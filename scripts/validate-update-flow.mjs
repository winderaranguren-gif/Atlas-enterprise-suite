import fs from 'node:fs';

const release=JSON.parse(fs.readFileSync(new URL('../public/atlas.release.json',import.meta.url),'utf8'));
const update=fs.readFileSync(new URL('../public/update-core.js',import.meta.url),'utf8');
const readiness=fs.readFileSync(new URL('../worker/system-readiness.js',import.meta.url),'utf8');
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
for(const token of ['/api/system/readiness','/api/system/release-fingerprint','ATLAS_DEPLOYED_SHA','ATLAS_BOOTSTRAP_TOKEN','BACKUPS']) assert(readiness.includes(token),`Readiness module missing requirement: ${token}`);

if(errors.length){
  console.error(errors.join('\n'));
  process.exitCode=1;
}else{
  console.log('ATLAS update flow and English-first release gates validated.');
}
