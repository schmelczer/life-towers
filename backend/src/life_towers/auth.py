"""Bearer token extraction, UUIDv4 validation, and DB lookup."""

from __future__ import annotations

from fastapi import HTTPException, Request

from .db import db_connection
from .models import _canonical_uuidv4

# Single generic detail used for ALL 401 responses. Per spec, the response
# must not distinguish between missing / malformed / unknown tokens — that
# would let an attacker enumerate registered tokens.
_UNAUTHORIZED_DETAIL = "Authentication required"


def _unauthorized() -> HTTPException:
    return HTTPException(
        status_code=401,
        detail={"error": "unauthorized", "detail": _UNAUTHORIZED_DETAIL},
    )


def extract_bearer_token(request: Request) -> str | None:
    """Return the raw Bearer token from the Authorization header, or None."""
    auth_header = request.headers.get("Authorization") or request.headers.get(
        "authorization"
    )
    if not auth_header:
        return None
    parts = auth_header.split()
    if len(parts) == 2 and parts[0].lower() == "bearer":
        return parts[1]
    return None


def get_current_user(request: Request) -> str:
    """Dependency that extracts and validates a Bearer token, returns user_id."""
    token = extract_bearer_token(request)
    if token is None:
        raise _unauthorized()

    try:
        token = _canonical_uuidv4(token)
    except ValueError:
        raise _unauthorized()

    with db_connection() as conn:
        row = conn.execute(
            "SELECT id FROM users WHERE id = ?", (token,)
        ).fetchone()

    if row is None:
        raise _unauthorized()

    return token
