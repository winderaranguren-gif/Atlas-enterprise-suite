PRAGMA foreign_keys = ON;

-- Audit/security evidence is append-only. Application code may insert records,
-- but UPDATE/DELETE is rejected at the database layer for tamper resistance.
CREATE TRIGGER IF NOT EXISTS atlas_audit_events_no_update
BEFORE UPDATE ON atlas_audit_events
BEGIN
  SELECT RAISE(ABORT, 'atlas_audit_events is append-only');
END;

CREATE TRIGGER IF NOT EXISTS atlas_audit_events_no_delete
BEFORE DELETE ON atlas_audit_events
BEGIN
  SELECT RAISE(ABORT, 'atlas_audit_events is append-only');
END;

CREATE TRIGGER IF NOT EXISTS atlas_security_events_no_update
BEFORE UPDATE ON atlas_security_events
BEGIN
  SELECT RAISE(ABORT, 'atlas_security_events is append-only');
END;

CREATE TRIGGER IF NOT EXISTS atlas_security_events_no_delete
BEFORE DELETE ON atlas_security_events
BEGIN
  SELECT RAISE(ABORT, 'atlas_security_events is append-only');
END;
