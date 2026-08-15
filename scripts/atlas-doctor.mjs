import { readFile, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const full = process.argv.includes('--full');
const checks = [];
const failures = [];
const warnings = [];

function record(id, status, message) {
  const item = { id, status, message };
  checks.push(item);
  if (status === 'fail') failures.push(item);
  if (status === 'warn') warnings.push(item);
}

async function readText(path) {
  return readFile(resolve(root, path), 'utf8');
}

async function readJson(path) {
  return JSON.parse(await readText(path));
}

function canonical(value) {
  if (Array.isArray(value)) {
    const items = value.map(canonical);
    if (items.every((item) => item && typeof item === 'object' && typeof item.pattern === 'string')) {
      return items.sort((a, b) => a.pattern.localeCompare(b.pattern));
    }
    return items;
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonical(value[key])]));
  }
  return value;
}

function same(left, right) {
  return JSON.stringify(canonical(left)) === JSON.stringify(canonical(right));
}

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: root,
    stdio: 'inherit',
    shell: false,
    env: process.env
  });
  return Number.isInteger(result.status) ? result.status : 1;
}

const nodeMajor = Number(process.versions.node.split('.')[0]);
if (Number.isInteger(nodeMajor) && nodeMajor >= 22) record('node', 'pass', `Node ${process.versions.node}`);
else record('node', 'fail', `Node 22+ required; current=${process.versions.node}`);

let pkg;
try {
  pkg = await readJson('package.json');
  record('package-json', 'pass', `package.json v${pkg.version || 'unknown'} loaded`);
} catch (error) {
  record('package-json', 'fail', `package.json unreadable: ${error.message}`);
}

if (pkg) {
  const dependencyFields = ['dependencies', 'devDependencies', 'optionalDependencies', 'peerDependencies'];
  const thirdParty = dependencyFields.flatMap((field) => Object.keys(pkg[field] || {}).map((name) => `${field}:${name}`));
  if (thirdParty.length === 0) record('dependency-policy', 'pass', 'No third-party npm dependencies');
  else record('dependency-policy', 'fail', `Third-party npm dependencies found: ${thirdParty.join(', ')}`);

  for (const script of ['build:prod', 'qa:release', 'infra:validate', 'infra:repair']) {
    if (pkg.scripts?.[script]) record(`script:${script}`, 'pass', pkg.scripts[script]);
    else record(`script:${script}`, 'fail', `Missing npm script: ${script}`);
  }
}

let baseline;
let wrangler;
try {
  [baseline, wrangler] = await Promise.all([
    readJson('infra/cloudflare/production-baseline.json'),
    readJson('wrangler.jsonc')
  ]);
  if (same(wrangler, baseline.wrangler)) record('cloudflare-baseline', 'pass', 'wrangler.jsonc matches repository production baseline');
  else record('cloudflare-baseline', 'fail', 'Cloudflare Wrangler configuration drift detected; run npm run infra:repair');

  if (baseline.recoveryPolicy?.configurationSourceOfTruth === 'repository') record('source-of-truth', 'pass', 'Repository is configuration source of truth');
  else record('source-of-truth', 'fail', 'Repository is not declared as configuration source of truth');

  if (baseline.recoveryPolicy?.allowProductionBranch === 'main') record('production-branch', 'pass', 'Only main is authorized for production');
  else record('production-branch', 'fail', 'Production branch policy is not main-only');

  if (wrangler.workers_dev === false) record('workers-dev', 'pass', 'workers.dev exposure disabled');
  else record('workers-dev', 'fail', 'workers.dev must remain disabled for production');
} catch (error) {
  record('cloudflare-config', 'fail', `Cloudflare baseline/config unreadable: ${error.message}`);
}

try {
  const knownGood = await readJson('infra/cloudflare/known-good.json');
  const validSource = /^[a-f0-9]{40}$/i.test(knownGood.recoveryBranchSourceCommit || '');
  if (validSource && knownGood.recoveryBranch && knownGood.baselineFile) {
    record('known-good', 'pass', `${knownGood.recoveryBranch} @ ${knownGood.recoveryBranchSourceCommit}`);
  } else {
    record('known-good', 'fail', 'Known-good recovery record is incomplete');
  }
} catch (error) {
  record('known-good', 'fail', `Known-good recovery record unreadable: ${error.message}`);
}

try {
  const workflowDir = resolve(root, '.github/workflows');
  const names = (await readdir(workflowDir)).filter((name) => /\.ya?ml$/i.test(name)).sort();
  if (names.length === 0) record('workflow-policy', 'warn', 'No GitHub workflow files found');
  for (const name of names) {
    const content = await readFile(resolve(workflowDir, name), 'utf8');
    const manual = /(^|\n)\s*workflow_dispatch\s*:/m.test(content);
    const automatic = /(^|\n)\s*(push|pull_request)\s*:/m.test(content);
    if (manual && !automatic) record(`workflow:${name}`, 'pass', 'Manual-only GitHub Actions runner');
    else if (automatic) record(`workflow:${name}`, 'fail', 'Automatic GitHub Actions trigger detected while hosted runners are intentionally non-authoritative');
    else record(`workflow:${name}`, 'warn', 'Workflow is not explicitly manual-only');
  }
} catch (error) {
  record('workflow-policy', 'warn', `Workflow policy could not be inspected: ${error.message}`);
}

for (const file of ['.github/CODEOWNERS', 'scripts/source-backup.mjs', 'docs/ATLAS_AUTONOMY.md']) {
  try {
    await readText(file);
    record(`required-file:${file}`, 'pass', 'present');
  } catch {
    record(`required-file:${file}`, 'fail', 'missing');
  }
}

if (full && failures.length === 0) {
  const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  const buildStatus = run(npm, ['run', 'build:prod']);
  if (buildStatus === 0) record('full:build-prod', 'pass', 'Production validation passed');
  else record('full:build-prod', 'fail', `Production validation failed with exit ${buildStatus}`);

  if (buildStatus === 0) {
    const qaStatus = run(npm, ['run', 'qa:release']);
    if (qaStatus === 0) record('full:qa-release', 'pass', 'ATLAS QA passed');
    else record('full:qa-release', 'fail', `ATLAS QA failed with exit ${qaStatus}`);
  }
}

const report = {
  ok: failures.length === 0,
  gate: 'ATLAS Doctor',
  mode: full ? 'full' : 'diagnostic',
  node: process.versions.node,
  checks,
  warningCount: warnings.length,
  failureCount: failures.length,
  completedAt: new Date().toISOString()
};

console.log(JSON.stringify(report, null, 2));
if (failures.length > 0) process.exit(1);
