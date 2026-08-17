import http from 'node:http';
import { lstat, mkdir, readFile, readdir, realpath, rename, rm, symlink, writeFile } from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.env.ATLAS_ROOT || '/opt/atlas';
const RELEASES = path.join(ROOT, 'releases');
const CURRENT = path.join(ROOT, 'current');
const STATE = path.join(ROOT, 'state', 'edge.json');
const TOKEN = String(process.env.ATLAS_CONTROL_TOKEN || '');
const HOST = process.env.ATLAS_EDGE_HOST || '127.0.0.1';
const PORT = Number(process.env.ATLAS_EDGE_PORT || 7402);

function json(res, code, data) {
  res.writeHead(code, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'x-content-type-options': 'nosniff',
  });
  res.end(JSON.stringify(data));
}

function auth(req) {
  return Boolean(TOKEN) && req.headers.authorization === `Bearer ${TOKEN}`;
}

function validId(id) {
  const value = String(id || '');
  return /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(value) && value !== '.' && value !== '..';
}

async function ensure() {
  await mkdir(RELEASES, { recursive: true });
  await mkdir(path.dirname(STATE), { recursive: true });
}

async function state() {
  try { return JSON.parse(await readFile(STATE, 'utf8')); }
  catch { return { activeRelease: null, previousRelease: null, updatedAt: null }; }
}

async function save(nextState) {
  const temporary = `${STATE}.tmp`;
  await writeFile(temporary, JSON.stringify(nextState, null, 2));
  await rename(temporary, STATE);
}

async function releaseRoot() {
  await ensure();
  return realpath(RELEASES);
}

async function resolveRelease(id) {
  if (!validId(id)) throw new Error('invalid_release_id');
  const root = await releaseRoot();
  const candidate = path.join(root, id);
  const entry = await lstat(candidate);
  if (entry.isSymbolicLink()) throw new Error('release_symlink_forbidden');
  if (!entry.isDirectory()) throw new Error('release_directory_required');
  const resolved = await realpath(candidate);
  if (path.dirname(resolved) !== root) throw new Error('release_outside_root');
  return { root, resolved };
}

async function list() {
  await ensure();
  const entries = await readdir(RELEASES, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isDirectory() && validId(entry.name))
    .map((entry) => entry.name)
    .sort()
    .reverse();
}

async function promote(id) {
  const { root, resolved: target } = await resolveRelease(id);
  let old = null;
  try { old = await realpath(CURRENT); } catch {}
  const oldId = old && path.dirname(old) === root ? path.basename(old) : null;

  const next = `${CURRENT}.next`;
  await rm(next, { force: true, recursive: true });
  await symlink(target, next, 'dir');
  await rename(next, CURRENT);

  const currentState = await state();
  const previous = currentState.activeRelease && validId(currentState.activeRelease)
    ? currentState.activeRelease
    : oldId;
  const nextState = {
    activeRelease: id,
    previousRelease: previous === id ? currentState.previousRelease : previous,
    updatedAt: new Date().toISOString(),
  };
  await save(nextState);
  return nextState;
}

async function rollback() {
  const currentState = await state();
  if (!currentState.previousRelease || !validId(currentState.previousRelease)) throw new Error('no_previous_release');
  return promote(currentState.previousRelease);
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://atlas');
    if (url.pathname === '/health') return json(res, 200, { ok: true, service: 'atlas-edge' });
    if (url.pathname === '/readiness') {
      const currentState = await state();
      return json(res, currentState.activeRelease ? 200 : 503, { ok: Boolean(currentState.activeRelease), service: 'atlas-edge', ...currentState });
    }
    if (!auth(req)) return json(res, 401, { ok: false, error: 'unauthorized' });
    if (req.method === 'GET' && url.pathname === '/api/releases') {
      return json(res, 200, { ok: true, releases: await list(), state: await state() });
    }
    const match = url.pathname.match(/^\/api\/releases\/([^/]+)\/promote$/);
    if (req.method === 'POST' && match) {
      return json(res, 200, { ok: true, state: await promote(decodeURIComponent(match[1])) });
    }
    if (req.method === 'POST' && url.pathname === '/api/rollback') {
      return json(res, 200, { ok: true, state: await rollback() });
    }
    return json(res, 404, { ok: false, error: 'not_found' });
  } catch (error) {
    return json(res, 500, { ok: false, error: error?.message || 'edge_error' });
  }
});

await ensure();
server.listen(PORT, HOST, () => console.log(`ATLAS Edge listening on http://${HOST}:${PORT}`));
