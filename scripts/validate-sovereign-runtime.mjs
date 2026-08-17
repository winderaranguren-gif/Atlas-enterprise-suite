import { readFile } from 'node:fs/promises';

const required = [
  'scripts/atlas-sovereign-snapshot.mjs',
  'scripts/atlas-sovereign-release.mjs',
  'scripts/deploy-adapters/cloudflare.mjs',
  'scripts/deploy-adapters/bundle.mjs',
  'scripts/deploy-adapters/sovereign-edge.mjs',
  'sovereign/runtime/d1-sqlite.mjs',
  'sovereign/runtime/server.mjs',
  'sovereign/systemd/atlas-runtime.service',
  'sovereign/atlas-edge/Caddyfile.template',
  'docs/ATLAS_SOVEREIGN_RUNTIME.md',
];
for (const file of required) await readFile(file, 'utf8');

const pkg = JSON.parse(await readFile('package.json', 'utf8'));
for (const key of ['build:sovereign', 'snapshot:sovereign', 'release:sovereign', 'release:sovereign:edge', 'validate:sovereign']) {
  if (!pkg.scripts?.[key]) throw new Error(`Missing package script: ${key}`);
}

const orchestrator = await readFile('scripts/atlas-sovereign-release.mjs', 'utf8');
if (/GITHUB_TOKEN|GITHUB_ACTIONS|github\.com/i.test(orchestrator)) {
  throw new Error('Sovereign release orchestrator must not require GitHub runtime state.');
}
const buildIndex = orchestrator.indexOf("run('npm', ['run', 'build:sovereign'])");
const snapshotIndex = orchestrator.indexOf("run('node', ['scripts/atlas-sovereign-snapshot.mjs']");
if (buildIndex < 0 || snapshotIndex < 0 || buildIndex > snapshotIndex) {
  throw new Error('Sovereign snapshot must be created after release stamping and validation.');
}
if (!orchestrator.includes('liveVerified: verification?.verified === true')) {
  throw new Error('Sovereign release output must distinguish deployment success from public LIVE verification.');
}

const cloudflare = await readFile('scripts/deploy-adapters/cloudflare.mjs', 'utf8');
if (!cloudflare.includes('replaceable = true')) throw new Error('Cloudflare adapter must be explicitly replaceable.');
const sovereignEdge = await readFile('scripts/deploy-adapters/sovereign-edge.mjs', 'utf8');
for (const token of ['immutable_release_conflict', '/api/rollback', 'host_ready_public_origin_not_configured', 'destructive_migration_blocked', 'migration_drift_preflight', '/_atlas/runtime/schema']) {
  if (!sovereignEdge.includes(token)) throw new Error(`Sovereign Edge safety contract missing: ${token}`);
}

const runtime = await readFile('sovereign/runtime/server.mjs', 'utf8');
for (const token of ['migration_drift:', 'worker-meta.js', '/_atlas/runtime/readiness', '/_atlas/runtime/schema', 'CONTROL_TOKEN', 'x-atlas-sovereign-release']) {
  if (!runtime.includes(token)) throw new Error(`Sovereign application runtime contract missing: ${token}`);
}
const sqlite = await readFile('sovereign/runtime/d1-sqlite.mjs', 'utf8');
for (const token of ['DatabaseSync', 'async batch', 'PRAGMA foreign_keys=ON']) {
  if (!sqlite.includes(token)) throw new Error(`Sovereign SQLite compatibility contract missing: ${token}`);
}

const caddy = await readFile('sovereign/atlas-edge/Caddyfile.template', 'utf8');
if (!caddy.includes('reverse_proxy 127.0.0.1:7403')) throw new Error('Caddy must proxy application traffic to ATLAS Runtime.');
if (caddy.includes('file_server')) throw new Error('Caddy must not reduce the dynamic ATLAS application to a static file server.');

const snapshot = await readFile('scripts/atlas-sovereign-snapshot.mjs', 'utf8');
if (!snapshot.includes('githubRequired: false')) throw new Error('Snapshot manifest must state GitHub is not required.');

console.log('ATLAS Sovereign Runtime contract validated.');
