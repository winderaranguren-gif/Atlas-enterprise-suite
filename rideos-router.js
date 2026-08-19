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
    return atlasWorker.fetch(request,env,ctx);
  },
  async scheduled(controller,env,ctx){
    if(typeof atlasWorker.scheduled==='function')return atlasWorker.scheduled(controller,env,ctx);
    ctx?.waitUntil?.(Promise.resolve());
  }
};
