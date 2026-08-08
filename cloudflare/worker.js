const SECURITY_HEADERS = Object.freeze({
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-Frame-Options': 'DENY',
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Permissions-Policy': 'camera=(self), microphone=(self), geolocation=(self)',
  'Content-Security-Policy': "default-src 'self'; script-src 'self' https://cdn.jsdelivr.net; connect-src 'self' https://*.supabase.co wss://*.supabase.co; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; media-src 'self' blob:; worker-src 'self' blob:; frame-ancestors 'none'; base-uri 'self'; form-action 'self'"
});

const APP_VERSION='0.5.0';
const SUPPORT_VERSION='1.0.0';

function applySecurityHeaders(response, requestUrl) {
  const headers = new Headers(response.headers);
  for (const [name, value] of Object.entries(SECURITY_HEADERS)) headers.set(name, value);

  const pathname = requestUrl.pathname;
  const contentType = headers.get('Content-Type') || '';

  if (contentType.includes('application/json')) {
    headers.set('Cache-Control', 'no-store, max-age=0');
  } else if (contentType.includes('text/html') || pathname.endsWith('.html') || pathname === '/') {
    headers.set('Cache-Control', 'no-store, max-age=0');
  } else if (pathname === '/service-worker.js') {
    headers.set('Cache-Control', 'public, max-age=0, must-revalidate');
  } else {
    headers.set('Cache-Control', 'public, max-age=3600');
  }

  if (pathname.startsWith('/private-beta') || pathname.startsWith('/cloud-auth')) {
    headers.set('X-Robots-Tag', 'noindex, nofollow, noarchive');
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}

function json(payload,status=200,extraHeaders={}){
  return new Response(JSON.stringify(payload),{
    status,
    headers:{'Content-Type':'application/json; charset=utf-8',...extraHeaders}
  });
}

function classifyIssue(summary=''){
  const text=String(summary).toLowerCase();
  if(/login|log in|sign in|auth|password|mfa|otp|acceso/.test(text))return 'identity-access';
  if(/deploy|deployment|cloudflare|worker|build|ci|pipeline|github/.test(text))return 'deployment';
  if(/network|internet|wifi|wi-fi|offline|conexi/.test(text))return 'network';
  if(/slow|lento|performance|rendimiento|freeze|frozen/.test(text))return 'performance';
  if(/data|storage|database|localstorage|cache|datos/.test(text))return 'data-storage';
  return 'general';
}

function supportAnalysis(body={}){
  const diagnostics=Array.isArray(body.diagnostics)?body.diagnostics:[];
  const failures=diagnostics.filter(item=>item&&item.ok===false);
  const recommendations=[];

  for(const item of failures){
    const id=String(item.id||'unknown');
    if(id==='service-worker')recommendations.push({id:'repair-service-worker',mode:'auto-safe',reason:'Registrar o actualizar el Service Worker y verificar nuevamente.'});
    else if(id==='quota')recommendations.push({id:'request-persistence',mode:'auto-safe',reason:'Solicitar persistencia reforzada sin borrar datos.'});
    else if(id==='network')recommendations.push({id:'network-access',mode:'external-access',reason:'Se necesita acceso al dispositivo o red; el navegador no puede reconectar físicamente Wi-Fi/celular.'});
    else if(id==='origin')recommendations.push({id:'https-required',mode:'deployment-change',reason:'Mover el entorno a HTTPS o localhost para funciones protegidas.'});
    else if(id==='assets')recommendations.push({id:'asset-review',mode:'diagnostic',reason:'Revisar recursos que no completaron carga antes de modificar cache o datos.'});
    else if(id.startsWith('adapter:'))recommendations.push({id,mode:'adapter',reason:'Usar el adaptador registrado para el sistema empresarial afectado.'});
    else recommendations.push({id,mode:'diagnostic',reason:item.detail||'Requiere diagnóstico adicional del componente.'});
  }

  return {
    ok:true,
    service:'ATLAS Technical Operations',
    supportVersion:SUPPORT_VERSION,
    classification:classifyIssue(body.summary),
    autonomousPolicy:{autoExecute:'safe-reversible',verifyAfterRepair:true,escalateOnlyOnRealBlocker:true},
    failures:failures.map(item=>({id:item.id,label:item.label,detail:item.detail})),
    recommendations
  };
}

async function handleApi(request,url){
  const requestId=crypto.randomUUID();
  const base={requestId,at:new Date().toISOString()};

  if(request.method==='GET'&&url.pathname==='/healthz'){
    return json({...base,ok:true,app:'ATLAS Enterprise Suite',version:APP_VERSION,support:SUPPORT_VERSION,runtime:'cloudflare-worker'});
  }

  if(request.method==='GET'&&url.pathname==='/api/version'){
    return json({...base,ok:true,name:'ATLAS Enterprise Suite',version:APP_VERSION,supportVersion:SUPPORT_VERSION});
  }

  if(request.method==='GET'&&url.pathname==='/api/support/capabilities'){
    return json({...base,ok:true,service:'ATLAS Technical Operations',capabilities:['diagnostics','safe-auto-repair','post-repair-verification','dynamic-adapters','case-audit-log','exact-blocker-escalation']});
  }

  if(request.method==='POST'&&url.pathname==='/api/support/analyze'){
    const length=Number(request.headers.get('content-length')||0);
    if(length>65536)return json({...base,ok:false,error:'payload_too_large'},413);
    let body;
    try{body=await request.json();}catch{return json({...base,ok:false,error:'invalid_json'},400);}
    return json({...base,...supportAnalysis(body)});
  }

  return json({...base,ok:false,error:'api_not_found',path:url.pathname},404);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if(url.pathname==='/healthz'||url.pathname.startsWith('/api/')){
      return applySecurityHeaders(await handleApi(request,url),url);
    }
    const response = await env.ASSETS.fetch(request);
    return applySecurityHeaders(response, url);
  }
};