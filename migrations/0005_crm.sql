PRAGMA foreign_keys = ON;

INSERT OR IGNORE INTO role_permissions(role,permission) VALUES
  ('owner','crm.read'),('owner','crm.write'),('owner','crm.export'),('owner','crm.admin'),
  ('admin','crm.read'),('admin','crm.write'),('admin','crm.export'),('admin','crm.admin'),
  ('manager','crm.read'),('manager','crm.write'),('manager','crm.export'),
  ('member','crm.read'),('member','crm.write'),
  ('auditor','crm.read'),('auditor','crm.export'),
  ('viewer','crm.read');

CREATE TABLE IF NOT EXISTS crm_accounts (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  dba_id TEXT NOT NULL,
  name TEXT NOT NULL,
  account_type TEXT NOT NULL DEFAULT 'prospect',
  industry TEXT,
  website TEXT,
  email TEXT,
  phone TEXT,
  address_line1 TEXT,
  address_line2 TEXT,
  city TEXT,
  region TEXT,
  postal_code TEXT,
  country TEXT,
  source TEXT,
  owner_user_id TEXT,
  tags_json TEXT NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'active',
  created_by_user_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (dba_id, organization_id) REFERENCES dbas(id, organization_id) ON DELETE RESTRICT,
  FOREIGN KEY (created_by_user_id) REFERENCES users(id) ON DELETE RESTRICT,
  UNIQUE (id, organization_id, dba_id),
  CHECK (account_type IN ('prospect','customer','partner','vendor','other')),
  CHECK (status IN ('active','inactive','archived'))
);
CREATE INDEX IF NOT EXISTS idx_crm_accounts_scope_name ON crm_accounts(organization_id,dba_id,status,name);
CREATE INDEX IF NOT EXISTS idx_crm_accounts_scope_owner ON crm_accounts(organization_id,dba_id,owner_user_id,status);

CREATE TABLE IF NOT EXISTS crm_contacts (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  dba_id TEXT NOT NULL,
  account_id TEXT,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  display_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  mobile TEXT,
  job_title TEXT,
  contact_role TEXT,
  source TEXT,
  owner_user_id TEXT,
  tags_json TEXT NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'active',
  created_by_user_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (dba_id, organization_id) REFERENCES dbas(id, organization_id) ON DELETE RESTRICT,
  FOREIGN KEY (account_id, organization_id, dba_id) REFERENCES crm_accounts(id, organization_id, dba_id) ON DELETE RESTRICT,
  FOREIGN KEY (created_by_user_id) REFERENCES users(id) ON DELETE RESTRICT,
  UNIQUE (id, organization_id, dba_id),
  CHECK (status IN ('active','inactive','archived'))
);
CREATE INDEX IF NOT EXISTS idx_crm_contacts_scope_name ON crm_contacts(organization_id,dba_id,status,display_name);
CREATE INDEX IF NOT EXISTS idx_crm_contacts_scope_account ON crm_contacts(organization_id,dba_id,account_id,status);
CREATE INDEX IF NOT EXISTS idx_crm_contacts_scope_email ON crm_contacts(organization_id,dba_id,email);

CREATE TABLE IF NOT EXISTS crm_pipeline_stages (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  dba_id TEXT NOT NULL,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  probability INTEGER NOT NULL DEFAULT 0,
  is_closed INTEGER NOT NULL DEFAULT 0,
  is_won INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active',
  created_by_user_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (dba_id, organization_id) REFERENCES dbas(id, organization_id) ON DELETE RESTRICT,
  FOREIGN KEY (created_by_user_id) REFERENCES users(id) ON DELETE RESTRICT,
  UNIQUE (organization_id,dba_id,slug),
  UNIQUE (id, organization_id, dba_id),
  CHECK (probability BETWEEN 0 AND 100),
  CHECK (is_closed IN (0,1)),
  CHECK (is_won IN (0,1)),
  CHECK (status IN ('active','archived'))
);
CREATE INDEX IF NOT EXISTS idx_crm_stages_scope_position ON crm_pipeline_stages(organization_id,dba_id,status,position);

