let schemaReady = false;
let schemaPromise = null;

const statements = [
  `CREATE TABLE IF NOT EXISTS finance_accounts (
    id TEXT PRIMARY KEY,
    organization_id TEXT NOT NULL,
    dba_id TEXT NOT NULL,
    code TEXT NOT NULL,
    name TEXT NOT NULL,
    account_type TEXT NOT NULL,
    normal_balance TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'active',
    created_by_user_id TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(organization_id,dba_id,code),
    CHECK (account_type IN ('asset','liability','equity','revenue','expense')),
    CHECK (normal_balance IN ('debit','credit')),
    CHECK (status IN ('active','inactive'))
  )`,
  `CREATE INDEX IF NOT EXISTS idx_finance_accounts_scope ON finance_accounts(organization_id,dba_id,status,code)`,
  `CREATE TABLE IF NOT EXISTS finance_journal_entries (
    id TEXT PRIMARY KEY,
    organization_id TEXT NOT NULL,
    dba_id TEXT NOT NULL,
    entry_number TEXT NOT NULL,
    entry_date TEXT NOT NULL,
    reference TEXT,
    memo TEXT,
    status TEXT NOT NULL DEFAULT 'posted',
    total_debit_cents INTEGER NOT NULL DEFAULT 0,
    total_credit_cents INTEGER NOT NULL DEFAULT 0,
    created_by_user_id TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(organization_id,dba_id,entry_number),
    CHECK (status IN ('draft','posted','reversed')),
    CHECK (total_debit_cents >= 0),
    CHECK (total_credit_cents >= 0)
  )`,
  `CREATE INDEX IF NOT EXISTS idx_finance_journals_scope_date ON finance_journal_entries(organization_id,dba_id,entry_date DESC,created_at DESC)`,
  `CREATE TABLE IF NOT EXISTS finance_journal_lines (
    id TEXT PRIMARY KEY,
    entry_id TEXT NOT NULL,
    account_id TEXT NOT NULL,
    description TEXT,
    debit_cents INTEGER NOT NULL DEFAULT 0,
    credit_cents INTEGER NOT NULL DEFAULT 0,
    line_number INTEGER NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(entry_id) REFERENCES finance_journal_entries(id) ON DELETE CASCADE,
    FOREIGN KEY(account_id) REFERENCES finance_accounts(id),
    CHECK (debit_cents >= 0),
    CHECK (credit_cents >= 0),
    CHECK (NOT (debit_cents > 0 AND credit_cents > 0))
  )`,
  `CREATE INDEX IF NOT EXISTS idx_finance_journal_lines_entry ON finance_journal_lines(entry_id,line_number)`,
  `CREATE INDEX IF NOT EXISTS idx_finance_journal_lines_account ON finance_journal_lines(account_id)`,
  `CREATE TABLE IF NOT EXISTS finance_bills (
    id TEXT PRIMARY KEY,
    organization_id TEXT NOT NULL,
    dba_id TEXT NOT NULL,
    vendor_name TEXT NOT NULL,
    invoice_number TEXT,
    issue_date TEXT NOT NULL,
    due_date TEXT,
    total_cents INTEGER NOT NULL,
    paid_cents INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'open',
    memo TEXT,
    created_by_user_id TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(organization_id,dba_id,vendor_name,invoice_number),
    CHECK (total_cents >= 0),
    CHECK (paid_cents >= 0),
    CHECK (paid_cents <= total_cents),
    CHECK (status IN ('draft','open','approved','partial','paid','void'))
  )`,
  `CREATE INDEX IF NOT EXISTS idx_finance_bills_scope_due ON finance_bills(organization_id,dba_id,status,due_date)`,
  `CREATE TABLE IF NOT EXISTS finance_invoices (
    id TEXT PRIMARY KEY,
    organization_id TEXT NOT NULL,
    dba_id TEXT NOT NULL,
    customer_name TEXT NOT NULL,
    invoice_number TEXT NOT NULL,
    issue_date TEXT NOT NULL,
    due_date TEXT,
    total_cents INTEGER NOT NULL,
    received_cents INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'open',
    memo TEXT,
    created_by_user_id TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(organization_id,dba_id,invoice_number),
    CHECK (total_cents >= 0),
    CHECK (received_cents >= 0),
    CHECK (received_cents <= total_cents),
    CHECK (status IN ('draft','open','sent','partial','paid','void'))
  )`,
  `CREATE INDEX IF NOT EXISTS idx_finance_invoices_scope_due ON finance_invoices(organization_id,dba_id,status,due_date)`
];

export async function ensureFinanceSchema(env) {
  if (schemaReady) return { ok: true, created: false };
  if (!env?.DB) return { ok: false, error: 'identity_database_unavailable' };
  if (!schemaPromise) {
    schemaPromise = (async () => {
      for (const sql of statements) await env.DB.prepare(sql).run();
      schemaReady = true;
      return { ok: true, created: true };
    })().catch((error) => {
      schemaPromise = null;
      throw error;
    });
  }
  return schemaPromise;
}
