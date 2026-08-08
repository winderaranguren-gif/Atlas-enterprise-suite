(()=>{
'use strict';

const STORAGE_KEY='atlas-technical-support-v1';
const MAX_EVENTS=250;
const now=()=>new Date().toISOString();
const uid=()=>crypto.randomUUID?.()||`ats-${Date.now()}-${Math.random().toString(16).slice(2)}`;
const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));

const state=loadState();
const adapters=new Map();
let panel=null;
let activeCaseId=state.activeCaseId||null;

function loadState(){
  try{
    const parsed=JSON.parse(localStorage.getItem(STORAGE_KEY)||'{}');
    return {
      cases:Array.isArray(parsed.cases)?parsed.cases:[],
      activeCaseId:parsed.activeCaseId||null,
      preferences:parsed.preferences||{}
    };
  }catch{
    return {cases:[],activeCaseId:null,preferences:{}};
  }
}

function persist(){
  try{
    state.activeCaseId=activeCaseId;
    localStorage.setItem(STORAGE_KEY,JSON.stringify(state));
    return true;
  }catch{return false;}
}

function emit(name,detail={}){
  window.dispatchEvent(new CustomEvent(`atlas:support:${name}`,{detail}));
}

function getActiveCase(){
  return state.cases.find(item=>item.id===activeCaseId)||null;
}

function log(caseItem,type,message,data={}){
  const event={id:uid(),at:now(),type,message,data};
  caseItem.timeline=Array.isArray(caseItem.timeline)?caseItem.timeline:[];
  caseItem.timeline.push(event);
  if(caseItem.timeline.length>MAX_EVENTS)caseItem.timeline=caseItem.timeline.slice(-MAX_EVENTS);
  caseItem.updatedAt=event.at;
  persist();
  emit('event',{caseId:caseItem.id,event});
  render();
  return event;
}

function openCase(input={}){
  const caseItem={
    id:uid(),
    company:String(input.company||'').trim()||'ATLAS Client',
    contact:String(input.contact||'').trim(),
    summary:String(input.summary||'').trim()||'Technical support request',
    status:'open',
    severity:'normal',
    createdAt:now(),
    updatedAt:now(),
    diagnostics:[],
    actions:[],
    blockers:[],
    modules:discoverModules(),
    timeline:[]
  };
  state.cases.unshift(caseItem);
  activeCaseId=caseItem.id;
  log(caseItem,'case-opened','Caso técnico creado.',{company:caseItem.company,summary:caseItem.summary});
  emit('case-opened',{case:caseItem});
  return caseItem;
}

function registerAdapter(name,adapter={}){
  if(!name||typeof name!=='string')throw new TypeError('Adapter name is required.');
  if(!adapter||typeof adapter!=='object')throw new TypeError('Adapter must be an object.');
  adapters.set(name,{name,...adapter});
  emit('adapter-registered',{name});
  render();
  return ()=>adapters.delete(name);
}

function discoverModules(){
  const found=new Map();
  const add=(id,label,source='dom')=>{
    const key=String(id||label||'').trim();
    if(!key)return;
    if(!found.has(key))found.set(key,{id:key,label:String(label||id||key).trim(),source});
  };

  document.querySelectorAll('[data-module],[data-module-id],[data-route]').forEach(node=>{
    const id=node.dataset.module||node.dataset.moduleId||node.dataset.route;
    const label=node.getAttribute('aria-label')||node.textContent?.trim()||id;
    add(id,label,'dom');
  });

  const runtimeCandidates=[window.ATLAS?.modules,window.ATLAS?.registry,window.ATLAS_MODULES,window.ATLAS?.moduleRegistry];
  runtimeCandidates.forEach(candidate=>{
    if(Array.isArray(candidate))candidate.forEach(item=>add(item.id||item.key||item.name,item.label||item.title||item.name,'runtime'));
    else if(candidate&&typeof candidate==='object')Object.entries(candidate).forEach(([key,item])=>add(key,item?.label||item?.title||item?.name||key,'runtime'));
  });

  return [...found.values()].slice(0,100);
}

async function withTimeout(promise,ms=5000){
  let timer;
  try{
    return await Promise.race([
      promise,
      new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error(`Timeout after ${ms}ms`)),ms);})
    ]);
  }finally{clearTimeout(timer);}
}

