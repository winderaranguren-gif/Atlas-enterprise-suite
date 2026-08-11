import fs from 'node:fs';

const guard=fs.readFileSync(new URL('../worker/authorization-guard.js',import.meta.url),'utf8');
const router=fs.readFileSync(new URL('../worker/router.js',import.meta.url),'utf8');

const requiredGuardFragments=[
  "accounting:{",
  "backup:{",
  "atlas_security_events",
  "membership_missing",
  "invalid_session",
  "missing_scope",
  "role_${role}_not_allowed",
  "decision:'allow'",
  "resourceType:`${resourceType}_scope`",
  "WHERE user_id=? AND organization_id=? AND dba_id=? AND status='active'"
];
for(const fragment of requiredGuardFragments){
  if(!guard.includes(fragment)) throw new Error(`authorization guard missing required contract: ${fragment}`);
}

const requiredRouterFragments=[
  "import { enforceScopedAuthorization,authorizationMode } from './authorization-guard.js';",
  "resourceType:'accounting'",
  "resourceType:'backup'",
  "url.pathname!=='/api/accounting/health'",
  "url.pathname!=='/api/backups/health'"
];
for(const fragment of requiredRouterFragments){
  if(!router.includes(fragment)) throw new Error(`router missing financial security-event wiring: ${fragment}`);
}

const accountingWrite="write:new Set(['owner','admin','editor'])";
const backupWrite="write:new Set(['owner','admin'])";
const backupRead="read:new Set(['owner','admin','auditor'])";
for(const fragment of [accountingWrite,backupWrite,backupRead]){
  if(!guard.includes(fragment)) throw new Error(`authorization policy drift detected: ${fragment}`);
}

console.log('financial security-event authorization contract: ok');
