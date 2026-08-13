PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS audit_ledger (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  dba_id TEXT NOT NULL,
  actor_user_id TEXT,
  category TEXT NOT NULL,
  action TEXT NOT NULL,
  resource_type TEXT,
  resource_id TEXT,
  decision TEXT,
  severity TEXT NOT NULL DEFAULT 'info',
  correlation_id TEXT,
  metadata_json TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (actor_user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE RESTRICT,
  FOREIGN KEY (dba_id, organization_id) REFERENCES dbas(id, organization_id) ON DELETE RESTRICT,
  CHECK (category IN ('authorization','security','data','system','business')),
  CHECK (decision IS NULL OR decision IN ('allow','deny')),
  CHECK (severity IN ('info','low','medium','high','critical'))
);

CREATE INDEX IF NOT EXISTS idx_audit_ledger_scope_created
  ON audit_ledger(organization_id,dba_id,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_ledger_resource
  ON audit_ledger(organization_id,dba_id,resource_type,resource_id,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_ledger_correlation
  ON audit_ledger(correlation_id,created_at DESC);

CREATE TRIGGER IF NOT EXISTS prevent_audit_ledger_update
BEFORE UPDATE ON audit_ledger
BEGIN
  SELECT RAISE(ABORT,'audit_ledger_is_immutable');
END;

CREATE TRIGGER IF NOT EXISTS prevent_audit_ledger_delete
BEFORE DELETE ON audit_ledger
BEGIN
  SELECT RAISE(ABORT,'audit_ledger_is_immutable');
END;

CREATE TABLE IF NOT EXISTS security_events (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  dba_id TEXT NOT NULL,
  actor_user_id TEXT,
  event_type TEXT NOT NULL,
  severity TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'atlas',
  resource_type TEXT,
  resource_id TEXT,
  correlation_id TEXT,
  detail_json TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (actor_user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE RESTRICT,
  FOREIGN KEY (dba_id, organization_id) REFERENCES dbas(id, organization_id) ON DELETE RESTRICT,
  CHECK (severity IN ('low','medium','high','critical'))
);

CREATE INDEX IF NOT EXISTS idx_security_events_scope_created
  ON security_events(organization_id,dba_id,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_events_scope_severity
  ON security_events(organization_id,dba_id,severity,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_events_correlation
  ON security_events(correlation_id,created_at DESC);

CREATE TRIGGER IF NOT EXISTS prevent_security_events_update
BEFORE UPDATE ON security_events
BEGIN
  SELECT RAISE(ABORT,'security_events_are_immutable');
END;

CREATE TRIGGER IF NOT EXISTS prevent_security_events_delete
BEFORE DELETE ON security_events
BEGIN
  SELECT RAISE(ABORT,'security_events_are_immutable');
END;
