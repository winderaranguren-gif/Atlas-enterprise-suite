import assert from 'node:assert/strict';
import fs from 'node:fs';

const gateway = fs.readFileSync(new URL('../modules/api-gateway/src/router.js', import.meta.url), 'utf8');
const boundary = fs.readFileSync(new URL('../modules/backup-recovery/src/routes.js', import.meta.url), 'utf8');

assert.match(gateway, /from '\.\.\/\.\.\/backup-recovery\/src\/routes\.js'/, 'API Gateway must import backups only through modules/backup-recovery');
assert.doesNotMatch(gateway, /\.\.\/\.\.\/backups\/routes\.js/, 'API Gateway must not import legacy backup routes directly');
assert.match(boundary, /BACKUP_RECOVERY_RUNTIME_CONTRACT/);
assert.match(boundary, /restorePolicy: 'empty_only'/);
assert.match(boundary, /organization_id/);
assert.match(boundary, /dba_id/);
assert.match(boundary, /'D1'/);
assert.match(boundary, /'R2'/);
assert.match(boundary, /POST \/api\/backups\/:id\/restore/);

console.log('backup/recovery modular boundary validation passed');
