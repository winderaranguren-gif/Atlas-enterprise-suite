let schemaReady = false;
let schemaPromise = null;

const statements = [
  `CREATE TABLE IF NOT EXISTS finance_accounting_periods (
    id TEXT PRIMARY KEY,
    organization_id TEXT NOT NULL,
    dba_id TEXT NOT NULL,
    name TEXT NOT NULL,
    start_date TEXT NOT NULL,
    end_date TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'open',
    closed_at TEXT,
    closed_by_user_id TEXT,
    reopened_at TEXT,
    reopened_by_user_id TEXT,
    reopen_reason TEXT,
    created_by_user_id TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(organization_id,dba_id,start_date,end_date),
    CHECK (status IN ('open','closed')),
    CHECK (start_date <= end_date)
  )`,
  `CREATE INDEX IF NOT EXISTS idx_finance_periods_scope_dates ON finance_accounting_periods(organization_id,dba_id,start_date,end_date,status)`,
  `CREATE TABLE IF NOT EXISTS finance_tax_payments (
    id TEXT PRIMARY KEY,
    organization_id TEXT NOT NULL,
    dba_id TEXT NOT NULL,
    tax_item_id TEXT NOT NULL,
    payment_date TEXT NOT NULL,
    amount_cents INTEGER NOT NULL,
    reference TEXT,
    notes TEXT,
    created_by_user_id TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(tax_item_id) REFERENCES finance_tax_items(id) ON DELETE RESTRICT,
    CHECK (amount_cents > 0)
  )`,
  `CREATE INDEX IF NOT EXISTS idx_finance_tax_payments_scope ON finance_tax_payments(organization_id,dba_id,tax_item_id,payment_date DESC)`,
  `CREATE TABLE IF NOT EXISTS finance_asset_disposals (
    id TEXT PRIMARY KEY,
    organization_id TEXT NOT NULL,
    dba_id TEXT NOT NULL,
    asset_id TEXT NOT NULL UNIQUE,
    disposal_date TEXT NOT NULL,
    proceeds_cents INTEGER NOT NULL DEFAULT 0,
    accumulated_depreciation_cents INTEGER NOT NULL DEFAULT 0,
    book_value_cents INTEGER NOT NULL DEFAULT 0,
    gain_loss_cents INTEGER NOT NULL DEFAULT 0,
    reference TEXT,
    notes TEXT,
    created_by_user_id TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(asset_id) REFERENCES finance_fixed_assets(id) ON DELETE RESTRICT,
    CHECK (proceeds_cents >= 0),
    CHECK (accumulated_depreciation_cents >= 0),
    CHECK (book_value_cents >= 0)
  )`,
  `CREATE INDEX IF NOT EXISTS idx_finance_asset_disposals_scope ON finance_asset_disposals(organization_id,dba_id,disposal_date DESC)`
];

export async function ensureFinanceReportingSchema(env) {
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
