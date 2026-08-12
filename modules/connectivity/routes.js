import { CONNECTIVITY_CATALOG, CONNECTIVITY_CATALOG_VERSION, flattenConnectivityCapabilities, findConnectivityCapability } from './service-catalog.js';

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

function catalogSummary(){
  const capabilities=flattenConnectivityCapabilities();
  return {
    module:CONNECTIVITY_CATALOG.module,
    version:CONNECTIVITY_CATALOG_VERSION,
    strategy:CONNECTIVITY_CATALOG.strategy,
    capabilityCount:capabilities.length,
    segments:['personal','business'],
    exclusions:CONNECTIVITY_CATALOG.exclusions,
    nativeRuntime:['connectivity_probe','captive_portal_detection','portal_url_redaction'],
    serviceLayer:['catalog','capability_discovery','operation_contracts'],
    carrierProvisioningRequiresBackendIntegration:true
  };
}

function filteredCapabilities(url){
  const segment=url.searchParams.get('segment');
  const category=url.searchParams.get('category');
  const operation=url.searchParams.get('operation');
  const query=(url.searchParams.get('q')||'').trim().toLowerCase();
  return flattenConnectivityCapabilities().filter(item=>{
    if(segment && item.segment!==segment) return false;
    if(category && item.category!==category) return false;
    if(operation && !item.operations.includes(operation)) return false;
    if(query){
      const haystack=[item.id,item.name,item.segment,item.category,...item.operations].join(' ').toLowerCase();
      if(!haystack.includes(query)) return false;
    }
    return true;
  });
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
      mode:'communications-connectivity',
      catalog:catalogSummary(),
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

  if(url.pathname==='/api/connectivity/catalog' && request.method==='GET'){
    return json({ok:true,summary:catalogSummary(),catalog:CONNECTIVITY_CATALOG});
  }

  if(url.pathname==='/api/connectivity/capabilities' && request.method==='GET'){
    const capabilities=filteredCapabilities(url);
    return json({ok:true,count:capabilities.length,capabilities});
  }

  if(url.pathname.startsWith('/api/connectivity/capabilities/') && request.method==='GET'){
    const id=decodeURIComponent(url.pathname.slice('/api/connectivity/capabilities/'.length));
    if(!id) return json({ok:false,error:'capability_id_required'},400);
    const capability=findConnectivityCapability(id);
    if(!capability) return json({ok:false,error:'capability_not_found'},404);
    return json({ok:true,capability});
  }

  if(url.pathname==='/api/connectivity/account/actions' && request.method==='GET'){
    const actions=(CONNECTIVITY_CATALOG.personal.account||[]).flatMap(item=>item.operations.map(operation=>({capabilityId:item.id,operation})));
    return json({ok:true,count:actions.length,actions});
  }

  if(url.pathname==='/api/connectivity/support/actions' && request.method==='GET'){
    return json({ok:true,support:CONNECTIVITY_CATALOG.support});
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
