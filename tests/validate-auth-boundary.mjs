import assert from 'node:assert/strict';
import fs from 'node:fs';

const gateway = fs.readFileSync(new URL('../modules/api-gateway/src/router.js', import.meta.url), 'utf8');
const boundary = fs.readFileSync(new URL('../modules/auth/src/routes.js', import.meta.url), 'utf8');

assert.match(gateway, /from '\.\.\/\.\.\/auth\/src\/routes\.js'/, 'API Gateway must import auth only through modules/auth');
assert.doesNotMatch(gateway, /identity\/auth-routes\.js/, 'API Gateway must not import legacy auth routes directly');
assert.doesNotMatch(gateway, /identity\/session-routes\.js/, 'API Gateway must not import legacy session routes directly');
assert.match(boundary, /AUTH_RUNTIME_CONTRACT/);
assert.match(boundary, /POST \/api\/auth\/login/);
assert.match(boundary, /GET \/api\/auth\/session/);
assert.match(boundary, /compatibilityAdapter: true/);

console.log('auth modular boundary validation passed');
