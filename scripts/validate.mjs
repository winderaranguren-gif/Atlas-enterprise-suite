import { access, readFile } from 'node:fs/promises';

const required = [
  'README.md',
  'package.json',
  'wrangler.jsonc',
  'apps/web/worker/index.js',
  'apps/web/public/index.html',
  'modules/core/module.json',
  'modules/dashboard/module.json',
  'modules/users-permissions/module.json',
  'migrations/0001_identity_rbac.sql',
  'scripts/render-production-wrangler.mjs',
  '.github/workflows/ci.yml',
  '.github/workflows/deploy.yml'
];

for (const path of required) await access(path);

for (const path of ['modules/core/module.json','modules/dashboard/module.json','modules/users-permissions/module.json']) {
  const manifest = JSON.parse(await readFile(path, 'utf8'));
  if (!manifest.id || !manifest.name || manifest.status !== 'active') throw new Error(`Invalid ATLAS module manifest: ${path}`);
}

const worker = await readFile('apps/web/worker/index.js', 'utf8');
for (const route of ['/api/status','/api/ready','/api/modules','/api/bootstrap','/api/auth/me','/api/users','/api/memberships/','/api/audit']) {
  if (!worker.includes(route)) throw new Error(`Missing runtime route: ${route}`);
}
for (const invariant of [
  "m.user_id = ? AND m.organization_id = ? AND m.dba_id = ? AND m.status = 'active'",
  'JOIN dbas d ON d.id = m.dba_id AND d.organization_id = m.organization_id',
  'token_hash = ? AND s.revoked_at IS NULL AND s.expires_at > ?',
  'roles && !roles.includes(membership.role)',
  'WHERE m.organization_id = ? AND m.dba_id = ?',
  'WHERE organization_id = ? AND dba_id = ? ORDER BY created_at DESC LIMIT 200'
]) {
  if (!worker.includes(invariant)) throw new Error(`Missing authorization invariant: ${invariant}`);
}

const migration = await readFile('migrations/0001_identity_rbac.sql', 'utf8');
for (const table of ['organizations','dbas','users','memberships','sessions','audit_events']) {
  if (!migration.includes(`CREATE TABLE IF NOT EXISTS ${table}`)) throw new Error(`Missing D1 table: ${table}`);
}
for (const trigger of ['audit_events_no_update','audit_events_no_delete']) {
  if (!migration.includes(trigger)) throw new Error(`Missing immutable audit trigger: ${trigger}`);
}
if (!migration.includes('UNIQUE (user_id, organization_id, dba_id)')) throw new Error('Membership uniqueness must be exact Organization/DBA scope');

const wrangler = await readFile('wrangler.jsonc', 'utf8');
if (!wrangler.includes('"binding": "ATLAS_DB"')) throw new Error('ATLAS_DB D1 binding missing');
if (!wrangler.includes('"migrations_dir": "migrations"')) throw new Error('D1 migrations directory missing');

const renderer = await readFile('scripts/render-production-wrangler.mjs', 'utf8');
for (const key of ['ATLAS_D1_DATABASE_NAME','ATLAS_D1_DATABASE_ID']) {
  if (!renderer.includes(key)) throw new Error(`Production renderer missing ${key}`);
}
if (!renderer.includes("config.includes('REPLACE_WITH_')")) throw new Error('Production renderer must reject unresolved placeholders');

const deploy = await readFile('.github/workflows/deploy.yml', 'utf8');
for (const gate of ['npm run check','d1 migrations apply','secret put ATLAS_BOOTSTRAP_TOKEN','wrangler deploy','/api/status','/api/ready','ATLAS_DEPLOYED_SHA']) {
  if (!deploy.includes(gate)) throw new Error(`Deployment gate missing: ${gate}`);
}

const ui = await readFile('apps/web/public/index.html', 'utf8');
for (const uiInvariant of ['<html lang="en">','<option value="en">English</option>','<option value="es">Español</option>',"localStorage.getItem('atlas.language')","localStorage.setItem('atlas.language'"]) {
  if (!ui.includes(uiInvariant)) throw new Error(`Language UI invariant missing: ${uiInvariant}`);
}

console.log('ATLAS commercial identity foundation validation: PASS');
