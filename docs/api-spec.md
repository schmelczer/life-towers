# Life Towers API specification

This is the single source of truth for the v4 HTTP API between the Angular SPA and the FastAPI backend. Both clients and the server MUST conform to the shapes and rules defined here.

## Conventions

- All IDs are UUIDv4 strings (lowercase, canonical hex with dashes).
- All timestamps are Unix epoch seconds as integers.
- All requests and responses are `application/json` unless noted.
- Auth is `Authorization: Bearer <token>` where `<token>` is a UUIDv4 generated client-side at first launch.
- Same-origin: the frontend is served by the same FastAPI process, so CORS is locked to the deployment origin (or fully disabled in same-origin mode).
- All payloads are size-capped at **2 MiB**. Server returns `413 Payload Too Large` on overflow.
- Because `PUT /api/v1/data` atomically replaces the user's entire tree, the request size **is** the user's total storage — there is no separate per-user quota.
- Every response carries an `X-Request-Id` (UUIDv4) for log correlation.

## Authentication

A "user" is identified solely by a token (UUIDv4). There is no password, email, or recovery mechanism. The token is the credential — losing it means losing the data.

- The token is generated on the client at first launch (`crypto.randomUUID()`).
- The client calls `POST /api/v1/register` to claim the token. Idempotent — if the token already exists the server returns `200 OK` with the existing record.
- All authenticated endpoints require `Authorization: Bearer <token>`. Missing/malformed → `401`. Token not a valid UUIDv4 → `401`. Token not in DB → `401`. The `detail` string is identical across all 401 causes so the response cannot be used to enumerate tokens.

## Endpoints

### `GET /api/v1/health`

Public liveness probe. Returns `200 {"status":"ok"}`. No auth.

### `POST /api/v1/register`

Body: `{"token": "<uuidv4>"}`. Creates the user if absent; updates `last_seen_at` if present. Returns `200 {"user_id": "<uuidv4>"}`.

Rate limit: **30 requests / hour / IP**.

### `GET /api/v1/data`

Returns the full hierarchy belonging to the authenticated user. Response shape:

```json
{
  "pages": [
    {
      "id": "uuid",
      "name": "string",
      "hide_create_tower_button": false,
      "default_date_from": 1700000000,  // or null
      "default_date_to":   1700090000,  // or null
      "towers": [
        {
          "id": "uuid",
          "name": "string",
          "base_color": { "h": 0.5, "s": 0.8, "l": 0.6 },
          "blocks": [
            {
              "id": "uuid",
              "tag": "string",
              "description": "string",
              "is_done": false,
              "created_at": 1700000000
            }
          ]
        }
      ]
    }
  ]
}
```

Empty user → `200 {"pages": []}`.

Rate limit: **60 / minute / token**.

### `PUT /api/v1/data`

Atomically replaces the entire user hierarchy with the request body. Request body has the same shape as the `GET /api/v1/data` response. Server enforces:

- Every `id` is a valid UUIDv4. The server does NOT enforce that IDs already exist — clients are free to mint new IDs. IDs MUST be unique within the request (no duplicates at any level).
- All string fields are bounded:
  - `page.name`, `tower.name`, `block.tag`: ≤ 200 chars
  - `block.description`: ≤ 10 000 chars
- Numeric bounds:
  - HSL components: `h ∈ [0,1]`, `s ∈ [0,1]`, `l ∈ [0,1]`
  - Page-level counts: ≤ 100 pages, ≤ 100 towers per page, ≤ 1000 blocks per tower
  - Total blocks across the user: ≤ 50 000
- The whole replacement happens in a single SQLite transaction. Existing rows for the user are deleted and the new tree is inserted. The `users.last_seen_at` timestamp is updated.

Returns `204 No Content` on success.

Rate limit: **30 / minute / token**.

### Error responses

All error responses are JSON: `{"error": "code", "detail": "human-readable"}`. Codes the client must handle:

| HTTP | code                  | When                                                    |
|------|-----------------------|---------------------------------------------------------|
| 400  | `bad_request`         | Malformed JSON, missing fields, validation failures     |
| 401  | `unauthorized`        | Missing/invalid/unknown token                           |
| 413  | `payload_too_large`   | Request body > 2 MiB                                    |
| 429  | `rate_limited`        | Rate limit exceeded. `Retry-After` header set           |
| 500  | `server_error`        | Unexpected server failure. Body is generic, no stacktrace |

## SPA hosting

Any non-`/api/*` route is served from the static frontend build:

- `GET /` → `index.html`
- `GET /assets/*`, `/favicon.ico`, `/manifest.webmanifest`, `/ngsw-worker.js`, hashed JS/CSS bundles → static file
- `GET /<anything-else>` → `index.html` (SPA fallback for client-side routing)

Static files served with:
- `Cache-Control: public, max-age=31536000, immutable` for hashed assets
- `Cache-Control: no-cache` for `index.html`
- gzip / brotli pre-compressed where available

## Removed since legacy

- `POST /` (replaced by `POST /api/v1/register`)
- `POST /me` (the `track` endpoint — pure DOS vector, dropped entirely)
- `GET /me/root`, `PUT /me/root` (folded into `GET/PUT /api/v1/data`)
- `GET /me/<id>`, `POST /me/<id>` (per-object endpoints — replaced by tree-replace semantics)

## Future extensions (not in v1, but designed to allow)

- `GET /api/v1/data/stream` (Server-Sent Events) — push notifications of remote changes. Replaces polling for multi-device sync.
- Signed share tokens for read-only sharing without giving away the full account token.
