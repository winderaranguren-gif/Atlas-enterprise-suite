import fs from 'node:fs';

const migration=fs.readFileSync('migrations/0016_audit_immutability.sql','utf8');
const readiness=fs.readFileSync('worker/system-readiness.js','utf8');

const requiredTriggers=[
  'atlas_audit_events_no_update',
  'atlas_audit_events_no_delete',
  'atlas_security_events_no_update',
  'atlas_security_events_no_delete'
];

for(const trigger of requiredTriggers){
  if(!migration.includes(`CREATE TRIGGER IF NOT EXISTS ${trigger}`)) throw new Error(`Missing D1 append-only trigger: ${trigger}`);
  if(!readiness.includes(`'${trigger}'`)) throw new Error(`Production readiness does not require trigger: ${trigger}`);
}

if(!migration.includes("RAISE(ABORT, 'atlas_audit_events is append-only')")) throw new Error('Audit UPDATE/DELETE protection is missing');
if(!migration.includes("RAISE(ABORT, 'atlas_security_events is append-only')")) throw new Error('Security-event UPDATE/DELETE protection is missing');
if(!readiness.includes('appendOnlyAuditTriggers')) throw new Error('Readiness does not expose append-only audit trigger status');
if(!readiness.includes('missingAuditTriggers')) throw new Error('Readiness does not report missing audit triggers');

console.log('ATLAS audit immutability validation passed');
