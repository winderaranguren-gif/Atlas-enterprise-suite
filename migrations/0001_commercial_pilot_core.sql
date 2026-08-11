PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS atlas_organizations (
  id TEXT PRIMARY KEY,
  legal_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS atlas_dbas (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (organization_id) REFERENCES atlas_organizations(id) ON DELETE CASCADE,
  UNIQUE (organization_id, id)
);
CREATE INDEX IF NOT EXISTS idx_atlas_dbas_org ON atlas_dbas(organization_id, status);

CREATE TABLE IF NOT EXISTS atlas_users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS atlas_roles (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  dba_id TEXT NOT NULL,
  name TEXT NOT NULL,
  permissions TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (organization_id) REFERENCES atlas_organizations(id) ON DELETE CASCADE,
  FOREIGN KEY (dba_id) REFERENCES atlas_dbas(id) ON DELETE CASCADE,
  UNIQUE (organization_id, dba_id, name)
);
CREATE INDEX IF NOT EXISTS idx_atlas_roles_scope ON atlas_roles(organization_id, dba_id, name);

CREATE TABLE IF NOT EXISTS atlas_memberships (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  organization_id TEXT NOT NULL,
  dba_id TEXT NOT NULL,
  role_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES atlas_users(id) ON DELETE CASCADE,
  FOREIGN KEY (organization_id) REFERENCES atlas_organizations(id) ON DELETE CASCADE,
  FOREIGN KEY (dba_id) REFERENCES atlas_dbas(id) ON DELETE CASCADE,
  FOREIGN KEY (role_id) REFERENCES atlas_roles(id) ON DELETE RESTRICT,
  UNIQUE (user_id, organization_id, dba_id)
);
CREATE INDEX IF NOT EXISTS idx_atlas_memberships_scope ON atlas_memberships(organization_id, dba_id, user_id, status);

CREATE TABLE IF NOT EXISTS audit_log (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  dba_id TEXT NOT NULL,
  actor TEXT NOT NULL DEFAULT 'system',
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT NOT NULL,
  payload TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_audit_scope ON audit_log(organization_id, dba_id, created_at);
