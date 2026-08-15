import core from './worker.js';
import { requireBrowserSession } from './modules/auth.js';
import { crmRoutes } from './modules/crm.js';
import { crmPage } from './modules/crm-ui.js';
import { crmClientScript } from './modules/crm-client.js';
import { ensureWebSchema } from './modules/web-schema.js';

function securityUnavailable(){
  return new Response(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>Security verification · ATLAS</title><style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#020711;color:#eef7ff;font-family:Inter,system-ui,sans-serif}.card{max-width:560px;margin:24px;padding:28px;border:1px solid #25527a;border-radius:18px;background:#071522}.card p{color:#9fb4c7;line-height:1.6}.card a{color:#59c9ff}</style></head><body><main class="card"><h1>Security verification unavailable.</h1><p>ATLAS will not open CRM without validating the active session.</p><a href="/login">Return to sign in</a></main></body></html>`,{status:503,headers:{'content-type':'text/html; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'}});
}

function isStaticVisual(pathname){
  return pathname.startsWith('/assets/')&&/\.(?:avif|gif|ico|jpe?g|png|svg|webp)$/i.test(pathname);
}

export default {
  async fetch(request,env){
    const url=new URL(request.url);
    if(url.pathname==='/platform/crm'){
      const verification=await requireBrowserSession(request,env);
      if(!verification.ok){
        if(verification.status===401)return Response.redirect(new URL('/login',url),302);
        return securityUnavailable();
      }
      return new Response(crmPage(),{headers:{'content-type':'text/html; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff','referrer-policy':'strict-origin-when-cross-origin'}});
    }
    if(url.pathname==='/assets/crm-app.js')return new Response(crmClientScript(),{headers:{'content-type':'text/javascript; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'}});
    // Wrangler runs the Worker before static assets. Forward every visual asset
    // to the ASSETS binding so homepage, dashboard and module imagery can load.
    // Runtime JavaScript remains owned by the Worker/core routing above/below.
    if(request.method==='GET'&&isStaticVisual(url.pathname)&&env.ASSETS)return env.ASSETS.fetch(request);
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