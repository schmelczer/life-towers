"""pytest + httpx AsyncClient tests for the Life Towers API."""

from __future__ import annotations

import asyncio
import uuid
from pathlib import Path
from typing import AsyncGenerator

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient

import life_towers.db as db_module
from life_towers.db import run_migrations, get_connection
from life_towers.limits import limiter
from life_towers.main import create_app


def make_uuidv4() -> str:
    return str(uuid.uuid4())


@pytest.fixture()
def anyio_backend():
    return "asyncio"


@pytest_asyncio.fixture()
async def client(tmp_path: Path) -> AsyncGenerator[AsyncClient, None]:
    """Create a test client backed by a fresh SQLite database."""
    db_path = tmp_path / "test.db"
    db_module._DB_PATH = db_path

    # Reset rate limiter state so each test starts clean
    limiter.reset()

    # Run migrations using a fresh connection
    conn = get_connection()
    run_migrations(conn)
    conn.close()

    app = create_app()

    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://testserver",
    ) as c:
        yield c

    # Reset DB path for next test
    db_module._DB_PATH = None


@pytest.mark.asyncio
async def test_spa_index_injects_absolute_open_graph_urls(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    static_dir = tmp_path / "static"
    static_dir.mkdir()
    (static_dir / "index.html").write_text(
        """
<!doctype html>
<html>
  <head>
    <link rel="canonical" href="/" data-dynamic-url="canonical" />
    <meta property="og:url" content="/" data-dynamic-url="canonical" />
    <meta property="og:image" content="/og-image.png" data-dynamic-url="og-image" />
    <meta name="twitter:image" content="/og-image.png" data-dynamic-url="og-image" />
  </head>
</html>
""",
        encoding="utf-8",
    )
    (static_dir / "og-image.png").write_bytes(b"fake png")
    monkeypatch.setenv("LIFE_TOWERS_STATIC_DIR", str(static_dir))

    app = create_app()
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="https://towers.example",
    ) as c:
        resp = await c.get("/tasks?utm_source=test")

    assert resp.status_code == 200
    assert (
        '<link rel="canonical" href="https://towers.example/tasks" '
        'data-dynamic-url="canonical" />'
    ) in resp.text
    assert (
        '<meta property="og:url" content="https://towers.example/tasks" '
        'data-dynamic-url="canonical" />'
    ) in resp.text
    assert (
        '<meta property="og:image" content="https://towers.example/og-image.png" '
        'data-dynamic-url="og-image" />'
    ) in resp.text
    assert (
        '<meta name="twitter:image" content="https://towers.example/og-image.png" '
        'data-dynamic-url="og-image" />'
    ) in resp.text

    monkeypatch.setenv("LIFE_TOWERS_PUBLIC_URL", "https://public.example/towers")
    app = create_app()
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="https://internal.example",
    ) as c:
        resp = await c.get("/")

    assert resp.status_code == 200
    assert (
        '<link rel="canonical" href="https://public.example/towers/" '
        'data-dynamic-url="canonical" />'
    ) in resp.text
    assert (
        '<meta property="og:image" content="https://public.example/towers/og-image.png" '
        'data-dynamic-url="og-image" />'
    ) in resp.text


# ---------------------------------------------------------------------------
# Register
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_register_new_token(client: AsyncClient) -> None:
    token = make_uuidv4()
    resp = await client.post("/api/v1/register", json={"token": token})
    assert resp.status_code == 200
    assert resp.json() == {"user_id": token}


@pytest.mark.asyncio
async def test_register_idempotent(client: AsyncClient) -> None:
    token = make_uuidv4()
    r1 = await client.post("/api/v1/register", json={"token": token})
    r2 = await client.post("/api/v1/register", json={"token": token})
    assert r1.status_code == 200
    assert r2.status_code == 200
    assert r1.json() == {"user_id": token}
    assert r2.json() == {"user_id": token}


@pytest.mark.asyncio
async def test_register_non_uuid_token(client: AsyncClient) -> None:
    resp = await client.post("/api/v1/register", json={"token": "not-a-uuid"})
    assert resp.status_code == 400


@pytest.mark.asyncio
async def test_register_non_uuidv4_token(client: AsyncClient) -> None:
    # UUIDv1
    v1 = str(uuid.uuid1())
    resp = await client.post("/api/v1/register", json={"token": v1})
    assert resp.status_code == 400


