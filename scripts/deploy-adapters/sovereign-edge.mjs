import { createHash, randomUUID } from 'node:crypto';
import { access, cp, mkdir, readFile, readdir, rename, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';

const provider = 'ATLAS Sovereign Edge';
const root = () => path.resolve(process.env.ATLAS_ROOT || '/opt/atlas');
const edgeOrigin = () => String(process.env.ATLAS_EDGE_ORIGIN || `http://${process.env.ATLAS_EDGE_HOST || '127.0.0.1'}:${process.env.ATLAS_EDGE_PORT || '7402'}`).replace(/\/$/, '');
const runtimeOrigin = () => String(process.env.ATLAS_RUNTIME_ORIGIN || `http://${process.env.ATLAS_RUNTIME_HOST || '127.0.0.1'}:${process.env.ATLAS_RUNTIME_PORT || '7403'}`).replace(/\/$/, '');
const controlToken = () => String(process.env.ATLAS_CONTROL_TOKEN || '').trim();

const DESTRUCTIVE_MIGRATION = /\b(?:DROP\s+(?:TABLE|VIEW|INDEX)|TRUNCATE|DELETE\s+FROM|REPLACE\s+INTO|UPDATE\s+[A-Za-z0-9_"`]+\s+SET|ALTER\s+TABLE[\s\S]{0,200}\b(?:DROP|RENAME)\b)/i;

function sha256(content) {
  return createHash('sha256').update(content).digest('hex');
}

async function migrationSafety(snapshot) {
  const migrationDir = path.join(snapshot.releaseDir, 'source', 'migrations');
  let names = [];
  try { names = (await readdir(migrationDir)).filter((name) => /^\d+.*\.sql$/i.test(name)).sort(); } catch { return { ok: true, pending: [] }; }
  const schema = await fetchJson(`${runtimeOrigin()}/_atlas/runtime/schema`, {
    headers: { authorization: `Bearer ${controlToken()}`, accept: 'application/json' },
  });
  if (!schema.response.ok || schema.body?.ok !== true) {
    return { ok: false, reason: 'runtime_schema_unavailable', status: schema.response.status };
  }
  const applied = new Map((schema.body.migrations || []).map((row) => [row.name, row.sha256]));
  const pending = [];
  for (const name of names) {
    const sql = await readFile(path.join(migrationDir, name), 'utf8');
    const digest = sha256(sql);
    if (applied.has(name)) {
      if (applied.get(name) !== digest) return { ok: false, reason: 'migration_drift_preflight', migration: name };
      continue;
    }
    if (DESTRUCTIVE_MIGRATION.test(sql)) return { ok: false, reason: 'destructive_migration_blocked', migration: name };
    pending.push({ name, sha256: digest });
  }
  return { ok: true, pending };
}

async function exists(target) {
  try { await stat(target); return true; } catch { return false; }
}

async function fetchJson(url, init = {}) {
  const response = await fetch(url, init);
  const text = await response.text();
  let body = null;
  try { body = JSON.parse(text); } catch { body = { raw: text }; }
  return { response, body };
}

async function edgePost(pathname) {
  const token = controlToken();
  const { response, body } = await fetchJson(`${edgeOrigin()}${pathname}`, {
    method: 'POST',
    headers: { authorization: `Bearer ${token}`, accept: 'application/json' },
  });
  if (!response.ok) throw new Error(`atlas_edge_${response.status}:${body?.error || 'request_failed'}`);
  return body;
}

async function stageRelease(snapshot) {
  const source = path.join(snapshot.releaseDir, 'source');
  const releaseId = String(snapshot.releaseId || '').trim();
  if (!/^[A-Za-z0-9._-]{1,128}$/.test(releaseId)) throw new Error('invalid_sovereign_release_id');
  const releases = path.join(root(), 'releases');
  const destination = path.join(releases, releaseId);
  const manifest = {
    schema: 'atlas.sovereign.deployment.v1',
    releaseId,
    releaseIdentity: process.env.ATLAS_RELEASE_SHA || null,
    aggregateSha256: snapshot.aggregateSha256,
    stagedAt: new Date().toISOString(),
  };
  await mkdir(releases, { recursive: true });
  if (await exists(destination)) {
    let existing = null;
    try { existing = JSON.parse(await readFile(path.join(destination, '.atlas-release.json'), 'utf8')); } catch {}
    if (existing?.aggregateSha256 !== snapshot.aggregateSha256) throw new Error(`immutable_release_conflict:${releaseId}`);
    return { releaseId, destination, reused: true, manifest: existing };
  }
  const staging = path.join(releases, `.${releaseId}.staging-${randomUUID()}`);
  await rm(staging, { recursive: true, force: true });
  try {
    await mkdir(staging, { recursive: true });
    await cp(source, staging, { recursive: true, force: false, errorOnExist: true });
    await writeFile(path.join(staging, '.atlas-release.json'), `${JSON.stringify(manifest, null, 2)}\n`, { flag: 'wx' });
    await rename(staging, destination);
  } catch (error) {
    await rm(staging, { recursive: true, force: true }).catch(() => {});
    throw error;
  }
  return { releaseId, destination, reused: false, manifest };
}

export const id = 'sovereign-edge';
export { provider };
export const replaceable = false;

export async function preflight({ snapshot } = {}) {
  const missing = [];
  if (!controlToken()) missing.push('ATLAS_CONTROL_TOKEN');
  if (!snapshot?.releaseDir) missing.push('snapshot.releaseDir');
  if (!snapshot?.releaseId) missing.push('snapshot.releaseId');
  if (!snapshot?.aggregateSha256) missing.push('snapshot.aggregateSha256');
  if (missing.length) return { ok: false, reason: 'sovereign_edge_preflight_missing', missing };
  try {
    await access(path.join(snapshot.releaseDir, 'source'));
    const { response, body } = await fetchJson(`${edgeOrigin()}/health`, { headers: { accept: 'application/json' } });
    if (!response.ok || body?.ok !== true) return { ok: false, reason: 'atlas_edge_unhealthy', status: response.status };
    const migrationCheck = await migrationSafety(snapshot);
    if (!migrationCheck.ok) return migrationCheck;
    return { ok: true, provider, root: root(), edgeOrigin: edgeOrigin(), runtimeOrigin: runtimeOrigin(), pendingMigrations: migrationCheck.pending };
  } catch (error) {
    return { ok: false, reason: 'atlas_edge_unreachable', error: error?.message || String(error) };
  }
}

export async function deploy({ snapshot }) {
  const check = await preflight({ snapshot });
  if (!check.ok) throw new Error(`Sovereign Edge adapter blocked: ${check.reason}`);
  const staged = await stageRelease(snapshot);
  const promoted = await edgePost(`/api/releases/${encodeURIComponent(staged.releaseId)}/promote`);
  return { ok: true, provider, staged, promoted, verified: false };
}

export async function verify({ snapshot, deployment }) {
  const releaseId = deployment?.staged?.releaseId || snapshot?.releaseId;
  let runtime;
  try {
    const release = await fetchJson(`${runtimeOrigin()}/_atlas/runtime/release`, { headers: { accept: 'application/json' } });
    if (!release.response.ok || release.body?.releaseId !== releaseId) {
      throw new Error(`runtime_release_mismatch:${release.body?.releaseId || release.response.status}`);
    }
    const readiness = await fetchJson(`${runtimeOrigin()}/_atlas/runtime/readiness`, { headers: { accept: 'application/json' } });
    runtime = { release: release.body, readiness: readiness.body, readinessStatus: readiness.response.status };
    if (!readiness.response.ok || readiness.body?.ok !== true) throw new Error(`runtime_not_ready:${readiness.body?.reason || readiness.response.status}`);
  } catch (error) {
    let rollback = null;
    try { rollback = await edgePost('/api/rollback'); } catch (rollbackError) { rollback = { ok: false, error: rollbackError?.message || String(rollbackError) }; }
    return { ok: false, verified: false, provider, releaseId, runtime, error: error?.message || String(error), rollback };
  }

  const publicOrigin = String(process.env.ATLAS_PUBLIC_ORIGIN || '').replace(/\/$/, '');
  if (!publicOrigin) {
    return { ok: true, verified: false, provider, releaseId, runtime, reason: 'host_ready_public_origin_not_configured' };
  }

  try {
    const release = await fetchJson(`${publicOrigin}/api/release`, { headers: { accept: 'application/json' } });
    const readiness = await fetchJson(`${publicOrigin}/api/readiness`, { headers: { accept: 'application/json' } });
    const expectedIdentity = String(process.env.ATLAS_RELEASE_SHA || '');
    const identityMatches = release.response.ok && release.body?.releaseSha === expectedIdentity;
    const ready = readiness.response.ok && readiness.body?.ok === true;
    if (!identityMatches || !ready) {
      return {
        ok: true,
        verified: false,
        provider,
        releaseId,
        runtime,
        public: { origin: publicOrigin, release: release.body, readiness: readiness.body },
        reason: identityMatches ? 'public_origin_not_ready' : 'public_origin_release_not_promoted',
      };
    }
    return { ok: true, verified: true, provider, releaseId, runtime, public: { origin: publicOrigin, release: release.body, readiness: readiness.body } };
  } catch (error) {
    return { ok: true, verified: false, provider, releaseId, runtime, reason: 'public_origin_unreachable', error: error?.message || String(error) };
  }
}
