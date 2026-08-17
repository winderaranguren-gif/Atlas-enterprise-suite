import http from 'node:http';
import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { mkdir, readFile, readdir, realpath, stat } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { Readable } from 'node:stream';
import { D1SQLiteDatabase } from './d1-sqlite.mjs';

const ROOT = process.env.ATLAS_ROOT || '/opt/atlas';
const CURRENT = path.join(ROOT, 'current');
const HOST = process.env.ATLAS_RUNTIME_HOST || '127.0.0.1';
const PORT = Number(process.env.ATLAS_RUNTIME_PORT || 7403);
const DB_PATH = process.env.ATLAS_SQLITE_PATH || path.join(ROOT, 'state', 'atlas.sqlite3');
const PUBLIC_ORIGIN = String(process.env.ATLAS_PUBLIC_ORIGIN || '').replace(/\/$/, '');
const MAX_BODY_BYTES = Number(process.env.ATLAS_MAX_REQUEST_BYTES || 25 * 1024 * 1024);
const MIME = new Map([
  ['.avif', 'image/avif'], ['.css', 'text/css; charset=utf-8'], ['.gif', 'image/gif'], ['.ico', 'image/x-icon'],
  ['.jpeg', 'image/jpeg'], ['.jpg', 'image/jpeg'], ['.js', 'text/javascript; charset=utf-8'], ['.json', 'application/json; charset=utf-8'],
  ['.png', 'image/png'], ['.svg', 'image/svg+xml; charset=utf-8'], ['.txt', 'text/plain; charset=utf-8'], ['.webp', 'image/webp'],
  ['.woff', 'font/woff'], ['.woff2', 'font/woff2'],
]);

await mkdir(path.dirname(DB_PATH), { recursive: true });
const DB = await D1SQLiteDatabase.open(DB_PATH);
DB.native.exec(`CREATE TABLE IF NOT EXISTS atlas_schema_migrations(
  name TEXT PRIMARY KEY,
  sha256 TEXT NOT NULL,
  applied_at TEXT NOT NULL DEFAULT (datetime('now'))
)`);

let loaded = null;
let loading = null;

function sha256(content) {
  return createHash('sha256').update(content).digest('hex');
}

async function applyMigrations(releasePath) {
  const migrationDir = path.join(releasePath, 'migrations');
  let names = [];
  try { names = (await readdir(migrationDir)).filter((name) => /^\d+.*\.sql$/i.test(name)).sort(); } catch { return { applied: 0, total: 0 }; }
  let applied = 0;
  for (const name of names) {
    const sql = await readFile(path.join(migrationDir, name), 'utf8');
    const digest = sha256(sql);
    const existing = DB.native.prepare('SELECT sha256 FROM atlas_schema_migrations WHERE name=?').get(name);
    if (existing) {
      if (existing.sha256 !== digest) throw new Error(`migration_drift:${name}`);
      continue;
    }
    DB.native.exec('BEGIN IMMEDIATE');
    try {
      DB.native.exec(sql);
      DB.native.prepare('INSERT INTO atlas_schema_migrations(name,sha256) VALUES(?,?)').run(name, digest);
      DB.native.exec('COMMIT');
      applied += 1;
    } catch (error) {
      try { DB.native.exec('ROLLBACK'); } catch {}
      throw new Error(`migration_failed:${name}:${error?.message || 'unknown'}`);
    }
  }
  return { applied, total: names.length };
}

function createAssetsBinding(assetRoot) {
  const root = path.resolve(assetRoot);
  return {
    async fetch(request) {
      const url = new URL(request.url);
      let pathname;
      try { pathname = decodeURIComponent(url.pathname); } catch { return new Response('Bad Request', { status: 400 }); }
      const relative = pathname.replace(/^\/+/, '');
      const resolved = path.resolve(root, relative);
      if (resolved !== root && !resolved.startsWith(`${root}${path.sep}`)) return new Response('Forbidden', { status: 403 });
      let info;
      try { info = await stat(resolved); } catch { return new Response('Not Found', { status: 404 }); }
      if (!info.isFile()) return new Response('Not Found', { status: 404 });
      const stream = Readable.toWeb(createReadStream(resolved));
      return new Response(stream, {
        headers: {
          'content-type': MIME.get(path.extname(resolved).toLowerCase()) || 'application/octet-stream',
          'cache-control': 'public,max-age=900',
          'x-content-type-options': 'nosniff',
        },
      });
    },
  };
}

function runtimeEnv(assets) {
  const base = { DB, ASSETS: assets };
  return new Proxy(base, {
    get(target, property) {
      if (property in target) return target[property];
      if (typeof property === 'string') return process.env[property];
      return undefined;
    },
    has(target, property) {
      return property in target || (typeof property === 'string' && property in process.env);
    },
  });
}

async function loadApplication() {
  const releasePath = await realpath(CURRENT);
  if (loaded?.releasePath === releasePath) return loaded;
  if (loading) return loading;
  loading = (async () => {
    const migrations = await applyMigrations(releasePath);
    const entry = path.join(releasePath, 'worker-meta.js');
    const entryInfo = await stat(entry);
    const moduleUrl = `${pathToFileURL(entry).href}?atlas_release=${encodeURIComponent(path.basename(releasePath))}-${entryInfo.mtimeMs}`;
    const imported = await import(moduleUrl);
    if (!imported?.default || typeof imported.default.fetch !== 'function') throw new Error('worker_fetch_export_missing');
    const next = {
      releasePath,
      releaseId: path.basename(releasePath),
      worker: imported.default,
      env: runtimeEnv(createAssetsBinding(path.join(releasePath, 'assets'))),
      migrations,
      loadedAt: new Date().toISOString(),
    };
    loaded = next;
    return next;
  })();
  try { return await loading; } finally { loading = null; }
}

