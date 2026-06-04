from __future__ import annotations

import asyncio
import json
import sqlite3
import time
from typing import Annotated

import structlog
from fastapi import APIRouter, Depends, Header, HTTPException, Request
from fastapi.responses import StreamingResponse

from . import events
from .auth import get_current_user
from .db import db_connection
from .limits import limiter
from .logging import token_log_id
from .models import (
    BlockOut,
    DataIn,
    DataOut,
    HealthResponse,
    HslColor,
    PageOut,
    PutDataResponse,
    RegisterRequest,
    RegisterResponse,
    TowerOut,
)

router = APIRouter(prefix="/api/v1")
logger = structlog.get_logger(__name__)

# How long the SSE loop waits for a new revision before emitting a keepalive
# comment. Keeps the connection warm through proxies and bounds disconnect
# detection latency.
SSE_KEEPALIVE_SECONDS = 20


def _read_revision(conn: sqlite3.Connection, user_id: str) -> int:
    row = conn.execute(
        "SELECT revision FROM users WHERE id = ?", (user_id,)
    ).fetchone()
    return int(row["revision"]) if row is not None else 0


def _parse_if_match(value: str | None) -> int | None:
    """Parse the client's CAS base revision from the If-Match header.

    Tolerates an ETag-style quoted form (``"5"``). Returns None when the header
    is absent or unparseable, in which case the write proceeds unguarded
    (last-writer-wins) — this keeps older cached clients working across a deploy.
    """
    if value is None:
        return None
    cleaned = value.strip().strip('"')
    try:
        return int(cleaned)
    except ValueError:
        return None


@router.get("/health", response_model=HealthResponse)
async def health() -> HealthResponse:
    return HealthResponse(status="ok")


@router.post("/register", response_model=RegisterResponse)
@limiter.limit("30/hour", key_func=lambda request: request.client.host if request.client else "unknown")
async def register(request: Request, body: RegisterRequest) -> RegisterResponse:
    token = body.token
    now = int(time.time())
    with db_connection() as conn:
        existing = conn.execute(
            "SELECT id FROM users WHERE id = ?", (token,)
        ).fetchone()
        if existing is None:
            conn.execute(
                "INSERT INTO users (id, created_at, last_seen_at) VALUES (?, ?, ?)",
                (token, now, now),
            )
        else:
            conn.execute(
                "UPDATE users SET last_seen_at = ? WHERE id = ?",
                (now, token),
            )
        conn.commit()
    logger.info("user_registered", user_id=token_log_id(token), new=existing is None)
    return RegisterResponse(user_id=token)


@router.get("/data", response_model=DataOut)
@limiter.limit("60/minute")
async def get_data(
    request: Request,
    user_id: Annotated[str, Depends(get_current_user)],
) -> DataOut:
    with db_connection() as conn:
        revision = _read_revision(conn, user_id)

        pages_rows = conn.execute(
            """
            SELECT id, name, hide_create_tower_button, keep_tasks_open, default_date_from, default_date_to
            FROM pages
            WHERE user_id = ?
            ORDER BY position
            """,
            (user_id,),
        ).fetchall()

        pages_out: list[PageOut] = []
        for page_row in pages_rows:
            page_id = page_row["id"]

            tower_rows = conn.execute(
                """
                SELECT id, name, base_color_h, base_color_s, base_color_l
                FROM towers
                WHERE page_id = ?
                ORDER BY position
                """,
                (page_id,),
            ).fetchall()

            towers_out: list[TowerOut] = []
            for tower_row in tower_rows:
                tower_id = tower_row["id"]

                block_rows = conn.execute(
                    """
                    SELECT id, tag, description, is_done, difficulty, created_at
                    FROM blocks
                    WHERE tower_id = ?
                    ORDER BY position
                    """,
                    (tower_id,),
                ).fetchall()

                blocks_out = [
                    BlockOut(
                        id=b["id"],
                        tag=b["tag"],
                        description=b["description"],
                        is_done=bool(b["is_done"]),
                        difficulty=b["difficulty"],
                        created_at=b["created_at"],
                    )
                    for b in block_rows
                ]

                towers_out.append(
                    TowerOut(
                        id=tower_row["id"],
                        name=tower_row["name"],
                        base_color=HslColor(
                            h=tower_row["base_color_h"],
                            s=tower_row["base_color_s"],
                            l=tower_row["base_color_l"],
                        ),
                        blocks=blocks_out,
                    )
                )

            pages_out.append(
                PageOut(
                    id=page_row["id"],
                    name=page_row["name"],
                    hide_create_tower_button=bool(
                        page_row["hide_create_tower_button"]
                    ),
                    keep_tasks_open=bool(page_row["keep_tasks_open"]),
                    default_date_from=page_row["default_date_from"],
                    default_date_to=page_row["default_date_to"],
                    towers=towers_out,
                )
            )

    return DataOut(pages=pages_out, revision=revision)


