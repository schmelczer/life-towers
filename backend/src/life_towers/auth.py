"""Bearer token extraction, UUIDv4 validation, and DB lookup."""

from __future__ import annotations

import uuid

from fastapi import HTTPException, Request

from .db import db_connection

# Single generic detail used for ALL 401 responses. Per spec, the response
# must not distinguish between missing / malformed / unknown tokens — that
# would let an attacker enumerate registered tokens.
_UNAUTHORIZED_DETAIL = "Authentication required"


def _unauthorized() -> HTTPException:
    return HTTPException(
        status_code=401,
        detail={"error": "unauthorized", "detail": _UNAUTHORIZED_DETAIL},
    )


def get_current_user(request: Request) -> str:
    """Dependency that extracts and validates a Bearer token, returns user_id."""
    auth_header = request.headers.get("Authorization") or request.headers.get(
        "authorization"
    )
    if not auth_header:
        raise _unauthorized()

    parts = auth_header.split()
    if len(parts) != 2 or parts[0].lower() != "bearer":
        raise _unauthorized()

    token = parts[1]

    try:
        u = uuid.UUID(token)
        if u.version != 4:
            raise ValueError("Not v4")
    except (ValueError, AttributeError):
        raise _unauthorized()

    with db_connection() as conn:
        row = conn.execute(
            "SELECT id FROM users WHERE id = ?", (token,)
        ).fetchone()

    if row is None:
        raise _unauthorized()

    return token
