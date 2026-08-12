import assert from 'node:assert/strict';
import fs from 'node:fs';

const gateway = fs.readFileSync(new URL('../modules/api-gateway/src/router.js', import.meta.url), 'utf8');
const boundary = fs.readFileSync(new URL('../modules/identity/src/routes.js', import.meta.url), 'utf8');
const legacy = fs.readFileSync(new URL('../modules/identity/routes.js', import.meta.url), 'utf8');

assert.match(gateway, /from '\.\.\/\.\.\/identity\/src\/routes\.js'/, 'API Gateway must import identity through the modular boundary');
assert.doesNotMatch(gateway, /from '\.\.\/\.\.\/identity\/routes\.js'/, 'API Gateway must not import legacy identity routes directly');
assert.match(boundary, /IDENTITY_RUNTIME_CONTRACT/);
assert.match(boundary, /compatibilityAdapter: true/);
assert.match(boundary, /organization_id/);
assert.match(boundary, /dba_id/);
assert.match(boundary, /POST \/api\/identity\/users/);
assert.match(boundary, /GET \/api\/identity\/memberships/);
assert.match(boundary, /PATCH \/api\/identity\/memberships\/:id/);
assert.match(boundary, /GET \/api\/audit-events/);
assert.match(boundary, /last-active-owner-protected/);
assert.match(legacy, /last_active_owner_required/, 'Legacy adapter target must preserve last-owner protection during migration');
assert.match(legacy, /owner_role_requires_owner/, 'Legacy adapter target must preserve owner grant protection during migration');
assert.match(legacy, /organization_and_dba_required/, 'Legacy adapter target must preserve organization/DBA scoping during migration');
assert.match(legacy, /audit\(/, 'Legacy adapter target must preserve auditability during migration');

console.log('identity modular boundary validation passed');
