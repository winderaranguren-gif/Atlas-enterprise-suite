import assert from 'node:assert/strict';
import {handleCreatorRelease,PROJECTS,releaseContract} from '../modules/creator-release-worker.js';

assert.equal(PROJECTS.venezuela.country,'VE');
assert.equal(PROJECTS.venezuela.locale,'es-VE');
assert.equal(PROJECTS.venezuela.currency,'VES');
assert.equal(PROJECTS.venezuela.route,'/ve');
assert.ok(PROJECTS.venezuela.modules.includes('ATLAS Pay'));

const contract=releaseContract(PROJECTS.venezuela);
assert.equal(contract.source.branch,'main');
assert.equal(contract.policy.simulateDeploy,false);
assert.equal(contract.policy.fabricatedMetrics,false);
assert.ok(contract.gates.some(g=>g.id==='cloudflare-auth'&&g.state==='external-check'));

const page=await handleCreatorRelease(new Request('https://atlasenterprisesuite.com/studio/release'));
assert.equal(page.status,200);
const html=await page.text();
assert.match(html,/ATLAS Creator/);
assert.match(html,/Release Center/);
assert.match(html,/ATLAS Venezuela/);
assert.match(html,/Crear plan en Creator Director/);

const projects=await (await handleCreatorRelease(new Request('https://atlasenterprisesuite.com/api/studio/release/projects'))).json();
assert.equal(projects.service,'atlas-creator-release');
assert.equal(projects.projects[0].route,'/ve');

const statusResponse=await handleCreatorRelease(new Request('https://atlasenterprisesuite.com/api/studio/release/status?project=venezuela&offline=1'));
assert.equal(statusResponse.status,200);
const status=await statusResponse.json();
assert.equal(status.ok,true);
assert.equal(status.github.status,'offline-validation');
assert.equal(status.project.country,'VE');

const missing=await handleCreatorRelease(new Request('https://atlasenterprisesuite.com/api/studio/release/status?project=missing&offline=1'));
assert.equal(missing.status,404);

console.log('ATLAS Creator Release Center validation passed.');
