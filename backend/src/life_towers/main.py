"""ASGI app, lifespan, static files mount, route registration."""

from __future__ import annotations

import json
import os
from contextlib import asynccontextmanager
from pathlib import Path
from typing import AsyncGenerator

import structlog
from fastapi import FastAPI, HTTPException, Request, Response
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from starlette.middleware.base import BaseHTTPMiddleware

from .api import router
from .db import db_connection, run_migrations
from .limits import limiter, payload_size_middleware
from .logging import configure_logging, request_logging_middleware

logger = structlog.get_logger(__name__)

# Map HTTP status codes to error code strings
STATUS_CODE_MAP: dict[int, str] = {
    400: "bad_request",
    401: "unauthorized",
    403: "forbidden",
    404: "not_found",
    405: "method_not_allowed",
    409: "conflict",
    413: "payload_too_large",
    422: "bad_request",
    429: "rate_limited",
    507: "quota_exceeded",
    500: "server_error",
}


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    configure_logging()
    logger.info("starting_up")
    with db_connection() as conn:
        run_migrations(conn)
    logger.info("migrations_complete")
    yield
    logger.info("shutting_down")


def create_app() -> FastAPI:
    app = FastAPI(
        title="Life Towers",
        lifespan=lifespan,
        docs_url="/api/docs",
        redoc_url="/api/redoc",
    )

    # Rate limiter state
    app.state.limiter = limiter

    # CORS (only if env var set)
    allowed_origin = os.environ.get("LIFE_TOWERS_ALLOWED_ORIGIN")
    if allowed_origin:
        app.add_middleware(
            CORSMiddleware,
            allow_origins=[allowed_origin],
            allow_credentials=False,
            allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
            allow_headers=["Authorization", "Content-Type"],
        )

    # Payload size middleware
    app.add_middleware(BaseHTTPMiddleware, dispatch=payload_size_middleware)

    # Request logging middleware
    app.add_middleware(BaseHTTPMiddleware, dispatch=request_logging_middleware)

    # Rate limit exceeded handler
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

    # Pydantic / FastAPI validation errors → 400 bad_request.
    # We do NOT echo the user-supplied input back in the detail string —
    # pydantic's default messages include the offending value, which would
    # reflect arbitrary attacker-controlled content. Instead we just list
    # the failing field paths.
    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(
        request: Request, exc: RequestValidationError
    ) -> JSONResponse:
        fields = sorted(
            {".".join(str(loc) for loc in e.get("loc", ()) if loc != "body") for e in exc.errors()}
        )
        if fields:
            detail_str = "Validation failed for: " + ", ".join(f for f in fields if f)
        else:
            detail_str = "Validation failed"
        return JSONResponse(
            status_code=400,
            content={"error": "bad_request", "detail": detail_str},
        )

    # HTTP exception handler → normalized JSON
    @app.exception_handler(HTTPException)
    async def http_exception_handler(request: Request, exc: HTTPException) -> JSONResponse:
        if isinstance(exc.detail, dict):
            # Already shaped correctly (from auth.py etc.)
            detail = exc.detail
        else:
            code = STATUS_CODE_MAP.get(exc.status_code, "server_error")
            detail = {"error": code, "detail": str(exc.detail)}

        headers = getattr(exc, "headers", None) or {}
        return JSONResponse(status_code=exc.status_code, content=detail, headers=headers)

    # Generic 500 handler
    @app.exception_handler(Exception)
    async def generic_exception_handler(request: Request, exc: Exception) -> JSONResponse:
        logger.exception("unhandled_exception", exc_info=exc)
        return JSONResponse(
            status_code=500,
            content={"error": "server_error", "detail": "Internal server error"},
        )

    # Register API router
    app.include_router(router)

    # Static files
    static_dir = Path(os.environ.get("LIFE_TOWERS_STATIC_DIR", "/app/static"))
    if static_dir.exists() and static_dir.is_dir():
        _mount_static(app, static_dir)
    else:
        logger.warning("static_dir_missing", path=str(static_dir))

    return app


def _mount_static(app: FastAPI, static_dir: Path) -> None:
    """Mount static files with SPA fallback and proper cache headers."""

    import re

    # Matches Angular's content-hashed asset filenames, e.g.
    #   main-L5B7PG5E.js, chunk-deadbeef.css, styles-6JWNHNC2.css, font.AbCdEf12.woff2
    # The hash is at least 8 chars of alphanumerics, separated from the base name
    # by either '-' (modern Angular) or '.' (older Angular / generic).
    HASHED_PATTERN = re.compile(
        r"[-.][A-Za-z0-9]{8,}\.(?:js|css|woff2?|png|jpe?g|svg|ico|map)$"
    )

    def _serve_file(file_path: Path) -> FileResponse:
        resp = FileResponse(str(file_path))
        if HASHED_PATTERN.search(file_path.name):
            resp.headers["Cache-Control"] = "public, max-age=31536000, immutable"
        else:
            resp.headers["Cache-Control"] = "no-cache"
        return resp

    @app.get("/{full_path:path}", include_in_schema=False)
    async def spa_fallback(full_path: str) -> Response:
        # API routes are handled by the API router (registered before this);
        # if execution reaches here for an /api/* path, it really is unknown.
        if full_path.startswith("api/"):
            raise HTTPException(status_code=404, detail="Not found")

        # Real file? Serve it (with cache headers based on hash detection).
        # Guard against path traversal by resolving and re-checking containment.
        candidate = (static_dir / full_path).resolve()
        try:
            candidate.relative_to(static_dir.resolve())
        except ValueError:
            raise HTTPException(status_code=404, detail="Not found")
        if candidate.is_file():
            return _serve_file(candidate)

        # SPA fallback to index.html.
        index = static_dir / "index.html"
        if index.is_file():
            return _serve_file(index)

        raise HTTPException(status_code=404, detail="Not found")


app = create_app()