function requestHeaders(req) {
  const headers = new Headers();
  for (const [name, value] of Object.entries(req.headers)) {
    if (Array.isArray(value)) value.forEach((item) => headers.append(name, item));
    else if (value !== undefined) headers.set(name, String(value));
  }
  return headers;
}

function requestOrigin(req) {
  if (PUBLIC_ORIGIN) return PUBLIC_ORIGIN;
  const forwardedProto = String(req.headers['x-forwarded-proto'] || '').split(',')[0].trim();
  const proto = forwardedProto || 'http';
  const host = String(req.headers.host || `127.0.0.1:${PORT}`);
  return `${proto}://${host}`;
}

async function webRequest(req) {
  const target = new URL(req.url || '/', requestOrigin(req)).toString();
  const method = String(req.method || 'GET').toUpperCase();
  const init = { method, headers: requestHeaders(req), redirect: 'manual' };
  if (method !== 'GET' && method !== 'HEAD') {
    const declaredLength = Number(req.headers['content-length'] || 0);
    if (declaredLength > MAX_BODY_BYTES) throw Object.assign(new Error('request_body_too_large'), { statusCode: 413 });
    const chunks = [];
    let total = 0;
    for await (const chunk of req) {
      const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      total += buffer.length;
      if (total > MAX_BODY_BYTES) throw Object.assign(new Error('request_body_too_large'), { statusCode: 413 });
      chunks.push(buffer);
    }
    if (total) init.body = Buffer.concat(chunks, total);
  }
  return new Request(target, init);
}

async function sendWebResponse(res, response) {
  res.statusCode = response.status;
  res.statusMessage = response.statusText || res.statusMessage;
  const setCookies = typeof response.headers.getSetCookie === 'function' ? response.headers.getSetCookie() : [];
  for (const [name, value] of response.headers) {
    if (name.toLowerCase() !== 'set-cookie') res.setHeader(name, value);
  }
  if (setCookies.length) res.setHeader('set-cookie', setCookies);
  if (!response.body) return res.end();
  Readable.fromWeb(response.body).on('error', (error) => res.destroy(error)).pipe(res);
}

function json(res, status, body) {
  res.statusCode = status;
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.setHeader('cache-control', 'no-store');
  res.end(JSON.stringify(body));
}

async function runtimeReadiness(req, res) {
  try {
    const app = await loadApplication();
    const pending = new Set();
    const ctx = { waitUntil(promise) { pending.add(Promise.resolve(promise)); }, passThroughOnException() {} };
    const request = new Request(`${requestOrigin(req)}/api/readiness`, { method: 'GET', headers: requestHeaders(req) });
    const response = await app.worker.fetch(request, app.env, ctx);
    const body = await response.text();
    res.statusCode = response.status;
    res.setHeader('content-type', response.headers.get('content-type') || 'application/json; charset=utf-8');
    res.setHeader('cache-control', 'no-store');
    res.setHeader('x-atlas-sovereign-release', app.releaseId);
    res.end(body);
    Promise.allSettled([...pending]).catch(() => {});
  } catch (error) {
    json(res, 503, { ok: false, service: 'atlas-runtime', error: error?.message || 'runtime_not_ready' });
  }
}

const server = http.createServer(async (req, res) => {
  try {
    const pathname = new URL(req.url || '/', 'http://atlas').pathname;
    if (pathname === '/_atlas/runtime/health') {
      return json(res, 200, { ok: true, service: 'atlas-runtime', database: 'sqlite', loadedRelease: loaded?.releaseId || null });
    }
    if (pathname === '/_atlas/runtime/readiness') return runtimeReadiness(req, res);
    if (pathname === '/_atlas/runtime/release') {
      const app = await loadApplication();
      return json(res, 200, { ok: true, service: 'atlas-runtime', releaseId: app.releaseId, releasePath: app.releasePath, migrations: app.migrations, loadedAt: app.loadedAt });
    }

    const app = await loadApplication();
    const pending = new Set();
    const ctx = {
      waitUntil(promise) { pending.add(Promise.resolve(promise)); },
      passThroughOnException() {},
    };
    const response = await app.worker.fetch(await webRequest(req), app.env, ctx);
    res.setHeader('x-atlas-sovereign-release', app.releaseId);
    await sendWebResponse(res, response);
    Promise.allSettled([...pending]).catch((error) => console.error('ATLAS waitUntil error', error));
  } catch (error) {
    const status = Number(error?.statusCode || 503);
    json(res, status, { ok: false, service: 'atlas-runtime', error: error?.message || 'runtime_error' });
  }
});

function shutdown(signal) {
  console.log(`ATLAS Runtime received ${signal}`);
  server.close(() => {
    try { DB.close(); } catch {}
    process.exit(0);
  });
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

server.listen(PORT, HOST, () => console.log(`ATLAS Runtime listening on http://${HOST}:${PORT}`));
