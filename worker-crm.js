import core from './worker.js';
import { crmRoutes } from './modules/crm.js';
import { crmPage } from './modules/crm-ui.js';
import { crmClientScript } from './modules/crm-client.js';
import { ensureWebSchema } from './modules/web-schema.js';

export default {
  async fetch(request,env){
    const url=new URL(request.url);
    if(/^\/assets\/atlas-(?:cloud-network-bg-v1|bg-\d{3})\.webp$/.test(url.pathname)&&env.ASSETS)return env.ASSETS.fetch(request);
    if(url.pathname==='/platform/crm')return new Response(crmPage(),{headers:{'content-type':'text/html; charset=utf-8','cache-control':'no-store'}});
    if(url.pathname==='/assets/crm-app.js')return new Response(crmClientScript(),{headers:{'content-type':'text/javascript; charset=utf-8','cache-control':'no-store'}});
    if(url.pathname.startsWith('/api/crm')){
      try{
        const response=await crmRoutes(request,env,url);
        if(response)return response;
      }catch{
        return Response.json({ok:false,error:'crm_runtime_unavailable'},{status:503,headers:{'cache-control':'no-store'}});
      }
    }
    if(url.pathname.startsWith('/api/web/')){
      try{
        const ready=await ensureWebSchema(env);
        if(!ready.ok)return Response.json({ok:false,error:ready.error},{status:503,headers:{'cache-control':'no-store'}});
      }catch{
        return Response.json({ok:false,error:'web_schema_unavailable'},{status:503,headers:{'cache-control':'no-store'}});
      }
    }
    return core.fetch(request,env);
  }
};
