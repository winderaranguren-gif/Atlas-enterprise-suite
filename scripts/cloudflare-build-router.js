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

// Cloudflare Workers Builds executes the configured build command directly and
// exposes WORKERS_CI/WORKERS_CI_BRANCH even when no Wrangler command is present.
// Route those builds without depending on GitHub Actions.
if (workersCi && branch && !command) {
  run(branch === productionBranch ? 'build:prod' : 'build:dev');
  process.exit(0);
}

// Never let a non-production branch promote itself through Workers Builds.
if (workersCi && branch && branch !== productionBranch && (command === 'deploy' || command === 'versions deploy')) {
  fail(
    `non-production branch "${branch}" was invoked with "${command}". ` +
    'Use "npx wrangler versions upload" for preview branches. ATLAS will not weaken the production gate.'
  );
}

// Production always passes the full constitutional gate.
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

fail(`unsupported build context: workersCi=${workersCi ? '1' : '0'}, branch=${branch || '(empty)'}, wrangler=${command || '(empty)'}`);
