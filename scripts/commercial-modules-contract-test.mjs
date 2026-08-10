import fs from 'node:fs';

const read = p => fs.readFileSync(p,'utf8');
const fail = message => { console.error(`ATLAS commercial modules contract failed: ${message}`); process.exit(1); };
const need = (text,marker,label) => { if (!text.includes(marker)) fail(`${label} missing ${marker}`); };

const migration = read('migrations/0003_documents_accounting.sql');
const modules = read('worker/commercial-modules.js');
const security = read('worker/secure-entry.js');

for (const table of ['atlas_documents','atlas_document_versions','accounting_accounts','accounting_journal_entries','accounting_journal_lines']) {
  need(migration,`CREATE TABLE IF NOT EXISTS ${table}`, 'migration 0003');
}

for (const marker of [
  'organization_id TEXT NOT NULL',
  'dba_id TEXT NOT NULL',
  'total_debit_cents INTEGER',
  'total_credit_cents INTEGER',
  'debit_cents INTEGER',
  'credit_cents INTEGER',
  'CHECK(total_debit_cents = total_credit_cents)',
  "CHECK((debit_cents > 0 AND credit_cents = 0) OR (credit_cents > 0 AND debit_cents = 0))"
]) need(migration,marker,'migration 0003');

if (/\bREAL\b/i.test(migration)) fail('accounting migration must not use floating-point REAL money columns');

for (const marker of [
  'MAX_DOCUMENT_BYTES',
  'current_version',
  'content_hash',
  "status='archived'",
  'env.DB.batch([',
  "new TextEncoder().encode(content).byteLength",
  "Number.isSafeInteger(value)",
  "Journal entry must balance exactly in integer cents",
  "accounting_accounts",
  "organization_id=? AND dba_id=? AND status='active'",
  "resource === 'trial-balance'",
  "totalDebits===totalCredits"
]) need(modules,marker,'commercial modules');

for (const marker of [
  "import { handleCommercialModule } from './commercial-modules.js'",
  "url.pathname === '/api/documents'",
  "url.pathname === '/api/accounting'",
  'authorizeScopedRequest',
  "READ_ROLES = new Set(['owner','admin','editor','viewer','auditor'])",
  "WRITE_ROLES = new Set(['owner','admin','editor'])",
  'scope:{organization_id:membership.organization_id,dba_id:membership.dba_id}'
]) need(security,marker,'security boundary');

if (/request\.headers\.get\('x-atlas-organization'\)[\s\S]{0,300}return\s+core\.fetch/.test(security)) {
  fail('commercial scope must not bypass membership authorization');
}

console.log('ATLAS commercial modules contract passed: scoped Documents, version integrity, integer-cent double-entry Accounting, RBAC and audit boundaries are present.');
