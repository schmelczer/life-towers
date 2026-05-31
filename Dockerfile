# Stage 1: SPA build
FROM node:22-alpine AS spa-build
WORKDIR /build
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build
# Angular's application builder outputs to dist/frontend/browser/

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
