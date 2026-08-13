PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS organizations (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'active',
  created_by_user_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by_user_id) REFERENCES users(id) ON DELETE RESTRICT,
  CHECK (status IN ('active','suspended','archived'))
);

CREATE TABLE IF NOT EXISTS dbas (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  created_by_user_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE RESTRICT,
  FOREIGN KEY (created_by_user_id) REFERENCES users(id) ON DELETE RESTRICT,
  UNIQUE (organization_id, slug),
  CHECK (status IN ('active','suspended','archived'))
);

CREATE TABLE IF NOT EXISTS memberships (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  organization_id TEXT NOT NULL,
  dba_id TEXT NOT NULL,
  role TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  created_by_user_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE RESTRICT,
  FOREIGN KEY (dba_id) REFERENCES dbas(id) ON DELETE RESTRICT,
  FOREIGN KEY (created_by_user_id) REFERENCES users(id) ON DELETE RESTRICT,
  UNIQUE (user_id, organization_id, dba_id),
  CHECK (role IN ('owner','admin','manager','member','auditor','viewer')),
  CHECK (status IN ('active','suspended','revoked'))
);

CREATE INDEX IF NOT EXISTS idx_memberships_user_scope
  ON memberships(user_id, organization_id, dba_id, status);
CREATE INDEX IF NOT EXISTS idx_memberships_scope_role
  ON memberships(organization_id, dba_id, role, status);

CREATE TABLE IF NOT EXISTS role_permissions (
  role TEXT NOT NULL,
  permission TEXT NOT NULL,
  PRIMARY KEY (role, permission),
  CHECK (role IN ('owner','admin','manager','member','auditor','viewer'))
);

INSERT OR IGNORE INTO role_permissions(role,permission) VALUES
  ('owner','organization.manage'),
  ('owner','dba.manage'),
  ('owner','membership.manage'),
  ('owner','audit.read'),
  ('owner','module.read'),
  ('owner','module.write'),
  ('admin','dba.manage'),
  ('admin','membership.manage'),
  ('admin','audit.read'),
  ('admin','module.read'),
  ('admin','module.write'),
  ('manager','module.read'),
  ('manager','module.write'),
  ('member','module.read'),
  ('member','module.write'),
  ('auditor','audit.read'),
  ('auditor','module.read'),
  ('viewer','module.read');

CREATE TABLE IF NOT EXISTS authorization_audit_events (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  organization_id TEXT,
  dba_id TEXT,
  action TEXT NOT NULL,
  permission TEXT,
  decision TEXT NOT NULL,
  metadata_json TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE SET NULL,
  FOREIGN KEY (dba_id) REFERENCES dbas(id) ON DELETE SET NULL,
  CHECK (decision IN ('allow','deny'))
);

CREATE INDEX IF NOT EXISTS idx_authorization_audit_scope_created
  ON authorization_audit_events(organization_id,dba_id,created_at);
