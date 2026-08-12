PRAGMA foreign_keys = ON;

CREATE TABLE password_credentials (
  user_id TEXT PRIMARY KEY,
  salt_hex TEXT NOT NULL,
  password_hash_hex TEXT NOT NULL,
  iterations INTEGER NOT NULL CHECK(iterations >= 100000),
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE credential_setup_tokens (
  id TEXT PRIMARY KEY,
  token_hash TEXT NOT NULL UNIQUE,
  user_id TEXT NOT NULL,
  organization_id TEXT NOT NULL,
  dba_id TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  used_at TEXT,
  created_by_user_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (organization_id) REFERENCES organizations(id),
  FOREIGN KEY (dba_id, organization_id) REFERENCES dbas(id, organization_id),
  FOREIGN KEY (created_by_user_id) REFERENCES users(id)
);

CREATE INDEX idx_credential_setup_token ON credential_setup_tokens(token_hash, used_at, expires_at);
CREATE INDEX idx_credential_setup_scope ON credential_setup_tokens(user_id, organization_id, dba_id);
