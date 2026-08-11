PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS atlas_password_credentials (
  user_id TEXT PRIMARY KEY,
  algorithm TEXT NOT NULL DEFAULT 'PBKDF2-SHA256',
  iterations INTEGER NOT NULL CHECK(iterations >= 210000),
  salt_hex TEXT NOT NULL,
  password_hash_hex TEXT NOT NULL,
  must_change INTEGER NOT NULL DEFAULT 0 CHECK(must_change IN (0,1)),
  failed_attempts INTEGER NOT NULL DEFAULT 0,
  locked_until TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY(user_id) REFERENCES atlas_users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS atlas_activation_tokens (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  organization_id TEXT NOT NULL,
  dba_id TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  consumed_at TEXT,
  created_by_user_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY(user_id) REFERENCES atlas_users(id) ON DELETE CASCADE,
  FOREIGN KEY(created_by_user_id) REFERENCES atlas_users(id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_activation_tokens_lookup
  ON atlas_activation_tokens(token_hash, expires_at, consumed_at);
CREATE INDEX IF NOT EXISTS idx_activation_tokens_scope
  ON atlas_activation_tokens(organization_id, dba_id, user_id, created_at);
