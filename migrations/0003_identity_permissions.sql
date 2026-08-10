CREATE TABLE IF NOT EXISTS atlas_invites (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  organization_id TEXT NOT NULL,
  dba_id TEXT NOT NULL,
  role TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  consumed_at TEXT,
  revoked_at TEXT,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY(user_id) REFERENCES atlas_users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_invites_scope
  ON atlas_invites(organization_id,dba_id,expires_at,consumed_at,revoked_at);
CREATE INDEX IF NOT EXISTS idx_invites_token
  ON atlas_invites(token_hash,expires_at,consumed_at,revoked_at);
