import baseWorker from './worker.js';
import {handleGpsApi} from './gps-gateway.js';
import {handleMusicApi} from './music-gateway.js';

const EDGE_HEADERS=Object.freeze({
  'X-Content-Type-Options':'nosniff',
  'Referrer-Policy':'strict-origin-when-cross-origin',
  'X-Frame-Options':'DENY',
  'Cross-Origin-Opener-Policy':'same-origin',
  'Permissions-Policy':'camera=(self), microphone=(self), geolocation=(self)',
  'Content-Security-Policy':"default-src 'self'; script-src 'self' https://cdn.jsdelivr.net; connect-src 'self' https://*.supabase.co wss://*.supabase.co; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; media-src 'self' blob:; worker-src 'self' blob:; frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
  'Cache-Control':'no-store, max-age=0'
});

function secure(response){
  const headers=new Headers(response.headers);
  for(const [name,value] of Object.entries(EDGE_HEADERS))headers.set(name,value);
  return new Response(response.body,{status:response.status,statusText:response.statusText,headers});
}

export default {
  async fetch(request,env){
    const url=new URL(request.url);
    if(url.pathname.startsWith('/api/gps/')){
      const base={requestId:crypto.randomUUID(),at:new Date().toISOString()};
      const response=await handleGpsApi(request,url,env,base);
      if(response)return secure(response);
    }
    if(url.pathname.startsWith('/api/music/')){
      const base={requestId:crypto.randomUUID(),at:new Date().toISOString()};
      const response=await handleMusicApi(request,url,env,base);
      if(response)return secure(response);
    }
    return baseWorker.fetch(request,env);
  }
};