async function probe(id,label,test,repair=null){
  const started=performance.now();
  try{
    const result=await test();
    const normalized=typeof result==='object'&&result!==null?result:{ok:Boolean(result),detail:String(result)};
    return {id,label,ok:normalized.ok!==false,detail:normalized.detail||'',data:normalized.data||null,repair,durationMs:Math.round(performance.now()-started)};
  }catch(error){
    return {id,label,ok:false,detail:error?.message||String(error),data:null,repair,durationMs:Math.round(performance.now()-started)};
  }
}

async function coreDiagnostics(){
  const diagnostics=[];

  diagnostics.push(await probe('network','Conectividad',async()=>({
    ok:navigator.onLine,
    detail:navigator.onLine?'El dispositivo reporta conexión de red.':'El dispositivo reporta estado offline.'
  })));

  diagnostics.push(await probe('origin','Origen seguro',async()=>({
    ok:window.isSecureContext||['localhost','127.0.0.1','::1'].includes(location.hostname),
    detail:window.isSecureContext?'Contexto HTTPS seguro activo.':`Origen actual: ${location.origin}`
  })));

  diagnostics.push(await probe('storage','Persistencia local',async()=>{
    const key=`${STORAGE_KEY}:probe`;
    localStorage.setItem(key,'ok');
    const ok=localStorage.getItem(key)==='ok';
    localStorage.removeItem(key);
    return {ok,detail:ok?'Lectura/escritura local operativa.':'No se pudo verificar localStorage.'};
  }));

  diagnostics.push(await probe('quota','Capacidad de almacenamiento',async()=>{
    if(!navigator.storage?.estimate)return {ok:true,detail:'El navegador no expone estimación de cuota.'};
    const estimate=await navigator.storage.estimate();
    const usage=Number(estimate.usage||0),quota=Number(estimate.quota||0);
    const ratio=quota?usage/quota:0;
    return {ok:ratio<0.92,detail:quota?`${Math.round(ratio*100)}% de la cuota local en uso.`:'Cuota no reportada.',data:{usage,quota,ratio}};
  },'request-persistence'));

  diagnostics.push(await probe('service-worker','Service Worker / PWA',async()=>{
    if(!('serviceWorker' in navigator))return {ok:false,detail:'Service Worker no soportado por este navegador.'};
    const registration=await navigator.serviceWorker.getRegistration();
    return {ok:Boolean(registration),detail:registration?'Service Worker registrado.':'No hay Service Worker registrado.',data:{scope:registration?.scope||null}};
  },'repair-service-worker'));

  diagnostics.push(await probe('cache-api','Cache API',async()=>({
    ok:'caches' in window,
    detail:'caches' in window?'Cache API disponible.':'Cache API no disponible.'
  })));

  diagnostics.push(await probe('assets','Recursos cargados',async()=>{
    const resources=performance.getEntriesByType('resource');
    const own=resources.filter(item=>{try{return new URL(item.name).origin===location.origin;}catch{return false;}});
    const suspicious=own.filter(item=>item.duration===0&&item.transferSize===0&&item.decodedBodySize===0).map(item=>item.name);
    return {ok:suspicious.length===0,detail:suspicious.length?`${suspicious.length} recurso(s) requieren revisión.`:`${own.length} recurso(s) del origen observados sin fallas evidentes.`,data:{suspicious}};
  }));

  diagnostics.push(await probe('api-version','Backend ATLAS',async()=>{
    if(!navigator.onLine)return {ok:false,detail:'No se prueba backend mientras el dispositivo está offline.'};
    const controller=new AbortController();
    const timer=setTimeout(()=>controller.abort(),4500);
    try{
      const response=await fetch('/api/version',{headers:{accept:'application/json'},cache:'no-store',signal:controller.signal});
      const type=response.headers.get('content-type')||'';
      const text=await response.text();
      const json=type.includes('application/json')?JSON.parse(text||'{}'):null;
      const valid=response.ok&&Boolean(json)&&typeof json==='object';
      return {ok:valid,detail:valid?`API activa (${json.version||json.name||response.status}).`:`/api/version respondió ${response.status} ${type||'sin content-type'}; no se recibió JSON válido.`,data:{status:response.status,contentType:type,json}};
    }finally{clearTimeout(timer);}
  }));

  diagnostics.push(await probe('modules','Descubrimiento dinámico de módulos',async()=>{
    const modules=discoverModules();
    return {ok:true,detail:`${modules.length} módulo(s) detectado(s) en el runtime actual.`,data:{modules}};
  }));

  for(const [name,adapter] of adapters){
    if(typeof adapter.detect==='function'){
      let detected=false;
      try{detected=await adapter.detect({window,document});}catch{}
      if(!detected)continue;
    }
    if(typeof adapter.diagnose!=='function')continue;
    diagnostics.push(await probe(`adapter:${name}`,adapter.label||name,async()=>{
      const result=await adapter.diagnose({window,document});
      return result&&typeof result==='object'?result:{ok:Boolean(result),detail:String(result??'')};
    },typeof adapter.repair==='function'?`adapter:${name}`:null));
  }

  return diagnostics;
}

