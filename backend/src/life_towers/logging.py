"""structlog JSON config and request logging middleware."""

from __future__ import annotations

import time
import uuid as _uuid_mod

import structlog
from fastapi import Request, Response


def configure_logging() -> None:
    """Configure structlog for JSON output."""
    structlog.configure(
        processors=[
            structlog.contextvars.merge_contextvars,
            structlog.processors.add_log_level,
            structlog.processors.TimeStamper(fmt="iso"),
            structlog.processors.StackInfoRenderer(),
            structlog.processors.JSONRenderer(),
        ],
        wrapper_class=structlog.make_filtering_bound_logger(0),
        context_class=dict,
        logger_factory=structlog.PrintLoggerFactory(),
        cache_logger_on_first_use=True,
    )


async def request_logging_middleware(request: Request, call_next) -> Response:
    """Log each request with method, path, status, duration_ms, user_id, request_id."""
    request_id = str(_uuid_mod.uuid4())
    structlog.contextvars.clear_contextvars()
    structlog.contextvars.bind_contextvars(request_id=request_id)

    # Extract user_id from Authorization header for logging (no DB call here)
    auth = request.headers.get("Authorization") or request.headers.get("authorization")
    user_id: str | None = None
    if auth:
        parts = auth.split()
        if len(parts) == 2 and parts[0].lower() == "bearer":
            user_id = parts[1]

    start = time.monotonic()
    response = await call_next(request)
    duration_ms = round((time.monotonic() - start) * 1000, 2)

    # request.client is rewritten by uvicorn's ProxyHeadersMiddleware
    # (--proxy-headers) to the real client IP when behind a trusted reverse proxy.
    client_ip = request.client.host if request.client else None

    log = structlog.get_logger("access")
    log.info(
        "request",
        method=request.method,
        path=request.url.path,
        status=response.status_code,
        duration_ms=duration_ms,
        user_id=user_id,
        client_ip=client_ip,
    )

    response.headers["X-Request-Id"] = request_id
    return response
