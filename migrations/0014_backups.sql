PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS atlas_backup_manifests (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  dba_id TEXT NOT NULL,
  object_key TEXT NOT NULL UNIQUE,
  sha256 TEXT NOT NULL,
  byte_length INTEGER NOT NULL CHECK(byte_length > 0),
  record_count INTEGER NOT NULL CHECK(record_count >= 0),
  schema_version TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'complete' CHECK(status IN ('complete','verified','restore-tested','failed')),
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL,
  verified_at TEXT,
  restore_tested_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_backup_manifests_scope
  ON atlas_backup_manifests(organization_id,dba_id,created_at);
