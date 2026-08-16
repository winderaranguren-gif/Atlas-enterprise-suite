PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS capability_state (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  dba_id TEXT NOT NULL,
  capability_slug TEXT NOT NULL,
  subject_key TEXT NOT NULL,
  record_key TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  created_by_user_id TEXT NOT NULL,
  updated_by_user_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE RESTRICT,
  FOREIGN KEY (dba_id, organization_id) REFERENCES dbas(id, organization_id) ON DELETE RESTRICT,
  FOREIGN KEY (created_by_user_id) REFERENCES users(id) ON DELETE RESTRICT,
  FOREIGN KEY (updated_by_user_id) REFERENCES users(id) ON DELETE RESTRICT,
  UNIQUE (organization_id, dba_id, capability_slug, subject_key, record_key),
  CHECK (length(capability_slug) BETWEEN 2 AND 64),
  CHECK (length(subject_key) BETWEEN 1 AND 160),
  CHECK (length(record_key) BETWEEN 1 AND 120),
  CHECK (length(payload_json) <= 65536)
);

CREATE INDEX IF NOT EXISTS idx_capability_state_scope
  ON capability_state(organization_id, dba_id, capability_slug, subject_key, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_capability_state_user
  ON capability_state(updated_by_user_id, updated_at DESC);
