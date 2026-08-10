import core from './index.js';
import { handleDocuments } from './documents.js';

export default {
  async fetch(request,env,ctx){
    const url=new URL(request.url);
    if(url.pathname.startsWith('/api/documents')){
      const response=await handleDocuments(request,env,ctx);
      if(response) return response;
    }
    return core.fetch(request,env,ctx);
  }
};
