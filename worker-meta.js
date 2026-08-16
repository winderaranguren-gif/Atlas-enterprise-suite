import app from './worker-crm.js';
import { metaCatalogRoutes } from './modules/meta-catalog.js';
import { RELEASE_SHA, RELEASE_BRANCH } from './modules/release-identity.js';

export default {
 async fetch(request,env,ctx){
  const url=new URL(request.url);
  if(url.pathname==='/api/release'&&request.method==='GET'){
   return Response.json({ok:true,service:'atlas-enterprise-suite',releaseSha:RELEASE_SHA,releaseBranch:RELEASE_BRANCH},{headers:{'cache-control':'no-store'}});
  }
  if(url.pathname==='/whatsapp-catalog.csv')url.pathname='/feeds/meta/atlas-catalog.csv';
  const catalogResponse=await metaCatalogRoutes(request,env,url);
  if(catalogResponse)return catalogResponse;
  return app.fetch(request,env,ctx);
 }
};
