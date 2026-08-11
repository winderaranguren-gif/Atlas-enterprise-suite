PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS accounting_accounts (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  dba_id TEXT NOT NULL,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  account_type TEXT NOT NULL CHECK(account_type IN ('asset','liability','equity','revenue','expense')),
  normal_balance TEXT NOT NULL CHECK(normal_balance IN ('debit','credit')),
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','inactive')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (organization_id) REFERENCES organizations(id),
  FOREIGN KEY (dba_id) REFERENCES dbas(id),
  UNIQUE (organization_id,dba_id,code)
);

CREATE INDEX IF NOT EXISTS idx_accounting_accounts_scope
ON accounting_accounts(organization_id,dba_id,status,code);

CREATE TABLE IF NOT EXISTS journal_entries (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  dba_id TEXT NOT NULL,
  entry_date TEXT NOT NULL,
  memo TEXT,
  reference TEXT,
  currency TEXT NOT NULL DEFAULT 'USD',
  status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','posted','void')),
  created_by_user_id TEXT NOT NULL,
  posted_by_user_id TEXT,
  posted_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (organization_id) REFERENCES organizations(id),
  FOREIGN KEY (dba_id) REFERENCES dbas(id),
  FOREIGN KEY (created_by_user_id) REFERENCES users(id),
  FOREIGN KEY (posted_by_user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_journal_entries_scope
ON journal_entries(organization_id,dba_id,entry_date,status);

CREATE TABLE IF NOT EXISTS journal_lines (
  id TEXT PRIMARY KEY,
  journal_entry_id TEXT NOT NULL,
  organization_id TEXT NOT NULL,
  dba_id TEXT NOT NULL,
  account_id TEXT NOT NULL,
  description TEXT,
  debit_cents INTEGER NOT NULL DEFAULT 0 CHECK(debit_cents >= 0),
  credit_cents INTEGER NOT NULL DEFAULT 0 CHECK(credit_cents >= 0),
  line_no INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (journal_entry_id) REFERENCES journal_entries(id) ON DELETE CASCADE,
  FOREIGN KEY (account_id) REFERENCES accounting_accounts(id),
  FOREIGN KEY (organization_id) REFERENCES organizations(id),
  FOREIGN KEY (dba_id) REFERENCES dbas(id),
  CHECK((debit_cents > 0 AND credit_cents = 0) OR (credit_cents > 0 AND debit_cents = 0)),
  UNIQUE(journal_entry_id,line_no)
);

CREATE INDEX IF NOT EXISTS idx_journal_lines_entry
ON journal_lines(journal_entry_id,line_no);

CREATE TRIGGER IF NOT EXISTS prevent_posted_journal_update
BEFORE UPDATE ON journal_entries
WHEN OLD.status='posted'
BEGIN
  SELECT RAISE(ABORT,'posted_journal_is_immutable');
END;

CREATE TRIGGER IF NOT EXISTS prevent_posted_journal_delete
BEFORE DELETE ON journal_entries
WHEN OLD.status='posted'
BEGIN
  SELECT RAISE(ABORT,'posted_journal_is_immutable');
END;

CREATE TRIGGER IF NOT EXISTS prevent_posted_line_update
BEFORE UPDATE ON journal_lines
WHEN EXISTS(SELECT 1 FROM journal_entries je WHERE je.id=OLD.journal_entry_id AND je.status='posted')
BEGIN
  SELECT RAISE(ABORT,'posted_journal_lines_are_immutable');
END;

CREATE TRIGGER IF NOT EXISTS prevent_posted_line_delete
BEFORE DELETE ON journal_lines
WHEN EXISTS(SELECT 1 FROM journal_entries je WHERE je.id=OLD.journal_entry_id AND je.status='posted')
BEGIN
  SELECT RAISE(ABORT,'posted_journal_lines_are_immutable');
END;
