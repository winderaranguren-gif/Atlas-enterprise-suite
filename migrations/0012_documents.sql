PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS atlas_documents (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  dba_id TEXT NOT NULL,
  title TEXT NOT NULL,
  mime_type TEXT NOT NULL DEFAULT 'text/plain',
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','archived')),
  current_version INTEGER NOT NULL DEFAULT 1 CHECK(current_version >= 1),
  current_hash TEXT NOT NULL,
  size_bytes INTEGER NOT NULL DEFAULT 0 CHECK(size_bytes >= 0),
  metadata TEXT NOT NULL DEFAULT '{}',
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_documents_scope
  ON atlas_documents(organization_id,dba_id,status,updated_at);

CREATE TABLE IF NOT EXISTS atlas_document_versions (
  id TEXT PRIMARY KEY,
  document_id TEXT NOT NULL,
  organization_id TEXT NOT NULL,
  dba_id TEXT NOT NULL,
  version INTEGER NOT NULL CHECK(version >= 1),
  content_text TEXT NOT NULL DEFAULT '',
  content_hash TEXT NOT NULL,
  size_bytes INTEGER NOT NULL DEFAULT 0 CHECK(size_bytes >= 0),
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE(document_id,version),
  FOREIGN KEY(document_id) REFERENCES atlas_documents(id) ON DELETE RESTRICT
);
CREATE INDEX IF NOT EXISTS idx_document_versions_scope
  ON atlas_document_versions(organization_id,dba_id,document_id,version);
