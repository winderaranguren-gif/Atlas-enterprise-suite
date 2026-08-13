import { access, readFile } from 'node:fs/promises';

const required = [
  'README.md',
  'package.json',
  'worker.js',
  'wrangler.jsonc',
  'modules/auth.js',
  'modules/rbac.js',
  'migrations/0001_identity.sql',
  'migrations/0002_organizations_rbac.sql'
];

for (const file of required) await access(file);

const pkg = JSON.parse(await readFile('package.json', 'utf8'));
if (pkg.name !== 'atlas-enterprise-suite') throw new Error('invalid_package_name');
if (pkg.version !== '0.3.0') throw new Error('unexpected_core_version');
if (!pkg.scripts?.['build:prod']) throw new Error('missing_build_prod_script');

const worker = await readFile('worker.js', 'utf8');
if (!worker.includes('/api/health')) throw new Error('missing_health_endpoint');
if (!worker.includes('authRoutes')) throw new Error('auth_not_wired');
if (!worker.includes('rbacRoutes')) throw new Error('rbac_not_wired');

const auth = await readFile('modules/auth.js', 'utf8');
for (const route of ['/api/auth/bootstrap','/api/auth/login','/api/auth/me','/api/auth/logout']) {
  if (!auth.includes(route)) throw new Error(`missing_auth_route:${route}`);
}
if (!auth.includes("name: 'PBKDF2'")) throw new Error('password_kdf_missing');
if (!auth.includes("hash: 'SHA-256'")) throw new Error('password_hash_algorithm_missing');
if (!auth.includes('ATLAS_BOOTSTRAP_TOKEN')) throw new Error('bootstrap_secret_gate_missing');
if (!auth.includes('token_hash')) throw new Error('session_token_hashing_missing');

const identityMigration = await readFile('migrations/0001_identity.sql', 'utf8');
if (/password\s+TEXT/i.test(identityMigration)) throw new Error('plaintext_password_column_forbidden');
for (const table of ['users','sessions','auth_audit_events']) {
  if (!identityMigration.includes(`CREATE TABLE IF NOT EXISTS ${table}`)) throw new Error(`missing_table:${table}`);
}
if (!identityMigration.includes('password_hash') || !identityMigration.includes('password_salt')) {
  throw new Error('password_storage_contract_missing');
}

const rbac = await readFile('modules/rbac.js', 'utf8');
for (const route of ['/api/core/organizations','/api/core/context','/api/core/memberships']) {
  if (!rbac.includes(route)) throw new Error(`missing_rbac_route:${route}`);
}
if (!rbac.includes('/dbas')) throw new Error('missing_dba_route');
if (!rbac.includes('requirePermission')) throw new Error('permission_guard_missing');
if (!rbac.includes("'membership.manage'")) throw new Error('membership_permission_gate_missing');
if (!rbac.includes("'dba.manage'")) throw new Error('dba_permission_gate_missing');
if (/atlas\s*\/\s*default|organizationId\s*\|\|\s*['\"]default|dbaId\s*\|\|\s*['\"]default/i.test(rbac)) {
  throw new Error('implicit_default_scope_forbidden');
}

const rbacMigration = await readFile('migrations/0002_organizations_rbac.sql', 'utf8');
for (const table of ['organizations','dbas','memberships','role_permissions','authorization_audit_events']) {
  if (!rbacMigration.includes(`CREATE TABLE IF NOT EXISTS ${table}`)) throw new Error(`missing_table:${table}`);
}
for (const role of ['owner','admin','manager','member','auditor','viewer']) {
  if (!rbacMigration.includes(`'${role}'`)) throw new Error(`missing_role:${role}`);
}
for (const permission of ['organization.manage','dba.manage','membership.manage','audit.read','module.read','module.write']) {
  if (!rbacMigration.includes(`'${permission}'`)) throw new Error(`missing_permission:${permission}`);
}
if (!rbacMigration.includes('FOREIGN KEY (dba_id, organization_id) REFERENCES dbas(id, organization_id)')) {
  throw new Error('cross_organization_dba_integrity_missing');
}

console.log('ATLAS Core Organizations + DBA + RBAC v0.3 validation passed');