CREATE TABLE IF NOT EXISTS crm_leads (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  dba_id TEXT NOT NULL,
  account_id TEXT,
  contact_id TEXT,
  title TEXT NOT NULL,
  company_name TEXT,
  person_name TEXT,
  email TEXT,
  phone TEXT,
  source TEXT,
  status TEXT NOT NULL DEFAULT 'new',
  score INTEGER NOT NULL DEFAULT 0,
  estimated_value_cents INTEGER NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USD',
  owner_user_id TEXT,
  next_action TEXT,
  next_action_at TEXT,
  notes TEXT,
  converted_opportunity_id TEXT,
  created_by_user_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (dba_id, organization_id) REFERENCES dbas(id, organization_id) ON DELETE RESTRICT,
  FOREIGN KEY (account_id, organization_id, dba_id) REFERENCES crm_accounts(id, organization_id, dba_id) ON DELETE RESTRICT,
  FOREIGN KEY (contact_id, organization_id, dba_id) REFERENCES crm_contacts(id, organization_id, dba_id) ON DELETE RESTRICT,
  FOREIGN KEY (created_by_user_id) REFERENCES users(id) ON DELETE RESTRICT,
  UNIQUE (id, organization_id, dba_id),
  CHECK (status IN ('new','contacted','qualified','unqualified','converted','archived')),
  CHECK (score BETWEEN 0 AND 100),
  CHECK (estimated_value_cents >= 0)
);
CREATE INDEX IF NOT EXISTS idx_crm_leads_scope_status ON crm_leads(organization_id,dba_id,status,updated_at);
CREATE INDEX IF NOT EXISTS idx_crm_leads_scope_owner ON crm_leads(organization_id,dba_id,owner_user_id,status);
CREATE INDEX IF NOT EXISTS idx_crm_leads_scope_next_action ON crm_leads(organization_id,dba_id,next_action_at,status);

CREATE TABLE IF NOT EXISTS crm_opportunities (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  dba_id TEXT NOT NULL,
  account_id TEXT,
  primary_contact_id TEXT,
  lead_id TEXT,
  stage_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  amount_cents INTEGER NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USD',
  probability INTEGER NOT NULL DEFAULT 0,
  expected_close_date TEXT,
  owner_user_id TEXT,
  source TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  loss_reason TEXT,
  last_activity_at TEXT,
  next_activity_at TEXT,
  created_by_user_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (dba_id, organization_id) REFERENCES dbas(id, organization_id) ON DELETE RESTRICT,
  FOREIGN KEY (account_id, organization_id, dba_id) REFERENCES crm_accounts(id, organization_id, dba_id) ON DELETE RESTRICT,
  FOREIGN KEY (primary_contact_id, organization_id, dba_id) REFERENCES crm_contacts(id, organization_id, dba_id) ON DELETE RESTRICT,
  FOREIGN KEY (lead_id, organization_id, dba_id) REFERENCES crm_leads(id, organization_id, dba_id) ON DELETE RESTRICT,
  FOREIGN KEY (stage_id, organization_id, dba_id) REFERENCES crm_pipeline_stages(id, organization_id, dba_id) ON DELETE RESTRICT,
  FOREIGN KEY (created_by_user_id) REFERENCES users(id) ON DELETE RESTRICT,
  UNIQUE (id, organization_id, dba_id),
  CHECK (status IN ('open','won','lost','archived')),
  CHECK (amount_cents >= 0),
  CHECK (probability BETWEEN 0 AND 100)
);
CREATE INDEX IF NOT EXISTS idx_crm_opportunities_scope_stage ON crm_opportunities(organization_id,dba_id,status,stage_id,updated_at);
CREATE INDEX IF NOT EXISTS idx_crm_opportunities_scope_owner ON crm_opportunities(organization_id,dba_id,owner_user_id,status);
CREATE INDEX IF NOT EXISTS idx_crm_opportunities_scope_close ON crm_opportunities(organization_id,dba_id,expected_close_date,status);

