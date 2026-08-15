let schemaReady = false;
let schemaPromise = null;

const statements = [
  `CREATE TABLE IF NOT EXISTS finance_bank_accounts (
    id TEXT PRIMARY KEY,
    organization_id TEXT NOT NULL,
    dba_id TEXT NOT NULL,
    name TEXT NOT NULL,
    institution TEXT,
    account_last4 TEXT,
    currency TEXT NOT NULL DEFAULT 'USD',
    ledger_account_id TEXT NOT NULL,
    opening_balance_cents INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'active',
    created_by_user_id TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(ledger_account_id) REFERENCES finance_accounts(id),
    CHECK (length(account_last4) <= 4),
    CHECK (status IN ('active','inactive'))
  )`,
  `CREATE INDEX IF NOT EXISTS idx_finance_bank_accounts_scope ON finance_bank_accounts(organization_id,dba_id,status,name)`,
  `CREATE TABLE IF NOT EXISTS finance_bank_transactions (
    id TEXT PRIMARY KEY,
    organization_id TEXT NOT NULL,
    dba_id TEXT NOT NULL,
    bank_account_id TEXT NOT NULL,
    transaction_date TEXT NOT NULL,
    description TEXT NOT NULL,
    amount_cents INTEGER NOT NULL,
    reference TEXT,
    journal_entry_id TEXT,
    status TEXT NOT NULL DEFAULT 'posted',
    reconciliation_id TEXT,
    created_by_user_id TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(bank_account_id) REFERENCES finance_bank_accounts(id) ON DELETE CASCADE,
    FOREIGN KEY(journal_entry_id) REFERENCES finance_journal_entries(id),
    CHECK (status IN ('pending','posted','void'))
  )`,
  `CREATE INDEX IF NOT EXISTS idx_finance_bank_transactions_scope_date ON finance_bank_transactions(organization_id,dba_id,bank_account_id,transaction_date DESC)`,
  `CREATE TABLE IF NOT EXISTS finance_reconciliations (
    id TEXT PRIMARY KEY,
    organization_id TEXT NOT NULL,
    dba_id TEXT NOT NULL,
    bank_account_id TEXT NOT NULL,
    statement_ending_date TEXT NOT NULL,
    statement_ending_balance_cents INTEGER NOT NULL,
    calculated_balance_cents INTEGER NOT NULL DEFAULT 0,
    difference_cents INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'draft',
    completed_at TEXT,
    completed_by_user_id TEXT,
    created_by_user_id TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(bank_account_id) REFERENCES finance_bank_accounts(id) ON DELETE CASCADE,
    CHECK (status IN ('draft','completed','void'))
  )`,
  `CREATE INDEX IF NOT EXISTS idx_finance_reconciliations_scope ON finance_reconciliations(organization_id,dba_id,bank_account_id,statement_ending_date DESC)`,
  `CREATE TABLE IF NOT EXISTS finance_budgets (
    id TEXT PRIMARY KEY,
    organization_id TEXT NOT NULL,
    dba_id TEXT NOT NULL,
    name TEXT NOT NULL,
    fiscal_year INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft',
    created_by_user_id TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(organization_id,dba_id,name,fiscal_year),
    CHECK (fiscal_year BETWEEN 2000 AND 2200),
    CHECK (status IN ('draft','active','closed'))
  )`,
  `CREATE TABLE IF NOT EXISTS finance_budget_lines (
    id TEXT PRIMARY KEY,
    budget_id TEXT NOT NULL,
    account_id TEXT NOT NULL,
    period_month INTEGER NOT NULL,
    amount_cents INTEGER NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(budget_id) REFERENCES finance_budgets(id) ON DELETE CASCADE,
    FOREIGN KEY(account_id) REFERENCES finance_accounts(id),
    UNIQUE(budget_id,account_id,period_month),
    CHECK (period_month BETWEEN 1 AND 12),
    CHECK (amount_cents >= 0)
  )`,
  `CREATE INDEX IF NOT EXISTS idx_finance_budget_lines_budget ON finance_budget_lines(budget_id,period_month,account_id)`,
  `CREATE TABLE IF NOT EXISTS finance_tax_items (
    id TEXT PRIMARY KEY,
    organization_id TEXT NOT NULL,
    dba_id TEXT NOT NULL,
    tax_type TEXT NOT NULL,
    jurisdiction TEXT,
    period_start TEXT,
    period_end TEXT,
    due_date TEXT,
    amount_due_cents INTEGER NOT NULL DEFAULT 0,
    amount_paid_cents INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'open',
    notes TEXT,
    created_by_user_id TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CHECK (amount_due_cents >= 0),
    CHECK (amount_paid_cents >= 0),
    CHECK (amount_paid_cents <= amount_due_cents),
    CHECK (status IN ('draft','open','filed','partial','paid','void'))
  )`,
  `CREATE INDEX IF NOT EXISTS idx_finance_tax_items_scope_due ON finance_tax_items(organization_id,dba_id,status,due_date)`,
  `CREATE TABLE IF NOT EXISTS finance_fixed_assets (
    id TEXT PRIMARY KEY,
    organization_id TEXT NOT NULL,
    dba_id TEXT NOT NULL,
    asset_tag TEXT NOT NULL,
    name TEXT NOT NULL,
    category TEXT,
    acquisition_date TEXT NOT NULL,
    cost_cents INTEGER NOT NULL,
    salvage_cents INTEGER NOT NULL DEFAULT 0,
    useful_life_months INTEGER NOT NULL,
    depreciation_method TEXT NOT NULL DEFAULT 'straight_line',
    status TEXT NOT NULL DEFAULT 'active',
    disposal_date TEXT,
    notes TEXT,
    created_by_user_id TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(organization_id,dba_id,asset_tag),
    CHECK (cost_cents >= 0),
    CHECK (salvage_cents >= 0),
    CHECK (salvage_cents <= cost_cents),
    CHECK (useful_life_months BETWEEN 1 AND 1200),
    CHECK (depreciation_method IN ('straight_line')),
    CHECK (status IN ('active','disposed','inactive'))
  )`,
  `CREATE INDEX IF NOT EXISTS idx_finance_fixed_assets_scope ON finance_fixed_assets(organization_id,dba_id,status,acquisition_date)`
];

export async function ensureFinanceAdvancedSchema(env) {
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
