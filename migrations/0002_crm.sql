PRAGMA foreign_keys=ON;

CREATE TABLE IF NOT EXISTS crm_contacts (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  dba_id TEXT NOT NULL,
  contact_type TEXT NOT NULL DEFAULT 'customer' CHECK(contact_type IN ('lead','prospect','customer','vendor','partner','other')),
  name TEXT NOT NULL,
  company TEXT,
  email TEXT,
  phone TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','inactive','archived')),
  notes TEXT,
  created_by_user_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(organization_id) REFERENCES organizations(id),
  FOREIGN KEY(dba_id) REFERENCES dbas(id),
  FOREIGN KEY(created_by_user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_crm_contacts_scope_status
  ON crm_contacts(organization_id,dba_id,status,updated_at);
CREATE INDEX IF NOT EXISTS idx_crm_contacts_scope_email
  ON crm_contacts(organization_id,dba_id,email);
