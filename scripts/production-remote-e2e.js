'use strict';

const assert = require('node:assert/strict');

const origin = (process.env.ATLAS_PRODUCTION_URL || 'https://atlasenterprisesuite.com').replace(/\/$/, '');
const timeoutMs = Number(process.env.ATLAS_E2E_TIMEOUT_MS || 15000);

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
  } finally {
    clearTimeout(timer);
  }
}

async function requireOk(path) {
  const response = await fetchWithTimeout(path);
  assert.equal(response.ok, true, `${path} returned HTTP ${response.status}`);
  return response;
}

async function main() {
  const root = await requireOk('/');
  const html = await root.text();
  assert.match(html, /ATLAS/i, 'root page does not identify ATLAS');

  const healthResponse = await requireOk('/healthz');
  const health = await healthResponse.json();
  assert.equal(health.ok, true, '/healthz did not report ok=true');
  assert.equal(health.version, '0.5.0', `unexpected deployed version: ${health.version}`);

  const versionResponse = await requireOk('/api/version');
  const version = await versionResponse.json();
  assert.equal(version.version, '0.5.0', '/api/version does not report 0.5.0');

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
