import core from './worker.js';
import { crmRoutes } from './modules/crm.js';
import { crmPage } from './modules/crm-ui.js';

export default {
  async fetch(request,env){
    const url=new URL(request.url);
    const crmResponse=await crmRoutes(request,env,url);
    if(crmResponse)return crmResponse;
    if(url.pathname==='/platform/crm')return new Response(crmPage(),{headers:{'content-type':'text/html; charset=utf-8','cache-control':'no-store'}});
    return core.fetch(request,env);
  }
};
