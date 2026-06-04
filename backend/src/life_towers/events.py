"""In-process pub/sub for Server-Sent Events.

Single-worker deployment (see Dockerfile: uvicorn with no ``--workers``), so a
plain in-memory registry is enough — there is one event loop and every
subscriber queue lives on it. If this ever grows to multiple workers, this
module is the seam to swap for a cross-process bus (Redis pub/sub, LISTEN/NOTIFY,
or polling the ``users.revision`` column).

Each subscriber gets a 1-slot queue that always holds the *latest* revision to
notify. Coalescing is intentional: the SSE payload is just "something changed,
current revision is N", so a burst of writes collapses to a single refetch
signal rather than a backlog.
"""

from __future__ import annotations

import asyncio

import structlog

logger = structlog.get_logger(__name__)

# user_id -> set of per-connection queues. Each queue carries the most recent
# revision the connection still needs to flush to its client.
_subscribers: dict[str, set[asyncio.Queue[int]]] = {}


def subscribe(user_id: str) -> asyncio.Queue[int]:
    """Register a new SSE connection for ``user_id`` and return its queue.

    Must be called from the event loop (the SSE route handler is async), so the
    queue binds to the running loop.
    """
    queue: asyncio.Queue[int] = asyncio.Queue(maxsize=1)
    _subscribers.setdefault(user_id, set()).add(queue)
    return queue


def unsubscribe(user_id: str, queue: asyncio.Queue[int]) -> None:
    """Drop a connection's queue; prune the user entry when the last one goes."""
    subs = _subscribers.get(user_id)
    if subs is None:
        return
    subs.discard(queue)
    if not subs:
        _subscribers.pop(user_id, None)


def publish(user_id: str, revision: int) -> None:
    """Notify every live connection for ``user_id`` of the new revision.

    Called from the (single) event loop right after a PUT commits, so the
    ``put_nowait`` calls are loop-safe. Coalesces into each 1-slot queue: if a
    connection has not yet drained its previous signal, replace it with the
    newer revision rather than block or grow unbounded.
    """
    subs = _subscribers.get(user_id)
    if not subs:
        return
    for queue in subs:
        try:
            queue.put_nowait(revision)
        except asyncio.QueueFull:
            # Connection is behind — drop the stale value and keep the newest.
            try:
                queue.get_nowait()
            except asyncio.QueueEmpty:
                pass
            try:
                queue.put_nowait(revision)
            except asyncio.QueueFull:
                pass


def connection_count(user_id: str) -> int:
    """Number of live SSE connections for a user (used in tests)."""
    return len(_subscribers.get(user_id, ()))
