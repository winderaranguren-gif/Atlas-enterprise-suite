import assert from 'node:assert/strict';
import { handleCreatorStudio } from '../modules/creator-studio-worker.js';

async function text(path) {
  const res = handleCreatorStudio(new Request(`https://atlas.local${path}`));
  assert.ok(res instanceof Response, `${path} must be handled`);
  assert.equal(res.status, 200, `${path} must return 200`);
  return res.text();
}

const html = await text('/studio');
const client = await text('/studio/client.js');
const runtimeSurface = html + '\n' + client;
const required = [
  'Home & Inspiration',
  'Create & Edit',
  'Publish & Schedule',
  'Comments & Community',
  'Overview · Content · Viewers · Followers',
  'Rewards & programs',
  'Creator & account notifications',
  'Smart Split',
  'Outline Builder',
  'Content Preflight',
  'Creator feedback',
  '/studio/production'
];
for (const token of required) assert.ok(runtimeSurface.includes(token), `missing UI/runtime token: ${token}`);

for (const forbidden of ['1.84M','128.4K','$8,420','642000','184000','Publish demo','Demo Mode · Connector Ready']) {
  assert.ok(!runtimeSurface.includes(forbidden), `synthetic/demo metric leaked into Studio: ${forbidden}`);
}
assert.ok(!html.includes('href="#"'), 'empty navigation links are not allowed');
assert.ok(client.includes('No analytics connected or imported'), 'analytics must have a truthful empty state');
assert.ok(client.includes('No rewards, balance or program data connected/imported'), 'monetization must have a truthful empty state');
assert.ok(html.includes('Publish externally</button>') && html.includes('disabled title="Requires authorized publishing connector"'), 'external publish must remain disabled without a connector');
assert.ok(html.includes('<script src="/studio/client.js"></script>'), 'browser runtime must be served separately');
assert.ok(client.includes('navigator.mediaDevices.getUserMedia'), 'camera capture must be wired');
assert.ok(client.includes('new MediaRecorder'), 'recording must be wired');
assert.ok(client.includes("download('atlas-smart-split-plan.json'"), 'Smart Split export must be wired');

const health = JSON.parse(await text('/api/studio/health'));
assert.equal(health.ok, true);
assert.equal(health.mode, 'real-data-only');
assert.ok(health.capabilities >= 12);

const cap = JSON.parse(await text('/api/studio/capabilities'));
assert.equal(cap.benchmark.cleanRoom, true);
assert.equal(cap.truthPolicy.inventedMetrics, false);
assert.equal(cap.truthPolicy.externalConnectionClaims, false);
assert.equal(cap.truthPolicy.recommendationEligibilityClaims, false);
const ids = new Set(cap.capabilities.map(x => x.id));
for (const id of ['home','create','publish','manage','comments','analytics','monetization','inbox','smart-split','outline','preflight','feedback']) {
  assert.ok(ids.has(id), `missing capability: ${id}`);
}

const benchmark = JSON.parse(await text('/api/studio/benchmark'));
assert.equal(benchmark.reviewed, '2026-08-22');
assert.ok(benchmark.sources.length >= 5);

console.log(`ATLAS Creator Studio validation passed: ${cap.capabilities.length} capabilities, real-data-only policy enforced.`);
