import { authRoutes, requireBrowserSession } from './modules/auth.js';
import { rbacRoutes } from './modules/rbac.js';
import { evidenceRoutes } from './modules/evidence.js';
import { hrKnowledgeRoutes } from './modules/hr-knowledge.js';
import { hrPayrollRoutes } from './modules/hr-payroll.js';
import { hrEmploymentUiRoutes } from './modules/hr-employment-ui.js';
import { hrTalentRoutes } from './modules/hr-talent.js';
import { operationsRoutes } from './modules/operations.js';
import { inventoryRoutes } from './modules/inventory.js';
import { transportationSafetyRoutes } from './modules/transportation-safety.js';
import { transportationRoutes } from './modules/transportation.js';
import { projectsRoutes } from './modules/projects.js';
import { reportsRoutes } from './modules/reports.js';
import { documentsRoutes } from './modules/documents.js';
import { integrationsRoutes } from './modules/integrations.js';
import { settingsRoutes } from './modules/settings.js';
import { sensoryRoutes } from './modules/sensory.js';
import { investRoutes } from './modules/invest.js';
import { bridgeRoutes } from './modules/bridge.js';
import { globalContextRoutes } from './modules/global-context.js';
import { ATLAS_VERSION } from './modules/version.js';
import { webHardeningRoutes } from './modules/web-hardening.js';
import { menuExperienceRoutes } from './modules/menu-experience.js';
import { moduleWorkspacesRoutes } from './modules/module-workspaces.js';
import { financeRoutes } from './modules/finance.js';
import { financeAdvancedRoutes } from './modules/finance-advanced.js';
import { financeReportingRoutes } from './modules/finance-reporting.js';
import { financeStatementsRoutes } from './modules/finance-statements.js';
import { webShellRoutes, errorPage, notFound } from './modules/web-shell.js';
import { webRuntimeScript } from './modules/web-runtime.js';

