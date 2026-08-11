import fs from 'node:fs';

const fail=(message)=>{console.error(`ATLAS Accounting validation failed: ${message}`);process.exitCode=1;};
const need=(text,marker,label)=>{if(!text.includes(marker)) fail(`${label} missing ${marker}`);};

const migration=fs.readFileSync(new URL('../migrations/0013_accounting.sql',import.meta.url),'utf8');
const accounting=fs.readFileSync(new URL('../worker/accounting.js',import.meta.url),'utf8');
const router=fs.readFileSync(new URL('../worker/router.js',import.meta.url),'utf8');

for(const marker of [
  'CREATE TABLE IF NOT EXISTS accounting_accounts',
  'CREATE TABLE IF NOT EXISTS accounting_journal_entries',
  'CREATE TABLE IF NOT EXISTS accounting_journal_lines',
  'organization_id TEXT NOT NULL',
  'dba_id TEXT NOT NULL',
  'total_debit_cents INTEGER NOT NULL',
  'total_credit_cents INTEGER NOT NULL',
  'debit_cents INTEGER NOT NULL',
  'credit_cents INTEGER NOT NULL',
  'CHECK(total_debit_cents = total_credit_cents)',
  'ON DELETE RESTRICT'
]) need(migration,marker,'accounting migration');

if(/\bREAL\b/i.test(migration)) fail('money columns must not use REAL floating point');

for(const marker of [
  "NORMAL_BALANCE={asset:'debit',expense:'debit',liability:'credit',equity:'credit',revenue:'credit'}",
  'Number.isSafeInteger(value)',
  'Journal entry must balance exactly in integer cents',
  "status='active'",
  'env.DB.batch(statements)',
  "resourceType:'journal_entry'",
  "'/api/accounting/trial-balance'",
  'balanced:totalDebits===totalCredits',
  "request.headers.get('x-atlas-organization')",
  "request.headers.get('x-atlas-dba')",
  'atlas_memberships'
]) need(accounting,marker,'accounting worker');

for(const marker of [
  "import { handleAccounting } from './accounting.js'",
  "url.pathname.startsWith('/api/accounting')"
]) need(router,marker,'worker router');

if(/debit_cents\s*:\s*\d+\.\d+/.test(accounting)||/credit_cents\s*:\s*\d+\.\d+/.test(accounting)) fail('floating-point accounting literals detected');

if(!process.exitCode) console.log('ATLAS Accounting validation passed: scoped chart of accounts, integer-cent journals, exact double-entry balance, audit and trial balance are present.');
