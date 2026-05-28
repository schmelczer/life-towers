"""pytest + httpx AsyncClient tests for the Life Towers API."""

from __future__ import annotations

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


# ---------------------------------------------------------------------------
# Health
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_health(client: AsyncClient) -> None:
    resp = await client.get("/api/v1/health")
    assert resp.status_code == 200
    assert resp.json() == {"status": "ok"}


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
    assert resp.json() == {"pages": []}


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
    assert put_resp.status_code == 204

    get_resp = await client.get("/api/v1/data", headers=headers)
    assert get_resp.status_code == 200
    data = get_resp.json()

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
