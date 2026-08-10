const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');

const port = Number(process.env.PORT || 4173);
const host = process.env.HOST || '0.0.0.0';
const root = path.resolve(__dirname);
const APP_VERSION = '0.5.0';
const SUPPORT_VERSION = '1.1.0';
const RUNBOOK_VERSION = '1.0.0';
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-5.6';
const OPENAI_TIMEOUT_MS = 45000;
const MAX_AI_MESSAGES = 12;
const types = {
  '.html':'text/html; charset=utf-8',
  '.css':'text/css; charset=utf-8',
  '.js':'text/javascript; charset=utf-8',
  '.json':'application/json; charset=utf-8',
  '.webmanifest':'application/manifest+json',
  '.svg':'image/svg+xml',
  '.png':'image/png',
  '.jpg':'image/jpeg',
  '.jpeg':'image/jpeg',
  '.webp':'image/webp',
  '.ico':'image/x-icon'
};

function networkUrls() {
  const urls = [];
  try {
    for (const entries of Object.values(os.networkInterfaces())) {
      for (const info of entries || []) {
        if (info.family === 'IPv4' && !info.internal) urls.push(`http://${info.address}:${port}`);
      }
    }
  } catch (error) {
    console.warn(`Network address discovery unavailable: ${error.code || error.message}`);
  }
  return [...new Set(urls)];
}

function sendJson(res,status,payload){
  res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});
  res.end(JSON.stringify(payload));
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

function analyzeSupport(body={}){
  const diagnostics=Array.isArray(body.diagnostics)?body.diagnostics:[];
  const failures=diagnostics.filter(item=>item&&item.ok===false);
  return {
    ok:true,
    service:'ATLAS Technical Operations',
    supportVersion:SUPPORT_VERSION,
    classification:classifyIssue(body.summary),
    autonomousPolicy:{autoExecute:'safe-reversible',verifyAfterRepair:true,escalateOnlyOnRealBlocker:true},
    failures:failures.map(item=>({id:item.id,label:item.label,detail:item.detail})),
    recommendations:failures.map(item=>{
      const id=String(item.id||'unknown');
      if(id==='service-worker')return {id:'repair-service-worker',mode:'auto-safe',reason:'Registrar o actualizar el Service Worker y verificar nuevamente.'};
      if(id==='quota')return {id:'request-persistence',mode:'auto-safe',reason:'Solicitar persistencia reforzada sin borrar datos.'};
      if(id==='network')return {id:'network-access',mode:'external-access',reason:'Se necesita acceso al dispositivo o red para restablecer conectividad física.'};
      if(id==='origin')return {id:'https-required',mode:'deployment-change',reason:'Mover el entorno a HTTPS o localhost para funciones protegidas.'};
      return {id,mode:id.startsWith('adapter:')?'adapter':'diagnostic',reason:item.detail||'Requiere diagnóstico adicional del componente.'};
    })
  };
}

function buildRunbook(body={}){
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
    if(id==='service-worker')steps.push({id:'repair-service-worker',action:'repair-service-worker',label:'Reparar Service Worker',mode:'auto-safe',status:'ready',detail:'Registrar o actualizar el Service Worker sin borrar datos y verificar nuevamente.'});
    else if(id==='quota')steps.push({id:'request-persistence',action:'request-persistence',label:'Reforzar persistencia',mode:'auto-safe',status:'ready',detail:'Solicitar almacenamiento persistente sin eliminar información existente.'});
    else if(id==='network')steps.push({id:'network-access',label:'Restablecer conectividad',mode:'blocked-access',status:'blocked',detail:'Requiere acceso al dispositivo, Wi-Fi, router o proveedor de red.'});
    else if(id==='origin')steps.push({id:'https-required',label:'Corregir origen seguro',mode:'deployment',status:'blocked',detail:'Requiere servir ATLAS mediante HTTPS o localhost.'});
    else if(id==='api-version')steps.push({id:'backend-route',label:'Restaurar backend ATLAS',mode:'deployment',status:'blocked',detail:'Requiere una ruta /api/version válida en el entorno desplegado.'});
    else if(id==='assets')steps.push({id:'asset-review',label:'Revisar recursos web',mode:'diagnostic',status:'ready',detail:'Identificar recursos fallidos antes de invalidar caches o modificar datos.'});
    else if(id.startsWith('adapter:'))steps.push({id,label:item.label||id,mode:'adapter',status:'ready',detail:item.detail||'Ejecutar el adaptador empresarial autorizado y verificar el resultado.'});
    else steps.push({id:`diagnose-${id}`,label:`Profundizar ${item.label||id}`,mode:'diagnostic',status:'ready',detail:item.detail||'Recolectar evidencia adicional antes de aplicar cambios.'});
  }

  steps.push({id:'verify-final',label:'Verificación posterior',mode:'verify',status:'ready',detail:'Volver a ejecutar diagnóstico y no cerrar el caso hasta comprobar el estado final.'});

  return {
    ok:true,
    service:'ATLAS Technical Operations',
    source:'node-local',
    supportVersion:SUPPORT_VERSION,
    runbookVersion:RUNBOOK_VERSION,
    classification,
    policy:{autoExecute:'safe-reversible-only',verifyAfterRepair:true,escalateOnlyOnRealBlocker:true},
    summary:{failures:failures.length,steps:steps.length,autoExecutable:steps.filter(step=>step.mode==='auto-safe').length,blocked:steps.filter(step=>step.status==='blocked').length},
    steps
  };
}

