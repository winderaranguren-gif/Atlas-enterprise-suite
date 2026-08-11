import fs from 'node:fs';

const required = [
  'wrangler.toml','src/index.js','migrations/0001_core.sql','.github/workflows/ci.yml','.github/workflows/deploy.yml','public/index.html'
];
for (const file of required) {
  if (!fs.existsSync(file)) throw new Error(`missing required file: ${file}`);
}
const worker = fs.readFileSync('src/index.js','utf8');
const schema = fs.readFileSync('migrations/0001_core.sql','utf8');
const wrangler = fs.readFileSync('wrangler.toml','utf8');
for (const token of ["status='active'",'organization_id=? AND dba_id=?','audit_events','ATLAS_BACKUPS.put','journal must balance in integer cents','preferred_locale']) {
  if (!worker.includes(token)) throw new Error(`worker invariant missing: ${token}`);
}
for (const token of [
  'schema_version:2',
  'memberships:`SELECT * FROM memberships WHERE organization_id=? AND dba_id=?`',
  'users:`SELECT u.* FROM users u JOIN memberships m ON m.user_id=u.id WHERE m.organization_id=? AND m.dba_id=?`',
  'journal_lines:`SELECT jl.* FROM journal_lines jl JOIN journal_entries je ON je.id=jl.entry_id WHERE je.organization_id=? AND je.dba_id=?`',
  'audit_events:`SELECT * FROM audit_events WHERE organization_id=? AND dba_id=?`',
  "customMetadata:{sha256:digest,schema_version:'2'}"
]) {
  if (!worker.includes(token)) throw new Error(`backup coverage invariant missing: ${token}`);
}
for (const token of ['audit_events_no_update','audit_events_no_delete','memberships_scope_idx','journal_lines','backup_manifests']) {
  if (!schema.includes(token)) throw new Error(`schema invariant missing: ${token}`);
}
for (const token of ['binding = "ATLAS_DB"','binding = "ATLAS_BACKUPS"','ATLAS_DEFAULT_LOCALE = "en"']) {
  if (!wrangler.includes(token)) throw new Error(`wrangler invariant missing: ${token}`);
}
console.log('ATLAS repository invariants: PASS');
