import app from './worker-crm.js';
import { metaCatalogRoutes } from './modules/meta-catalog.js';
import { RELEASE_SHA, RELEASE_BRANCH } from './modules/release-identity.js';

const CORE_TABLES=['users','sessions','organizations','dbas','memberships','role_permissions'];
async function readiness(env){
 if(!env.DB)return Response.json({ok:false,state:'blocked',reason:'identity_database_binding_missing',checks:{database:false,schema:false,firstOwner:false,release:RELEASE_SHA!=='unreleased'}},{status:503,headers:{'cache-control':'no-store'}});
 try{
  const placeholders=CORE_TABLES.map(()=>'?').join(',');
  const tables=await env.DB.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name IN (${placeholders})`).bind(...CORE_TABLES).all();
  const found=new Set((tables.results||[]).map(r=>r.name));
  const missing=CORE_TABLES.filter(name=>!found.has(name));
  if(missing.length)return Response.json({ok:false,state:'blocked',reason:'core_schema_incomplete',missingTables:missing,checks:{database:true,schema:false,firstOwner:false,release:RELEASE_SHA!=='unreleased'}},{status:503,headers:{'cache-control':'no-store'}});
  const row=await env.DB.prepare('SELECT COUNT(*) AS count FROM users').first();
  const userCount=Number(row?.count||0);
  const bootstrapConfigured=Boolean(env.ATLAS_BOOTSTRAP_TOKEN);
  const firstOwnerReady=userCount>0||bootstrapConfigured;
  const releaseReady=/^[0-9a-f]{40}$/i.test(RELEASE_SHA)&&RELEASE_BRANCH==='main';
  const ok=firstOwnerReady&&releaseReady;
  return Response.json({ok,state:ok?'ready':'blocked',reason:ok?null:!firstOwnerReady?'first_owner_bootstrap_secret_missing':'release_identity_unstamped',userCount,bootstrapConfigured:userCount===0?bootstrapConfigured:undefined,releaseSha:RELEASE_SHA,releaseBranch:RELEASE_BRANCH,checks:{database:true,schema:true,firstOwner:firstOwnerReady,release:releaseReady}},{status:ok?200:503,headers:{'cache-control':'no-store'}});
 }catch{return Response.json({ok:false,state:'blocked',reason:'readiness_query_failed',checks:{database:true,schema:false,firstOwner:false,release:false}},{status:503,headers:{'cache-control':'no-store'}})}
}

async function enhanceCapabilityBridge(response,url){
 if(url.pathname!=='/platform/capabilities/academy')return response;
 const type=response.headers.get('content-type')||'';
 if(!type.includes('text/html'))return response;
 const source=await response.text();
 if(source.includes('data-atlas-live-bridge="academy-training"'))return new Response(source,{status:response.status,statusText:response.statusText,headers:response.headers});
 const bridge=`<section data-atlas-live-bridge="academy-training" style="margin-top:22px;padding:18px;border:1px solid #235d46;border-radius:18px;background:linear-gradient(145deg,#071e17,#071522)"><div style="font-size:.68rem;letter-spacing:.14em;color:#86f7bf;margin-bottom:8px">CONNECTED ATLAS RECORDS</div><h2 style="margin:0 0 8px">Live Training & Certification Records</h2><p style="margin:0 0 14px;color:#91aac0;line-height:1.55">Open the existing HR Training workspace for tenant-scoped course catalog, assignments, completion scores and expiration tracking. Academy remains the learner-facing experience while HR Training remains the accountable system of record.</p><a href="/platform/hr-payroll/training" style="display:inline-block;padding:10px 14px;border:1px solid #2f8cff;border-radius:12px;background:linear-gradient(135deg,#7ee6ff,#2f8cff);color:#03111d;text-decoration:none;font-weight:800">Open ATLAS Training Records →</a></section>`;
 const body=source.includes('</main>')?source.replace('</main>',bridge+'</main>'):source.replace('</body>',bridge+'</body>');
 const headers=new Headers(response.headers);headers.delete('content-length');
 return new Response(body,{status:response.status,statusText:response.statusText,headers});
}

export default {
 async fetch(request,env,ctx){
  const url=new URL(request.url);
  if(url.pathname==='/api/release'&&request.method==='GET'){
   return Response.json({ok:true,service:'atlas-enterprise-suite',releaseSha:RELEASE_SHA,releaseBranch:RELEASE_BRANCH},{headers:{'cache-control':'no-store'}});
  }
  if(url.pathname==='/api/readiness'&&request.method==='GET')return readiness(env);
  if(url.pathname==='/whatsapp-catalog.csv')url.pathname='/feeds/meta/atlas-catalog.csv';
  const catalogResponse=await metaCatalogRoutes(request,env,url);
  if(catalogResponse)return catalogResponse;
  const response=await app.fetch(request,env,ctx);
  return enhanceCapabilityBridge(response,url);
 }
};
