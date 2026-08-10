PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS atlas_users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  display_name TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS atlas_memberships (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  organization_id TEXT NOT NULL,
  dba_id TEXT NOT NULL,
  role TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(user_id, organization_id, dba_id),
  FOREIGN KEY(user_id) REFERENCES atlas_users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_membership_user_scope
  ON atlas_memberships(user_id, organization_id, dba_id, status);

CREATE TABLE IF NOT EXISTS atlas_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  revoked_at TEXT,
  created_at TEXT NOT NULL,
  last_seen_at TEXT NOT NULL,
  FOREIGN KEY(user_id) REFERENCES atlas_users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_sessions_token
  ON atlas_sessions(token_hash, expires_at, revoked_at);

CREATE TABLE IF NOT EXISTS crm_accounts (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  dba_id TEXT NOT NULL,
  name TEXT NOT NULL DEFAULT '',
  email TEXT DEFAULT '',
  status TEXT DEFAULT 'active',
  stage TEXT DEFAULT 'new',
  owner TEXT DEFAULT '',
  amount REAL,
  payload TEXT DEFAULT '{}',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_crm_accounts_scope ON crm_accounts(organization_id, dba_id, updated_at);

CREATE TABLE IF NOT EXISTS crm_contacts (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  dba_id TEXT NOT NULL,
  name TEXT NOT NULL DEFAULT '',
  email TEXT DEFAULT '',
  status TEXT DEFAULT 'active',
  stage TEXT DEFAULT 'new',
  owner TEXT DEFAULT '',
  amount REAL,
  payload TEXT DEFAULT '{}',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_crm_contacts_scope ON crm_contacts(organization_id, dba_id, updated_at);

CREATE TABLE IF NOT EXISTS crm_leads (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  dba_id TEXT NOT NULL,
  name TEXT NOT NULL DEFAULT '',
  email TEXT DEFAULT '',
  status TEXT DEFAULT 'active',
  stage TEXT DEFAULT 'new',
  owner TEXT DEFAULT '',
  amount REAL,
  payload TEXT DEFAULT '{}',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_crm_leads_scope ON crm_leads(organization_id, dba_id, updated_at);

CREATE TABLE IF NOT EXISTS crm_opportunities (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  dba_id TEXT NOT NULL,
  name TEXT NOT NULL DEFAULT '',
  email TEXT DEFAULT '',
  status TEXT DEFAULT 'active',
  stage TEXT DEFAULT 'new',
  owner TEXT DEFAULT '',
  amount REAL,
  payload TEXT DEFAULT '{}',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_crm_opportunities_scope ON crm_opportunities(organization_id, dba_id, updated_at);

CREATE TABLE IF NOT EXISTS crm_tasks (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  dba_id TEXT NOT NULL,
  name TEXT NOT NULL DEFAULT '',
  email TEXT DEFAULT '',
  status TEXT DEFAULT 'active',
  stage TEXT DEFAULT 'new',
  owner TEXT DEFAULT '',
  amount REAL,
  payload TEXT DEFAULT '{}',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_crm_tasks_scope ON crm_tasks(organization_id, dba_id, updated_at);

CREATE TABLE IF NOT EXISTS crm_activity (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  dba_id TEXT NOT NULL,
  name TEXT NOT NULL DEFAULT '',
  email TEXT DEFAULT '',
  status TEXT DEFAULT 'active',
  stage TEXT DEFAULT 'new',
  owner TEXT DEFAULT '',
  amount REAL,
  payload TEXT DEFAULT '{}',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_crm_activity_scope ON crm_activity(organization_id, dba_id, updated_at);

CREATE TABLE IF NOT EXISTS audit_log (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  dba_id TEXT NOT NULL,
  actor_user_id TEXT DEFAULT '',
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT NOT NULL,
  payload TEXT DEFAULT '{}',
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_audit_scope ON audit_log(organization_id, dba_id, created_at);
CREATE INDEX IF NOT EXISTS idx_audit_actor ON audit_log(actor_user_id, created_at);

CREATE TABLE IF NOT EXISTS atlas_system_health (
  component TEXT PRIMARY KEY,
  status TEXT NOT NULL,
  details TEXT DEFAULT '{}',
  checked_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS atlas_repair_log (
  id TEXT PRIMARY KEY,
  component TEXT NOT NULL,
  action TEXT NOT NULL,
  result TEXT NOT NULL,
  details TEXT DEFAULT '{}',
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_repair_created ON atlas_repair_log(created_at);
