"""structlog JSON config and request logging middleware."""

from __future__ import annotations

import time
import uuid as _uuid_mod
from hashlib import sha256

import structlog
from fastapi import Request, Response

from .auth import extract_bearer_token


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


def token_log_id(token: str) -> str:
    return sha256(token.encode("utf-8")).hexdigest()[:12]


async def request_logging_middleware(request: Request, call_next) -> Response:
    """Log each request without writing bearer credentials to the log stream."""
    request_id = str(_uuid_mod.uuid4())
    structlog.contextvars.clear_contextvars()
    structlog.contextvars.bind_contextvars(request_id=request_id)

    # Extract user_id from Authorization header for logging (no DB call here)
    token = extract_bearer_token(request)
    user_id = token_log_id(token) if token else None

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
