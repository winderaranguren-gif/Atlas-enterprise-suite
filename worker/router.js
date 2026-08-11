import core from './index.js';
import { handleCommercialCore } from './commercial-core.js';
import { handleDocuments } from './documents.js';
import { handleAccounting } from './accounting.js';
import { handleBackups } from './backups.js';
import { handleSystemReadiness } from './system-readiness.js';
import { handleReleaseVerification } from './release-verification.js';
import { handlePasswordAuth } from './password-auth.js';

export default {
  async fetch(request,env,ctx){
    const url=new URL(request.url);
    if(url.pathname==='/api/admin/release-verification-session'){
      const response=await handleReleaseVerification(request,env,ctx);
      if(response) return response;
    }
    if(url.pathname.startsWith('/api/auth/') && url.pathname!=='/api/auth/logout'){
      const response=await handlePasswordAuth(request,env,ctx);
      if(response) return response;
    }
    if(url.pathname.startsWith('/api/system/')){
      const response=await handleSystemReadiness(request,env,ctx);
      if(response) return response;
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
