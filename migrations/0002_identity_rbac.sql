PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS atlas_users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','suspended')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS atlas_memberships (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  organization_id TEXT NOT NULL,
  dba_id TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('owner','admin','editor','viewer','auditor')),
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','suspended')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(user_id, organization_id, dba_id),
  FOREIGN KEY(user_id) REFERENCES atlas_users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_memberships_scope
  ON atlas_memberships(user_id, organization_id, dba_id, status);

CREATE TABLE IF NOT EXISTS atlas_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  revoked_at TEXT,
  created_at TEXT NOT NULL,
  last_seen_at TEXT NOT NULL,
  FOREIGN KEY(user_id) REFERENCES atlas_users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_sessions_token
  ON atlas_sessions(token_hash, expires_at, revoked_at);

CREATE TABLE IF NOT EXISTS atlas_security_events (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL DEFAULT '',
  organization_id TEXT NOT NULL DEFAULT '',
  dba_id TEXT NOT NULL DEFAULT '',
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT NOT NULL DEFAULT '',
  decision TEXT NOT NULL CHECK(decision IN ('allow','deny')),
  reason TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_security_events_scope
  ON atlas_security_events(organization_id, dba_id, created_at);

CREATE TABLE IF NOT EXISTS atlas_audit_events (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  dba_id TEXT NOT NULL,
  actor_user_id TEXT NOT NULL,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT NOT NULL,
  payload TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_atlas_audit_scope
  ON atlas_audit_events(organization_id, dba_id, created_at);
CREATE INDEX IF NOT EXISTS idx_atlas_audit_actor
  ON atlas_audit_events(actor_user_id, created_at);