@pytest.mark.asyncio
async def test_uuid_inputs_are_canonicalized(client: AsyncClient) -> None:
    token = make_uuidv4()
    upper_token = token.upper()
    register_resp = await client.post("/api/v1/register", json={"token": upper_token})
    assert register_resp.status_code == 200
    assert register_resp.json() == {"user_id": token}

    data_resp = await client.get(
        "/api/v1/data",
        headers={"Authorization": f"Bearer {upper_token}"},
    )
    assert data_resp.status_code == 200


# ---------------------------------------------------------------------------
# Auth / GET /data
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_get_data_no_token(client: AsyncClient) -> None:
    resp = await client.get("/api/v1/data")
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_get_data_bogus_token(client: AsyncClient) -> None:
    resp = await client.get(
        "/api/v1/data",
        headers={"Authorization": f"Bearer {make_uuidv4()}"},
    )
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_get_data_empty_user(client: AsyncClient) -> None:
    token = make_uuidv4()
    await client.post("/api/v1/register", json={"token": token})
    resp = await client.get(
        "/api/v1/data",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 200
    assert resp.json() == {"pages": [], "revision": 0}


# ---------------------------------------------------------------------------
# Round-trip: register → PUT → GET
# ---------------------------------------------------------------------------

def _make_tree() -> dict:
    """Build a valid tree with 2 pages × 2 towers × 3 blocks."""
    pages = []
    for pi in range(2):
        towers = []
        for ti in range(2):
            blocks = []
            for bi in range(3):
                blocks.append(
                    {
                        "id": make_uuidv4(),
                        "tag": f"tag-{pi}-{ti}-{bi}",
                        "description": f"desc-{pi}-{ti}-{bi}",
                        "is_done": False,
                        "difficulty": bi + 1,
                        "created_at": 1700000000 + bi,
                    }
                )
            towers.append(
                {
                    "id": make_uuidv4(),
                    "name": f"Tower {pi}-{ti}",
                    "base_color": {"h": 0.1 * ti, "s": 0.5, "l": 0.6},
                    "blocks": blocks,
                }
            )
        pages.append(
            {
                "id": make_uuidv4(),
                "name": f"Page {pi}",
                "hide_create_tower_button": False,
                "keep_tasks_open": False,
                "default_date_from": None,
                "default_date_to": None,
                "towers": towers,
            }
        )
    return {"pages": pages}


@pytest.mark.asyncio
async def test_round_trip(client: AsyncClient) -> None:
    token = make_uuidv4()
    await client.post("/api/v1/register", json={"token": token})
    headers = {"Authorization": f"Bearer {token}"}

    tree = _make_tree()
    put_resp = await client.put("/api/v1/data", json=tree, headers=headers)
    assert put_resp.status_code == 200
    assert put_resp.json() == {"revision": 1}

    get_resp = await client.get("/api/v1/data", headers=headers)
    assert get_resp.status_code == 200
    data = get_resp.json()

    assert data["revision"] == 1
    assert len(data["pages"]) == 2
    for pi, page in enumerate(data["pages"]):
        assert page["id"] == tree["pages"][pi]["id"]
        assert page["name"] == tree["pages"][pi]["name"]
        assert len(page["towers"]) == 2
        for ti, tower in enumerate(page["towers"]):
            assert tower["id"] == tree["pages"][pi]["towers"][ti]["id"]
            assert tower["name"] == tree["pages"][pi]["towers"][ti]["name"]
            assert len(tower["blocks"]) == 3
            for bi, block in enumerate(tower["blocks"]):
                assert block["id"] == tree["pages"][pi]["towers"][ti]["blocks"][bi]["id"]
                assert block["tag"] == tree["pages"][pi]["towers"][ti]["blocks"][bi]["tag"]
                assert (
                    block["difficulty"]
                    == tree["pages"][pi]["towers"][ti]["blocks"][bi]["difficulty"]
                )


@pytest.mark.asyncio
async def test_difficulty_defaults_to_one_when_omitted(client: AsyncClient) -> None:
    """A block sent without `difficulty` is stored and returned as 1."""
    token = make_uuidv4()
    await client.post("/api/v1/register", json={"token": token})
    headers = {"Authorization": f"Bearer {token}"}

    tree = _make_tree()
    # Drop difficulty from the very first block.
    del tree["pages"][0]["towers"][0]["blocks"][0]["difficulty"]

    put_resp = await client.put("/api/v1/data", json=tree, headers=headers)
    assert put_resp.status_code == 200

    data = (await client.get("/api/v1/data", headers=headers)).json()
    assert data["pages"][0]["towers"][0]["blocks"][0]["difficulty"] == 1


@pytest.mark.asyncio
async def test_difficulty_must_be_positive(client: AsyncClient) -> None:
    """difficulty < 1 is rejected by validation."""
    token = make_uuidv4()
    await client.post("/api/v1/register", json={"token": token})
    headers = {"Authorization": f"Bearer {token}"}

    tree = _make_tree()
    tree["pages"][0]["towers"][0]["blocks"][0]["difficulty"] = 0

    resp = await client.put("/api/v1/data", json=tree, headers=headers)
    assert resp.status_code == 400


# ---------------------------------------------------------------------------
# Validation errors
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_put_duplicate_page_id(client: AsyncClient) -> None:
    token = make_uuidv4()
    await client.post("/api/v1/register", json={"token": token})
    headers = {"Authorization": f"Bearer {token}"}

    dup_id = make_uuidv4()
    tree = _make_tree()
    tree["pages"][0]["id"] = dup_id
    tree["pages"][1]["id"] = dup_id  # duplicate

    resp = await client.put("/api/v1/data", json=tree, headers=headers)
    assert resp.status_code == 400  # pydantic validation error → 400 bad_request per spec
    assert resp.json() == {"error": "bad_request", "detail": "Validation failed"}


@pytest.mark.asyncio
async def test_put_cross_user_id_conflict_returns_409(client: AsyncClient) -> None:
    first_token = make_uuidv4()
    second_token = make_uuidv4()
    await client.post("/api/v1/register", json={"token": first_token})
    await client.post("/api/v1/register", json={"token": second_token})

    tree = _make_tree()
    first_resp = await client.put(
        "/api/v1/data",
        json=tree,
        headers={"Authorization": f"Bearer {first_token}"},
    )
    assert first_resp.status_code == 200

    second_resp = await client.put(
        "/api/v1/data",
        json=tree,
        headers={"Authorization": f"Bearer {second_token}"},
    )
    assert second_resp.status_code == 409
    assert second_resp.json() == {
        "error": "conflict",
        "detail": "Submitted IDs conflict with existing data",
    }


@pytest.mark.asyncio
async def test_put_name_too_long(client: AsyncClient) -> None:
    token = make_uuidv4()
    await client.post("/api/v1/register", json={"token": token})
    headers = {"Authorization": f"Bearer {token}"}

    tree = _make_tree()
    tree["pages"][0]["name"] = "A" * 201  # exceeds 200 char limit

    resp = await client.put("/api/v1/data", json=tree, headers=headers)
    assert resp.status_code == 400  # pydantic validation error → 400 bad_request per spec


@pytest.mark.asyncio
async def test_put_body_too_large_via_content_length(client: AsyncClient) -> None:
    """A body exceeding the 2 MiB cap, with Content-Length set, returns 413."""
    from life_towers.limits import PAYLOAD_LIMIT_BYTES

    token = make_uuidv4()
    await client.post("/api/v1/register", json={"token": token})
    over = PAYLOAD_LIMIT_BYTES + 1
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Length": str(over),
        "Content-Type": "application/json",
    }
    resp = await client.put("/api/v1/data", content=b"x" * over, headers=headers)
    assert resp.status_code == 413
    body = resp.json()
    assert body == {
        "error": "payload_too_large",
        "detail": f"Request body exceeds {PAYLOAD_LIMIT_BYTES} bytes",
    }


