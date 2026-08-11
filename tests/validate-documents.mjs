import fs from 'node:fs';

const migration=fs.readFileSync('migrations/0003_documents.sql','utf8');
const routes=fs.readFileSync('modules/documents/routes.js','utf8');
const worker=fs.readFileSync('worker/index.js','utf8');

for(const marker of ['CREATE TABLE IF NOT EXISTS documents','CREATE TABLE IF NOT EXISTS document_versions','organization_id TEXT NOT NULL','dba_id TEXT NOT NULL','UNIQUE(document_id,version)']){
  if(!migration.includes(marker)) throw new Error(`Documents migration invariant missing: ${marker}`);
}
for(const marker of [
  "requireSession(env,request)",
  "requireScope(env,auth.session.user_id,organizationId,dbaId,roles)",
  "env.BACKUPS.put(objectKey",
  "env.BACKUPS.get(row.object_key)",
  "WHERE d.id=? AND d.organization_id=? AND d.dba_id=?",
  "document.version.create",
  "document.archive",
  "decision:'deny'",
  "sha256Hex(bytes.buffer)"
]){
  if(!routes.includes(marker)) throw new Error(`Documents scope/storage/audit invariant missing: ${marker}`);
}
if(!worker.includes("import { documentRoutes } from '../modules/documents/routes.js';")) throw new Error('Documents router import missing');
if(!worker.includes('await documentRoutes(request,env,url)')) throw new Error('Documents router wiring missing');

console.log('ATLAS Documents D1/R2 scope/audit validation passed');
