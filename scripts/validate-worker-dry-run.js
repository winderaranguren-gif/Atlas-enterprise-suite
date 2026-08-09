'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const root = path.resolve(__dirname, '..');
const productionConfigPath = path.join(root, 'wrangler.jsonc');
const tempRoot = path.join(root, '.wrangler-dry-run');
const tempConfigPath = path.join(tempRoot, 'wrangler.validation.json');
const outputDir = path.join(tempRoot, 'output');

function fail(message) {
  console.error(`ATLAS Worker dry-run validation failed: ${message}`);
  process.exitCode = 1;
}

let productionConfig;
try {
  productionConfig = JSON.parse(fs.readFileSync(productionConfigPath, 'utf8'));
} catch (error) {
  fail(`cannot read production Wrangler config: ${error.message}`);
  process.exit();
}

const preferredEntry = path.join(root, productionConfig.main || '');
const fallbackEntry = path.join(root, 'cloudflare', 'worker.js');
const selectedEntry = fs.existsSync(preferredEntry) ? preferredEntry : fallbackEntry;
if (!fs.existsSync(selectedEntry)) {
  fail(`worker entry is missing: ${productionConfig.main || 'cloudflare/worker.js'}`);
  process.exit();
}

fs.rmSync(tempRoot, { recursive: true, force: true });
fs.mkdirSync(tempRoot, { recursive: true });

const validationConfig = {
  name: `${productionConfig.name || 'atlas-enterprise-suite'}-validation`,
  main: selectedEntry,
  compatibility_date: productionConfig.compatibility_date,
  workers_dev: true,
  assets: {
    directory: root,
    binding: productionConfig.assets?.binding || 'ASSETS',
    not_found_handling: productionConfig.assets?.not_found_handling || 'single-page-application',
    run_worker_first: true
  }
};

fs.writeFileSync(tempConfigPath, JSON.stringify(validationConfig, null, 2));

try {
  const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx';
  const result = spawnSync(npx, [
    'wrangler@4', 'deploy', '--dry-run', '--outdir', outputDir, '--config', tempConfigPath
  ], { cwd: root, stdio: 'inherit', env: process.env });

  if (result.error) fail(result.error.message);
  else if (result.status !== 0) process.exitCode = result.status || 1;
  else console.log(`ATLAS Worker dry-run passed using ${path.relative(root, selectedEntry)} without production routes or build hooks.`);
} finally {
  fs.rmSync(tempRoot, { recursive: true, force: true });
}
