'use strict';

const { spawnSync } = require('child_process');

const command = String(process.env.WRANGLER_COMMAND || '').trim().toLowerCase();
const branch = String(process.env.WORKERS_CI_BRANCH || '').trim();
const productionBranch = 'main';

function fail(message) {
  console.error(`ATLAS Cloudflare build router failed: ${message}`);
  process.exit(1);
}

function run(script) {
  console.log(`ATLAS Cloudflare build router: branch=${branch || 'local/unknown'}, wrangler=${command || 'unknown'}, path=${script}`);
  const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  const result = spawnSync(npm, ['run', script], { stdio: 'inherit', env: process.env });
  if (result.error) fail(result.error.message);
  if (result.status !== 0) process.exit(result.status || 1);
}

// Any operation on the production branch must pass the full constitutional gate.
if (branch === productionBranch) {
  run('build:prod');
  process.exit(0);
}

// Manual or CI promotion/deploy commands are production-capable even when the
// branch variable is missing, so they also fail closed through build:prod.
if (command === 'deploy' || command === 'versions deploy') {
  run('build:prod');
  process.exit(0);
}

// Preview uploads and development build validated assets without production
// approval. They cannot themselves approve or promote a production release.
if (command === 'versions upload' || command === 'dev' || command === 'types') {
  run('build:dev');
  process.exit(0);
}

fail(`unsupported or missing WRANGLER_COMMAND: ${command || '(empty)'}`);
