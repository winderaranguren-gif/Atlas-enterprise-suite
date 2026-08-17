import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    encoding: options.capture ? 'utf8' : undefined,
    stdio: options.capture ? ['ignore', 'pipe', options.quietError ? 'pipe' : 'inherit'] : 'inherit',
    shell: process.platform === 'win32',
    env: process.env,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    if (options.allowFailure) return '';
    throw new Error(`${command} exited with status ${result.status}`);
  }
  return options.capture ? String(result.stdout || '').trim() : '';
}

function git(args, options = {}) {
  return run('git', args, { capture: true, allowFailure: options.allowFailure, quietError: true });
}

const args = process.argv.slice(2);
const targetArg = args.find((arg) => arg.startsWith('--target='));
const target = (targetArg?.split('=')[1] || process.env.ATLAS_DEPLOY_TARGET || 'bundle').trim();
const skipBuild = args.includes('--skip-build');
if (!/^[a-z0-9-]+$/i.test(target)) throw new Error('Invalid ATLAS deploy target.');

const explicitSha = String(process.env.ATLAS_RELEASE_SHA || '').trim();
const explicitBranch = String(process.env.ATLAS_RELEASE_BRANCH || '').trim();
const gitSha = explicitSha ? '' : git(['rev-parse', 'HEAD'], { allowFailure: true });
const gitBranch = explicitBranch ? '' : git(['rev-parse', '--abbrev-ref', 'HEAD'], { allowFailure: true });
const releaseIdentity = explicitSha || gitSha;
const releaseBranch = explicitBranch || gitBranch;
if (!/^[0-9a-f]{40}$/i.test(releaseIdentity)) throw new Error('ATLAS sovereign release identity unavailable. Commit the release in ATLAS Forge/Git or set ATLAS_RELEASE_SHA.');
if (releaseBranch !== 'main') throw new Error(`ATLAS sovereign releases must originate from main, received: ${releaseBranch || 'unknown'}`);
if (!explicitSha) {
  const dirty = git(['status', '--porcelain', '--untracked-files=normal'], { allowFailure: true });
  if (dirty) throw new Error('ATLAS sovereign release requires a clean committed source tree before stamping.');
}
process.env.ATLAS_RELEASE_SHA = releaseIdentity;
process.env.ATLAS_RELEASE_BRANCH = releaseBranch;

if (!skipBuild) run('npm', ['run', 'build:sovereign']);

const snapshotRaw = run('node', ['scripts/atlas-sovereign-snapshot.mjs'], { capture: true });
let snapshot = null;
try { snapshot = JSON.parse(snapshotRaw.split('\n').at(-1)); } catch { snapshot = { raw: snapshotRaw }; }
if (!snapshot?.aggregateSha256 || !/^[0-9a-f]{64}$/i.test(snapshot.aggregateSha256)) {
  throw new Error('Sovereign snapshot did not produce a valid aggregate SHA-256.');
}

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
  console.error(JSON.stringify({ ok: false, phase: 'preflight', target, preflight, releaseIdentity, snapshot }));
  process.exit(2);
}
const deployment = await adapter.deploy?.({ snapshot });
const verification = await adapter.verify?.({ snapshot, deployment });

console.log(JSON.stringify({
  ok: Boolean(deployment?.ok) && (verification?.ok !== false),
  liveVerified: verification?.verified === true,
  mode: 'ATLAS Sovereign Runtime',
  githubRequired: false,
  releaseIdentity,
  releaseBranch,
  artifactSha256: snapshot.aggregateSha256,
  target,
  snapshot,
  deployment,
  verification,
}, null, 2));
