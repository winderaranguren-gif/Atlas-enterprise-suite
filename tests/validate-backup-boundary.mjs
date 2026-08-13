import assert from 'node:assert/strict';
import fs from 'node:fs';

const gateway = fs.readFileSync(new URL('../modules/api-gateway/src/router.js', import.meta.url), 'utf8');
const routes = fs.readFileSync(new URL('../modules/backups/routes.js', import.meta.url), 'utf8');
const readme = fs.readFileSync(new URL('../modules/backups/README.md', import.meta.url), 'utf8');

assert.match(gateway, /from '\.\.\/\.\.\/backups\/routes\.js'/, 'API Gateway must import the canonical modules/backups runtime');
assert.doesNotMatch(gateway, /backup-recovery/, 'duplicate backup-recovery adapter must not remain wired');
assert.match(routes, /export async function backupRoutes/);
assert.match(routes, /empty_only/);
assert.match(routes, /organization_id/);
assert.match(routes, /dba_id/);
assert.match(routes, /POST|pathname/);
assert.match(readme, /D1 \+ R2/);
assert.match(readme, /POST \/api\/backups\/:id\/restore/);

console.log('canonical backups/recovery boundary validation passed');
