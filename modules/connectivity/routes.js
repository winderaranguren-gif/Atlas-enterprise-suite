const SENSITIVE_QUERY_KEYS = new Set([
  'mauth',
  'client_ip',
  'client_mac',
  'ap_mac',
  'login_url',
  'continue_url',
  'token',
  'session',
  'session_id',
  'auth',
  'authorization'
]);

function json(body,status=200,headers={}){
  return new Response(JSON.stringify(body),{
    status,
    headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store',...headers}
  });
}

export function sanitizePortalUrl(rawUrl){
  let parsed;
  try { parsed = new URL(rawUrl); }
  catch { return {ok:false,error:'invalid_url'}; }

  if(!['http:','https:'].includes(parsed.protocol)){
    return {ok:false,error:'unsupported_protocol'};
  }

  const removed=[];
  for(const key of [...parsed.searchParams.keys()]){
    if(SENSITIVE_QUERY_KEYS.has(key.toLowerCase())){
      parsed.searchParams.delete(key);
      removed.push(key);
    }
  }

  return {
    ok:true,
    origin:parsed.origin,
    hostname:parsed.hostname,
    pathname:parsed.pathname,
    safeUrl:parsed.toString(),
    removedSensitiveParameters:[...new Set(removed)].sort(),
    captivePortalLikely:/network-auth\.com$|connect-edge\.ihg\.com$/i.test(parsed.hostname)
  };
}

export async function connectivityRoutes(request,env,url){
  if(url.pathname==='/api/connectivity/ping' && request.method==='GET'){
    return new Response(null,{
      status:204,
      headers:{
        'cache-control':'no-store, no-cache, must-revalidate',
        'pragma':'no-cache',
        'x-atlas-connectivity':'online'
      }
    });
  }

  if(url.pathname==='/api/connectivity/config' && request.method==='GET'){
    return json({
      ok:true,
      module:'ATLAS Connectivity',
      mode:'captive-portal-assist',
      flow:[
        'probe_network',
        'detect_captive_portal',
        'open_authorized_login',
        'wait_for_user_authentication',
        'verify_internet',
        'mark_online'
      ],
      privacy:{
        persistPortalTokens:false,
        persistClientMac:false,
        persistClientIp:false,
        redactSensitiveQueryParameters:true
      },
      verificationEndpoint:'/api/connectivity/ping'
    });
  }

  if(url.pathname==='/api/connectivity/portal/analyze' && request.method==='POST'){
    let body;
    try { body=await request.json(); }
    catch { return json({ok:false,error:'invalid_json'},400); }

    if(typeof body?.url!=='string' || body.url.length>8192){
      return json({ok:false,error:'invalid_portal_url'},400);
    }

    const result=sanitizePortalUrl(body.url);
    return json(result,result.ok?200:400);
  }

  return null;
}
