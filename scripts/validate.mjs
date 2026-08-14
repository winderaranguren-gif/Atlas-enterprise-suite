import { access, readFile } from 'node:fs/promises';
import { ATLAS_VERSION } from '../modules/version.js';

const required = [
  'README.md',
  'package.json',
  'worker.js',
  'wrangler.jsonc',
  'modules/auth.js',
  'modules/rbac.js',
  'modules/audit.js',
  'modules/tenant.js',
  'modules/evidence.js',
  'modules/hr-knowledge.js',
  'modules/version.js',
  'migrations/0001_identity.sql',
  'migrations/0002_organizations_rbac.sql',
  'migrations/0003_audit_security.sql',
  'migrations/0004_hr_knowledge.sql'
];

for (const file of required) await access(file);

const pkg = JSON.parse(await readFile('package.json', 'utf8'));
if (pkg.name !== 'atlas-enterprise-suite') throw new Error('invalid_package_name');
if (pkg.version !== ATLAS_VERSION) throw new Error('unexpected_core_version');
if (!pkg.scripts?.['build:prod']) throw new Error('missing_build_prod_script');

const worker = await readFile('worker.js', 'utf8');
if (!worker.includes('/api/health')) throw new Error('missing_health_endpoint');
if (!worker.includes("import { ATLAS_VERSION } from './modules/version.js'")) throw new Error('runtime_version_source_missing');
if (!worker.includes('version:ATLAS_VERSION')) throw new Error('runtime_version_not_canonical');
if (!worker.includes('authRoutes')) throw new Error('auth_not_wired');
if (!worker.includes('rbacRoutes')) throw new Error('rbac_not_wired');
if (!worker.includes('evidenceRoutes')) throw new Error('evidence_not_wired');
if (!worker.includes('hrKnowledgeRoutes')) throw new Error('hr_knowledge_not_wired');
if (!worker.includes('ATLAS_ENABLE_HR_KNOWLEDGE')) throw new Error('hr_knowledge_activation_state_missing');

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
if (!rbacMigration.includes('UNIQUE (id, organization_id)')) {
  throw new Error('dba_composite_parent_key_missing');
}
if (!rbacMigration.includes('FOREIGN KEY (dba_id, organization_id) REFERENCES dbas(id, organization_id)')) {
  throw new Error('cross_organization_dba_integrity_missing');
}

const audit = await readFile('modules/audit.js', 'utf8');
if (!audit.includes('appendAuditLedger')) throw new Error('canonical_audit_writer_missing');
if (!audit.includes('appendSecurityEvent')) throw new Error('security_event_writer_missing');
if (!audit.includes('MAX_METADATA_BYTES')) throw new Error('audit_metadata_bound_missing');
if (!audit.includes('correlationIdFromRequest')) throw new Error('correlation_id_support_missing');

