PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS company_work_items (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  dba_id TEXT NOT NULL,
  company_key TEXT NOT NULL,
  workflow_type TEXT NOT NULL,
  external_ref TEXT,
  title TEXT NOT NULL,
  party_name TEXT,
  amount_cents INTEGER,
  currency TEXT NOT NULL DEFAULT 'USD',
  stage TEXT NOT NULL,
  stage_index INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'open',
  priority TEXT NOT NULL DEFAULT 'normal',
  owner_user_id TEXT,
  due_date TEXT,
  metadata_json TEXT,
  created_by_user_id TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK (status IN ('open','in_progress','blocked','completed','cancelled')),
  CHECK (priority IN ('low','normal','high','urgent')),
  CHECK (amount_cents IS NULL OR amount_cents >= 0)
);

CREATE INDEX IF NOT EXISTS idx_company_work_items_scope
  ON company_work_items(organization_id,dba_id,company_key,workflow_type,status,stage_index,updated_at DESC);

CREATE TABLE IF NOT EXISTS company_work_item_events (
  id TEXT PRIMARY KEY,
  work_item_id TEXT NOT NULL,
  organization_id TEXT NOT NULL,
  dba_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  from_stage TEXT,
  to_stage TEXT,
  note TEXT,
  actor_user_id TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(work_item_id) REFERENCES company_work_items(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_company_work_item_events_item
  ON company_work_item_events(work_item_id,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_company_work_item_events_scope
  ON company_work_item_events(organization_id,dba_id,created_at DESC);
