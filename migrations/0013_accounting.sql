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
  currency TEXT NOT NULL DEFAULT 'USD' CHECK(length(currency)=3),
  status TEXT NOT NULL DEFAULT 'posted' CHECK(status IN ('posted','void')),
  total_debit_cents INTEGER NOT NULL CHECK(total_debit_cents >= 0),
  total_credit_cents INTEGER NOT NULL CHECK(total_credit_cents >= 0),
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL,
  posted_at TEXT NOT NULL,
  UNIQUE(organization_id,dba_id,entry_number),
  CHECK(total_debit_cents = total_credit_cents),
  CHECK(total_debit_cents > 0)
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
  debit_cents INTEGER NOT NULL DEFAULT 0 CHECK(debit_cents >= 0),
  credit_cents INTEGER NOT NULL DEFAULT 0 CHECK(credit_cents >= 0),
  created_at TEXT NOT NULL,
  CHECK((debit_cents > 0 AND credit_cents = 0) OR (credit_cents > 0 AND debit_cents = 0)),
  FOREIGN KEY(entry_id) REFERENCES accounting_journal_entries(id) ON DELETE RESTRICT,
  FOREIGN KEY(account_id) REFERENCES accounting_accounts(id) ON DELETE RESTRICT
);
CREATE INDEX IF NOT EXISTS idx_journal_lines_entry
  ON accounting_journal_lines(organization_id,dba_id,entry_id);
CREATE INDEX IF NOT EXISTS idx_journal_lines_account
  ON accounting_journal_lines(organization_id,dba_id,account_id,created_at);
