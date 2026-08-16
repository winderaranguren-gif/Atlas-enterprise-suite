import app from './worker-crm.js';
import { metaCatalogRoutes } from './modules/meta-catalog.js';
import { RELEASE_SHA, RELEASE_BRANCH } from './modules/release-identity.js';

const CORE_TABLES=['users','sessions','organizations','dbas','memberships','role_permissions'];
const CAPABILITY_BRIDGES={
 '/platform/capabilities/lingua':{
  id:'lingua-localization',eyebrow:'CONNECTED ATLAS SETTINGS',title:'Localization & Workspace Preferences',
  copy:'Use ATLAS Settings for organization language, region and timezone preferences. Lingua remains the translation experience while Settings remains the scoped configuration surface.',
  href:'/platform/settings',action:'Open ATLAS Settings →',tone:'blue'
 },
 '/platform/capabilities/language-coach':{
  id:'language-coach-voice',eyebrow:'CONNECTED ATLAS SENSORY',title:'Voice & Vision Workspace',
  copy:'Continue pronunciation and speech practice with the existing ATLAS Voice & Vision workspace for device voice, microphone and sensory capabilities. Language Coach remains the guided learning experience.',
  href:'/platform/voice-vision',action:'Open ATLAS Voice & Vision →',tone:'blue'
 },
 '/platform/capabilities/academy':{
  id:'academy-training',eyebrow:'CONNECTED ATLAS RECORDS',title:'Live Training & Certification Records',
  copy:'Open the existing HR Training workspace for tenant-scoped course catalog, assignments, completion scores and expiration tracking. Academy remains the learner-facing experience while HR Training remains the accountable system of record.',
  href:'/platform/hr-payroll/training',action:'Open ATLAS Training Records →',tone:'green'
 },
 '/platform/capabilities/tax-compliance':{
  id:'tax-compliance-finance',eyebrow:'CONNECTED ATLAS WORKSPACE',title:'Accounting Tax Workspace',
  copy:'Continue from due-diligence and review controls into the existing ATLAS Finance tax workspace. Capability Fusion owns the compliance workflow; Finance remains the scoped accounting context.',
  href:'/platform/finance/taxes',action:'Open ATLAS Finance Taxes →',tone:'blue'
 },
 '/platform/capabilities/tax-pro':{
  id:'tax-pro-finance',eyebrow:'CONNECTED ATLAS WORKSPACE',title:'Tax Preparation + Accounting Context',
  copy:'Move between the client tax workflow and the existing ATLAS Finance tax section without duplicating financial records or inventing a second ledger.',
  href:'/platform/finance/taxes',action:'Open ATLAS Finance Taxes →',tone:'blue'
 },
 '/platform/capabilities/candidate-hub':{
  id:'candidate-recruiting',eyebrow:'CONNECTED ATLAS WORKSPACE',title:'HR Recruiting Workspace',
  copy:'Open the existing ATLAS HR recruiting workspace for the organization recruiting flow. Candidate Hub remains the candidate-experience and assessment layer; this bridge does not claim a separate candidate database.',
  href:'/platform/hr-payroll/recruiting',action:'Open ATLAS Recruiting →',tone:'blue'
 },
 '/platform/capabilities/forms':{
  id:'forms-documents',eyebrow:'CONNECTED ATLAS DOCUMENTS',title:'Documents, Templates & Approvals',
  copy:'Send completed form workflows toward the existing ATLAS Documents surface for controlled templates, approvals, versions and archives. The current Forms builder remains browser-local until its secure persistence layer is promoted.',
  href:'/platform/documents',action:'Open ATLAS Documents →',tone:'blue'
 },
 '/platform/capabilities/personalization':{
  id:'personalization-settings',eyebrow:'CONNECTED ATLAS SETTINGS',title:'Workspace Configuration',
  copy:'Use the existing ATLAS Settings workspace for organization-level appearance, localization, notifications and system preferences. Personalization remains the user-facing preference model.',
  href:'/platform/settings',action:'Open ATLAS Settings →',tone:'blue'
 }
};
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
 const config=CAPABILITY_BRIDGES[url.pathname];
 if(!config)return response;
 const type=response.headers.get('content-type')||'';
 if(!type.includes('text/html'))return response;
 const source=await response.text(),marker=`data-atlas-live-bridge="${config.id}"`;
 if(source.includes(marker))return new Response(source,{status:response.status,statusText:response.statusText,headers:response.headers});
 const green=config.tone==='green',border=green?'#235d46':'#28587c',background=green?'linear-gradient(145deg,#071e17,#071522)':'linear-gradient(145deg,#071a2b,#071522)',eyebrow=green?'#86f7bf':'#7ee6ff';
 const bridge=`<section ${marker} style="margin-top:22px;padding:18px;border:1px solid ${border};border-radius:18px;background:${background}"><div style="font-size:.68rem;letter-spacing:.14em;color:${eyebrow};margin-bottom:8px">${config.eyebrow}</div><h2 style="margin:0 0 8px">${config.title}</h2><p style="margin:0 0 14px;color:#91aac0;line-height:1.55">${config.copy}</p><a href="${config.href}" style="display:inline-block;padding:10px 14px;border:1px solid #2f8cff;border-radius:12px;background:linear-gradient(135deg,#7ee6ff,#2f8cff);color:#03111d;text-decoration:none;font-weight:800">${config.action}</a></section>`;
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
