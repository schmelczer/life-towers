# Stage 1: SPA build
FROM node:22-alpine AS spa-build
WORKDIR /build
# Sub-path the SPA is served under, e.g. "/towers/" for https://schmelczer.dev/towers/.
# Defaults to "/" so local/dev/e2e builds (served at the container root) work
# unchanged. The production image (see .forgejo/workflows/docker.yml) overrides
# this. The trailing slash matters — it becomes <base href> and the service
# worker (ngsw.json) URL prefix.
ARG BASE_HREF=/
# Toggle the built-in PWA service worker. Defaults to "enabled" so prod images
# ship the full offline-capable PWA unchanged. The dev / e2e compose overrides
# this to "disabled" (see docker-compose.dev.yml): it swaps Angular's real
# ngsw-worker.js for a self-unregistering safety worker and drops ngsw.json, so
# a `--build` rebuild is never shadowed by a stale, client-cached app shell on
# the fixed localhost origin. (Docker layer caching already busts the SPA build
# on FE source changes; this handles the browser-side service-worker cache.)
ARG SERVICE_WORKER=enabled
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
# Angular's application builder outputs to dist/frontend/browser/
RUN npm run build -- --base-href="$BASE_HREF" \
    && if [ "$SERVICE_WORKER" = "disabled" ]; then \
         echo "Neutralising service worker for dev/e2e image"; \
         rm -f dist/frontend/browser/ngsw.json; \
         cp safety-worker.js dist/frontend/browser/ngsw-worker.js; \
       fi

# Stage 2: runtime
FROM python:3.13-slim

# Runtime essentials:
#   curl     — used by HEALTHCHECK
#   sqlite3  — used for `docker compose exec ... sqlite3` backups
#   uv       — Python dependency installer
RUN apt-get update \
    && apt-get install -y --no-install-recommends curl ca-certificates sqlite3 \
    && rm -rf /var/lib/apt/lists/* \
    && pip install --no-cache-dir uv

# Create non-root user with a real shell so `docker exec ... sh` works for ops.
RUN useradd -r -u 1000 -m -s /bin/sh appuser

WORKDIR /app

# Install backend deps WITHOUT building the project (source not copied yet).
# The package itself is resolvable via PYTHONPATH=/app/src below; this avoids
# busting the dep-layer cache on every source change.
COPY backend/pyproject.toml backend/uv.lock ./
RUN uv sync --frozen --no-dev --no-install-project

# Backend source (migrations now ship as package data under src/life_towers/)
COPY backend/src/ ./src/

# SPA static files
COPY --from=spa-build /build/dist/frontend/browser/ /app/static/

# Persistent data directory + recursive ownership for everything appuser
# might read or write at runtime.
RUN mkdir -p /data && chown -R appuser:appuser /data /app

USER appuser

ENV LIFE_TOWERS_DB_PATH=/data/life-towers.db \
    LIFE_TOWERS_STATIC_DIR=/app/static \
    LIFE_TOWERS_FORWARDED_ALLOW_IPS=* \
    PYTHONUNBUFFERED=1 \
    PYTHONPATH=/app/src \
    PATH=/app/.venv/bin:$PATH

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
    CMD curl -fsS http://localhost:8000/api/v1/health || exit 1

CMD ["sh", "-c", "uvicorn life_towers.main:app --host 0.0.0.0 --port 8000 --proxy-headers --forwarded-allow-ips=${LIFE_TOWERS_FORWARDED_ALLOW_IPS}"]
