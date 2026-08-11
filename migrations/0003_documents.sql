PRAGMA foreign_keys=ON;

CREATE TABLE IF NOT EXISTS documents (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  dba_id TEXT NOT NULL,
  filename TEXT NOT NULL,
  content_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','archived')),
  current_version INTEGER NOT NULL DEFAULT 1 CHECK(current_version>=1),
  created_by_user_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(organization_id) REFERENCES organizations(id),
  FOREIGN KEY(dba_id) REFERENCES dbas(id),
  FOREIGN KEY(created_by_user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS document_versions (
  id TEXT PRIMARY KEY,
  document_id TEXT NOT NULL,
  organization_id TEXT NOT NULL,
  dba_id TEXT NOT NULL,
  version INTEGER NOT NULL CHECK(version>=1),
  object_key TEXT NOT NULL UNIQUE,
  sha256 TEXT NOT NULL,
  size_bytes INTEGER NOT NULL CHECK(size_bytes>=0),
  content_type TEXT NOT NULL,
  created_by_user_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(document_id) REFERENCES documents(id),
  FOREIGN KEY(organization_id) REFERENCES organizations(id),
  FOREIGN KEY(dba_id) REFERENCES dbas(id),
  FOREIGN KEY(created_by_user_id) REFERENCES users(id),
  UNIQUE(document_id,version)
);

CREATE INDEX IF NOT EXISTS idx_documents_scope_status
  ON documents(organization_id,dba_id,status,updated_at);
CREATE INDEX IF NOT EXISTS idx_document_versions_scope_document
  ON document_versions(organization_id,dba_id,document_id,version);
