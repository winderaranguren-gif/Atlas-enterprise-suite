'use strict';

const { spawn } = require('node:child_process');
const assert = require('node:assert/strict');

const port = 43817;
const origin = `http://127.0.0.1:${port}`;
const child = spawn(process.execPath, ['server.js'], {
  cwd: require('node:path').resolve(__dirname, '..'),
  env: { ...process.env, HOST: '127.0.0.1', PORT: String(port) },
  stdio: ['ignore', 'pipe', 'pipe']
});

let stderr = '';
child.stderr.on('data', chunk => { stderr += chunk.toString(); });

async function request(path, options) {
  const response = await fetch(`${origin}${path}`, options);
  return response;
}

async function waitForServer() {
  const deadline = Date.now() + 10000;
  while (Date.now() < deadline) {
    try {
      const response = await request('/healthz');
      if (response.ok) return;
    } catch {}
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error(`ATLAS server did not become healthy. ${stderr}`);
}

async function main() {
  await waitForServer();

  const healthResponse = await request('/healthz');
  assert.equal(healthResponse.status, 200);
  const health = await healthResponse.json();
  assert.equal(health.ok, true);
  assert.equal(health.version, '0.5.0');
  assert.equal(health.runtime, 'node-local');

  const versionResponse = await request('/api/version');
  assert.equal(versionResponse.status, 200);
  const version = await versionResponse.json();
  assert.equal(version.version, '0.5.0');

  const capabilitiesResponse = await request('/api/support/capabilities');
  assert.equal(capabilitiesResponse.status, 200);
  const capabilities = await capabilitiesResponse.json();
  assert.equal(capabilities.ok, true);
  assert.ok(capabilities.capabilities.includes('safe-auto-repair'));

  const calendarResponse = await request('/atlas-calendar.html');
  assert.equal(calendarResponse.status, 200);
  const calendarHtml = await calendarResponse.text();
  assert.match(calendarHtml, /atlas-calendar-system-events\.js/);
  assert.match(calendarHtml, /atlas-config\.js/);
  assert.match(calendarHtml, /@supabase\/supabase-js/);

  const missingApiResponse = await request('/api/not-real');
  assert.equal(missingApiResponse.status, 404);
  const missingApi = await missingApiResponse.json();
  assert.equal(missingApi.error, 'api_not_found');

  console.log('ATLAS production smoke test: PASS');
}

main()
  .catch(error => {
    console.error(`ATLAS production smoke test: FAIL — ${error.message}`);
    process.exitCode = 1;
  })
  .finally(() => {
    child.kill('SIGTERM');
  });
