import { json, health } from '../platform/runtime/health.js';

export default {
  async fetch(request,env){
    const url=new URL(request.url);
    if(url.pathname==='/api/health') return json(await health(env));
    if(url.pathname.startsWith('/api/')) return json({ok:false,error:'not_implemented'},501);
    return env.ASSETS?env.ASSETS.fetch(request):new Response('ATLAS',{status:200});
  }
};
