'use strict';

const { spawnSync } = require('node:child_process');

function run(script) {
  const result = spawnSync(process.execPath, [script], {
    stdio: 'inherit',
    env: process.env
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status || 1);
}

console.log('ATLAS clean Cloudflare build compatibility shim');
run('scripts/validate.mjs');
run('scripts/build.mjs');
