-- Per-user revision counter for multi-client sync.
-- Bumped inside the same transaction as every PUT /data so clients can:
--   * detect another client's write (cheap compare, no full-tree diff), and
--   * guard their own writes with compare-and-swap (stale If-Match -> 409).
-- Existing users start at 0; their next confirmed GET seeds the client base.

ALTER TABLE users ADD COLUMN revision INTEGER NOT NULL DEFAULT 0;
