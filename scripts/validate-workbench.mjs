import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { WORKBENCH_CAPABILITIES, createWorkbenchScaffold, handleWorkbench } from '../modules/workbench-worker.js';

const ROOT=resolve(process.cwd());
const files=['atlas/workbench.mjs','atlas/model-engine.mjs','atlas/connectors.mjs','atlas/providers.mjs','atlas/oauth.mjs','atlas/sandbox.mjs','atlas/forge.mjs','modules/workbench-worker.js','rideos-router.js'];
for(const file of files){
  const r=spawnSync(process.execPath,['--check',resolve(ROOT,file)],{encoding:'utf8'});
  assert.equal(r.status,0,`${file} syntax failed: ${r.stderr||r.stdout}`);
}

assert.ok(WORKBENCH_CAPABILITIES.length>=10,'Workbench should expose a broad sovereign tool catalog');
const ids=new Set(WORKBENCH_CAPABILITIES.map((c)=>c.id));
for(const required of ['builder','files','search','tasks','checkpoints','schemas','entities','connectors','release','deployment']) assert.ok(ids.has(required),`missing capability ${required}`);

const scaffold=createWorkbenchScaffold('Vendor Portal','Secure vendor workspace');
assert.equal(scaffold.id,'vendor-portal');
assert.equal(scaffold.route,'/vendor-portal');
assert.equal(scaffold.statusRoute,'/api/vendor-portal/status');
assert.equal(scaffold.files.length,3);
assert.match(scaffold.routerImport,/handleVendorPortal/);

const status=handleWorkbench(new Request('https://atlas.local/api/workbench/status'),{});
assert.ok(status);
assert.equal(status.status,200);
const statusBody=await status.json();
assert.equal(statusBody.ok,true);
assert.equal(statusBody.webMutationEndpoint,false);

const catalog=handleWorkbench(new Request('https://atlas.local/api/workbench/catalog'),{});
assert.equal(catalog.status,200);
assert.ok((await catalog.json()).capabilities.length>=10);

const page=handleWorkbench(new Request('https://atlas.local/workbench'),{});
assert.equal(page.status,200);
const html=await page.text();
assert.match(html,/ATLAS Workbench/);
assert.match(html,/Build the tools we depend on/);
assert.match(html,/Repository mutations execute through the ATLAS Node CLI or CI/);

const cli=spawnSync(process.execPath,['atlas/workbench.mjs','status'],{cwd:ROOT,encoding:'utf8'});
assert.equal(cli.status,0,cli.stderr||cli.stdout);
const cliStatus=JSON.parse(cli.stdout);
assert.equal(cliStatus.service,'ATLAS Sovereign Workbench');
assert.ok(cliStatus.tools.includes('app.scaffold'));

const model=spawnSync(process.execPath,['atlas/model-engine.mjs','status'],{cwd:ROOT,encoding:'utf8'});
assert.equal(model.status,0,model.stderr||model.stdout);
assert.equal(JSON.parse(model.stdout).service,'ATLAS Model Engine');

const connectors=spawnSync(process.execPath,['atlas/connectors.mjs','catalog'],{cwd:ROOT,encoding:'utf8'});
assert.equal(connectors.status,0,connectors.stderr||connectors.stdout);
const connectorCatalog=JSON.parse(connectors.stdout);
assert.equal(connectorCatalog.policy.secretsStoredInRegistry,false);

const providers=spawnSync(process.execPath,['atlas/providers.mjs','catalog'],{cwd:ROOT,encoding:'utf8'});
assert.equal(providers.status,0,providers.stderr||providers.stdout);
const providerCatalog=JSON.parse(providers.stdout);
assert.equal(providerCatalog.service,'ATLAS Provider Adapters');
assert.equal(providerCatalog.policy.secretValuesStored,false);
assert.ok(providerCatalog.providers.some((p)=>p.id==='cloudflare'));
assert.ok(providerCatalog.providers.some((p)=>p.id==='openai'));

const providerPlan=spawnSync(process.execPath,['atlas/providers.mjs','plan','cloudflare','deploy','--json','{"service":"atlas"}'],{cwd:ROOT,encoding:'utf8'});
assert.equal(providerPlan.status,0,providerPlan.stderr||providerPlan.stdout);
const providerPlanBody=JSON.parse(providerPlan.stdout);
assert.equal(providerPlanBody.executable,false);
assert.equal(providerPlanBody.contract.auditRequired,true);

const oauth=spawnSync(process.execPath,['atlas/oauth.mjs','status'],{cwd:ROOT,encoding:'utf8'});
assert.equal(oauth.status,0,oauth.stderr||oauth.stdout);
const oauthStatus=JSON.parse(oauth.stdout);
assert.equal(oauthStatus.service,'ATLAS OAuth Broker');
assert.equal(oauthStatus.pkce,true);
assert.equal(oauthStatus.tokenPersistence,false);

const pkce=spawnSync(process.execPath,['atlas/oauth.mjs','pkce','--auth-url','https://example.com/authorize','--client-id','atlas-test','--redirect-uri','https://atlas.local/callback','--scope','openid profile'],{cwd:ROOT,encoding:'utf8'});
assert.equal(pkce.status,0,pkce.stderr||pkce.stdout);
const pkceBody=JSON.parse(pkce.stdout);
assert.equal(pkceBody.method,'S256');
assert.match(pkceBody.authorizationUrl,/code_challenge=/);
assert.equal(pkceBody.policy.persistedByTool,false);

const sandbox=spawnSync(process.execPath,['atlas/sandbox.mjs','create','ci-validation'],{cwd:ROOT,encoding:'utf8'});
assert.equal(sandbox.status,0,sandbox.stderr||sandbox.stdout);
const sandboxBody=JSON.parse(sandbox.stdout);
assert.equal(sandboxBody.operation,'create');
assert.equal(sandboxBody.apply,false);
assert.equal(sandboxBody.sandbox.safeScriptsOnly,true);

const forge=spawnSync(process.execPath,['atlas/forge.mjs','inspect'],{cwd:ROOT,encoding:'utf8'});
assert.equal(forge.status,0,forge.stderr||forge.stdout);
const forgeManifest=JSON.parse(forge.stdout);
assert.ok(forgeManifest.fileCount>10);
assert.ok(!Object.keys(forgeManifest.files).some((p)=>p.startsWith('.git/')||p.startsWith('node_modules/')||p.startsWith('.atlas/')));

console.log(`ATLAS Workbench validation passed: ${WORKBENCH_CAPABILITIES.length} capabilities plus provider, OAuth and sandbox adapters.`);
