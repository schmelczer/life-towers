"""Payload size middleware and rate-limit setup."""

from __future__ import annotations

import json

from fastapi import Request, Response
from slowapi import Limiter
from slowapi.util import get_remote_address

PAYLOAD_LIMIT_BYTES = 2 * 1024 * 1024  # 2 MiB

_TOO_LARGE_BODY = json.dumps(
    {
        "error": "payload_too_large",
        "detail": f"Request body exceeds {PAYLOAD_LIMIT_BYTES} bytes",
    }
).encode()


def _get_token_or_ip(request: Request) -> str:
    """Key function for rate limiting: use Bearer token if present, else IP."""
    auth = request.headers.get("Authorization") or request.headers.get("authorization")
    if auth:
        parts = auth.split()
        if len(parts) == 2 and parts[0].lower() == "bearer":
            return parts[1]
    return get_remote_address(request)


limiter = Limiter(key_func=_get_token_or_ip, default_limits=[])


def _too_large() -> Response:
    return Response(
        content=_TOO_LARGE_BODY,
        status_code=413,
        media_type="application/json",
    )


async def payload_size_middleware(request: Request, call_next) -> Response:
    """Reject requests larger than PAYLOAD_LIMIT_BYTES.

    Two-layer enforcement:
      1. If `Content-Length` is present, reject up front (cheap and avoids
         buffering anything).
      2. Otherwise (chunked encoding / missing header) wrap `request.receive`
         so the body stream is tallied as it arrives; abort the moment the
         running total exceeds the cap. This is defense-in-depth against
         clients that omit Content-Length.
    """
    content_length = request.headers.get("content-length")
    if content_length is not None:
        try:
            length = int(content_length)
        except ValueError:
            length = 0
        if length > PAYLOAD_LIMIT_BYTES:
            return _too_large()
        # Trust the declared length; the ASGI server enforces it.
        return await call_next(request)

    # No Content-Length: tally bytes as they arrive.
    received_total = 0
    too_large = False
    original_receive = request.receive

    async def guarded_receive() -> dict:
        nonlocal received_total, too_large
        message = await original_receive()
        if message.get("type") == "http.request":
            body = message.get("body") or b""
            received_total += len(body)
            if received_total > PAYLOAD_LIMIT_BYTES:
                too_large = True
                # Tell downstream "no more body" — they may still try to
                # parse what's been seen, but we'll override the response.
                return {"type": "http.disconnect"}
        return message

    request._receive = guarded_receive  # type: ignore[attr-defined]
    response = await call_next(request)
    if too_large:
        return _too_large()
    return response
