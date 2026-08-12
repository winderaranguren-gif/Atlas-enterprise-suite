import { dispatchApi } from '../modules/api-gateway/src/router.js';

export default {
  async fetch(request,env){
    const apiResponse=await dispatchApi(request,env);
    if(apiResponse) return apiResponse;
    return env.ASSETS?env.ASSETS.fetch(request):new Response('ATLAS',{status:200});
  }
};
