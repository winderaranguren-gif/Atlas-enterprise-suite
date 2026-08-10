import core from './index.js';
import { handleDocuments } from './documents.js';
import { handleAccounting } from './accounting.js';
import { handleBackups } from './backups.js';

const noStoreJson=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json;charset=UTF-8','cache-control':'no-store'}});

export default {
  async fetch(request,env,ctx){
    const url=new URL(request.url);
    if(url.pathname==='/api/system/release-fingerprint'&&request.method==='GET'){
      const sourceSha=String(env.ATLAS_DEPLOYED_SHA||'').trim();
      return noStoreJson({
        service:'ATLAS Enterprise Suite',
        sourceSha:sourceSha||null,
        verified: /^[0-9a-f]{40}$/i.test(sourceSha)
      },sourceSha?200:503);
    }
    if(url.pathname.startsWith('/api/documents')){
      const response=await handleDocuments(request,env,ctx);
      if(response) return response;
    }
    if(url.pathname.startsWith('/api/accounting')){
      const response=await handleAccounting(request,env,ctx);
      if(response) return response;
    }
    if(url.pathname.startsWith('/api/backups')){
      const response=await handleBackups(request,env,ctx);
      if(response) return response;
    }
    return core.fetch(request,env,ctx);
  }
};
