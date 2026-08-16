import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root=resolve(new URL('..',import.meta.url).pathname);
const origin=(process.env.ATLAS_PRODUCTION_ORIGIN||'https://atlasenterprisesuite.com').replace(/\/$/,'');
let expectedSha=String(process.env.ATLAS_EXPECTED_RELEASE_SHA||'').trim();
if(!expectedSha){try{expectedSha=(await readFile(resolve(root,'.atlas-release-sha'),'utf8')).trim()}catch{}}
if(!/^[0-9a-f]{40}$/i.test(expectedSha))throw new Error('expected_release_sha_unavailable');

const expectedCapabilities=['lingua','language-coach','academy','tax-compliance','tax-pro','candidate-hub','forms','stream','subscriptions','personalization'];
const hasCapabilitySet=data=>{
  const slugs=Array.isArray(data?.capabilities)?data.capabilities.map(item=>item?.slug):[];
  return data?.ok===true&&data?.count===expectedCapabilities.length&&expectedCapabilities.every(slug=>slugs.includes(slug));
};
const hasPublicCapabilitySet=data=>{
  const items=Array.isArray(data?.items)?data.items:[];
  const slugs=items.map(item=>item?.slug);
  return data?.ok===true&&data?.count===expectedCapabilities.length&&data?.generatedFrom==='ATLAS_CAPABILITY_REGISTRY'&&expectedCapabilities.every(slug=>slugs.includes(slug))&&items.every(item=>typeof item?.connectedAtlasWorkspace==='string'&&item.connectedAtlasWorkspace.startsWith('ATLAS '));
};

const checks=[
  {path:'/',status:200,contains:['ATLAS','href="/capabilities"','>Capabilities</a>']},
  {path:'/login',status:200,contains:['Sign in']},
  {path:'/signup',status:200,contains:['Create your ATLAS account']},
  {path:'/capabilities',status:200,contains:['ATLAS CAPABILITY DIRECTORY','One ecosystem.','Implementation transparency:','Connected: ATLAS Stream Control','Connected: ATLAS Subscription Control']},
  {path:'/feeds/capabilities.json',status:200,json:hasPublicCapabilitySet},
  {path:'/sitemap.xml',status:200,contains:[`<loc>${origin}/capabilities</loc>`]},
  {path:'/assets/atlas-capability-security.js',status:200,contains:['__ATLAS_CAPABILITY_SAFE_DOM__','javascript:','data:text/html']},
  {path:'/api/health',status:200,json:d=>d?.ok===true&&d?.state==='operational'},
  {path:'/api/readiness',status:200,json:d=>d?.ok===true&&d?.state==='ready'&&d?.checks?.database===true&&d?.checks?.schema===true&&d?.checks?.firstOwner===true&&d?.checks?.release===true},
  {path:'/api/release',status:200,json:d=>d?.ok===true&&d?.releaseBranch==='main'&&String(d?.releaseSha||'').toLowerCase()===expectedSha.toLowerCase()},
  {path:'/api/capabilities',status:200,json:hasCapabilitySet},
  {path:'/platform/capabilities/stream',status:302,redirect:'manual',locationContains:'/login'},
  {path:'/platform/capabilities/subscriptions',status:302,redirect:'manual',locationContains:'/login'},
  {path:'/platform/stream-control',status:302,redirect:'manual',locationContains:'/login'},
  {path:'/platform/subscriptions',status:302,redirect:'manual',locationContains:'/login'}
];

let failed=false;
for(const check of checks){
  const url=origin+check.path;
  let thisFailed=false;
  try{
    const response=await fetch(url,{redirect:check.redirect||'follow',headers:{'user-agent':'ATLAS-Production-Verifier/3.4'},signal:AbortSignal.timeout(15000)});
    const text=await response.text();
    if(response.status!==check.status){console.error(`FAIL ${check.path}: HTTP ${response.status}, expected ${check.status}${text?` · ${text.slice(0,300)}`:''}`);failed=thisFailed=true;continue}
    if(check.locationContains){const location=response.headers.get('location')||'';if(!location.includes(check.locationContains)){console.error(`FAIL ${check.path}: redirect location ${JSON.stringify(location)} missing ${JSON.stringify(check.locationContains)}`);failed=thisFailed=true}}
    for(const needle of check.contains||[]){if(!text.includes(needle)){console.error(`FAIL ${check.path}: missing expected marker ${JSON.stringify(needle)}`);failed=thisFailed=true}}
    if(check.json){let data;try{data=JSON.parse(text)}catch{console.error(`FAIL ${check.path}: invalid JSON`);failed=thisFailed=true;continue}if(!check.json(data)){console.error(`FAIL ${check.path}: production state/identity mismatch · ${text.slice(0,500)}`);failed=thisFailed=true}}
    if(!thisFailed)console.log(`PASS ${check.path}`);
  }catch(error){console.error(`FAIL ${check.path}: ${error?.message||error}`);failed=true}
}

if(failed){console.error(`ATLAS production verification failed. Expected release ${expectedSha}. Release must not be called LIVE.`);process.exit(43)}
console.log(`ATLAS production verified LIVE @ ${expectedSha}.`);
