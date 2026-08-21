import assert from 'node:assert/strict';
import {handleCreatorRelease,PROJECTS,releaseContract} from '../modules/creator-release-worker.js';

assert.equal(PROJECTS['main-dashboard'].releaseKind,'web');
assert.equal(PROJECTS['main-dashboard'].route,'/');
assert.equal(PROJECTS['main-dashboard'].webBrief.authEntry,'/identity');
assert.equal(PROJECTS['main-dashboard'].webBrief.dataPolicy,'authorized-only');
assert.ok(PROJECTS['main-dashboard'].modules.includes('Accounting'));
assert.ok(PROJECTS['main-dashboard'].modules.includes('Settings'));
assert.equal(PROJECTS.venezuela.country,'VE');
assert.equal(PROJECTS.venezuela.locale,'es-VE');
assert.equal(PROJECTS.venezuela.currency,'VES');
assert.equal(PROJECTS.venezuela.route,'/ve');
assert.ok(PROJECTS.venezuela.modules.includes('ATLAS Pay'));

const mainContract=releaseContract(PROJECTS['main-dashboard']);
assert.equal(mainContract.source.branch,'main');
assert.equal(mainContract.policy.simulateDeploy,false);
assert.equal(mainContract.policy.fabricatedMetrics,false);
assert.equal(mainContract.policy.protectedModulesRequireAuthorization,true);
assert.ok(mainContract.gates.some(g=>g.id==='auth-boundary'&&g.state==='ready'));
assert.ok(mainContract.gates.some(g=>g.id==='cloudflare-auth'&&g.state==='external-check'));

const venezuelaContract=releaseContract(PROJECTS.venezuela);
assert.equal(venezuelaContract.policy.protectedModulesRequireAuthorization,false);
assert.ok(venezuelaContract.gates.some(g=>g.id==='country-layer'&&g.state==='ready'));

const page=await handleCreatorRelease(new Request('https://atlasenterprisesuite.com/studio/release'));
assert.equal(page.status,200);
const html=await page.text();
assert.match(html,/ATLAS Creator/);
assert.match(html,/Release Center/);
assert.match(html,/ATLAS Main Dashboard/);
assert.match(html,/Crear plan en Web Director/);
assert.match(html,/\/api\/studio\/creator\/web\/recipe/);
assert.match(html,/project\.liveMarker/);

const mainPage=await handleCreatorRelease(new Request('https://atlasenterprisesuite.com/studio/release/main-dashboard'));
assert.equal(mainPage.status,200);
assert.match(await mainPage.text(),/Public preview/);

const venezuelaPage=await handleCreatorRelease(new Request('https://atlasenterprisesuite.com/studio/release/venezuela'));
assert.equal(venezuelaPage.status,200);
const venezuelaHtml=await venezuelaPage.text();
assert.match(venezuelaHtml,/ATLAS Venezuela/);
assert.match(venezuelaHtml,/Crear plan en Creator Director/);

const projects=await (await handleCreatorRelease(new Request('https://atlasenterprisesuite.com/api/studio/release/projects'))).json();
assert.equal(projects.service,'atlas-creator-release');
assert.equal(projects.projects.length,2);
assert.ok(projects.projects.some(p=>p.id==='main-dashboard'&&p.route==='/'&&p.releaseKind==='web'));
assert.ok(projects.projects.some(p=>p.id==='venezuela'&&p.route==='/ve'&&p.releaseKind==='country'));

const statusResponse=await handleCreatorRelease(new Request('https://atlasenterprisesuite.com/api/studio/release/status?project=main-dashboard&offline=1'));
assert.equal(statusResponse.status,200);
const status=await statusResponse.json();
assert.equal(status.ok,true);
assert.equal(status.github.status,'offline-validation');
assert.equal(status.project.route,'/');
assert.equal(status.policy.fabricatedMetrics,false);

const defaultStatus=await handleCreatorRelease(new Request('https://atlasenterprisesuite.com/api/studio/release/status?offline=1'));
assert.equal(defaultStatus.status,200);
assert.equal((await defaultStatus.json()).project.id,'main-dashboard');

const missing=await handleCreatorRelease(new Request('https://atlasenterprisesuite.com/api/studio/release/status?project=missing&offline=1'));
assert.equal(missing.status,404);

console.log('ATLAS Creator Release Center validation passed for Main Dashboard and Venezuela.');