@pytest.mark.asyncio
async def test_unauthorized_detail_is_uniform(client: AsyncClient) -> None:
    """All 401 responses must share an identical detail to prevent enumeration."""
    bodies: list[dict] = []
    # missing header
    bodies.append((await client.get("/api/v1/data")).json())
    # wrong scheme
    bodies.append(
        (
            await client.get("/api/v1/data", headers={"Authorization": "Basic foo"})
        ).json()
    )
    # malformed token
    bodies.append(
        (
            await client.get(
                "/api/v1/data", headers={"Authorization": "Bearer not-a-uuid"}
            )
        ).json()
    )
    # well-formed but unknown token
    bodies.append(
        (
            await client.get(
                "/api/v1/data", headers={"Authorization": f"Bearer {make_uuidv4()}"}
            )
        ).json()
    )
    assert len({tuple(sorted(b.items())) for b in bodies}) == 1, bodies


@pytest.mark.asyncio
async def test_put_replaces_prior_data(client: AsyncClient) -> None:
    token = make_uuidv4()
    await client.post("/api/v1/register", json={"token": token})
    headers = {"Authorization": f"Bearer {token}"}

    # First PUT: 2 pages
    tree1 = _make_tree()
    await client.put("/api/v1/data", json=tree1, headers=headers)

    # Second PUT: 1 page
    tree2 = {"pages": [tree1["pages"][0]]}
    await client.put("/api/v1/data", json=tree2, headers=headers)

    get_resp = await client.get("/api/v1/data", headers=headers)
    data = get_resp.json()
    assert len(data["pages"]) == 1
    assert data["pages"][0]["id"] == tree1["pages"][0]["id"]


