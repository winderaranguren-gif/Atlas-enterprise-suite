import baseWorker from './worker.js';
import {handleFinance} from './modules/finance-worker.js';

export default {
  async fetch(request,env,ctx){
    const url=new URL(request.url);
    if(url.pathname==='/api/finance/capabilities'||url.pathname==='/api/finance/health'||url.pathname==='/finance'||url.pathname.startsWith('/finance/')){
      const response=await handleFinance(request,env,ctx);
      if(response)return response;
    }
    return baseWorker.fetch(request,env,ctx);
  }
};
