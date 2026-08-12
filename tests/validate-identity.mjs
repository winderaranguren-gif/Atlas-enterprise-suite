import fs from 'node:fs';

const migration=fs.readFileSync('migrations/0001_identity.sql','utf8');
const routes=fs.readFileSync('modules/identity/routes.js','utf8');
const auth=fs.readFileSync('platform/security/auth.js','utf8');
const audit=fs.readFileSync('platform/security/audit.js','utf8');
const worker=fs.readFileSync('worker/index.js','utf8');

const requiredMigration=[
  'UNIQUE(user_id, organization_id, dba_id)',
  "CHECK(role IN ('owner','admin','auditor','member','viewer'))",
  'audit_events_no_update',
  'audit_events_no_delete',
  'idx_memberships_scope'
];
for(const marker of requiredMigration) if(!migration.includes(marker)) throw new Error(`Identity migration invariant missing: ${marker}`);

const requiredRoutes=[
  '/api/identity/bootstrap',
  'bootstrap_already_completed',
  '/api/identity/users',
  'user.provision',
  'membership_already_exists',
  '/api/identity/dbas',
  'dba.create',
  'dba.list',
  'owner_role_requires_owner',
  'owner_membership_requires_owner',
  'last_active_owner_required',
  "role='owner' AND status='active'",
  "['owner','admin','auditor']",
  "['owner','admin']",
  'organization_id=? AND m.dba_id=?',
  'organization_id=? AND dba_id=?',
  'LIMIT 200'
];
for(const marker of requiredRoutes) if(!routes.includes(marker)) throw new Error(`Identity route invariant missing: ${marker}`);

for(const marker of ['token_hash=?','user_id=? AND organization_id=? AND dba_id=?',"status='active'"]){
  if(!auth.includes(marker)) throw new Error(`Authorization invariant missing: ${marker}`);
}
if(!audit.includes('INSERT INTO audit_events')) throw new Error('Audit writer missing');
if(!worker.includes('identityRoutes(request,env,url)')) throw new Error('Identity router wiring missing');

console.log('ATLAS identity contracts passed');