CREATE TABLE IF NOT EXISTS crm_activities (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  dba_id TEXT NOT NULL,
  account_id TEXT,
  contact_id TEXT,
  lead_id TEXT,
  opportunity_id TEXT,
  activity_type TEXT NOT NULL,
  subject TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  due_at TEXT,
  completed_at TEXT,
  owner_user_id TEXT,
  created_by_user_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (dba_id, organization_id) REFERENCES dbas(id, organization_id) ON DELETE RESTRICT,
  FOREIGN KEY (account_id, organization_id, dba_id) REFERENCES crm_accounts(id, organization_id, dba_id) ON DELETE RESTRICT,
  FOREIGN KEY (contact_id, organization_id, dba_id) REFERENCES crm_contacts(id, organization_id, dba_id) ON DELETE RESTRICT,
  FOREIGN KEY (lead_id, organization_id, dba_id) REFERENCES crm_leads(id, organization_id, dba_id) ON DELETE RESTRICT,
  FOREIGN KEY (opportunity_id, organization_id, dba_id) REFERENCES crm_opportunities(id, organization_id, dba_id) ON DELETE RESTRICT,
  FOREIGN KEY (created_by_user_id) REFERENCES users(id) ON DELETE RESTRICT,
  UNIQUE (id, organization_id, dba_id),
  CHECK (activity_type IN ('call','email','meeting','task','note','sms','demo','follow_up')),
  CHECK (status IN ('open','completed','cancelled'))
);
CREATE INDEX IF NOT EXISTS idx_crm_activities_scope_due ON crm_activities(organization_id,dba_id,status,due_at);
CREATE INDEX IF NOT EXISTS idx_crm_activities_scope_opportunity ON crm_activities(organization_id,dba_id,opportunity_id,created_at);

CREATE TABLE IF NOT EXISTS crm_quotes (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  dba_id TEXT NOT NULL,
  account_id TEXT,
  contact_id TEXT,
  opportunity_id TEXT,
  quote_number TEXT NOT NULL,
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  currency TEXT NOT NULL DEFAULT 'USD',
  subtotal_cents INTEGER NOT NULL DEFAULT 0,
  discount_cents INTEGER NOT NULL DEFAULT 0,
  tax_cents INTEGER NOT NULL DEFAULT 0,
  total_cents INTEGER NOT NULL DEFAULT 0,
  valid_until TEXT,
  terms TEXT,
  created_by_user_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (dba_id, organization_id) REFERENCES dbas(id, organization_id) ON DELETE RESTRICT,
  FOREIGN KEY (account_id, organization_id, dba_id) REFERENCES crm_accounts(id, organization_id, dba_id) ON DELETE RESTRICT,
  FOREIGN KEY (contact_id, organization_id, dba_id) REFERENCES crm_contacts(id, organization_id, dba_id) ON DELETE RESTRICT,
  FOREIGN KEY (opportunity_id, organization_id, dba_id) REFERENCES crm_opportunities(id, organization_id, dba_id) ON DELETE RESTRICT,
  FOREIGN KEY (created_by_user_id) REFERENCES users(id) ON DELETE RESTRICT,
  UNIQUE (organization_id,dba_id,quote_number),
  UNIQUE (id, organization_id, dba_id),
  CHECK (status IN ('draft','sent','viewed','accepted','rejected','expired','archived')),
  CHECK (subtotal_cents >= 0 AND discount_cents >= 0 AND tax_cents >= 0 AND total_cents >= 0)
);
CREATE INDEX IF NOT EXISTS idx_crm_quotes_scope_status ON crm_quotes(organization_id,dba_id,status,updated_at);

