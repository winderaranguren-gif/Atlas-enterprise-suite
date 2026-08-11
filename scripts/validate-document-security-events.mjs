import fs from 'node:fs';

const source=fs.readFileSync(new URL('../worker/documents.js',import.meta.url),'utf8');
const required=[
  "INSERT INTO atlas_security_events",
  "resource_type,'document_scope'",
  "reason:'invalid_session'",
  "reason:'missing_scope'",
  "reason:'membership_missing'",
  "reason:`role_${role}_not_allowed`",
  "decision:'allow'",
  "decision:'deny'"
];
for(const token of required){
  if(!source.includes(token)) throw new Error(`Document authorization security-event contract missing: ${token}`);
}
if(!source.includes("WHERE user_id=? AND organization_id=? AND dba_id=? AND status='active'")){
  throw new Error('Document authorization must remain scoped to active organization/DBA membership');
}
console.log('Document security-event validation passed.');
