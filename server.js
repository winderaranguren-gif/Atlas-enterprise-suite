const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');

const port = Number(process.env.PORT || 4173);
const host = process.env.HOST || '0.0.0.0';
const root = path.resolve(__dirname);
const APP_VERSION = '0.4.3';
const SUPPORT_VERSION = '1.0.0';
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
  for (const entries of Object.values(os.networkInterfaces())) {
    for (const info of entries || []) {
      if (info.family === 'IPv4' && !info.internal) urls.push(`http://${info.address}:${port}`);
    }
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

const server = http.createServer(async (req, res) => {
  const pathname = decodeURIComponent((req.url || '/').split('?')[0]);
  const requestId=crypto.randomUUID();
  const base={requestId,at:new Date().toISOString()};

  if (req.method==='GET' && pathname === '/healthz') {
    return sendJson(res,200,{...base,ok:true,app:'ATLAS Enterprise Suite',version:APP_VERSION,support:SUPPORT_VERSION,runtime:'node-local',port});
  }

  if (req.method==='GET' && pathname === '/api/version') {
    return sendJson(res,200,{...base,ok:true,name:'ATLAS Enterprise Suite',version:APP_VERSION,supportVersion:SUPPORT_VERSION});
  }

  if (req.method==='GET' && pathname === '/api/support/capabilities') {
    return sendJson(res,200,{...base,ok:true,service:'ATLAS Technical Operations',capabilities:['diagnostics','safe-auto-repair','post-repair-verification','dynamic-adapters','case-audit-log','exact-blocker-escalation']});
  }

  if (req.method==='POST' && pathname === '/api/support/analyze') {
    try{
      const body=await readRequestJson(req);
      return sendJson(res,200,{...base,...analyzeSupport(body)});
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