const tenant = await readFile('modules/tenant.js', 'utf8');
for (const header of ['x-atlas-organization','x-atlas-dba']) {
  if (!tenant.includes(header)) throw new Error(`tenant_header_missing:${header}`);
}
if (!tenant.includes('requireTenantPermission')) throw new Error('tenant_permission_guard_missing');
if (!tenant.includes('requirePermission')) throw new Error('tenant_guard_not_bound_to_rbac');
if (!tenant.includes('appendAuditLedger')) throw new Error('tenant_guard_not_audited');
if (/organizationId\s*\|\|\s*['\"]default|dbaId\s*\|\|\s*['\"]default/i.test(tenant)) {
  throw new Error('tenant_guard_default_scope_forbidden');
}

const evidence = await readFile('modules/evidence.js', 'utf8');
for (const route of ['/api/core/audit','/api/core/security-events']) {
  if (!evidence.includes(route)) throw new Error(`missing_evidence_route:${route}`);
}
if (!evidence.includes("'audit.read'")) throw new Error('evidence_permission_gate_missing');
if (!evidence.includes('Math.min(200')) throw new Error('evidence_result_limit_missing');
if (!evidence.includes('ORDER BY created_at DESC')) throw new Error('evidence_order_contract_missing');

const auditMigration = await readFile('migrations/0003_audit_security.sql', 'utf8');
for (const table of ['audit_ledger','security_events']) {
  if (!auditMigration.includes(`CREATE TABLE IF NOT EXISTS ${table}`)) throw new Error(`missing_table:${table}`);
}
for (const trigger of [
  'prevent_audit_ledger_update',
  'prevent_audit_ledger_delete',
  'prevent_security_events_update',
  'prevent_security_events_delete'
]) {
  if (!auditMigration.includes(`CREATE TRIGGER IF NOT EXISTS ${trigger}`)) throw new Error(`missing_immutability_trigger:${trigger}`);
}
if (!auditMigration.includes('FOREIGN KEY (dba_id, organization_id) REFERENCES dbas(id, organization_id)')) {
  throw new Error('audit_cross_tenant_integrity_missing');
}

const hrKnowledge = await readFile('modules/hr-knowledge.js', 'utf8');
for (const route of [
  '/api/hr/knowledge/status',
  '/api/hr/knowledge/overview',
  '/api/hr/knowledge/search',
  '/api/hr/people',
  '/api/hr/knowledge/items',
  '/api/hr/knowledge/skills',
  '/api/hr/knowledge/person-skills',
  '/api/hr/knowledge/assignments',
  '/api/hr/knowledge/assessments'
]) {
  if (!hrKnowledge.includes(route)) throw new Error(`missing_hr_knowledge_route:${route}`);
}
if (!hrKnowledge.includes('requireTenantPermission')) throw new Error('hr_knowledge_tenant_guard_missing');
if (!hrKnowledge.includes("'module.read'")) throw new Error('hr_knowledge_read_permission_missing');
if (!hrKnowledge.includes("'module.write'")) throw new Error('hr_knowledge_write_permission_missing');
if (!hrKnowledge.includes('ATLAS_ENABLE_HR_KNOWLEDGE')) throw new Error('hr_knowledge_feature_gate_missing');
if (!hrKnowledge.includes('appendAuditLedger')) throw new Error('hr_knowledge_audit_missing');
if (/organizationId\s*\|\|\s*['\"]default|dbaId\s*\|\|\s*['\"]default/i.test(hrKnowledge)) {
  throw new Error('hr_knowledge_default_scope_forbidden');
}

const hrMigration = await readFile('migrations/0004_hr_knowledge.sql', 'utf8');
for (const table of [
  'hr_people',
  'hr_knowledge_items',
  'hr_knowledge_assignments',
  'hr_skill_catalog',
  'hr_person_skills',
  'hr_assessment_templates',
  'hr_assessment_questions',
  'hr_assessment_attempts'
]) {
  if (!hrMigration.includes(`CREATE TABLE IF NOT EXISTS ${table}`)) throw new Error(`missing_hr_table:${table}`);
}
if (!hrMigration.includes('FOREIGN KEY (dba_id, organization_id) REFERENCES dbas(id, organization_id)')) {
  throw new Error('hr_knowledge_cross_tenant_dba_integrity_missing');
}
for (const compositeParent of [
  'UNIQUE (id, organization_id, dba_id)',
  'REFERENCES hr_people(id, organization_id, dba_id)',
  'REFERENCES hr_knowledge_items(id, organization_id, dba_id)',
  'REFERENCES hr_skill_catalog(id, organization_id, dba_id)',
  'REFERENCES hr_assessment_templates(id, organization_id, dba_id)'
]) {
  if (!hrMigration.includes(compositeParent)) throw new Error(`hr_knowledge_scope_contract_missing:${compositeParent}`);
}

console.log(`ATLAS Core v${ATLAS_VERSION} + HR Knowledge foundation validation passed`);