const html=(body,status=200)=>new Response(body,{status,headers:{'content-type':'text/html; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff','referrer-policy':'strict-origin-when-cross-origin'}});
function enhanceFinanceNavigation(body){if(!body.includes('ATLAS ACCOUNTING')||body.includes('href="/platform/finance/close"'))return body;const link='<a class="mod atlas-control-link" href="/platform/finance/close">Close & Controls</a>';if(body.includes('</nav><div class="side-note">'))return body.replace('</nav><div class="side-note">',link+'</nav><div class="side-note">');return body}
function enhanceHrNavigation(body){if(!body.includes('ATLAS HR & PAYROLL')||body.includes('href="/platform/hr-payroll/employment"'))return body;const link='<a href="/platform/hr-payroll/employment">Employment Setup</a>';if(body.includes('</nav></aside>'))return body.replace('</nav></aside>',link+'</nav></aside>');return body}
function normalizeHtmlShell(body){let normalized=body.replace('<main class="stage" id="main">','<section class="stage" id="atlas-workspace" role="region" aria-label="ATLAS workspace">').replace('</main>\n  <aside class="ai-panel">','</section>\n  <aside class="ai-panel">');normalized=enhanceFinanceNavigation(normalized);return enhanceHrNavigation(normalized)}
async function withRuntime(response){const type=response.headers.get('content-type')||'';if(!type.includes('text/html'))return response;const source=normalizeHtmlShell(await response.text());const body=source.replace('</body>','<script src="/assets/atlas-runtime.js" defer></script></body>');const headers=new Headers(response.headers);headers.delete('content-length');return new Response(body,{status:response.status,statusText:response.statusText,headers})}
function isProtectedWorkspace(pathname){return pathname==='/dashboard'||pathname==='/menu-experience'||pathname==='/settings'||pathname.startsWith('/platform/')}
function securityUnavailable(){return html(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><meta name="theme-color" content="#020711"><title>Security verification · ATLAS</title><style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#020711;color:#eef7ff;font-family:Inter,system-ui,sans-serif}.card{max-width:560px;margin:24px;padding:28px;border:1px solid #25527a;border-radius:18px;background:#071522;box-shadow:0 22px 70px #0008}.eyebrow{color:#59c9ff;text-transform:uppercase;letter-spacing:.16em;font-size:.72rem}.card h1{margin:12px 0;font-size:2rem}.card p{color:#9fb4c7;line-height:1.6}.card a{display:inline-block;margin-top:10px;padding:10px 14px;border:1px solid #2d76b4;border-radius:10px;color:#eef7ff;text-decoration:none}</style></head><body><main class="card"><div class="eyebrow">ATLAS SECURITY</div><h1>Security verification unavailable.</h1><p>ATLAS will not open a protected workspace without validating the active session. Please try again when identity services are available.</p><a href="/login">Return to sign in</a></main></body></html>`,503)}
function secureServiceWorker(){return `const C='atlas-${ATLAS_VERSION}-secure-1';const PUBLIC=['/','/login','/icon.svg','/manifest.webmanifest'];const protectedPath=p=>p==='/dashboard'||p==='/menu-experience'||p==='/settings'||p.startsWith('/platform/');self.addEventListener('install',e=>e.waitUntil(caches.open(C).then(c=>c.addAll(PUBLIC)).then(()=>self.skipWaiting())));self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==C&&k.startsWith('atlas-')).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));self.addEventListener('fetch',e=>{if(e.request.method!=='GET')return;const u=new URL(e.request.url);if(u.origin!==location.origin)return;if(u.pathname.startsWith('/api/')||protectedPath(u.pathname)){e.respondWith(fetch(e.request,{cache:'no-store'}));return}e.respondWith(fetch(e.request).then(r=>{if(!r||!r.ok)return r;const x=r.clone();caches.open(C).then(c=>c.put(e.request,x));return r}).catch(()=>caches.match(e.request).then(r=>r||caches.match('/'))))});`}
export default {async fetch(request,env){const url=new URL(request.url);try{
if(url.pathname==='/assets/atlas-runtime.js')return new Response(webRuntimeScript(),{headers:{'content-type':'text/javascript; charset=utf-8','cache-control':'public,max-age=3600','x-content-type-options':'nosniff'}});
if(url.pathname==='/sw.js')return new Response(secureServiceWorker(),{headers:{'content-type':'text/javascript; charset=utf-8','cache-control':'no-cache','service-worker-allowed':'/','x-content-type-options':'nosniff'}});
if(url.pathname==='/api/health'){const databaseReady=Boolean(env.DB);const body={ok:databaseReady,service:'atlas-enterprise-suite',version:ATLAS_VERSION,phase:'web-launch-readiness',state:databaseReady?'operational':'degraded',identityDatabase:databaseReady?'configured':'unconfigured',hrKnowledge:String(env.ATLAS_ENABLE_HR_KNOWLEDGE||'').toLowerCase()==='true'?'enabled':'disabled',hrPayroll:'enabled',hrTalent:'enabled',operations:'enabled',inventory:'enabled',transportation:'enabled',projects:'enabled',reports:'enabled',documents:'enabled',integrations:'enabled',settings:'enabled',sensory:'enabled',bridge:'foundation',globalContext:'enabled',qa:'native',backupIntegrity:'sha256',performanceOptimizer:'safe-policy'};return Response.json(body,{status:databaseReady?200:503,headers:{'cache-control':'no-store'}})}
const globalContextResponse=await globalContextRoutes(request,env,url);if(globalContextResponse)return globalContextResponse;
const authResponse=await authRoutes(request,env,url);if(authResponse)return authResponse;
if(request.method==='GET'&&isProtectedWorkspace(url.pathname)){const verification=await requireBrowserSession(request,env);if(!verification.ok){if(verification.status===401)return Response.redirect(new URL('/login',url),302);return securityUnavailable()}}
const financeStatementsResponse=await financeStatementsRoutes(request,env,url);if(financeStatementsResponse)return withRuntime(financeStatementsResponse);
const financeReportingResponse=await financeReportingRoutes(request,env,url);if(financeReportingResponse)return withRuntime(financeReportingResponse);
const financeAdvancedResponse=await financeAdvancedRoutes(request,env,url);if(financeAdvancedResponse)return withRuntime(financeAdvancedResponse);
const financeResponse=await financeRoutes(request,env,url);if(financeResponse)return withRuntime(financeResponse);
const hrEmploymentResponse=await hrEmploymentUiRoutes(request,env,url);if(hrEmploymentResponse)return withRuntime(hrEmploymentResponse);
const hrTalentResponse=await hrTalentRoutes(request,env,url);if(hrTalentResponse)return withRuntime(hrTalentResponse);
const hrPayrollResponse=await hrPayrollRoutes(request,env,url);if(hrPayrollResponse)return withRuntime(hrPayrollResponse);
const operationsResponse=await operationsRoutes(request,env,url);if(operationsResponse)return withRuntime(operationsResponse);
const inventoryResponse=await inventoryRoutes(request,env,url);if(inventoryResponse)return withRuntime(inventoryResponse);
const transportationSafetyResponse=await transportationSafetyRoutes(request,env,url);if(transportationSafetyResponse)return transportationSafetyResponse;
const transportationResponse=await transportationRoutes(request,env,url);if(transportationResponse)return withRuntime(transportationResponse);
const projectsResponse=await projectsRoutes(request,env,url);if(projectsResponse)return withRuntime(projectsResponse);
const reportsResponse=await reportsRoutes(request,env,url);if(reportsResponse)return withRuntime(reportsResponse);
const documentsResponse=await documentsRoutes(request,env,url);if(documentsResponse)return withRuntime(documentsResponse);
const integrationsResponse=await integrationsRoutes(request,env,url);if(integrationsResponse)return withRuntime(integrationsResponse);
const settingsResponse=await settingsRoutes(request,env,url);if(settingsResponse)return withRuntime(settingsResponse);
const rbacResponse=await rbacRoutes(request,env,url);if(rbacResponse)return rbacResponse;
const evidenceResponse=await evidenceRoutes(request,env,url);if(evidenceResponse)return evidenceResponse;
const hrKnowledgeResponse=await hrKnowledgeRoutes(request,env,url);if(hrKnowledgeResponse)return hrKnowledgeResponse;
const sensoryResponse=await sensoryRoutes(request,env,url);if(sensoryResponse)return sensoryResponse;
const investResponse=await investRoutes(request,env,url);if(investResponse)return investResponse;
const bridgeResponse=await bridgeRoutes(request,env,url);if(bridgeResponse)return bridgeResponse;
const menuResponse=await menuExperienceRoutes(request,env,url);if(menuResponse)return withRuntime(menuResponse);
const workspaceResponse=await moduleWorkspacesRoutes(request,env,url);if(workspaceResponse)return withRuntime(workspaceResponse);
const hardenedResponse=await webHardeningRoutes(request,env,url);if(hardenedResponse)return withRuntime(hardenedResponse);
const webResponse=await webShellRoutes(request,env,url);if(webResponse)return withRuntime(webResponse);
if(request.method==='GET'&&!url.pathname.startsWith('/api/'))return withRuntime(html(notFound(url.pathname),404));return Response.json({ok:false,error:'not_found'},{status:404,headers:{'cache-control':'no-store'}})
}catch(error){console.error('atlas_runtime_error',error?.message||error);if(request.method==='GET'&&!url.pathname.startsWith('/api/'))return withRuntime(html(errorPage(),500));return Response.json({ok:false,error:'atlas_runtime_unavailable'},{status:500,headers:{'cache-control':'no-store'}})}}};
