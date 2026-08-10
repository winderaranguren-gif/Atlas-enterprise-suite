CREATE TABLE IF NOT EXISTS atlas_security_events (
  id TEXT PRIMARY KEY,
  user_id TEXT DEFAULT '',
  organization_id TEXT DEFAULT '',
  dba_id TEXT DEFAULT '',
  action TEXT NOT NULL,
  path TEXT NOT NULL,
  decision TEXT NOT NULL,
  reason TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_security_events_scope
  ON atlas_security_events(organization_id, dba_id, created_at);

CREATE INDEX IF NOT EXISTS idx_security_events_user
  ON atlas_security_events(user_id, created_at);
