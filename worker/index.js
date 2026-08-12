import { json, health } from '../platform/runtime/health.js';
import { publicRuntimeMeta } from '../platform/runtime/meta.js';
import { identityRoutes } from '../modules/identity/routes.js';
import { crmRoutes } from '../modules/crm/routes.js';
import { documentRoutes } from '../modules/documents/routes.js';
import { accountingRoutes } from '../modules/accounting/routes.js';
import { backupRoutes } from '../modules/backups/routes.js';
import { connectivityRoutes } from '../modules/connectivity/routes.js';
import { intelligenceRoutes } from '../modules/intelligence/routes.js';
import { analyticsRoutes } from '../modules/analytics/routes.js';

export default {
  async fetch(request,env){
    const url=new URL(request.url);
    if(url.pathname==='/api/health') return json(await health(env));
    if(url.pathname==='/api/meta') return json(publicRuntimeMeta(env));
    const connectivityResponse=await connectivityRoutes(request,env,url);
    if(connectivityResponse) return connectivityResponse;
    const identityResponse=await identityRoutes(request,env,url);
    if(identityResponse) return identityResponse;
    const intelligenceResponse=await intelligenceRoutes(request,env,url);
    if(intelligenceResponse) return intelligenceResponse;
    const crmResponse=await crmRoutes(request,env,url);
    if(crmResponse) return crmResponse;
    const documentResponse=await documentRoutes(request,env,url);
    if(documentResponse) return documentResponse;
    const accountingResponse=await accountingRoutes(request,env,url);
    if(accountingResponse) return accountingResponse;
    const analyticsResponse=await analyticsRoutes(request,env,url);
    if(analyticsResponse) return analyticsResponse;
    const backupResponse=await backupRoutes(request,env,url);
    if(backupResponse) return backupResponse;
    if(url.pathname.startsWith('/api/')) return json({ok:false,error:'not_implemented'},501);
    return env.ASSETS?env.ASSETS.fetch(request):new Response('ATLAS',{status:200});
  }
};
