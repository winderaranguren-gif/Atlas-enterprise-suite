import { readFile } from 'node:fs/promises';

const required = [
  'scripts/atlas-sovereign-snapshot.mjs',
  'scripts/atlas-sovereign-release.mjs',
  'scripts/deploy-adapters/cloudflare.mjs',
  'scripts/deploy-adapters/bundle.mjs',
  'docs/ATLAS_SOVEREIGN_RUNTIME.md',
];
for (const file of required) await readFile(file, 'utf8');

const pkg = JSON.parse(await readFile('package.json', 'utf8'));
for (const key of ['build:sovereign', 'snapshot:sovereign', 'release:sovereign', 'validate:sovereign']) {
  if (!pkg.scripts?.[key]) throw new Error(`Missing package script: ${key}`);
}

const orchestrator = await readFile('scripts/atlas-sovereign-release.mjs', 'utf8');
if (/GITHUB_TOKEN|GITHUB_ACTIONS|github\.com/i.test(orchestrator)) {
  throw new Error('Sovereign release orchestrator must not require GitHub runtime state.');
}
const cloudflare = await readFile('scripts/deploy-adapters/cloudflare.mjs', 'utf8');
if (!cloudflare.includes('replaceable = true')) throw new Error('Cloudflare adapter must be explicitly replaceable.');
const snapshot = await readFile('scripts/atlas-sovereign-snapshot.mjs', 'utf8');
if (!snapshot.includes('githubRequired: false')) throw new Error('Snapshot manifest must state GitHub is not required.');

console.log('ATLAS Sovereign Runtime contract validated.');