# ---------------------------------------------------------------------------
# Rate limit (mock / direct hit)
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_register_rate_limit(client: AsyncClient) -> None:
    """Hit /register past the per-IP limit; the next call returns 429."""
    # Limit is 30/hour/IP. Make 31 requests; the 31st must be 429.
    responses = []
    for _ in range(31):
        resp = await client.post("/api/v1/register", json={"token": make_uuidv4()})
        responses.append(resp.status_code)
    assert responses[-1] == 429, f"Expected 429 on 31st request, got: {responses[-3:]}"


# ---------------------------------------------------------------------------
# Revision counter + compare-and-swap (multi-client sync)
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_revision_increments_on_each_put(client: AsyncClient) -> None:
    token = make_uuidv4()
    await client.post("/api/v1/register", json={"token": token})
    headers = {"Authorization": f"Bearer {token}"}

    # Fresh user starts at revision 0.
    assert (await client.get("/api/v1/data", headers=headers)).json()["revision"] == 0

    r1 = await client.put("/api/v1/data", json=_make_tree(), headers=headers)
    assert r1.json() == {"revision": 1}
    r2 = await client.put("/api/v1/data", json=_make_tree(), headers=headers)
    assert r2.json() == {"revision": 2}

    assert (await client.get("/api/v1/data", headers=headers)).json()["revision"] == 2


@pytest.mark.asyncio
async def test_stale_if_match_returns_409_with_current_revision(
    client: AsyncClient,
) -> None:
    token = make_uuidv4()
    await client.post("/api/v1/register", json={"token": token})
    headers = {"Authorization": f"Bearer {token}"}

    # Base 0 matches a fresh user -> succeeds, revision becomes 1.
    ok = await client.put(
        "/api/v1/data", json=_make_tree(), headers={**headers, "If-Match": "0"}
    )
    assert ok.status_code == 200
    assert ok.json() == {"revision": 1}

    # Re-using the now-stale base 0 is rejected; the body carries the truth.
    stale = await client.put(
        "/api/v1/data", json=_make_tree(), headers={**headers, "If-Match": "0"}
    )
    assert stale.status_code == 409
    body = stale.json()
    assert body["error"] == "conflict"
    assert body["revision"] == 1

    # The conflicting write must NOT have advanced the revision.
    assert (await client.get("/api/v1/data", headers=headers)).json()["revision"] == 1

    # Retrying with the fresh base succeeds.
    retry = await client.put(
        "/api/v1/data", json=_make_tree(), headers={**headers, "If-Match": "1"}
    )
    assert retry.status_code == 200
    assert retry.json() == {"revision": 2}


@pytest.mark.asyncio
async def test_put_without_if_match_skips_the_guard(client: AsyncClient) -> None:
    """Absent If-Match keeps older cached clients writing (last-writer-wins)."""
    token = make_uuidv4()
    await client.post("/api/v1/register", json={"token": token})
    headers = {"Authorization": f"Bearer {token}"}

    # Advance to revision 2 first.
    await client.put("/api/v1/data", json=_make_tree(), headers=headers)
    await client.put("/api/v1/data", json=_make_tree(), headers=headers)

    # No If-Match -> write goes through regardless of current revision.
    resp = await client.put("/api/v1/data", json=_make_tree(), headers=headers)
    assert resp.status_code == 200
    assert resp.json() == {"revision": 3}


