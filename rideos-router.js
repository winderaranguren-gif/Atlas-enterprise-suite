import atlasWorker from './atlas-router.js';
import {handleRideOS} from './modules/rideos-worker.js';
import {handleCreatorStudio} from './modules/creator-studio-worker.js';
export {VideoRoom} from './atlas-router.js';

function isRideOSPath(path){
  return path==='/rideos'||path.startsWith('/rideos/')||
    path==='/ride'||path.startsWith('/ride/')||
    path==='/driver'||path.startsWith('/driver/')||
    path==='/marketplace'||path.startsWith('/marketplace/')||
    path==='/driver-finance'||path.startsWith('/driver-finance/')||
    path.startsWith('/api/rideos/')||path.startsWith('/api/mobility/');
}

function isStudioPath(path){
  return path==='/studio'||path.startsWith('/studio/')||path.startsWith('/api/studio/');
}

async function surfaceStudio(response){
  const type=response.headers.get('content-type')||'';
  if(!type.includes('text/html'))return response;
  let html=await response.text();
  if(!html.includes('href="/studio"')){
    const link='<a class="nav" href="/studio"><span class="ico">✦</span>ATLAS Studio</a>';
    if(html.includes('</aside>'))html=html.replace('</aside>',link+'</aside>');
    else if(html.includes('</body>'))html=html.replace('</body>','<a href="/studio" style="position:fixed;right:14px;bottom:14px;z-index:999;padding:9px 12px;border-radius:10px;background:#0d365c;color:white;text-decoration:none;border:1px solid #2d78a8;font:12px system-ui">ATLAS Studio</a></body>');
  }
  const headers=new Headers(response.headers);
  headers.delete('content-length');
  return new Response(html,{status:response.status,statusText:response.statusText,headers});
}

export default {
  async fetch(request,env,ctx){
    const url=new URL(request.url);
    if(isStudioPath(url.pathname)){
      const response=handleCreatorStudio(request,env,ctx);
      if(response)return response;
    }
    if(isRideOSPath(url.pathname)){
      const response=await handleRideOS(request,env,ctx);
      if(response)return response;
    }
    return surfaceStudio(await atlasWorker.fetch(request,env,ctx));
  },
  async scheduled(controller,env,ctx){
    if(typeof atlasWorker.scheduled==='function')return atlasWorker.scheduled(controller,env,ctx);
    ctx?.waitUntil?.(Promise.resolve());
  }
};
