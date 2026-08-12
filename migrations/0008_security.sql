PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS security_incidents (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  dba_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'other',
  severity TEXT NOT NULL DEFAULT 'medium',
  status TEXT NOT NULL DEFAULT 'open',
  source TEXT,
  location_label TEXT,
  assigned_user_id TEXT,
  created_by_user_id TEXT NOT NULL,
  resolved_by_user_id TEXT,
  resolved_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK (category IN ('cyber','physical','safety','access','fraud','privacy','availability','other')),
  CHECK (severity IN ('low','medium','high','critical')),
  CHECK (status IN ('open','acknowledged','contained','resolved'))
);

CREATE INDEX IF NOT EXISTS idx_security_incidents_scope_status
  ON security_incidents(organization_id,dba_id,status,created_at);

CREATE INDEX IF NOT EXISTS idx_security_incidents_scope_severity
  ON security_incidents(organization_id,dba_id,severity,created_at);

CREATE TABLE IF NOT EXISTS security_incident_events (
  id TEXT PRIMARY KEY,
  incident_id TEXT NOT NULL,
  organization_id TEXT NOT NULL,
  dba_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  from_status TEXT,
  to_status TEXT,
  note TEXT,
  actor_user_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (incident_id) REFERENCES security_incidents(id) ON DELETE RESTRICT,
  CHECK (from_status IS NULL OR from_status IN ('open','acknowledged','contained','resolved')),
  CHECK (to_status IS NULL OR to_status IN ('open','acknowledged','contained','resolved'))
);

CREATE INDEX IF NOT EXISTS idx_security_incident_events_scope_incident
  ON security_incident_events(organization_id,dba_id,incident_id,created_at);

CREATE TRIGGER IF NOT EXISTS prevent_security_incident_delete
BEFORE DELETE ON security_incidents
BEGIN
  SELECT RAISE(ABORT,'security_incidents_are_retained_for_audit');
END;

CREATE TRIGGER IF NOT EXISTS prevent_security_event_update
BEFORE UPDATE ON security_incident_events
BEGIN
  SELECT RAISE(ABORT,'security_incident_events_are_immutable');
END;

CREATE TRIGGER IF NOT EXISTS prevent_security_event_delete
BEFORE DELETE ON security_incident_events
BEGIN
  SELECT RAISE(ABORT,'security_incident_events_are_immutable');
END;
