import core from './index.js';
import { handleCommercialCore } from './commercial-core.js';

export default {
  async fetch(request,env,ctx){
    const url=new URL(request.url);
    const secure=url.pathname.startsWith('/api/crm/')||url.pathname==='/api/users'||url.pathname.startsWith('/api/users/')||url.pathname==='/api/audit'||url.pathname==='/api/admin/bootstrap'||url.pathname==='/api/auth/logout';
    if(secure){
      const response=await handleCommercialCore(request,env,ctx);
      if(response) return response;
    }
    return core.fetch(request,env,ctx);
  },
  async scheduled(controller,env,ctx){
    if(core.scheduled) return core.scheduled(controller,env,ctx);
  }
};
