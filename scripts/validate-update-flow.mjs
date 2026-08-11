import fs from 'node:fs';

const release=JSON.parse(fs.readFileSync(new URL('../public/atlas.release.json',import.meta.url),'utf8'));
const update=fs.readFileSync(new URL('../public/update-core.js',import.meta.url),'utf8');
const readiness=fs.readFileSync(new URL('../worker/system-readiness.js',import.meta.url),'utf8');
const e2e=fs.readFileSync(new URL('./e2e-commercial-pilot.mjs',import.meta.url),'utf8');
const productionWorkflow=fs.readFileSync(new URL('../.github/workflows/atlas-production-release.yml',import.meta.url),'utf8');
const errors=[];
const assert=(condition,message)=>{if(!condition) errors.push(message);};

assert(release.language?.default==='en','English must remain the default language');
assert(Array.isArray(release.language?.supported)&&release.language.supported.includes('en')&&release.language.supported.includes('es'),'EN/ES must remain supported');
assert(release.language?.selector===true,'Language selector must remain enabled');
assert(release.language?.persistentPreference===true,'Language preference must remain persistent');
assert(release.autoApply===false,'Unverified release candidate must fail closed with autoApply=false');
assert(release.productionReady===false,'Unverified release candidate must have productionReady=false');
assert(release.verifiedE2E===false,'Unverified release candidate must have verifiedE2E=false');
assert(release.expectedSourceSha===null,'Unverified release candidate must not claim an expected source SHA');
for(const token of ['productionReady','verifiedE2E','expectedSourceSha','releaseIsEligible','fetchFingerprint','fetchReadiness','release_not_eligible_for_auto_apply']) assert(update.includes(token),`Update core missing gate: ${token}`);
for(const token of ['/api/system/readiness','/api/system/release-fingerprint','ATLAS_DEPLOYED_SHA','ATLAS_RELEASE_VERIFIED_SHA','ATLAS_BOOTSTRAP_TOKEN','BACKUPS','infrastructureReady','releaseVerified']) assert(readiness.includes(token),`Readiness module missing requirement: ${token}`);
assert(e2e.includes('/api/system/readiness?phase=preflight'),'Commercial E2E must use infrastructure preflight before release verification');
assert(e2e.includes('infrastructureReady===true'),'Commercial E2E must require infrastructureReady before exercising production');
for(const token of ['ATLAS_RELEASE_VERIFIED_SHA','Run exact-SHA commercial pilot E2E','Run password authentication E2E','Mark exact deployed SHA verified','Require final operational readiness','body.releaseVerified!==true','body.operational!==true','id: deploy_exact_sha','Roll back failed Worker release','wrangler@4 rollback','D1 migrations are intentionally not reversed automatically']) assert(productionWorkflow.includes(token),`Production workflow missing runtime verification/rollback gate: ${token}`);
const deployIndex=productionWorkflow.indexOf('Deploy exact SHA to Cloudflare Workers');
const markIndex=productionWorkflow.indexOf('Mark exact deployed SHA verified');
const commercialIndex=productionWorkflow.indexOf('Run exact-SHA commercial pilot E2E');
const passwordIndex=productionWorkflow.indexOf('Run password authentication E2E');
const finalIndex=productionWorkflow.indexOf('Require final operational readiness');
const evidenceIndex=productionWorkflow.indexOf('Upload release evidence');
const rollbackIndex=productionWorkflow.indexOf('Roll back failed Worker release');
assert(deployIndex>=0&&commercialIndex>deployIndex&&passwordIndex>commercialIndex&&markIndex>passwordIndex&&finalIndex>markIndex,'Production verification marker must be written only after both E2E suites and before final readiness');
assert(evidenceIndex>finalIndex,'Release evidence must only be uploaded after final readiness');
assert(rollbackIndex>evidenceIndex,'Rollback handler must remain after all post-deploy verification/evidence steps');
assert(productionWorkflow.includes("if: failure() && steps.deploy_exact_sha.outcome == 'success'"),'Rollback must run only after a successful deployment followed by a failure');

if(errors.length){
  console.error(errors.join('\n'));
  process.exitCode=1;
}else{
  console.log('ATLAS update flow, exact-SHA runtime verification, rollback protection, and English-first release gates validated.');
}
