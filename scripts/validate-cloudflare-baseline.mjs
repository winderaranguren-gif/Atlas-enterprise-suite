import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(new URL('..', import.meta.url).pathname);
const baselinePath = resolve(root, 'infra/cloudflare/production-baseline.json');
const wranglerPath = resolve(root, 'wrangler.jsonc');

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

const baseline = JSON.parse(await readFile(baselinePath, 'utf8'));
const actual = JSON.parse(await readFile(wranglerPath, 'utf8'));
const expected = baseline.wrangler;

const left = JSON.stringify(canonical(actual));
const right = JSON.stringify(canonical(expected));

if (left !== right) {
  console.error('ATLAS Cloudflare baseline drift detected.');
  console.error('Run: npm run infra:repair');
  process.exit(42);
}

if (baseline.recoveryPolicy?.configurationSourceOfTruth !== 'repository') {
  throw new Error('invalid_recovery_source_of_truth');
}
if (baseline.recoveryPolicy?.allowProductionBranch !== 'main') {
  throw new Error('invalid_production_branch_policy');
}
if (expected.workers_dev !== false) throw new Error('workers_dev_must_be_false');
if (expected.keep_vars !== true) throw new Error('keep_vars_must_be_true');
if (expected.observability?.enabled !== true) throw new Error('observability_must_be_enabled');
if (expected.assets?.run_worker_first !== true) throw new Error('worker_must_run_before_assets');

const patterns = new Set((expected.routes || []).map((route) => route.pattern));
for (const required of ['atlasenterprisesuite.com/*', 'www.atlasenterprisesuite.com/*']) {
  if (!patterns.has(required)) throw new Error(`required_route_missing:${required}`);
}

console.log('ATLAS Cloudflare production baseline verified.');