async function safeRepair(actionId,context={}){
  if(actionId==='repair-service-worker'){
    if(!('serviceWorker' in navigator))return {ok:false,blocked:true,detail:'El navegador no soporta Service Worker.'};
    if(!window.isSecureContext&&!['localhost','127.0.0.1','::1'].includes(location.hostname))return {ok:false,blocked:true,detail:'Se requiere HTTPS o localhost para registrar Service Worker.'};
    const existing=await navigator.serviceWorker.getRegistration();
    const registration=existing||await navigator.serviceWorker.register('/service-worker.js');
    await registration.update().catch(()=>{});
    return {ok:true,detail:existing?'Service Worker actualizado.':'Service Worker registrado.'};
  }

  if(actionId==='request-persistence'){
    if(!navigator.storage?.persist)return {ok:false,blocked:true,detail:'Persistencia reforzada no disponible en este navegador.'};
    const granted=await navigator.storage.persist();
    return {ok:granted,blocked:!granted,detail:granted?'El navegador concedió almacenamiento persistente.':'El navegador no concedió persistencia; los datos existentes no fueron eliminados.'};
  }

  if(actionId.startsWith('adapter:')){
    const name=actionId.slice(8),adapter=adapters.get(name);
    if(!adapter||typeof adapter.repair!=='function')return {ok:false,blocked:true,detail:`Adaptador ${name} no expone reparación automática.`};
    const result=await adapter.repair(context);
    return result&&typeof result==='object'?result:{ok:Boolean(result),detail:String(result??'')};
  }

  return {ok:false,blocked:true,detail:`No existe una reparación segura registrada para ${actionId}.`};
}

function inferBlocker(diagnostic){
  if(diagnostic.id==='network')return {code:'network-access',message:'Se necesita restablecer conectividad física/Wi‑Fi/celular fuera del navegador.',required:'Acceso a la red o al equipo de red.'};
  if(diagnostic.id==='origin')return {code:'https-required',message:'El origen actual no es seguro para ciertas funciones web.',required:'Servir ATLAS por HTTPS o localhost.'};
  if(diagnostic.id==='api-version')return {code:'backend-unavailable',message:'El frontend no encuentra un endpoint ATLAS /api/version válido.',required:'Despliegue o ruta backend válida en el entorno.'};
  if(diagnostic.id==='storage')return {code:'browser-storage',message:'El navegador bloquea o no permite persistencia local.',required:'Permiso/configuración de almacenamiento del navegador.'};
  return {code:diagnostic.id,message:diagnostic.detail||`Falla en ${diagnostic.label}.`,required:'Acceso técnico al componente afectado.'};
}

async function resolveCase(caseOrId=null){
  const caseItem=typeof caseOrId==='string'?state.cases.find(item=>item.id===caseOrId):caseOrId||getActiveCase()||openCase();
  activeCaseId=caseItem.id;
  caseItem.status='diagnosing';
  caseItem.blockers=[];
  log(caseItem,'diagnosis-started','ATLAS inició diagnóstico autónomo.');

  let diagnostics=await coreDiagnostics();
  caseItem.diagnostics=diagnostics;
  caseItem.modules=discoverModules();
  diagnostics.forEach(item=>log(caseItem,item.ok?'check-passed':'check-failed',`${item.label}: ${item.detail}`,{id:item.id,durationMs:item.durationMs}));

  const repairable=diagnostics.filter(item=>!item.ok&&item.repair);
  for(const item of repairable){
    log(caseItem,'repair-started',`Intentando reparación segura: ${item.label}.`,{action:item.repair});
    try{
      const result=await safeRepair(item.repair,{case:caseItem,diagnostic:item});
      caseItem.actions.push({id:uid(),at:now(),diagnosticId:item.id,action:item.repair,...result});
      log(caseItem,result.ok?'repair-applied':result.blocked?'repair-blocked':'repair-failed',result.detail||`Resultado de ${item.repair}.`,{action:item.repair});
    }catch(error){
      const result={ok:false,detail:error?.message||String(error)};
      caseItem.actions.push({id:uid(),at:now(),diagnosticId:item.id,action:item.repair,...result});
      log(caseItem,'repair-failed',`Falló la reparación automática: ${result.detail}`,{action:item.repair});
    }
  }

  if(repairable.length){
    log(caseItem,'verification-started','Verificando el entorno después de las reparaciones.');
    diagnostics=await coreDiagnostics();
    caseItem.diagnostics=diagnostics;
  }

  const failures=diagnostics.filter(item=>!item.ok);
  caseItem.blockers=failures.map(inferBlocker);
  caseItem.status=failures.length?'blocked':'resolved';
  caseItem.updatedAt=now();
  persist();

  if(failures.length){
    log(caseItem,'case-blocked',`ATLAS agotó las acciones seguras disponibles. Quedan ${failures.length} bloqueo(s) con requisito exacto de desbloqueo.`,{blockers:caseItem.blockers});
  }else{
    log(caseItem,'case-resolved','Diagnóstico y verificación completados sin fallas activas.');
  }

  emit('case-resolved',{case:caseItem});
  render();
  return caseItem;
}

