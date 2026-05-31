-- Life Towers v4 initial schema.
-- WAL mode, foreign keys, and busy_timeout are applied per-connection in
-- db._apply_pragmas(), so they are not (and need not be) set here.
-- All timestamps are unix epoch seconds (INTEGER).

CREATE TABLE IF NOT EXISTS users (
    id            TEXT PRIMARY KEY,
    created_at    INTEGER NOT NULL,
    last_seen_at  INTEGER NOT NULL
) STRICT;

CREATE TABLE IF NOT EXISTS pages (
    id                          TEXT PRIMARY KEY,
    user_id                     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    position                    INTEGER NOT NULL,
    name                        TEXT NOT NULL,
    hide_create_tower_button    INTEGER NOT NULL DEFAULT 0 CHECK (hide_create_tower_button IN (0, 1)),
    keep_tasks_open             INTEGER NOT NULL DEFAULT 0 CHECK (keep_tasks_open IN (0, 1)),
    default_date_from           INTEGER,
    default_date_to             INTEGER,
    created_at                  INTEGER NOT NULL,
    updated_at                  INTEGER NOT NULL
) STRICT;
CREATE INDEX IF NOT EXISTS idx_pages_user_position ON pages(user_id, position);

CREATE TABLE IF NOT EXISTS towers (
    id            TEXT PRIMARY KEY,
    page_id       TEXT NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
    user_id       TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    position      INTEGER NOT NULL,
    name          TEXT NOT NULL,
    base_color_h  REAL NOT NULL CHECK (base_color_h BETWEEN 0 AND 1),
    base_color_s  REAL NOT NULL CHECK (base_color_s BETWEEN 0 AND 1),
    base_color_l  REAL NOT NULL CHECK (base_color_l BETWEEN 0 AND 1),
    created_at    INTEGER NOT NULL,
    updated_at    INTEGER NOT NULL
) STRICT;
CREATE INDEX IF NOT EXISTS idx_towers_page_position ON towers(page_id, position);
CREATE INDEX IF NOT EXISTS idx_towers_user ON towers(user_id);

CREATE TABLE IF NOT EXISTS blocks (
    id            TEXT PRIMARY KEY,
    tower_id      TEXT NOT NULL REFERENCES towers(id) ON DELETE CASCADE,
    user_id       TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    position      INTEGER NOT NULL,
    tag           TEXT NOT NULL DEFAULT '',
    description   TEXT NOT NULL DEFAULT '',
    is_done       INTEGER NOT NULL DEFAULT 0 CHECK (is_done IN (0, 1)),
    difficulty    INTEGER NOT NULL DEFAULT 1 CHECK (difficulty >= 1),
    created_at    INTEGER NOT NULL,
    updated_at    INTEGER NOT NULL
) STRICT;
CREATE INDEX IF NOT EXISTS idx_blocks_tower_position ON blocks(tower_id, position);
CREATE INDEX IF NOT EXISTS idx_blocks_user ON blocks(user_id);
