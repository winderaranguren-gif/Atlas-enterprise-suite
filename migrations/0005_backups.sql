CREATE TABLE backup_snapshots (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  dba_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'complete' CHECK(status IN ('complete','verified','failed')),
  manifest_key TEXT NOT NULL UNIQUE,
  manifest_sha256 TEXT NOT NULL,
  document_object_count INTEGER NOT NULL DEFAULT 0,
  row_count INTEGER NOT NULL DEFAULT 0,
  created_by_user_id TEXT NOT NULL,
  verified_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (organization_id) REFERENCES organizations(id),
  FOREIGN KEY (dba_id, organization_id) REFERENCES dbas(id, organization_id),
  FOREIGN KEY (created_by_user_id) REFERENCES users(id)
);

CREATE INDEX idx_backup_snapshots_scope ON backup_snapshots(organization_id,dba_id,created_at);
