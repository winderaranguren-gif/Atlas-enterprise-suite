-- ATLAS CRM persistent schema. Each record is scoped to legal organization + DBA.
CREATE TABLE IF NOT EXISTS crm_accounts (id TEXT PRIMARY KEY, organization_id TEXT NOT NULL, dba_id TEXT NOT NULL, name TEXT NOT NULL DEFAULT '', email TEXT DEFAULT '', status TEXT DEFAULT 'active', stage TEXT DEFAULT 'new', owner TEXT DEFAULT '', amount REAL, payload TEXT DEFAULT '{}', created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS crm_contacts AS SELECT * FROM crm_accounts WHERE 0;
CREATE TABLE IF NOT EXISTS crm_leads AS SELECT * FROM crm_accounts WHERE 0;
CREATE TABLE IF NOT EXISTS crm_opportunities AS SELECT * FROM crm_accounts WHERE 0;
CREATE TABLE IF NOT EXISTS crm_tasks AS SELECT * FROM crm_accounts WHERE 0;
CREATE TABLE IF NOT EXISTS crm_activity AS SELECT * FROM crm_accounts WHERE 0;
CREATE TABLE IF NOT EXISTS audit_log (id TEXT PRIMARY KEY, organization_id TEXT NOT NULL, dba_id TEXT NOT NULL, action TEXT NOT NULL, resource_type TEXT NOT NULL, resource_id TEXT NOT NULL, payload TEXT DEFAULT '{}', created_at TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS idx_crm_accounts_scope ON crm_accounts(organization_id,dba_id,updated_at);
CREATE INDEX IF NOT EXISTS idx_crm_contacts_scope ON crm_contacts(organization_id,dba_id,updated_at);
CREATE INDEX IF NOT EXISTS idx_crm_leads_scope ON crm_leads(organization_id,dba_id,updated_at);
CREATE INDEX IF NOT EXISTS idx_crm_opportunities_scope ON crm_opportunities(organization_id,dba_id,updated_at);
CREATE INDEX IF NOT EXISTS idx_crm_tasks_scope ON crm_tasks(organization_id,dba_id,updated_at);
CREATE INDEX IF NOT EXISTS idx_crm_activity_scope ON crm_activity(organization_id,dba_id,updated_at);
CREATE INDEX IF NOT EXISTS idx_audit_scope ON audit_log(organization_id,dba_id,created_at);