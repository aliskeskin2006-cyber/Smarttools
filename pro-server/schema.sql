CREATE TABLE IF NOT EXISTS memberships (
 order_id TEXT PRIMARY KEY,
 code_hash TEXT NOT NULL UNIQUE,
 expires_at TEXT NOT NULL,
 revoked INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_membership_code ON memberships(code_hash);