function readRequestJson(req,limit=65536){
  return new Promise((resolve,reject)=>{
    let size=0;
    const chunks=[];
    req.on('data',chunk=>{
      size+=chunk.length;
      if(size>limit){
        reject(Object.assign(new Error('payload_too_large'),{status:413}));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end',()=>{
      try{resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')||'{}'));}
      catch{reject(Object.assign(new Error('invalid_json'),{status:400}));}
    });
    req.on('error',reject);
  });
}

function normalizeAiMessages(body={}){
  if(!Array.isArray(body.messages))return [];
  return body.messages.slice(-MAX_AI_MESSAGES).flatMap(message=>{
    const role=message?.role==='assistant'?'assistant':'user';
    const content=String(message?.content||'').trim().slice(0,8000);
    return content?[{role,content}]:[];
  });
}

async function requestAtlasIntelligence(body={}){
  const apiKey=process.env.OPENAI_API_KEY;
  if(!apiKey)throw Object.assign(new Error('ATLAS Intelligence requires OPENAI_API_KEY on the server.'),{status:503,code:'openai_not_configured'});
  const messages=normalizeAiMessages(body);
  if(!messages.length)throw Object.assign(new Error('A message is required.'),{status:400,code:'message_required'});

  const controller=new AbortController();
  const timeout=setTimeout(()=>controller.abort(),OPENAI_TIMEOUT_MS);
  try{
    const response=await fetch('https://api.openai.com/v1/responses',{
      method:'POST',
      headers:{'Authorization':`Bearer ${apiKey}`,'Content-Type':'application/json'},
      body:JSON.stringify({
        model:OPENAI_MODEL,
        instructions:'You are ATLAS Intelligence, the secure bilingual operating intelligence for ATLAS Enterprise Suite. Reply in the user\'s language. Be concise, accurate, action-oriented, privacy-aware, and transparent about uncertainty. Never claim to execute an external action unless the application provides verified evidence.',
        input:messages,
        store:false
      }),
      signal:controller.signal
    });
    const data=await response.json().catch(()=>({}));
    if(!response.ok){
      const safeStatus=response.status===429?429:response.status>=500?502:400;
      throw Object.assign(new Error(data.error?.message||'OpenAI request failed.'),{status:safeStatus,code:'openai_request_failed'});
    }
    const output=String(data.output_text||'').trim();
    if(!output)throw Object.assign(new Error('OpenAI returned an empty response.'),{status:502,code:'openai_empty_response'});
    return {output,model:data.model||OPENAI_MODEL,responseId:data.id||null};
  }catch(error){
    if(error.name==='AbortError')throw Object.assign(new Error('OpenAI request timed out.'),{status:504,code:'openai_timeout'});
    throw error;
  }finally{clearTimeout(timeout);}
}

const server = http.createServer(async (req, res) => {
  const pathname = decodeURIComponent((req.url || '/').split('?')[0]);
  const requestId=crypto.randomUUID();
  const base={requestId,at:new Date().toISOString()};

  if (req.method==='GET' && pathname === '/healthz') {
    return sendJson(res,200,{...base,ok:true,app:'ATLAS Enterprise Suite',version:APP_VERSION,support:SUPPORT_VERSION,runbookVersion:RUNBOOK_VERSION,runtime:'node-local',port});
  }

  if (req.method==='GET' && pathname === '/api/version') {
    return sendJson(res,200,{...base,ok:true,name:'ATLAS Enterprise Suite',version:APP_VERSION,supportVersion:SUPPORT_VERSION,runbookVersion:RUNBOOK_VERSION});
  }

  if (req.method==='GET' && pathname === '/api/support/capabilities') {
    return sendJson(res,200,{...base,ok:true,service:'ATLAS Technical Operations',capabilities:['diagnostics','safe-auto-repair','post-repair-verification','dynamic-adapters','case-audit-log','exact-blocker-escalation','runbook-planning','backend-advisory']});
  }

  if (req.method==='GET' && pathname === '/api/support/runbooks') {
    return sendJson(res,200,{...base,ok:true,service:'ATLAS Technical Operations',runbookVersion:RUNBOOK_VERSION,classifications:['general','identity-access','deployment','network','performance','data-storage'],executionPolicy:'safe-reversible-only'});
  }

  if (req.method==='GET' && pathname === '/api/atlas-ai/status') {
    return sendJson(res,200,{...base,ok:true,service:'ATLAS Intelligence',configured:Boolean(process.env.OPENAI_API_KEY),model:OPENAI_MODEL});
  }

  if (req.method==='POST' && pathname === '/api/atlas-ai/respond') {
    try{
      const body=await readRequestJson(req,131072);
      const result=await requestAtlasIntelligence(body);
      return sendJson(res,200,{...base,ok:true,...result});
    }catch(error){
      return sendJson(res,error.status||500,{...base,ok:false,error:error.code||'atlas_ai_error',message:error.message||'ATLAS Intelligence request failed.'});
    }
  }

  if (req.method==='POST' && pathname === '/api/support/analyze') {
    try{
      const body=await readRequestJson(req);
      return sendJson(res,200,{...base,...analyzeSupport(body)});
    }catch(error){
      return sendJson(res,error.status||400,{...base,ok:false,error:error.message||'invalid_request'});
    }
  }

  if (req.method==='POST' && pathname === '/api/support/plan') {
    try{
      const body=await readRequestJson(req);
      return sendJson(res,200,{...base,...buildRunbook(body)});
    }catch(error){
      return sendJson(res,error.status||400,{...base,ok:false,error:error.message||'invalid_request'});
    }
  }

  if(pathname.startsWith('/api/'))return sendJson(res,404,{...base,ok:false,error:'api_not_found',path:pathname});

  const relative = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
  let filePath = path.resolve(root, relative);
  if (filePath !== root && !filePath.startsWith(`${root}${path.sep}`)) {
    res.writeHead(403, { 'Content-Type':'text/plain; charset=utf-8' });
    return res.end('Forbidden');
  }

  fs.stat(filePath, (err, stat) => {
    if (err || !stat.isFile()) filePath = path.join(root, 'index.html');
    fs.readFile(filePath, (readErr, data) => {
      if (readErr) {
        res.writeHead(500, { 'Content-Type':'text/plain; charset=utf-8' });
        return res.end('Server error');
      }
      res.writeHead(200, {
        'Content-Type': types[path.extname(filePath).toLowerCase()] || 'application/octet-stream',
        'Cache-Control':'no-store'
      });
      res.end(data);
    });
  });
});

server.on('error', err => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${port} is already in use. Close the other ATLAS server or run with PORT=4174 npm start.`);
  } else if (err.code === 'EACCES') {
    console.error(`Permission denied while opening port ${port}. Try a different port.`);
  } else {
    console.error('ATLAS server error:', err.message);
  }
  process.exitCode = 1;
});

server.listen(port, host, () => {
  console.log('\nATLAS Enterprise Suite is running.');
  console.log(`Local:   http://127.0.0.1:${port}`);
  for (const url of networkUrls()) console.log(`Network: ${url}`);
  console.log(`Health:  http://127.0.0.1:${port}/healthz`);
  console.log(`Support: http://127.0.0.1:${port}/api/support/capabilities`);
  console.log('\nKeep this terminal open while using ATLAS.');
  console.log('For a phone/tablet, use a Network address above and keep both devices on the same Wi-Fi.\n');
});
