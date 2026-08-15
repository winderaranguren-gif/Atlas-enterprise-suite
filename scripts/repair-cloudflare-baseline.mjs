import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(new URL('..', import.meta.url).pathname);
const baselinePath = resolve(root, 'infra/cloudflare/production-baseline.json');
const wranglerPath = resolve(root, 'wrangler.jsonc');

const baseline = JSON.parse(await readFile(baselinePath, 'utf8'));
if (baseline.schema !== 'atlas.cloudflare.production-baseline' || baseline.version !== 1) {
  throw new Error('unsupported_cloudflare_baseline');
}
if (baseline.recoveryPolicy?.automaticRepairScope !== 'wrangler-drift-only') {
  throw new Error('automatic_repair_scope_not_allowed');
}

const desired = baseline.wrangler;
if (!desired || desired.workers_dev !== false || desired.keep_vars !== true) {
  throw new Error('unsafe_cloudflare_baseline');
}

await writeFile(wranglerPath, `${JSON.stringify(desired, null, 2)}\n`, 'utf8');
console.log('ATLAS repaired wrangler.jsonc from the production golden baseline.');
