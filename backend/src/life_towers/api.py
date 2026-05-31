from __future__ import annotations

import sqlite3
import time
from typing import Annotated

import structlog
from fastapi import APIRouter, Depends, HTTPException, Request

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
    RegisterRequest,
    RegisterResponse,
    TowerOut,
)

router = APIRouter(prefix="/api/v1")
logger = structlog.get_logger(__name__)


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

    return DataOut(pages=pages_out)


@router.put("/data", status_code=204)
@limiter.limit("30/minute")
async def put_data(
    request: Request,
    body: DataIn,
    user_id: Annotated[str, Depends(get_current_user)],
) -> None:
    # Tree-replace semantics mean the request size IS the user's total storage,
    # so the 2 MiB request cap (enforced by payload_size_middleware) is the only
    # quota we need.
    now = int(time.time())

    with db_connection() as conn:
        conn.execute("BEGIN IMMEDIATE")
        try:
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

            # Update last_seen_at
            conn.execute(
                "UPDATE users SET last_seen_at = ? WHERE id = ?",
                (now, user_id),
            )

            conn.commit()
        except sqlite3.IntegrityError as exc:
            conn.rollback()
            raise HTTPException(
                status_code=409,
                detail="Submitted IDs conflict with existing data",
            ) from exc
        except Exception:
            conn.rollback()
            raise

    logger.info("data_replaced", user_id=token_log_id(user_id), pages=len(body.pages))
