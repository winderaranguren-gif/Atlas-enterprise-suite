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
  const result = spawnSync(npm, ['run', script], {
    stdio: 'inherit',
    env: process.env
  });
  if (result.error) fail(result.error.message);
  if (result.status !== 0) process.exit(result.status || 1);
}

// Fail closed for the production branch regardless of which Wrangler command
// was selected by an external CI provider.
if (branch === productionBranch) {
  run('build');
  process.exit(0);
}

// Any command capable of promoting/deploying a Worker must pass the full
// constitutional production gate, including local/manual deployments where
// WORKERS_CI_BRANCH is unavailable.
if (command === 'deploy' || command === 'versions deploy') {
  run('build');
  process.exit(0);
}

// Preview uploads and local development may generate validated development
// assets, but they cannot promote a production release.
if (command === 'versions upload' || command === 'dev' || command === 'types') {
  run('build:dev');
  process.exit(0);
}

fail(`unsupported or missing WRANGLER_COMMAND: ${command || '(empty)'}`);
