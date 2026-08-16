import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root=resolve(new URL('..',import.meta.url).pathname);
const origin=(process.env.ATLAS_PRODUCTION_ORIGIN||'https://atlasenterprisesuite.com').replace(/\/$/,'');
let expectedSha=String(process.env.ATLAS_EXPECTED_RELEASE_SHA||'').trim();
if(!expectedSha){try{expectedSha=(await readFile(resolve(root,'.atlas-release-sha'),'utf8')).trim()}catch{}}
if(!/^[0-9a-f]{40}$/i.test(expectedSha))throw new Error('expected_release_sha_unavailable');

const checks=[
  {path:'/',status:200,contains:['ATLAS']},
  {path:'/login',status:200,contains:['Sign in']},
  {path:'/signup',status:200,contains:['Create your ATLAS account']},
  {path:'/api/health',status:200,json:d=>d?.ok===true&&d?.state==='operational'},
  {path:'/api/readiness',status:200,json:d=>d?.ok===true&&d?.state==='ready'&&d?.checks?.database===true&&d?.checks?.schema===true&&d?.checks?.firstOwner===true&&d?.checks?.release===true},
  {path:'/api/release',status:200,json:d=>d?.ok===true&&d?.releaseBranch==='main'&&String(d?.releaseSha||'').toLowerCase()===expectedSha.toLowerCase()}
];

let failed=false;
for(const check of checks){
  const url=origin+check.path;
  let thisFailed=false;
  try{
    const response=await fetch(url,{redirect:'follow',headers:{'user-agent':'ATLAS-Production-Verifier/3.0'},signal:AbortSignal.timeout(15000)});
    const text=await response.text();
    if(response.status!==check.status){console.error(`FAIL ${check.path}: HTTP ${response.status}, expected ${check.status}${text?` · ${text.slice(0,300)}`:''}`);failed=thisFailed=true;continue}
    for(const needle of check.contains||[]){if(!text.includes(needle)){console.error(`FAIL ${check.path}: missing expected marker ${JSON.stringify(needle)}`);failed=thisFailed=true}}
    if(check.json){let data;try{data=JSON.parse(text)}catch{console.error(`FAIL ${check.path}: invalid JSON`);failed=thisFailed=true;continue}if(!check.json(data)){console.error(`FAIL ${check.path}: production state/identity mismatch · ${text.slice(0,500)}`);failed=thisFailed=true}}
    if(!thisFailed)console.log(`PASS ${check.path}`);
  }catch(error){console.error(`FAIL ${check.path}: ${error?.message||error}`);failed=true}
}

if(failed){console.error(`ATLAS production verification failed. Expected release ${expectedSha}. Release must not be called LIVE.`);process.exit(43)}
console.log(`ATLAS production verified LIVE @ ${expectedSha}.`);
