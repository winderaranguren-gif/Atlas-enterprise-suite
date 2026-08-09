const SECURITY_HEADERS = Object.freeze({
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-Frame-Options': 'DENY',
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Permissions-Policy': 'camera=(self), microphone=(self), geolocation=(self)',
  'Content-Security-Policy': "default-src 'self'; script-src 'self' https://cdn.jsdelivr.net; connect-src 'self' https://*.supabase.co wss://*.supabase.co; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; media-src 'self' blob:; worker-src 'self' blob:; frame-ancestors 'none'; base-uri 'self'; form-action 'self'"
});

const APP_VERSION='0.5.0';
const SUPPORT_VERSION='1.1.0';
const RUNBOOK_VERSION='1.0.0';
const MAX_JSON_BODY_BYTES=65536;

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

function normalizeObject(body){
  return body&&typeof body==='object'&&!Array.isArray(body)?body:{};
}

function supportAnalysis(body={}){
  body=normalizeObject(body);
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

function buildRunbook(body={}){
  body=normalizeObject(body);
  const diagnostics=Array.isArray(body.diagnostics)?body.diagnostics:[];
  const failures=diagnostics.filter(item=>item&&item.ok===false);
  const classification=classifyIssue(body.summary);
  const steps=[{
    id:'capture-state',
    label:'Capturar estado técnico',
    mode:'observe',
    status:'ready',
    detail:'Preservar diagnóstico, entorno y evidencia antes de modificar el sistema.'
  }];

  for(const item of failures){
    const id=String(item.id||'unknown');
    if(id==='service-worker')steps.push({id:'repair-service-worker',diagnosticId:id,action:'repair-service-worker',label:'Reparar Service Worker',mode:'auto-safe',status:'ready',detail:'Registrar o actualizar el Service Worker sin borrar datos y verificar nuevamente.'});
    else if(id==='quota')steps.push({id:'request-persistence',diagnosticId:id,action:'request-persistence',label:'Reforzar persistencia',mode:'auto-safe',status:'ready',detail:'Solicitar almacenamiento persistente sin eliminar información existente.'});
    else if(id==='network')steps.push({id:'network-access',diagnosticId:id,label:'Restablecer conectividad',mode:'blocked-access',status:'blocked',detail:'Requiere acceso al dispositivo, Wi-Fi, router o proveedor de red.'});
    else if(id==='origin')steps.push({id:'https-required',diagnosticId:id,label:'Corregir origen seguro',mode:'deployment',status:'blocked',detail:'Requiere servir ATLAS mediante HTTPS o localhost.'});
    else if(id==='api-version')steps.push({id:'backend-route',diagnosticId:id,label:'Restaurar backend ATLAS',mode:'deployment',status:'blocked',detail:'Requiere una ruta /api/version válida en el entorno desplegado.'});
    else if(id==='assets')steps.push({id:'asset-review',diagnosticId:id,label:'Revisar recursos web',mode:'diagnostic',status:'ready',detail:'Identificar recursos fallidos antes de invalidar caches o modificar datos.'});
    else if(id.startsWith('adapter:'))steps.push({id,diagnosticId:id,label:item.label||id,mode:'adapter',status:'ready',detail:item.detail||'Ejecutar el adaptador empresarial autorizado y verificar el resultado.'});
    else steps.push({id:`diagnose-${id}`,diagnosticId:id,label:`Profundizar ${item.label||id}`,mode:'diagnostic',status:'ready',detail:item.detail||'Recolectar evidencia adicional antes de aplicar cambios.'});
  }

  steps.push({id:'verify-final',label:'Verificación posterior',mode:'verify',status:'ready',detail:'Volver a ejecutar diagnóstico y no cerrar el caso hasta comprobar el estado final.'});

  return {
    ok:true,
    service:'ATLAS Technical Operations',
    source:'cloudflare-worker',
    supportVersion:SUPPORT_VERSION,
    runbookVersion:RUNBOOK_VERSION,
    classification,
    policy:{autoExecute:'safe-reversible-only',verifyAfterRepair:true,escalateOnlyOnRealBlocker:true},
    summary:{failures:failures.length,steps:steps.length,autoExecutable:steps.filter(step=>step.mode==='auto-safe').length,blocked:steps.filter(step=>step.status==='blocked').length},
    steps
  };
}

function invalidBody(base){
  return {error:json({...base,ok:false,error:'invalid_payload'},400)};
}

async function readJsonBody(request,base){
  const declared=request.headers.get('content-length');
  if(declared!==null){
    const length=Number(declared);
    if(Number.isFinite(length)&&length>MAX_JSON_BODY_BYTES){
      return {error:json({...base,ok:false,error:'payload_too_large'},413)};
    }
  }

  if(!request.body)return {error:json({...base,ok:false,error:'invalid_json'},400)};

  const reader=request.body.getReader();
  const decoder=new TextDecoder();
  let bytes=0;
  let text='';

  try{
    while(true){
      const {done,value}=await reader.read();
      if(done)break;
      bytes+=value?.byteLength||0;
      if(bytes>MAX_JSON_BODY_BYTES){
        try{await reader.cancel();}catch{}
        return {error:json({...base,ok:false,error:'payload_too_large'},413)};
      }
      text+=decoder.decode(value,{stream:true});
    }
    text+=decoder.decode();
    return {body:JSON.parse(text)};
  }catch{
    return {error:json({...base,ok:false,error:'invalid_json'},400)};
  }
}

async function handleApi(request,url){
  const requestId=crypto.randomUUID();
  const base={requestId,at:new Date().toISOString()};

  if(request.method==='GET'&&url.pathname==='/healthz'){
    return json({...base,ok:true,app:'ATLAS Enterprise Suite',version:APP_VERSION,support:SUPPORT_VERSION,runbookVersion:RUNBOOK_VERSION,runtime:'cloudflare-worker'});
  }

  if(request.method==='GET'&&url.pathname==='/api/version'){
    return json({...base,ok:true,name:'ATLAS Enterprise Suite',version:APP_VERSION,supportVersion:SUPPORT_VERSION,runbookVersion:RUNBOOK_VERSION});
  }

  if(request.method==='GET'&&url.pathname==='/api/support/capabilities'){
    return json({...base,ok:true,service:'ATLAS Technical Operations',capabilities:['diagnostics','safe-auto-repair','post-repair-verification','dynamic-adapters','case-audit-log','exact-blocker-escalation','runbook-planning','backend-advisory']});
  }

  if(request.method==='GET'&&url.pathname==='/api/support/runbooks'){
    return json({...base,ok:true,service:'ATLAS Technical Operations',runbookVersion:RUNBOOK_VERSION,classifications:['general','identity-access','deployment','network','performance','data-storage'],executionPolicy:'safe-reversible-only'});
  }

  if(request.method==='POST'&&url.pathname==='/api/support/analyze'){
    const parsed=await readJsonBody(request,base);
    if(parsed.error)return parsed.error;
    if(!parsed.body||typeof parsed.body!=='object'||Array.isArray(parsed.body))return invalidBody(base).error;
    return json({...base,...supportAnalysis(parsed.body)});
  }

  if(request.method==='POST'&&url.pathname==='/api/support/plan'){
    const parsed=await readJsonBody(request,base);
    if(parsed.error)return parsed.error;
    if(!parsed.body||typeof parsed.body!=='object'||Array.isArray(parsed.body))return invalidBody(base).error;
    return json({...base,...buildRunbook(parsed.body)});
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
