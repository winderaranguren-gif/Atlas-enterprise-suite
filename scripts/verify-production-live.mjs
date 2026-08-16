const origin=(process.env.ATLAS_PRODUCTION_ORIGIN||'https://atlasenterprisesuite.com').replace(/\/$/,'');

const checks=[
  {path:'/',status:200,contains:['ATLAS']},
  {path:'/login',status:200,contains:['Sign in']},
  {path:'/signup',status:200,contains:['Create your ATLAS account']},
  {path:'/api/health',status:200,json:d=>d?.ok===true&&d?.state==='operational'}
];

let failed=false;
for(const check of checks){
  const url=origin+check.path;
  try{
    const response=await fetch(url,{redirect:'follow',headers:{'user-agent':'ATLAS-Production-Verifier/1.0'},signal:AbortSignal.timeout(15000)});
    const text=await response.text();
    if(response.status!==check.status){console.error(`FAIL ${check.path}: HTTP ${response.status}, expected ${check.status}`);failed=true;continue}
    for(const needle of check.contains||[]){if(!text.includes(needle)){console.error(`FAIL ${check.path}: missing expected marker ${JSON.stringify(needle)}`);failed=true}}
    if(check.json){let data;try{data=JSON.parse(text)}catch{console.error(`FAIL ${check.path}: invalid JSON`);failed=true;continue}if(!check.json(data)){console.error(`FAIL ${check.path}: production health is not operational`);failed=true}}
    if(!failed)console.log(`PASS ${check.path}`);
  }catch(error){console.error(`FAIL ${check.path}: ${error?.message||error}`);failed=true}
}

if(failed){console.error('ATLAS production verification failed. Release must not be called LIVE.');process.exit(43)}
console.log('ATLAS production verified LIVE.');