# ---------------------------------------------------------------------------
# Server-Sent Events stream (notify-to-refetch)
#
# The full SSE wire behaviour (incremental flush + live push) is exercised
# end-to-end against real uvicorn — httpx's in-memory ASGITransport can't model
# a long-lived streaming response with concurrent requests, so here we cover the
# two seams it CAN reach reliably: the in-process pub/sub bus, and the fact that
# a PUT publishes the new revision onto that bus (which the stream then drains).
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_event_bus_subscribe_publish_unsubscribe() -> None:
    from life_towers import events

    user = make_uuidv4()
    queue = events.subscribe(user)
    assert events.connection_count(user) == 1

    events.publish(user, 5)
    assert await asyncio.wait_for(queue.get(), 1) == 5

    events.unsubscribe(user, queue)
    assert events.connection_count(user) == 0


@pytest.mark.asyncio
async def test_event_bus_coalesces_to_latest_revision() -> None:
    """A backed-up connection should see only the newest revision, not a queue."""
    from life_towers import events

    user = make_uuidv4()
    queue = events.subscribe(user)
    events.publish(user, 1)
    events.publish(user, 2)
    events.publish(user, 3)

    assert await asyncio.wait_for(queue.get(), 1) == 3
    assert queue.empty()
    events.unsubscribe(user, queue)


@pytest.mark.asyncio
async def test_event_bus_fans_out_to_all_connections() -> None:
    from life_towers import events

    user = make_uuidv4()
    q1 = events.subscribe(user)
    q2 = events.subscribe(user)
    assert events.connection_count(user) == 2

    events.publish(user, 7)
    assert await asyncio.wait_for(q1.get(), 1) == 7
    assert await asyncio.wait_for(q2.get(), 1) == 7

    events.unsubscribe(user, q1)
    events.unsubscribe(user, q2)
    assert events.connection_count(user) == 0


@pytest.mark.asyncio
async def test_event_bus_publish_without_subscribers_is_noop() -> None:
    from life_towers import events

    events.publish(make_uuidv4(), 99)  # must not raise


@pytest.mark.asyncio
async def test_put_publishes_new_revision_to_subscribers(client: AsyncClient) -> None:
    """The integration seam: a real PUT must notify a live SSE subscriber."""
    from life_towers import events

    token = make_uuidv4()
    await client.post("/api/v1/register", json={"token": token})
    headers = {"Authorization": f"Bearer {token}"}

    queue = events.subscribe(token)
    try:
        await client.put("/api/v1/data", json=_make_tree(), headers=headers)
        assert await asyncio.wait_for(queue.get(), 2) == 1

        await client.put("/api/v1/data", json=_make_tree(), headers=headers)
        assert await asyncio.wait_for(queue.get(), 2) == 2
    finally:
        events.unsubscribe(token, queue)


@pytest.mark.asyncio
async def test_rejected_put_does_not_publish(client: AsyncClient) -> None:
    """A CAS-rejected (409) write must not emit a spurious refetch signal."""
    from life_towers import events

    token = make_uuidv4()
    await client.post("/api/v1/register", json={"token": token})
    headers = {"Authorization": f"Bearer {token}"}

    # Advance to revision 1.
    await client.put("/api/v1/data", json=_make_tree(), headers=headers)

    queue = events.subscribe(token)
    try:
        # Stale base -> 409, must not publish.
        stale = await client.put(
            "/api/v1/data", json=_make_tree(), headers={**headers, "If-Match": "0"}
        )
        assert stale.status_code == 409
        with pytest.raises(asyncio.TimeoutError):
            await asyncio.wait_for(queue.get(), 0.2)
    finally:
        events.unsubscribe(token, queue)


@pytest.mark.asyncio
async def test_sse_requires_auth(client: AsyncClient) -> None:
    # No Bearer token: auth fails before any streaming starts, so a plain GET
    # returns 401 without holding the connection open.
    resp = await client.get("/api/v1/events")
    assert resp.status_code == 401
