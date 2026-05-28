ALTER TABLE pages ADD COLUMN keep_tasks_open INTEGER NOT NULL DEFAULT 0
    CHECK (keep_tasks_open IN (0, 1));
