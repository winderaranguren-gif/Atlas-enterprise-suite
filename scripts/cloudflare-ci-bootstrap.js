'use strict';

const { spawnSync } = require('child_process');

const workersCi = String(process.env.WORKERS_CI || '').trim() === '1';
const branch = String(process.env.WORKERS_CI_BRANCH || '').trim();
const productionBranch = 'main';

if (!workersCi) {
  console.log('ATLAS Cloudflare CI bootstrap: skipped outside Workers Builds.');
  process.exit(0);
}

if (!branch) {
  console.error('ATLAS Cloudflare CI bootstrap failed: WORKERS_CI_BRANCH is missing inside Workers Builds.');
  process.exit(1);
}

const target = branch === productionBranch ? 'build:prod' : 'build:dev';
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';

console.log(`ATLAS Cloudflare CI bootstrap: branch=${branch}, target=${target}`);
const result = spawnSync(npm, ['run', target], {
  stdio: 'inherit',
  env: process.env
});

if (result.error) {
  console.error(`ATLAS Cloudflare CI bootstrap failed: ${result.error.message}`);
  process.exit(1);
}

if (result.status !== 0) process.exit(result.status || 1);
console.log('ATLAS Cloudflare CI bootstrap: distribution package ready.');
