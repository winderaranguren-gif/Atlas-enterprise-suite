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
  assert.equal(health.support, '1.1.0');
  assert.equal(health.runbookVersion, '1.0.0');
  assert.equal(health.runtime, 'node-local');

  const versionResponse = await request('/api/version');
  assert.equal(versionResponse.status, 200);
  const version = await versionResponse.json();
  assert.equal(version.version, '0.5.0');
  assert.equal(version.supportVersion, '1.1.0');

  const capabilitiesResponse = await request('/api/support/capabilities');
  assert.equal(capabilitiesResponse.status, 200);
  const capabilities = await capabilitiesResponse.json();
  assert.equal(capabilities.ok, true);
  assert.ok(capabilities.capabilities.includes('safe-auto-repair'));
  assert.ok(capabilities.capabilities.includes('runbook-planning'));

  const runbooksResponse = await request('/api/support/runbooks');
  assert.equal(runbooksResponse.status, 200);
  const runbooks = await runbooksResponse.json();
  assert.equal(runbooks.ok, true);
  assert.equal(runbooks.runbookVersion, '1.0.0');
  assert.ok(runbooks.classifications.includes('deployment'));

  const aiStatusResponse = await request('/api/atlas-ai/status');
  assert.equal(aiStatusResponse.status, 200);
  const aiStatus = await aiStatusResponse.json();
  assert.equal(aiStatus.ok, true);
  assert.equal(aiStatus.service, 'ATLAS Intelligence');
  assert.equal(aiStatus.configured, false);

  const aiResponse = await request('/api/atlas-ai/respond', {
    method:'POST',
    headers:{'content-type':'application/json'},
    body:JSON.stringify({messages:[{role:'user',content:'Hello ATLAS'}]})
  });
  assert.equal(aiResponse.status, 503);
  const aiUnavailable = await aiResponse.json();
  assert.equal(aiUnavailable.error, 'openai_not_configured');

  const aiPageResponse = await request('/atlas-intelligence.html');
  assert.equal(aiPageResponse.status, 200);
  const aiPage = await aiPageResponse.text();
  assert.match(aiPage, /ATLAS Intelligence/);
  assert.match(aiPage, /atlas-intelligence\.js/);

  const planResponse = await request('/api/support/plan', {
    method:'POST',
    headers:{'content-type':'application/json'},
    body:JSON.stringify({
      summary:'Cloudflare deploy is offline and the Service Worker is missing',
      diagnostics:[
        {id:'service-worker',label:'Service Worker / PWA',ok:false,detail:'No registration'},
        {id:'network',label:'Connectivity',ok:false,detail:'Offline'}
      ]
    })
  });
  assert.equal(planResponse.status, 200);
  const plan = await planResponse.json();
  assert.equal(plan.ok, true);
  assert.equal(plan.classification, 'deployment');
  assert.ok(plan.steps.some(step => step.id === 'repair-service-worker' && step.mode === 'auto-safe'));
  assert.ok(plan.steps.some(step => step.id === 'network-access' && step.status === 'blocked'));
  assert.equal(plan.steps.at(-1).id, 'verify-final');

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
