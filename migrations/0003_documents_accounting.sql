PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS atlas_documents (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  dba_id TEXT NOT NULL,
  title TEXT NOT NULL,
  mime_type TEXT NOT NULL DEFAULT 'text/plain',
  status TEXT NOT NULL DEFAULT 'active',
  current_version INTEGER NOT NULL DEFAULT 1,
  current_hash TEXT NOT NULL,
  size_bytes INTEGER NOT NULL DEFAULT 0,
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
  version INTEGER NOT NULL,
  content_text TEXT NOT NULL DEFAULT '',
  content_hash TEXT NOT NULL,
  size_bytes INTEGER NOT NULL DEFAULT 0,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE(document_id,version),
  FOREIGN KEY(document_id) REFERENCES atlas_documents(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_document_versions_scope
  ON atlas_document_versions(organization_id,dba_id,document_id,version);

CREATE TABLE IF NOT EXISTS accounting_accounts (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  dba_id TEXT NOT NULL,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  account_type TEXT NOT NULL CHECK(account_type IN ('asset','liability','equity','revenue','expense')),
  normal_balance TEXT NOT NULL CHECK(normal_balance IN ('debit','credit')),
  status TEXT NOT NULL DEFAULT 'active',
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(organization_id,dba_id,code)
);
CREATE INDEX IF NOT EXISTS idx_accounting_accounts_scope
  ON accounting_accounts(organization_id,dba_id,status,code);

CREATE TABLE IF NOT EXISTS accounting_journal_entries (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  dba_id TEXT NOT NULL,
  entry_number TEXT NOT NULL,
  entry_date TEXT NOT NULL,
  memo TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL CHECK(status IN ('draft','posted','void')) DEFAULT 'posted',
  total_debits REAL NOT NULL DEFAULT 0 CHECK(total_debits >= 0),
  total_credits REAL NOT NULL DEFAULT 0 CHECK(total_credits >= 0),
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL,
  posted_at TEXT,
  UNIQUE(organization_id,dba_id,entry_number)
);
CREATE INDEX IF NOT EXISTS idx_journal_entries_scope
  ON accounting_journal_entries(organization_id,dba_id,entry_date,created_at);

CREATE TABLE IF NOT EXISTS accounting_journal_lines (
  id TEXT PRIMARY KEY,
  entry_id TEXT NOT NULL,
  organization_id TEXT NOT NULL,
  dba_id TEXT NOT NULL,
  account_id TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  debit REAL NOT NULL DEFAULT 0 CHECK(debit >= 0),
  credit REAL NOT NULL DEFAULT 0 CHECK(credit >= 0),
  created_at TEXT NOT NULL,
  CHECK((debit > 0 AND credit = 0) OR (credit > 0 AND debit = 0)),
  FOREIGN KEY(entry_id) REFERENCES accounting_journal_entries(id) ON DELETE RESTRICT,
  FOREIGN KEY(account_id) REFERENCES accounting_accounts(id) ON DELETE RESTRICT
);
CREATE INDEX IF NOT EXISTS idx_journal_lines_entry
  ON accounting_journal_lines(organization_id,dba_id,entry_id);
CREATE INDEX IF NOT EXISTS idx_journal_lines_account
  ON accounting_journal_lines(organization_id,dba_id,account_id,created_at);