CREATE TABLE IF NOT EXISTS crm_quote_lines (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  dba_id TEXT NOT NULL,
  quote_id TEXT NOT NULL,
  description TEXT NOT NULL,
  quantity REAL NOT NULL DEFAULT 1,
  unit_price_cents INTEGER NOT NULL DEFAULT 0,
  discount_cents INTEGER NOT NULL DEFAULT 0,
  tax_cents INTEGER NOT NULL DEFAULT 0,
  line_total_cents INTEGER NOT NULL DEFAULT 0,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (dba_id, organization_id) REFERENCES dbas(id, organization_id) ON DELETE RESTRICT,
  FOREIGN KEY (quote_id, organization_id, dba_id) REFERENCES crm_quotes(id, organization_id, dba_id) ON DELETE CASCADE,
  UNIQUE (id, organization_id, dba_id),
  CHECK (quantity > 0),
  CHECK (unit_price_cents >= 0 AND discount_cents >= 0 AND tax_cents >= 0 AND line_total_cents >= 0)
);
CREATE INDEX IF NOT EXISTS idx_crm_quote_lines_quote ON crm_quote_lines(organization_id,dba_id,quote_id,position);

CREATE TABLE IF NOT EXISTS crm_communications (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  dba_id TEXT NOT NULL,
  account_id TEXT,
  contact_id TEXT,
  lead_id TEXT,
  opportunity_id TEXT,
  channel TEXT NOT NULL,
  direction TEXT NOT NULL DEFAULT 'outbound',
  subject TEXT,
  body TEXT,
  provider_message_id TEXT,
  delivery_status TEXT NOT NULL DEFAULT 'logged',
  occurred_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by_user_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (dba_id, organization_id) REFERENCES dbas(id, organization_id) ON DELETE RESTRICT,
  FOREIGN KEY (created_by_user_id) REFERENCES users(id) ON DELETE RESTRICT,
  UNIQUE (id, organization_id, dba_id),
  CHECK (channel IN ('email','phone','sms','meeting','chat','other')),
  CHECK (direction IN ('inbound','outbound')),
  CHECK (delivery_status IN ('logged','queued','sent','delivered','failed','received'))
);
CREATE INDEX IF NOT EXISTS idx_crm_communications_scope_time ON crm_communications(organization_id,dba_id,occurred_at);

CREATE TABLE IF NOT EXISTS crm_automation_rules (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  dba_id TEXT NOT NULL,
  name TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  event_type TEXT NOT NULL,
  condition_json TEXT NOT NULL DEFAULT '{}',
  action_json TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  created_by_user_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (dba_id, organization_id) REFERENCES dbas(id, organization_id) ON DELETE RESTRICT,
  FOREIGN KEY (created_by_user_id) REFERENCES users(id) ON DELETE RESTRICT,
  UNIQUE (id, organization_id, dba_id),
  CHECK (entity_type IN ('lead','opportunity','account','contact')),
  CHECK (event_type IN ('created','updated','stage_changed','status_changed')),
  CHECK (status IN ('active','paused','archived'))
);
CREATE INDEX IF NOT EXISTS idx_crm_automation_rules_scope ON crm_automation_rules(organization_id,dba_id,status,entity_type,event_type);

CREATE TABLE IF NOT EXISTS crm_automation_runs (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  dba_id TEXT NOT NULL,
  rule_id TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  result TEXT NOT NULL,
  detail_json TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (dba_id, organization_id) REFERENCES dbas(id, organization_id) ON DELETE RESTRICT,
  FOREIGN KEY (rule_id, organization_id, dba_id) REFERENCES crm_automation_rules(id, organization_id, dba_id) ON DELETE RESTRICT,
  CHECK (result IN ('executed','skipped','failed'))
);
CREATE INDEX IF NOT EXISTS idx_crm_automation_runs_scope ON crm_automation_runs(organization_id,dba_id,created_at);
