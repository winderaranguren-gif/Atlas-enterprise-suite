const JSON_HEADERS={'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'};
const COOKIE='atlas_wallet_owner';
const encoder=new TextEncoder();

const json=(body,status=200,headers={})=>new Response(JSON.stringify(body),{status,headers:{...JSON_HEADERS,...headers}});
const truthy=value=>['1','true','yes','verified','ready'].includes(String(value||'').trim().toLowerCase());
const validId=value=>typeof value==='string'&&value.length>=8&&value.length<=128&&/^[A-Za-z0-9._:-]+$/.test(value);

function constantTimeEqual(a,b){
  const aa=encoder.encode(String(a||''));
  const bb=encoder.encode(String(b||''));
  if(aa.length!==bb.length)return false;
  let out=0;
  for(let i=0;i<aa.length;i++)out|=aa[i]^bb[i];
  return out===0;
}

function base64url(bytes){
  let binary='';
  for(const byte of bytes)binary+=String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
}

async function sha256(value){
  return base64url(new Uint8Array(await crypto.subtle.digest('SHA-256',encoder.encode(value))));
}

async function hmac(secret,value){
  const key=await crypto.subtle.importKey('raw',encoder.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);
  return base64url(new Uint8Array(await crypto.subtle.sign('HMAC',key,encoder.encode(value))));
}

function cookieValue(request,name){
  const raw=request.headers.get('cookie')||'';
  for(const part of raw.split(';')){
    const [key,...rest]=part.trim().split('=');
    if(key===name)return decodeURIComponent(rest.join('='));
  }
  return null;
}

function sessionCookie(token){
  return `${COOKIE}=${encodeURIComponent(token)}; Path=/; Max-Age=43200; HttpOnly; Secure; SameSite=Strict`;
}

function gatewayAuthorization(request,env){
  if(!truthy(env?.ATLAS_WALLET_IDENTITY_VERIFIED))return {ok:false,status:503,error:'wallet_identity_binding_not_verified'};
  if(!env?.ATLAS_WALLET_IDENTITY_TOKEN||!env?.ATLAS_WALLET_SESSION_SECRET)return {ok:false,status:503,error:'wallet_identity_gateway_not_configured'};
  const auth=request.headers.get('authorization')||'';
  const token=auth.startsWith('Bearer ')?auth.slice(7).trim():'';
  if(!token||!constantTimeEqual(token,env.ATLAS_WALLET_IDENTITY_TOKEN))return {ok:false,status:401,error:'wallet_identity_gateway_unauthorized'};
  const organizationId=request.headers.get('x-atlas-organization-id')||'';
  const dbaId=request.headers.get('x-atlas-dba-id')||'';
  const userId=request.headers.get('x-atlas-user-id')||'';
  if(!validId(organizationId)||!validId(dbaId)||!validId(userId))return {ok:false,status:400,error:'valid_wallet_identity_scope_required'};
  return {ok:true,organizationId,dbaId,userId};
}

async function scopedSessionToken(scope,secret){
  const scopeDigest=await sha256(`atlas-wallet:v1:${scope.organizationId}:${scope.dbaId}:${scope.userId}`);
  const signature=await hmac(secret,scopeDigest);
  return `${scopeDigest}_${signature}`;
}

async function validSessionToken(token,secret){
  const match=String(token||'').match(/^([A-Za-z0-9_-]{43})_([A-Za-z0-9_-]{43})$/);
  if(!match)return false;
  const expected=await hmac(secret,match[1]);
  return constantTimeEqual(match[2],expected);
}

function isWalletPath(path){return path==='/wallet'||path.startsWith('/wallet/')||path.startsWith('/api/wallet/');}

export async function handleWalletIdentityGate(request,env={}){
  const url=new URL(request.url);
  if(!isWalletPath(url.pathname))return null;

  if(url.pathname==='/api/wallet/session'){
    if(request.method!=='POST')return json({ok:false,error:'method_not_allowed'},405);
    const authz=gatewayAuthorization(request,env);
    if(!authz.ok)return json({ok:false,error:authz.error},authz.status);
    const token=await scopedSessionToken(authz,env.ATLAS_WALLET_SESSION_SECRET);
    return json({ok:true,authenticated:true,scope:'organization+dba+user',expiresInSeconds:43200},200,{'set-cookie':sessionCookie(token)});
  }

  if(!truthy(env?.ATLAS_WALLET_IDENTITY_VERIFIED))return json({ok:false,error:'wallet_identity_binding_not_verified'},503);
  if(!env?.ATLAS_WALLET_SESSION_SECRET)return json({ok:false,error:'wallet_session_signing_not_configured'},503);
  const token=cookieValue(request,COOKIE);
  if(!await validSessionToken(token,env.ATLAS_WALLET_SESSION_SECRET))return json({ok:false,error:'wallet_authenticated_session_required',identityRoute:'/identity',sessionEndpoint:'/api/wallet/session'},401);
  return null;
}
