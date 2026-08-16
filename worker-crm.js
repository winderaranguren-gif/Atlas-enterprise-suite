import core from './worker.js';
import { requireBrowserSession } from './modules/auth.js';
import { crmRoutes } from './modules/crm.js';
import { crmPage } from './modules/crm-ui.js';
import { crmClientScript } from './modules/crm-client.js';
import { ensureWebSchema } from './modules/web-schema.js';
import { publicSiteRoutes } from './modules/public-site.js';
import { moduleVisualRuntimeScript } from './modules/module-visual-runtime.js';
import { menuToolPage } from './modules/menu-tools.js';
import { metaSocialRoutes } from './modules/meta-social.js';
import { streamSubscriptionRoutes } from './modules/stream-subscription-control.js';
import { formsControlRoutes } from './modules/forms-control.js';
import { knowledgeReaderRoutes } from './modules/knowledge-reader.js';

function securityUnavailable(){
  return new Response(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>Security verification · ATLAS</title><style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#020711;color:#eef7ff;font-family:Inter,system-ui,sans-serif}.card{max-width:560px;margin:24px;padding:28px;border:1px solid #25527a;border-radius:18px;background:#071522}.card p{color:#9fb4c7;line-height:1.6}.card a{color:#59c9ff}</style></head><body><main class="card"><h1>Security verification unavailable.</h1><p>ATLAS will not open a protected workspace without validating the active session.</p><a href="/login">Return to sign in</a></main></body></html>`,{status:503,headers:{'content-type':'text/html; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'}});
}

function isStaticVisual(pathname){return pathname.startsWith('/assets/')&&/\.(?:avif|gif|ico|jpe?g|png|svg|webp)$/i.test(pathname)}
function assetBindingRequest(request,url){const target=new URL(url);target.pathname=target.pathname.slice('/assets'.length)||'/';return new Request(target.toString(),{method:'GET',headers:request.headers,redirect:'follow'})}

const DASHBOARD_ROUTES={
 '/platform/finance#general-ledger':'/platform/finance/general-ledger','/platform/finance#accounts-payable':'/platform/finance/accounts-payable','/platform/finance#accounts-receivable':'/platform/finance/accounts-receivable','/platform/finance#banking':'/platform/finance/banking','/platform/finance#reconciliations':'/platform/finance/reconciliations','/platform/finance#budgets':'/platform/finance/budgets','/platform/finance#statements':'/platform/finance/statements','/platform/finance#taxes':'/platform/finance/taxes','/platform/finance#fixed-assets':'/platform/finance/fixed-assets',
 '/platform/operations#workflows':'/platform/operations/workflows','/platform/operations#approvals':'/platform/operations/approvals','/platform/operations#tasks':'/platform/operations/tasks','/platform/operations#calendar':'/platform/operations/calendar','/platform/operations#reminders':'/platform/operations/reminders','/platform/operations#automation':'/platform/operations/workflows','/platform/operations#alerts':'/platform/operations/alerts',
 '/platform/hr-payroll#employees':'/platform/hr-payroll/employees','/platform/hr-payroll#recruitment':'/platform/hr-payroll/recruiting','/platform/hr-payroll#onboarding':'/platform/hr-payroll/onboarding','/platform/hr-payroll#attendance':'/platform/hr-payroll/time','/platform/hr-payroll#payroll':'/platform/hr-payroll/payroll','/platform/hr-payroll#benefits':'/platform/hr-payroll/benefits','/platform/hr-payroll#performance':'/platform/hr-payroll/performance','/platform/hr-payroll#training':'/platform/hr-payroll/training','/platform/hr-payroll#policies':'/platform/documents',
 '/platform/operations#inventory':'/platform/inventory','/platform/operations#products':'/platform/inventory/items','/platform/operations#categories':'/platform/inventory/categories','/platform/operations#warehouses':'/platform/inventory/locations','/platform/operations#stock-movements':'/platform/inventory/movements','/platform/operations#adjustments':'/platform/inventory/adjustments','/platform/operations#cycle-counts':'/platform/inventory/cycle-counts','/platform/operations#logistics':'/platform/transportation',
 '/platform/enterprise-suite#companies':'/platform/enterprise-suite','/platform/enterprise-suite#branches':'/platform/enterprise-suite','/platform/enterprise-suite#departments':'/platform/enterprise-suite','/platform/enterprise-suite#users':'/platform/access-control','/platform/enterprise-suite#roles':'/platform/access-control','/platform/enterprise-suite#audit':'/platform/audit-security','/platform/enterprise-suite#logs':'/platform/audit-security','/platform/enterprise-suite#projects':'/platform/projects','/platform/enterprise-suite#documents':'/platform/documents','/platform/enterprise-suite#reports':'/platform/reports','/platform/enterprise-suite#bi':'/platform/reports','/platform/enterprise-suite#custom-reports':'/platform/reports','/platform/enterprise-suite#visualization':'/platform/reports','/platform/enterprise-suite#kpis':'/platform/reports','/platform/enterprise-suite#trends':'/platform/reports','/platform/enterprise-suite#comparisons':'/platform/reports','/platform/enterprise-suite#performance':'/platform/reports','/dashboard#settings':'/platform/settings'
};

function repairDashboardNavigation(body){
  let next=body;
  for(const [from,to] of Object.entries(DASHBOARD_ROUTES))next=next.replaceAll(`href="${from}"`,`href="${to}"`);
  next=next.replaceAll('>Logistics<','>Transportation<');
  const marker='<div class="nav-group" data-menu-group="settings"';
  if(next.includes('class="menu"')&&!next.includes('href="/platform/capabilities"')){
    const capabilities='<div class="nav-group" data-menu-group="capabilities" data-search="capabilities language learning tax recruiting forms stream subscriptions personalization"><div class="nav-row"><a class="nav-link" href="/platform/capabilities"><span class="nav-icon">✦</span><span class="nav-label">Capabilities</span></a></div></div>';
    if(next.includes(marker))next=next.replace(marker,capabilities+marker);
  }
  if(next.includes('class="menu"')&&!next.includes('href="/platform/integrations"')){
    const integration='<div class="nav-group" data-menu-group="integrations" data-search="integrations connections sync webhooks api access logs"><div class="nav-row"><a class="nav-link" href="/platform/integrations"><span class="nav-icon">⌘</span><span class="nav-label">Integrations</span></a></div></div>';
    if(next.includes(marker))next=next.replace(marker,integration+marker);
  }
  return next;
}

async function enhanceCoreResponse(response,url){
  const type=response.headers.get('content-type')||'';if(!type.includes('text/html'))return response;
  let body=await response.text();
  if(url.pathname==='/dashboard'||url.pathname==='/menu-experience')body=repairDashboardNavigation(body);
  if(url.pathname==='/platform/documents'&&!body.includes('href="/platform/forms-control"')){
    const forms='<a href="/platform/forms-control" style="position:fixed;right:18px;bottom:18px;z-index:50;padding:10px 14px;border:1px solid #2f8cff;border-radius:999px;background:linear-gradient(135deg,#7ee6ff,#2f8cff);color:#03111d;text-decoration:none;font-weight:800;box-shadow:0 12px 34px #0007">Open ATLAS Forms Control</a>';
    body=body.replace('</body>',forms+'</body>');
  }
  if(url.pathname==='/platform/hr-payroll/training'&&!body.includes('href="/platform/knowledge-reader"')){
    const reader='<a href="/platform/knowledge-reader" style="position:fixed;right:18px;bottom:18px;z-index:50;padding:10px 14px;border:1px solid #2f8cff;border-radius:999px;background:linear-gradient(135deg,#7ee6ff,#2f8cff);color:#03111d;text-decoration:none;font-weight:800;box-shadow:0 12px 34px #0007">Open ATLAS Knowledge Reader</a>';
    body=body.replace('</body>',reader+'</body>');
  }
  if(url.pathname.startsWith('/platform/')&&!body.includes('/assets/atlas-module-visual.js'))body=body.replace('</body>','<script src="/assets/atlas-module-visual.js" defer></script></body>');
  const headers=new Headers(response.headers);headers.delete('content-length');return new Response(body,{status:response.status,statusText:response.statusText,headers});
}

async function verifiedPage(request,env,url,body){
  const verification=await requireBrowserSession(request,env);
  if(!verification.ok){if(verification.status===401)return Response.redirect(new URL('/login',url),302);return securityUnavailable()}
  return new Response(body,{headers:{'content-type':'text/html; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff','referrer-policy':'strict-origin-when-cross-origin'}});
}

async function verifiedWorkspaceResponse(request,env,url,response){
  const verification=await requireBrowserSession(request,env);
  if(!verification.ok){if(verification.status===401)return Response.redirect(new URL('/login',url),302);return securityUnavailable()}
  return enhanceCoreResponse(response,url);
}

export default {async fetch(request,env){
  const url=new URL(request.url);
  const publicResponse=await publicSiteRoutes(request,env,url);if(publicResponse)return publicResponse;
  const metaResponse=await metaSocialRoutes(request,env,url);if(metaResponse)return metaResponse;

  const utility=menuToolPage(url.pathname);
  if(utility&&request.method==='GET')return verifiedPage(request,env,url,utility);

  if(request.method==='GET'&&(url.pathname==='/platform/stream-control'||url.pathname==='/platform/subscriptions')){
    const workspace=await streamSubscriptionRoutes(request,env,url);
    if(workspace)return verifiedWorkspaceResponse(request,env,url,workspace);
  }
  if(request.method==='GET'&&url.pathname==='/platform/forms-control'){
    const workspace=await formsControlRoutes(request,env,url);
    if(workspace)return verifiedWorkspaceResponse(request,env,url,workspace);
  }
  if(request.method==='GET'&&url.pathname==='/platform/knowledge-reader'){
    const workspace=await knowledgeReaderRoutes(request,env,url);
    if(workspace)return verifiedWorkspaceResponse(request,env,url,workspace);
  }

  if(url.pathname==='/platform/crm'&&request.method==='GET')return verifiedPage(request,env,url,crmPage().replace('</body>','<script src="/assets/atlas-module-visual.js" defer></script></body>'));
  if(url.pathname==='/assets/crm-app.js')return new Response(crmClientScript(),{headers:{'content-type':'text/javascript; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'}});
  if(url.pathname==='/assets/atlas-module-visual.js')return new Response(moduleVisualRuntimeScript(),{headers:{'content-type':'text/javascript; charset=utf-8','cache-control':'public,max-age=900','x-content-type-options':'nosniff'}});
  if(request.method==='GET'&&isStaticVisual(url.pathname)&&env.ASSETS)return env.ASSETS.fetch(assetBindingRequest(request,url));

  if(url.pathname.startsWith('/api/crm')){try{const response=await crmRoutes(request,env,url);if(response)return response}catch{return Response.json({ok:false,error:'crm_runtime_unavailable'},{status:503,headers:{'cache-control':'no-store'}})}}
  if(url.pathname.startsWith('/api/web/')){try{const ready=await ensureWebSchema(env);if(!ready.ok)return Response.json({ok:false,error:ready.error},{status:503,headers:{'cache-control':'no-store'}})}catch{return Response.json({ok:false,error:'web_schema_unavailable'},{status:503,headers:{'cache-control':'no-store'}})}}
  const response=await core.fetch(request,env);return enhanceCoreResponse(response,url);
}};
