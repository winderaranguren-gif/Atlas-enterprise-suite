const target=String(process.env.ATLAS_PRODUCTION_URL||process.argv[2]||'').trim();
if(!target){
  console.error('ATLAS_PRODUCTION_URL is required for live production verification.');
  process.exit(2);
}
let base;
try{
  base=new URL(target);
}catch{
  console.error('ATLAS_PRODUCTION_URL must be a valid absolute URL.');
  process.exit(2);
}
if(!['http:','https:'].includes(base.protocol)){
  console.error('ATLAS_PRODUCTION_URL must use http or https.');
  process.exit(2);
}
base.pathname=base.pathname.replace(/\/$/,'');
base.search='';base.hash='';

async function get(path,{json=false,contains=[]}={}){
  const url=new URL(path,base.toString().replace(/\/$/,'')+'/');
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),15000);
  let response;
  try{
    response=await fetch(url,{redirect:'follow',headers:{'user-agent':'ATLAS-Sovereign-Production-Verifier/1'},signal:controller.signal});
  }finally{
    clearTimeout(timer);
  }
  if(!response.ok)throw new Error(`${path} returned HTTP ${response.status}`);
  if(json)return await response.json();
  const text=await response.text();
  for(const marker of contains){if(!text.includes(marker))throw new Error(`${path} missing required marker: ${marker}`);}
  return text;
}

const health=await get('/_atlas/health',{json:true});
if(!health?.ok||health?.service!=='ATLAS Portable Runtime')throw new Error('Portable runtime health contract mismatch.');

const runtime=await get('/_atlas/runtime',{json:true});
if(!runtime?.ok)throw new Error('Portable runtime capability endpoint is not healthy.');

await get('/',{contains:['ATLAS']});
await get('/identity',{contains:['ATLAS']});
await get('/studio/create-anything',{contains:['ATLAS']});

const universal=await get('/api/studio/creator/universal/capabilities',{json:true});
if(universal?.service!=='atlas-universal-creator')throw new Error('ATLAS Universal Creator production contract mismatch.');
if(!Array.isArray(universal?.externalProviders)||universal.externalProviders.length!==0)throw new Error('Universal Creator unexpectedly requires an external builder.');

const web=await get('/api/studio/creator/web/capabilities',{json:true});
if(web?.service!=='atlas-creator-web-director')throw new Error('ATLAS Creator Web Director production contract mismatch.');

console.log(JSON.stringify({ok:true,service:'ATLAS Sovereign Production',target:base.origin,portableRuntime:true,universalCreator:true,creatorWeb:true,verifiedAt:new Date().toISOString()},null,2));
