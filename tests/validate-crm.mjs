import fs from 'node:fs';

const migration=fs.readFileSync('migrations/0002_crm.sql','utf8');
const routes=fs.readFileSync('modules/crm/routes.js','utf8');
const worker=fs.readFileSync('worker/index.js','utf8');

for(const marker of ['CREATE TABLE IF NOT EXISTS crm_contacts','organization_id TEXT NOT NULL','dba_id TEXT NOT NULL','created_by_user_id TEXT NOT NULL']){
  if(!migration.includes(marker)) throw new Error(`CRM migration invariant missing: ${marker}`);
}
for(const marker of [
  "requireSession(env,request)",
  "requireScope(env,auth.session.user_id,organizationId,dbaId,roles)",
  "WHERE organization_id=? AND dba_id=?",
  "WHERE id=? AND organization_id=? AND dba_id=?",
  "crm.contact.create",
  "crm.contact.update",
  "crm.contact.archive",
  "decision:'deny'",
  "WRITE_ROLES=['owner','admin','member']"
]){
  if(!routes.includes(marker)) throw new Error(`CRM authorization/audit invariant missing: ${marker}`);
}
if(!worker.includes("import { crmRoutes } from '../modules/crm/routes.js';")) throw new Error('CRM router import missing');
if(!worker.includes('await crmRoutes(request,env,url)')) throw new Error('CRM router wiring missing');

console.log('ATLAS CRM scope/audit validation passed');
