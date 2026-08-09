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

if (productionConfig.workers_dev !== false) {
  fail('production workers_dev must be false; only the controlled custom domains may expose ATLAS');
}

const rateLimiter = Array.isArray(productionConfig.ratelimits)
  ? productionConfig.ratelimits.find((item) => item?.name === 'ATLAS_API_RATE_LIMITER')
  : null;
if (!rateLimiter || rateLimiter.simple?.period !== 60 || !Number.isFinite(rateLimiter.simple?.limit)) {
  fail('ATLAS_API_RATE_LIMITER must be configured with a 60-second production window');
}

const serializedConfig = JSON.stringify(productionConfig);
if (/SUPABASE_(?:SECRET|SERVICE_ROLE)_KEY|DATABASE_URL/.test(serializedConfig)) {
  fail('server secrets or database credentials must never be stored in wrangler.jsonc');
}

const preferredEntry = path.join(root, productionConfig.main || '');
const fallbackEntry = path.join(root, 'cloudflare', 'worker.js');
const selectedEntry = fs.existsSync(preferredEntry) ? preferredEntry : fallbackEntry;
if (!fs.existsSync(selectedEntry)) {
  fail(`worker entry is missing: ${productionConfig.main || 'cloudflare/worker.js'}`);
  process.exit();
}

const workerSource = fs.readFileSync(selectedEntry, 'utf8');
for (const required of [
  '/auth/v1/user',
  '/api/support/',
  '/api/gps/',
  'ATLAS_API_RATE_LIMITER',
  'authentication_required',
  'rate_limited'
]) {
  if (!workerSource.includes(required)) fail(`worker entry is missing security control: ${required}`);
}

const publicIndex = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
for (const forbidden of ['demo@atlas.local', 'Atlas2026!', '246810', 'Winder Aranguren']) {
  if (publicIndex.includes(forbidden)) fail(`public index exposes forbidden demo/personal value: ${forbidden}`);
}
if (!/Private Beta/i.test(publicIndex)) fail('public index must remain a minimal Private Beta landing');

const privateBetaHtml = fs.readFileSync(path.join(root, 'private-beta.html'), 'utf8');
const cloudAuthHtml = fs.readFileSync(path.join(root, 'cloud-auth.html'), 'utf8');
if (/data-mode=["']signup["']/.test(privateBetaHtml)) fail('private-beta.html must not expose public signup');
if (/data-auth-mode=["']signup["']/.test(cloudAuthHtml)) fail('cloud-auth.html must not expose public signup');

const bootstrapMigration = path.join(root, 'supabase', 'migrations', '20260809182300_atlas_private_beta_access_hardening.sql');
if (!fs.existsSync(bootstrapMigration)) {
  fail('private-beta access hardening migration is missing');
} else {
  const migration = fs.readFileSync(bootstrapMigration, 'utf8');
  for (const required of ['atlas_platform_admins', 'email_confirmed_at', 'revoke execute', 'from public, anon']) {
    if (!migration.toLowerCase().includes(required.toLowerCase())) fail(`bootstrap migration is missing: ${required}`);
  }
}

if (process.exitCode) process.exit(process.exitCode);

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
  else console.log(`ATLAS Worker dry-run passed using ${path.relative(root, selectedEntry)} with production public-surface hardening enforced.`);
} finally {
  fs.rmSync(tempRoot, { recursive: true, force: true });
}
