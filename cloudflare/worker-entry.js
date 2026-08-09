import baseWorker from './worker.js';
import {handleGpsApi} from './gps-gateway.js';

const API_HEADERS=Object.freeze({
  'X-Content-Type-Options':'nosniff',
  'Referrer-Policy':'strict-origin-when-cross-origin',
  'X-Frame-Options':'DENY',
  'Cross-Origin-Opener-Policy':'same-origin',
  'Cross-Origin-Resource-Policy':'same-origin',
  'X-Permitted-Cross-Domain-Policies':'none',
  'Strict-Transport-Security':'max-age=31536000; includeSubDomains',
  'Permissions-Policy':'camera=(self), microphone=(self), geolocation=(self)',
  'Content-Security-Policy':"default-src 'self'; script-src 'self' https://cdn.jsdelivr.net; connect-src 'self' https://*.supabase.co wss://*.supabase.co; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; media-src 'self' blob:; worker-src 'self' blob:; frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
  'Cache-Control':'no-store, max-age=0'
});

const AUTH_TIMEOUT_MS=5000;
const MAX_AUTH_HEADER_BYTES=16384;

function secure(response){
  const headers=new Headers(response.headers);
  for(const [name,value] of Object.entries(API_HEADERS))headers.set(name,value);
  return new Response(response.body,{status:response.status,statusText:response.statusText,headers});
}

function json(payload,status=200,headers={}){
  return secure(new Response(JSON.stringify(payload),{
    status,
    headers:{'Content-Type':'application/json; charset=utf-8',...headers}
  }));
}

function routeGroup(pathname){
  if(pathname.startsWith('/api/gps/'))return 'gps';
  if(pathname.startsWith('/api/support/'))return 'support';
  return 'api';
}

function bearerToken(request){
  const value=request.headers.get('authorization')||'';
  if(!value||value.length>MAX_AUTH_HEADER_BYTES)return null;
  const match=value.match(/^Bearer\s+([^\s]+)$/i);
  return match?.[1]||null;
}

async function validateSupabaseUser(request,env){
  const token=bearerToken(request);
  const baseUrl=String(env.ATLAS_SUPABASE_URL||'').trim();
  const publishableKey=String(env.ATLAS_SUPABASE_PUBLISHABLE_KEY||'').trim();
  if(!token||!baseUrl||!publishableKey)return null;

  let endpoint;
  try{
    endpoint=new URL('/auth/v1/user',baseUrl);
    if(endpoint.protocol!=='https:')return null;
  }catch{return null;}

  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),AUTH_TIMEOUT_MS);
  try{
    const response=await fetch(endpoint.toString(),{
      method:'GET',
      headers:{
        'accept':'application/json',
        'apikey':publishableKey,
        'authorization':`Bearer ${token}`
      },
      cache:'no-store',
      signal:controller.signal
    });
    if(!response.ok)return null;
    const user=await response.json().catch(()=>null);
    if(!user||typeof user.id!=='string'||!user.id)return null;
    return {id:user.id,email:user.email||null};
  }catch{return null;}
  finally{clearTimeout(timer);}
}

async function rateLimit(env,key){
  const limiter=env.ATLAS_API_RATE_LIMITER;
  if(!limiter||typeof limiter.limit!=='function')return {ok:false,unavailable:true};
  try{
    const result=await limiter.limit({key});
    return {ok:result?.success===true};
  }catch{return {ok:false,unavailable:true};}
}

function requestIp(request){
  return String(request.headers.get('cf-connecting-ip')||'unknown').slice(0,48);
}

async function authorizeProtectedApi(request,url,env){
  const group=routeGroup(url.pathname);
  const preAuth=await rateLimit(env,`ip:${requestIp(request)}:${group}`);
  if(preAuth.unavailable)return {response:json({ok:false,error:'security_control_unavailable'},503)};
  if(!preAuth.ok)return {response:json({ok:false,error:'rate_limited'},429,{'Retry-After':'60'})};

  const user=await validateSupabaseUser(request,env);
  if(!user)return {response:json({ok:false,error:'authentication_required'},401,{'WWW-Authenticate':'Bearer'})};

  const perUser=await rateLimit(env,`user:${user.id}:${group}`);
  if(perUser.unavailable)return {response:json({ok:false,error:'security_control_unavailable'},503)};
  if(!perUser.ok)return {response:json({ok:false,error:'rate_limited'},429,{'Retry-After':'60'})};
  return {user};
}

export default {
  async fetch(request,env){
    const url=new URL(request.url);

    // Public liveness endpoints intentionally disclose no build, support, provider,
    // database, or runtime version metadata.
    if(request.method==='GET'&&url.pathname==='/healthz'){
      return json({ok:true});
    }
    if(request.method==='GET'&&url.pathname==='/api/version'){
      return json({ok:true});
    }

    const protectedApi=url.pathname.startsWith('/api/gps/')||url.pathname.startsWith('/api/support/');
    if(protectedApi){
      const authorization=await authorizeProtectedApi(request,url,env);
      if(authorization.response)return authorization.response;

      if(url.pathname.startsWith('/api/gps/')){
        const base={requestId:crypto.randomUUID(),at:new Date().toISOString()};
        const response=await handleGpsApi(request,url,env,base);
        if(response)return secure(response);
      }

      return secure(await baseWorker.fetch(request,env));
    }

    return baseWorker.fetch(request,env);
  }
};
