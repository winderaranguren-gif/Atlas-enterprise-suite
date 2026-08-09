'use strict';

const assert = require('node:assert/strict');
const dns = require('node:dns').promises;
const { URL } = require('node:url');

const origin = (process.env.ATLAS_PRODUCTION_URL || 'https://atlasenterprisesuite.com').replace(/\/$/, '');
const timeoutMs = Number(process.env.ATLAS_E2E_TIMEOUT_MS || 15000);
const hostname = new URL(origin).hostname;

async function diagnoseDns() {
  try {
    const addresses = await dns.lookup(hostname, { all: true });
    assert.ok(addresses.length > 0, `DNS returned no addresses for ${hostname}`);
    console.log(`ATLAS DNS: PASS — ${hostname} → ${addresses.map(a => a.address).join(', ')}`);
  } catch (error) {
    const code = error?.code || error?.cause?.code || 'DNS_ERROR';
    throw new Error(`DNS ${code} for ${hostname}: ${error?.message || error}`);
  }
}

async function fetchWithTimeout(path, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(`${origin}${path}`, {
      redirect: 'follow',
      ...options,
      signal: controller.signal,
      headers: { 'User-Agent': 'ATLAS-Production-E2E/0.5.0', ...(options.headers || {}) }
    });
  } catch (error) {
    const cause = error?.cause;
    const detail = cause ? `${cause.code || cause.name || 'network'}: ${cause.message || cause}` : (error?.message || error);
    throw new Error(`network failure on ${path}: ${detail}`);
  } finally {
    clearTimeout(timer);
  }
}

async function requireOk(path) {
  const response = await fetchWithTimeout(path);
  assert.equal(response.ok, true, `${path} returned HTTP ${response.status}`);
  return response;
}

async function requireAuth(path) {
  const response = await fetchWithTimeout(path);
  assert.equal(response.status, 401, `${path} must require authentication`);
  const payload = await response.json();
  assert.equal(payload.error, 'authentication_required', `${path} returned an unexpected auth error`);
}

async function main() {
  await diagnoseDns();

  const root = await requireOk('/');
  const html = await root.text();
  assert.match(html, /ATLAS/i, 'root page does not identify ATLAS');

  const healthResponse = await requireOk('/healthz');
  const health = await healthResponse.json();
  assert.deepEqual(health, { ok: true }, '/healthz must expose liveness only');

  const versionResponse = await requireOk('/api/version');
  const version = await versionResponse.json();
  assert.deepEqual(version, { ok: true }, '/api/version must not disclose build metadata publicly');

  await requireAuth('/api/support/capabilities');
  await requireAuth('/api/gps/status');

  const calendarResponse = await requireOk('/atlas-calendar.html');
  const calendar = await calendarResponse.text();
  assert.match(calendar, /ATLAS Calendar/);
  assert.match(calendar, /atlas-calendar-system-events\.js/);
  assert.match(calendar, /atlas-config\.js/);

  const notFound = await fetchWithTimeout('/api/atlas-e2e-not-found');
  assert.equal(notFound.status, 404, 'unknown API route must return JSON 404');
  const missing = await notFound.json();
  assert.equal(missing.error, 'api_not_found');

  console.log(`ATLAS production remote E2E: PASS — ${origin}`);
}

main().catch(error => {
  console.error(`ATLAS production remote E2E: FAIL — ${origin} — ${error.message}`);
  process.exitCode = 1;
});