async function diagnose(summary='',company='ATLAS Client'){
  const caseItem=openCase({company,summary:summary||'Diagnóstico técnico completo'});
  return resolveCase(caseItem);
}

function exportCase(caseOrId=null){
  const caseItem=typeof caseOrId==='string'?state.cases.find(item=>item.id===caseOrId):caseOrId||getActiveCase();
  if(!caseItem)return null;
  const blob=new Blob([JSON.stringify(caseItem,null,2)],{type:'application/json'});
  const url=URL.createObjectURL(blob);
  const anchor=document.createElement('a');
  anchor.href=url;
  anchor.download=`ATLAS_Support_${caseItem.id}.json`;
  anchor.click();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
  return caseItem;
}

function createUI(){
  if(document.getElementById('atlas-support-launcher'))return;
  const launcher=document.createElement('button');
  launcher.id='atlas-support-launcher';
  launcher.type='button';
  launcher.setAttribute('aria-label','Abrir ATLAS Technical Support');
  launcher.innerHTML='<span class="atlas-support-pulse"></span><span>ATLAS SUPPORT</span>';
  launcher.addEventListener('click',()=>togglePanel());
  document.body.append(launcher);

  panel=document.createElement('section');
  panel.id='atlas-support-panel';
  panel.setAttribute('aria-hidden','true');
  panel.innerHTML=`
    <header class="ats-header">
      <div>
        <div class="ats-kicker">ATLAS TECHNICAL OPERATIONS</div>
        <h2>Autonomous Support</h2>
      </div>
      <button type="button" class="ats-icon" data-ats-close aria-label="Cerrar">×</button>
    </header>
    <div class="ats-body">
      <div class="ats-intake">
        <input data-ats-company autocomplete="organization" placeholder="Empresa / cliente">
        <textarea data-ats-summary rows="3" placeholder="Describe el problema técnico. ATLAS diagnosticará, intentará reparaciones seguras y verificará el resultado."></textarea>
        <div class="ats-actions">
          <button type="button" class="ats-primary" data-ats-resolve>Resolver ahora</button>
          <button type="button" class="ats-secondary" data-ats-diagnose>Diagnóstico completo</button>
        </div>
      </div>
      <div data-ats-output></div>
    </div>`;
  panel.addEventListener('click',event=>{
    if(event.target.closest('[data-ats-close]'))togglePanel(false);
    if(event.target.closest('[data-ats-resolve]'))handleResolve();
    if(event.target.closest('[data-ats-diagnose]'))handleResolve(true);
    if(event.target.closest('[data-ats-export]'))exportCase();
  });
  document.body.append(panel);
  render();
}

function togglePanel(force){
  if(!panel)createUI();
  const open=typeof force==='boolean'?force:panel.getAttribute('aria-hidden')==='true';
  panel.setAttribute('aria-hidden',open?'false':'true');
  document.body.classList.toggle('atlas-support-open',open);
  if(open)render();
}

async function handleResolve(full=false){
  const company=panel.querySelector('[data-ats-company]')?.value?.trim()||'ATLAS Client';
  const summary=panel.querySelector('[data-ats-summary]')?.value?.trim()||(full?'Diagnóstico técnico completo':'Problema técnico reportado');
  const button=panel.querySelector('[data-ats-resolve]');
  const diagButton=panel.querySelector('[data-ats-diagnose]');
  [button,diagButton].forEach(item=>{if(item)item.disabled=true;});
  try{
    const caseItem=openCase({company,summary});
    render();
    await resolveCase(caseItem);
  }finally{
    [button,diagButton].forEach(item=>{if(item)item.disabled=false;});
  }
}

