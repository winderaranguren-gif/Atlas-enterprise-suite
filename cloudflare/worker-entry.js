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

const MUSIC_CSP="default-src 'self'; script-src 'self'; connect-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https://*.mzstatic.com https://i.ytimg.com; font-src 'self' data:; media-src 'self' blob:; frame-src https://www.youtube.com https://www.youtube-nocookie.com; frame-ancestors 'none'; base-uri 'self'; form-action 'self'";

function secure(response,overrides={}){
  const headers=new Headers(response.headers);
  for(const [name,value] of Object.entries(EDGE_HEADERS))headers.set(name,value);
  for(const [name,value] of Object.entries(overrides))headers.set(name,value);
  return new Response(response.body,{status:response.status,statusText:response.statusText,headers});
}

async function handleMusicSurface(request,env,url){
  const response=await env.ASSETS.fetch(request);
  const isHtml=url.pathname==='/atlas-music.html';
  return secure(response,{
    'Content-Security-Policy':MUSIC_CSP,
    'Cache-Control':isHtml?'no-store, max-age=0':'public, max-age=3600'
  });
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
    if(['/atlas-music.html','/atlas-music.css','/atlas-music.js','/atlas-music-providers.js'].includes(url.pathname)){
      return handleMusicSurface(request,env,url);
    }
    return baseWorker.fetch(request,env);
  }
};
