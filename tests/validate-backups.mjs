import fs from 'node:fs';

function mustContain(path, needles){
  const text=fs.readFileSync(path,'utf8');
  for(const needle of needles){
    if(!text.includes(needle)) throw new Error(`${path} missing required invariant: ${needle}`);
  }
}

mustContain('migrations/0005_backups.sql',[
  'CREATE TABLE backup_snapshots',
  'organization_id TEXT NOT NULL',
  'dba_id TEXT NOT NULL',
  'manifest_sha256 TEXT NOT NULL',
  'status TEXT NOT NULL',
  'idx_backup_snapshots_scope'
]);

mustContain('modules/backups/routes.js',[
  "requireScope(env,auth.session.user_id,organizationId,dbaId,roles)",
  "['owner','admin'],'backup.create'",
  "['owner','admin','auditor'],'backup.verify'",
  "['owner','admin'],'backup.restore'",
  'document_hash_mismatch',
  'backup_manifest_hash_mismatch',
  'backup_manifest_row_scope_mismatch',
  'restore_target_not_empty',
  "mode!=='empty_only'",
  'restore_target_object_conflict',
  'env.DB.batch(statements)',
  'journal_lines',
  'accounting_accounts',
  'crm_contacts',
  'env.BACKUPS.put(backupKey,bytes',
  "action:'backup.create'",
  "action:'backup.verify'",
  "action:'backup.restore'",
  "/restore$/"
]);

mustContain('worker/index.js',[
  "import { backupRoutes } from '../modules/backups/routes.js';",
  'await backupRoutes(request,env,url)'
]);

console.log('ATLAS backup validation passed');
