import fs from 'node:fs';

const migration=fs.readFileSync('migrations/0004_accounting.sql','utf8');
const routes=fs.readFileSync('modules/accounting/routes.js','utf8');
const worker=fs.readFileSync('worker/index.js','utf8');

const requiredMigration=[
  'CREATE TABLE IF NOT EXISTS accounting_accounts',
  'CREATE TABLE IF NOT EXISTS journal_entries',
  'CREATE TABLE IF NOT EXISTS journal_lines',
  'organization_id TEXT NOT NULL',
  'dba_id TEXT NOT NULL',
  'prevent_posted_journal_update',
  'prevent_posted_journal_delete',
  'prevent_posted_line_update',
  'prevent_posted_line_delete'
];
for(const marker of requiredMigration){
  if(!migration.includes(marker)) throw new Error(`Accounting migration invariant missing: ${marker}`);
}

const requiredRoutes=[
  "requireScope(env,auth.session.user_id,organizationId,dbaId,roles)",
  "['owner','admin'],'accounting.account.create'",
  "['owner','admin','member'],'accounting.journal.create'",
  "['owner','admin'],'accounting.journal.post'",
  "debitTotal!==creditTotal",
  "account_not_found_in_scope_or_inactive",
  "status='posted'",
  "accounting.journal.post",
  "decision:'deny'"
];
for(const marker of requiredRoutes){
  if(!routes.includes(marker)) throw new Error(`Accounting route invariant missing: ${marker}`);
}

if(!worker.includes("import { accountingRoutes } from '../modules/accounting/routes.js';")) throw new Error('Accounting router import missing');
if(!worker.includes('await accountingRoutes(request,env,url)')) throw new Error('Accounting router wiring missing');

console.log('ATLAS accounting validation passed');
