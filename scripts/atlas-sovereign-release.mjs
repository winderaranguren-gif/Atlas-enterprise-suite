import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    encoding: options.capture ? 'utf8' : undefined,
    stdio: options.capture ? ['ignore', 'pipe', 'inherit'] : 'inherit',
    shell: process.platform === 'win32',
    env: process.env,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${command} exited with status ${result.status}`);
  return options.capture ? String(result.stdout || '').trim() : '';
}

const args = process.argv.slice(2);
const targetArg = args.find((arg) => arg.startsWith('--target='));
const target = (targetArg?.split('=')[1] || process.env.ATLAS_DEPLOY_TARGET || 'bundle').trim();
const skipBuild = args.includes('--skip-build');
if (!/^[a-z0-9-]+$/i.test(target)) throw new Error('Invalid ATLAS deploy target.');

const snapshotRaw = run('node', ['scripts/atlas-sovereign-snapshot.mjs'], { capture: true });
let snapshot = null;
try { snapshot = JSON.parse(snapshotRaw.split('\n').at(-1)); } catch { snapshot = { raw: snapshotRaw }; }
if (!snapshot?.aggregateSha256 || !/^[0-9a-f]{64}$/i.test(snapshot.aggregateSha256)) {
  throw new Error('Sovereign snapshot did not produce a valid aggregate SHA-256.');
}
process.env.ATLAS_RELEASE_SHA = snapshot.aggregateSha256.slice(0, 40);
process.env.ATLAS_RELEASE_BRANCH = 'main';
if (!skipBuild) run('npm', ['run', 'build:sovereign']);

const adapterPath = path.resolve('scripts', 'deploy-adapters', `${target}.mjs`);
let adapter;
try {
  adapter = await import(pathToFileURL(adapterPath).href);
} catch (error) {
  if (error?.code === 'ERR_MODULE_NOT_FOUND') throw new Error(`Unknown ATLAS deploy adapter: ${target}`);
  throw error;
}

const preflight = await adapter.preflight?.({ snapshot });
if (preflight && !preflight.ok) {
  console.error(JSON.stringify({ ok: false, phase: 'preflight', target, preflight, snapshot }));
  process.exit(2);
}
const deployment = await adapter.deploy?.({ snapshot });
const verification = await adapter.verify?.({ snapshot, deployment });

console.log(JSON.stringify({
  ok: Boolean(deployment?.ok) && (verification?.ok !== false),
  mode: 'ATLAS Sovereign Runtime',
  githubRequired: false,
  releaseIdentity: process.env.ATLAS_RELEASE_SHA,
  target,
  snapshot,
  deployment,
  verification,
}, null, 2));
