import core from './index.js';
import { handleDocuments } from './documents.js';
import { handleAccounting } from './accounting.js';

export default {
  async fetch(request,env,ctx){
    const url=new URL(request.url);
    if(url.pathname.startsWith('/api/documents')){
      const response=await handleDocuments(request,env,ctx);
      if(response) return response;
    }
    if(url.pathname.startsWith('/api/accounting')){
      const response=await handleAccounting(request,env,ctx);
      if(response) return response;
    }
    return core.fetch(request,env,ctx);
  }
};
