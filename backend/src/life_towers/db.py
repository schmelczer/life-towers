"""SQLite connection factory, WAL/FK pragmas, and migration runner."""

from __future__ import annotations

import os
import sqlite3
import time
from contextlib import contextmanager
from importlib import resources
from pathlib import Path
from typing import Generator

import structlog

logger = structlog.get_logger(__name__)

_DB_PATH: Path | None = None


def get_db_path() -> Path:
    global _DB_PATH
    if _DB_PATH is None:
        _DB_PATH = Path(os.environ.get("LIFE_TOWERS_DB_PATH", "/data/life-towers.db"))
    return _DB_PATH


def _apply_pragmas(conn: sqlite3.Connection) -> None:
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    conn.execute("PRAGMA busy_timeout=5000")


def get_connection() -> sqlite3.Connection:
    """Open a new connection with required pragmas applied."""
    path = get_db_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(path), check_same_thread=False)
    conn.row_factory = sqlite3.Row
    _apply_pragmas(conn)
    return conn


@contextmanager
def db_connection() -> Generator[sqlite3.Connection, None, None]:
    """Context manager yielding a connection that is closed on exit."""
    conn = get_connection()
    try:
        yield conn
    finally:
        conn.close()


def _migration_files() -> list[tuple[str, str]]:
    """Return [(filename, sql)] for every migration, in lexical order.

    Migrations ship as package data under `life_towers/migrations/`, so they
    travel with the wheel and are resolvable regardless of cwd or how the
    package is installed (editable, wheel, or PYTHONPATH).
    """
    pkg_files = resources.files("life_towers").joinpath("migrations")
    out: list[tuple[str, str]] = []
    for entry in sorted(pkg_files.iterdir(), key=lambda p: p.name):
        if entry.name.endswith(".sql"):
            out.append((entry.name, entry.read_text()))
    return out


def run_migrations(conn: sqlite3.Connection) -> None:
    """Apply pending SQL migrations in lexical order."""
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS schema_migrations (
            filename   TEXT PRIMARY KEY,
            applied_at INTEGER NOT NULL
        )
        """
    )
    conn.commit()

    for filename, sql in _migration_files():
        row = conn.execute(
            "SELECT filename FROM schema_migrations WHERE filename = ?",
            (filename,),
        ).fetchone()
        if row is not None:
            continue

        logger.info("applying_migration", filename=filename)
        conn.executescript(sql)
        conn.execute(
            "INSERT INTO schema_migrations (filename, applied_at) VALUES (?, ?)",
            (filename, int(time.time())),
        )
        conn.commit()
        logger.info("migration_applied", filename=filename)
