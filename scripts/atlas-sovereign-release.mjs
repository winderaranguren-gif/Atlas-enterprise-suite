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

if (!skipBuild) run('npm', ['run', 'build:sovereign']);
const snapshotRaw = run('node', ['scripts/atlas-sovereign-snapshot.mjs'], { capture: true });
let snapshot = null;
try { snapshot = JSON.parse(snapshotRaw.split('\n').at(-1)); } catch { snapshot = { raw: snapshotRaw }; }

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
let verification = null;
if (target !== 'bundle') verification = await adapter.verify?.({ snapshot, deployment });
else verification = await adapter.verify?.({ snapshot, deployment });

console.log(JSON.stringify({
  ok: Boolean(deployment?.ok) && (verification?.ok !== false),
  mode: 'ATLAS Sovereign Runtime',
  githubRequired: false,
  target,
  snapshot,
  deployment,
  verification,
}, null, 2));
