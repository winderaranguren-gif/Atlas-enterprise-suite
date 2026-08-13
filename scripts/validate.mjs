import { access, readFile } from 'node:fs/promises';

const required = [
  'README.md',
  'package.json',
  'worker.js',
  'wrangler.jsonc',
  'modules/auth.js',
  'migrations/0001_identity.sql'
];

for (const file of required) await access(file);

const pkg = JSON.parse(await readFile('package.json', 'utf8'));
if (pkg.name !== 'atlas-enterprise-suite') throw new Error('invalid_package_name');
if (pkg.version !== '0.2.0') throw new Error('unexpected_core_version');
if (!pkg.scripts?.['build:prod']) throw new Error('missing_build_prod_script');

const worker = await readFile('worker.js', 'utf8');
if (!worker.includes('/api/health')) throw new Error('missing_health_endpoint');
if (!worker.includes('authRoutes')) throw new Error('auth_not_wired');

const auth = await readFile('modules/auth.js', 'utf8');
for (const route of ['/api/auth/bootstrap','/api/auth/login','/api/auth/me','/api/auth/logout']) {
  if (!auth.includes(route)) throw new Error(`missing_auth_route:${route}`);
}
if (!auth.includes("name: 'PBKDF2'")) throw new Error('password_kdf_missing');
if (!auth.includes("hash: 'SHA-256'")) throw new Error('password_hash_algorithm_missing');
if (!auth.includes('ATLAS_BOOTSTRAP_TOKEN')) throw new Error('bootstrap_secret_gate_missing');
if (!auth.includes('token_hash')) throw new Error('session_token_hashing_missing');
if (/password\s+TEXT/i.test(await readFile('migrations/0001_identity.sql', 'utf8'))) {
  throw new Error('plaintext_password_column_forbidden');
}

const migration = await readFile('migrations/0001_identity.sql', 'utf8');
for (const table of ['users','sessions','auth_audit_events']) {
  if (!migration.includes(`CREATE TABLE IF NOT EXISTS ${table}`)) throw new Error(`missing_table:${table}`);
}
if (!migration.includes('password_hash') || !migration.includes('password_salt')) {
  throw new Error('password_storage_contract_missing');
}

console.log('ATLAS Core Identity + Authentication v0.2 validation passed');
