<p align="center">
  <img src="frontend/public/logo.svg" alt="Life Towers" width="420">
</p>

A personal productivity tool for organising tasks into visual "towers" of blocks, grouped on pages. Each user is identified by a client-generated token — no accounts, no passwords.

## Architecture

The application runs as a single Docker container. A FastAPI process serves both the Angular SPA (as static files) and the JSON API on port 8000. Data is stored in a SQLite database file persisted via a volume mount at `/data`. There is no separate database server required.

The container is designed to run behind a reverse proxy (nginx, Caddy, Traefik). It honors `X-Forwarded-For`, `X-Forwarded-Proto`, and `X-Forwarded-Host` so rate limiting and logging see the real client IP, and links built with `request.url` produce the correct scheme.

## Quick start

```bash
# Local build (uses docker-compose.dev.yml which builds from source and
# wipes data on `down -v`):
docker compose -f docker-compose.dev.yml up --build -d
```

Then visit http://localhost:8000.

For a production-style run, set `LIFE_TOWERS_IMAGE` to point at your registry tag and use the default `docker-compose.yml`:

```bash
export LIFE_TOWERS_IMAGE=registry.example.com/life-towers:latest
docker compose pull
docker compose up -d
```

## Environment variables

| Variable | Default | Description |
|---|---|---|
| `LIFE_TOWERS_IMAGE` | `life-towers:local` | The image `docker-compose.yml` will run. Point at your registry tag for production deploys. |
| `LIFE_TOWERS_PORT` | `8000` | Host port mapped to the container. |
| `LIFE_TOWERS_PULL_POLICY` | `missing` | `pull_policy` passed to compose. Set `always` to force-pull on `up`. |
| `LIFE_TOWERS_ALLOWED_ORIGIN` | _(empty)_ | If set, restricts CORS to this origin. Leave empty for same-origin mode (the typical setup behind nginx). |
| `LIFE_TOWERS_PUBLIC_URL` | _(derived from request)_ | Absolute public URL used for canonical and Open Graph image tags. Set this when serving behind a path prefix or proxy that rewrites the visible URL. |
| `LIFE_TOWERS_FORWARDED_ALLOW_IPS` | `*` | (Optional, advanced.) Override uvicorn's `--forwarded-allow-ips` if you want to narrow the set of trusted proxies. |

## Data persistence

SQLite data is stored at `/data/life-towers.db` inside the container, persisted via the `life-towers-data` Docker named volume. Back up with:

```bash
docker compose exec life-towers sqlite3 /data/life-towers.db .dump > backup.sql
```

To switch to a host bind mount for easier file-level backups, see the commented line in `docker-compose.yml`.

## Behind nginx

Sample reverse-proxy snippet:

```nginx
server {
    listen 443 ssl http2;
    server_name towers.example.com;

    # SSL config omitted

    client_max_body_size 4m;     # backend enforces 2 MiB; give a small margin

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Host              $host;
        proxy_set_header X-Real-IP         $remote_addr;
        proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host  $host;
    }
}
```

## Development without Docker

- Backend: `cd backend && uv run uvicorn life_towers.main:app --reload`
- Frontend: `cd frontend && npm start` — runs `ng serve` on :4200 with `/api/*` proxied to the backend on :8000 (see `frontend/proxy.conf.json`).

## End-to-end tests

A `docker-compose.dev.yml` builds a single-container stack with an ephemeral volume — ideal for Playwright runs:

```bash
docker compose -f docker-compose.dev.yml up --build -d
cd frontend && npm run test:e2e          # http://localhost:8000
docker compose -f docker-compose.dev.yml down -v
```

`PLAYWRIGHT_BASE_URL` overrides the target (e.g. `http://life-towers:8000` when Playwright itself runs in a container on the same docker network).

## Deployment

Forgejo CI (`.forgejo/workflows/ci.yml`) tests the backend, frontend, production build, and Playwright e2e flow on every push to `main`.

The Docker workflow (`.forgejo/workflows/docker.yml`) builds and pushes images tagged `latest` and `sha-<commit>` on pushes to `main` or manual dispatch. It publishes to `vars.REGISTRY` (default `ghcr.io`) under the repository name, using `secrets.GITHUB_TOKEN` for registry auth.
