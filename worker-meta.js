import app from './worker-crm.js';
import { metaCatalogRoutes } from './modules/meta-catalog.js';

export default {
 async fetch(request,env,ctx){
  const url=new URL(request.url);
  if(url.pathname==='/whatsapp-catalog.csv')url.pathname='/feeds/meta/atlas-catalog.csv';
  const catalogResponse=await metaCatalogRoutes(request,env,url);
  if(catalogResponse)return catalogResponse;
  return app.fetch(request,env,ctx);
 }
};
