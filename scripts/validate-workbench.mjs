import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { WORKBENCH_CAPABILITIES, createWorkbenchScaffold, handleWorkbench } from '../modules/workbench-worker.js';

const ROOT=resolve(process.cwd());
const files=['atlas/workbench.mjs','atlas/model-engine.mjs','atlas/connectors.mjs','atlas/forge.mjs','modules/workbench-worker.js','rideos-router.js'];
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

const forge=spawnSync(process.execPath,['atlas/forge.mjs','inspect'],{cwd:ROOT,encoding:'utf8'});
assert.equal(forge.status,0,forge.stderr||forge.stdout);
const forgeManifest=JSON.parse(forge.stdout);
assert.ok(forgeManifest.fileCount>10);
assert.ok(!Object.keys(forgeManifest.files).some((p)=>p.startsWith('.git/')||p.startsWith('node_modules/')||p.startsWith('.atlas/')));

console.log(`ATLAS Workbench validation passed: ${WORKBENCH_CAPABILITIES.length} capabilities.`);