function statusText(status){
  return ({open:'Abierto',diagnosing:'Diagnosticando',resolved:'Resuelto',blocked:'Requiere acceso'})[status]||status;
}

function render(){
  if(!panel)return;
  const output=panel.querySelector('[data-ats-output]');
  if(!output)return;
  const caseItem=getActiveCase();
  const modules=discoverModules();
  const adapterNames=[...adapters.values()].map(item=>item.label||item.name);

  if(!caseItem){
    output.innerHTML=`
      <div class="ats-card">
        <div class="ats-card-title">Motor listo</div>
        <p>ATLAS detecta el entorno, ejecuta acciones seguras reversibles, vuelve a comprobar el sistema y solo escala cuando falta acceso real.</p>
        <div class="ats-discovery"><strong>Descubrimiento:</strong> ${modules.length} módulo(s) · ${adapterNames.length} adaptador(es)</div>
      </div>`;
    return;
  }

  const checks=caseItem.diagnostics||[];
  const passed=checks.filter(item=>item.ok).length;
  const failed=checks.filter(item=>!item.ok).length;
  const blockers=caseItem.blockers||[];
  const timeline=(caseItem.timeline||[]).slice(-12).reverse();

  output.innerHTML=`
    <div class="ats-case-head">
      <div>
        <span class="ats-status ats-status-${esc(caseItem.status)}">${esc(statusText(caseItem.status))}</span>
        <strong>${esc(caseItem.company)}</strong>
      </div>
      <button type="button" class="ats-link" data-ats-export>Exportar bitácora</button>
    </div>
    <div class="ats-card">
      <div class="ats-card-title">${esc(caseItem.summary)}</div>
      <div class="ats-metrics">
        <span><b>${passed}</b> correctos</span>
        <span><b>${failed}</b> fallas</span>
        <span><b>${caseItem.actions?.length||0}</b> acciones</span>
        <span><b>${modules.length}</b> módulos detectados</span>
      </div>
    </div>
    ${blockers.length?`<div class="ats-card ats-blockers"><div class="ats-card-title">Bloqueos exactos</div>${blockers.map(item=>`<div class="ats-blocker"><strong>${esc(item.message)}</strong><span>${esc(item.required)}</span></div>`).join('')}</div>`:''}
    ${checks.length?`<div class="ats-card"><div class="ats-card-title">Diagnóstico verificado</div><div class="ats-checks">${checks.map(item=>`<div class="ats-check ${item.ok?'ok':'fail'}"><span>${item.ok?'✓':'!'}</span><div><strong>${esc(item.label)}</strong><small>${esc(item.detail)}</small></div></div>`).join('')}</div></div>`:''}
    <div class="ats-card"><div class="ats-card-title">Actividad</div><div class="ats-timeline">${timeline.map(item=>`<div><time>${esc(new Date(item.at).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}))}</time><span>${esc(item.message)}</span></div>`).join('')||'<div><span>Sin actividad todavía.</span></div>'}</div></div>`;
}

registerAdapter('browser-runtime',{
  label:'Browser Runtime',
  detect:()=>true,
  diagnose:()=>({ok:document.readyState!=='loading',detail:`Documento: ${document.readyState}.`})
});

window.ATLASTechnicalSupport={
  version:'1.0.0',
  policy:{
    autonomous:true,
    autoExecute:'safe-reversible-actions',
    verifyAfterRepair:true,
    neverSilentlyClaimSuccess:true,
    escalation:'only-on-real-access-security-or-irreversible-action-blocker'
  },
  registerAdapter,
  discoverModules,
  openCase,
  resolveCase,
  diagnose,
  safeRepair,
  exportCase,
  getState:()=>JSON.parse(JSON.stringify(state)),
  getActiveCase,
  open:()=>togglePanel(true),
  close:()=>togglePanel(false)
};

const boot=()=>{
  createUI();
  emit('ready',{version:window.ATLASTechnicalSupport.version,modules:discoverModules(),adapters:[...adapters.keys()]});
};

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
else boot();

window.addEventListener('online',()=>emit('network',{online:true}));
window.addEventListener('offline',()=>emit('network',{online:false}));
})();