@router.put("/data", response_model=PutDataResponse)
@limiter.limit("30/minute")
async def put_data(
    request: Request,
    body: DataIn,
    user_id: Annotated[str, Depends(get_current_user)],
    if_match: Annotated[str | None, Header(alias="If-Match")] = None,
) -> PutDataResponse:
    # Tree-replace semantics mean the request size IS the user's total storage,
    # so the 2 MiB request cap (enforced by payload_size_middleware) is the only
    # quota we need.
    now = int(time.time())
    base_revision = _parse_if_match(if_match)

    with db_connection() as conn:
        conn.execute("BEGIN IMMEDIATE")
        try:
            current_revision = _read_revision(conn, user_id)

            # Compare-and-swap: reject if another client advanced the revision
            # under us. The client refetches, merges, and retries with the
            # fresh base. An absent If-Match opts out of the guard.
            if base_revision is not None and base_revision != current_revision:
                conn.rollback()
                raise HTTPException(
                    status_code=409,
                    detail={
                        "error": "conflict",
                        "detail": "Revision is stale; refetch and retry",
                        "revision": current_revision,
                    },
                )

            new_revision = current_revision + 1

            # Delete existing data for this user (cascades to towers + blocks)
            conn.execute("DELETE FROM pages WHERE user_id = ?", (user_id,))

            for page_pos, page in enumerate(body.pages):
                conn.execute(
                    """
                    INSERT INTO pages
                        (id, user_id, position, name, hide_create_tower_button,
                         keep_tasks_open, default_date_from, default_date_to,
                         created_at, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        page.id,
                        user_id,
                        page_pos,
                        page.name,
                        1 if page.hide_create_tower_button else 0,
                        1 if page.keep_tasks_open else 0,
                        page.default_date_from,
                        page.default_date_to,
                        now,
                        now,
                    ),
                )

                for tower_pos, tower in enumerate(page.towers):
                    conn.execute(
                        """
                        INSERT INTO towers
                            (id, page_id, user_id, position, name,
                             base_color_h, base_color_s, base_color_l,
                             created_at, updated_at)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                        """,
                        (
                            tower.id,
                            page.id,
                            user_id,
                            tower_pos,
                            tower.name,
                            tower.base_color.h,
                            tower.base_color.s,
                            tower.base_color.l,
                            now,
                            now,
                        ),
                    )

                    for block_pos, block in enumerate(tower.blocks):
                        created_at = block.created_at if block.created_at is not None else now
                        conn.execute(
                            """
                            INSERT INTO blocks
                                (id, tower_id, user_id, position, tag,
                                 description, is_done, difficulty,
                                 created_at, updated_at)
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                            """,
                            (
                                block.id,
                                tower.id,
                                user_id,
                                block_pos,
                                block.tag,
                                block.description,
                                1 if block.is_done else 0,
                                block.difficulty,
                                created_at,
                                now,
                            ),
                        )

            # Bump the revision and refresh last_seen_at in the same transaction.
            conn.execute(
                "UPDATE users SET last_seen_at = ?, revision = ? WHERE id = ?",
                (now, new_revision, user_id),
            )

            conn.commit()
        except HTTPException:
            # Already rolled back (e.g. the CAS 409); just propagate.
            raise
        except sqlite3.IntegrityError as exc:
            conn.rollback()
            raise HTTPException(
                status_code=409,
                detail="Submitted IDs conflict with existing data",
            ) from exc
        except Exception:
            conn.rollback()
            raise

    # Notify other live clients for this user to refetch. Done after commit so
    # subscribers never observe a revision that isn't durably stored yet.
    events.publish(user_id, new_revision)

    logger.info(
        "data_replaced",
        user_id=token_log_id(user_id),
        pages=len(body.pages),
        revision=new_revision,
    )
    return PutDataResponse(revision=new_revision)


def _format_revision_event(revision: int) -> str:
    return f"event: revision\ndata: {json.dumps({'revision': revision})}\n\n"


@router.get("/events")
async def events_stream(
    request: Request,
    user_id: Annotated[str, Depends(get_current_user)],
) -> StreamingResponse:
    """Server-Sent Events stream that notifies a client to refetch.

    Authenticated with the same Bearer token as the rest of the API — clients
    consume it via fetch()+ReadableStream (EventSource cannot set headers), so
    the token never leaks into a URL. Each event carries the current revision;
    the client refetches GET /data when it sees a revision newer than its own.
    """
    queue = events.subscribe(user_id)

    async def event_generator():
        try:
            # Emit the current revision immediately so a (re)connecting client
            # can catch up on anything it missed while disconnected.
            with db_connection() as conn:
                yield _format_revision_event(_read_revision(conn, user_id))

            while True:
                try:
                    revision = await asyncio.wait_for(
                        queue.get(), timeout=SSE_KEEPALIVE_SECONDS
                    )
                    yield _format_revision_event(revision)
                except asyncio.TimeoutError:
                    if await request.is_disconnected():
                        break
                    # Comment line: keeps proxies from idling the connection out.
                    yield ": keepalive\n\n"
        finally:
            events.unsubscribe(user_id, queue)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            # Disable nginx response buffering for this stream even if the
            # location block forgets `proxy_buffering off`.
            "X-Accel-Buffering": "no",
        },
    )
