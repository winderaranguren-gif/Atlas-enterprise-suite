import { authRoutes } from './modules/auth.js';
import { rbacRoutes } from './modules/rbac.js';
import { evidenceRoutes } from './modules/evidence.js';
import { hrKnowledgeRoutes } from './modules/hr-knowledge.js';
import { sensoryRoutes } from './modules/sensory.js';
import { investRoutes } from './modules/invest.js';
import { bridgeRoutes } from './modules/bridge.js';
import { ATLAS_VERSION } from './modules/version.js';
import { webShellRoutes, errorPage, notFound } from './modules/web-shell.js';
import { webRuntimeScript } from './modules/web-runtime.js';

const html=(body,status=200)=>new Response(body,{status,headers:{'content-type':'text/html; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff','referrer-policy':'strict-origin-when-cross-origin'}});
async function withRuntime(response){const type=response.headers.get('content-type')||'';if(!type.includes('text/html'))return response;const body=(await response.text()).replace('</body>','<script src="/assets/atlas-runtime.js" defer></script></body>');const headers=new Headers(response.headers);headers.delete('content-length');return new Response(body,{status:response.status,statusText:response.statusText,headers})}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    try {
      if (url.pathname === '/assets/atlas-runtime.js') return new Response(webRuntimeScript(),{headers:{'content-type':'text/javascript; charset=utf-8','cache-control':'public,max-age=3600','x-content-type-options':'nosniff'}});
      if (url.pathname === '/api/health') {
        const databaseReady=Boolean(env.DB);
        const body={ok:databaseReady,service:'atlas-enterprise-suite',version:ATLAS_VERSION,phase:'web-launch-readiness',state:databaseReady?'operational':'degraded',identityDatabase:databaseReady?'configured':'unconfigured',hrKnowledge:String(env.ATLAS_ENABLE_HR_KNOWLEDGE||'').toLowerCase()==='true'?'enabled':'disabled',sensory:'enabled',bridge:'foundation',qa:'native',backupIntegrity:'sha256',performanceOptimizer:'safe-policy'};
        return Response.json(body,{status:databaseReady?200:503,headers:{'cache-control':'no-store'}});
      }
      const authResponse = await authRoutes(request, env, url); if (authResponse) return authResponse;
      const rbacResponse = await rbacRoutes(request, env, url); if (rbacResponse) return rbacResponse;
      const evidenceResponse = await evidenceRoutes(request, env, url); if (evidenceResponse) return evidenceResponse;
      const hrKnowledgeResponse = await hrKnowledgeRoutes(request, env, url); if (hrKnowledgeResponse) return hrKnowledgeResponse;
      const sensoryResponse = await sensoryRoutes(request, env, url); if (sensoryResponse) return sensoryResponse;
      const investResponse = await investRoutes(request, env, url); if (investResponse) return investResponse;
      const bridgeResponse = await bridgeRoutes(request, env, url); if (bridgeResponse) return bridgeResponse;
      const webResponse = await webShellRoutes(request, env, url); if (webResponse) return withRuntime(webResponse);
      if (request.method === 'GET' && !url.pathname.startsWith('/api/')) return withRuntime(html(notFound(url.pathname),404));
      return Response.json({ok:false,error:'not_found'},{status:404,headers:{'cache-control':'no-store'}});
    } catch (error) {
      console.error('atlas_runtime_error', error?.message || error);
      if (request.method === 'GET' && !url.pathname.startsWith('/api/')) return withRuntime(html(errorPage(),500));
      return Response.json({ok:false,error:'atlas_runtime_unavailable'},{status:500,headers:{'cache-control':'no-store'}});
    }
  }
};
