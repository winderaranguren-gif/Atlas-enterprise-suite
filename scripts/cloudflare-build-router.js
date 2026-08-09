'use strict';

const { spawnSync } = require('child_process');

const command = String(process.env.WRANGLER_COMMAND || '').trim().toLowerCase();
const branch = String(process.env.WORKERS_CI_BRANCH || '').trim();
const workersCi = String(process.env.WORKERS_CI || '').trim() === '1';
const productionBranch = 'main';

function fail(message) {
  console.error(`ATLAS Cloudflare build router failed: ${message}`);
  process.exit(1);
}

function run(script) {
  console.log(`ATLAS Cloudflare build router: branch=${branch || 'local/unknown'}, wrangler=${command || 'direct-build'}, path=${script}`);
  const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  const result = spawnSync(npm, ['run', script], { stdio: 'inherit', env: process.env });
  if (result.error) fail(result.error.message);
  if (result.status !== 0) process.exit(result.status || 1);
}

// Workers Builds runs its configured Build command directly and does not honor
// Wrangler custom builds from wrangler.jsonc. In that direct-build context,
// WORKERS_CI/WORKERS_CI_BRANCH are present but WRANGLER_COMMAND is not.
// Route production and preview branches explicitly before Wrangler-specific logic.
if (workersCi && branch && !command) {
  run(branch === productionBranch ? 'build:prod' : 'build:dev');
  process.exit(0);
}

// If this router is ever reached from a Wrangler custom build inside Workers
// Builds, a non-production branch must still be uploaded as a preview version,
// never promoted with `wrangler deploy`.
if (workersCi && branch && branch !== productionBranch && (command === 'deploy' || command === 'versions deploy')) {
  fail(
    `non-production branch "${branch}" was invoked with "${command}". ` +
    'Set Cloudflare Workers Builds > Non-production branch deploy command to "npx wrangler versions upload". ' +
    'ATLAS will not weaken the production constitutional gate to compensate for a preview-deploy misconfiguration.'
  );
}

// Any Wrangler-triggered operation on the production branch must pass the full
// constitutional release gate.
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

// Preview uploads and development commands build validated assets without
// production approval. They cannot themselves approve or promote a release.
if (command === 'versions upload' || command === 'dev' || command === 'types') {
  run('build:dev');
  process.exit(0);
}

fail(`unsupported build context: workersCi=${workersCi ? '1' : '0'}, branch=${branch || '(empty)'}, wrangler=${command || '(empty)'}`);
