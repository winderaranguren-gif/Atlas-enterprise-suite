import { json, health } from '../platform/runtime/health.js';
import { identityRoutes } from '../modules/identity/routes.js';
import { crmRoutes } from '../modules/crm/routes.js';
import { documentRoutes } from '../modules/documents/routes.js';
import { accountingRoutes } from '../modules/accounting/routes.js';
import { connectivityRoutes } from '../modules/connectivity/routes.js';

export default {
  async fetch(request,env){
    const url=new URL(request.url);
    if(url.pathname==='/api/health') return json(await health(env));
    const connectivityResponse=await connectivityRoutes(request,env,url);
    if(connectivityResponse) return connectivityResponse;
    const identityResponse=await identityRoutes(request,env,url);
    if(identityResponse) return identityResponse;
    const crmResponse=await crmRoutes(request,env,url);
    if(crmResponse) return crmResponse;
    const documentResponse=await documentRoutes(request,env,url);
    if(documentResponse) return documentResponse;
    const accountingResponse=await accountingRoutes(request,env,url);
    if(accountingResponse) return accountingResponse;
    if(url.pathname.startsWith('/api/')) return json({ok:false,error:'not_implemented'},501);
    return env.ASSETS?env.ASSETS.fetch(request):new Response('ATLAS',{status:200});
  }
};
