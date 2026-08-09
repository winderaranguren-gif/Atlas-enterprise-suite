(()=>{
'use strict';

const STORAGE_KEY='atlas-support-runbooks-v1';
const SUPPORT_STORAGE_KEY='atlas-technical-support-v1';
const VERSION='1.0.1';
const RUNBOOK_API_TIMEOUT_MS=4500;
const MAX_TIMELINE_EVENTS=250;
const SAFE_ACTIONS=new Set(['repair-service-worker','request-persistence']);
const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const now=()=>new Date().toISOString();
const uid=()=>crypto.randomUUID?.()||`ats-runbook-${Date.now()}-${Math.random().toString(16).slice(2)}`;
const verifyingRunbookCaseIds=new Set();

function load(){
  try{return JSON.parse(localStorage.getItem(STORAGE_KEY)||'{}');}
  catch{return {};}
}

const state=load();

function persist(){
  try{localStorage.setItem(STORAGE_KEY,JSON.stringify(state));return true;}
  catch{return false;}
}

function persistSupport(){
  const support=window.ATLASTechnicalSupport;
  try{
    if(!support?.getState)return false;
    localStorage.setItem(SUPPORT_STORAGE_KEY,JSON.stringify(support.getState()));
    return true;
  }catch{return false;}
}

function classify(summary=''){
  const text=String(summary).toLowerCase();
  if(/login|log in|sign in|auth|password|mfa|otp|acceso/.test(text))return 'identity-access';
  if(/deploy|deployment|cloudflare|worker|build|ci|pipeline|github/.test(text))return 'deployment';
  if(/network|internet|wifi|wi-fi|offline|conexi/.test(text))return 'network';
  if(/slow|lento|performance|rendimiento|freeze|frozen/.test(text))return 'performance';
  if(/data|storage|database|localstorage|cache|datos/.test(text))return 'data-storage';
  return 'general';
}

function localPlan(caseItem={}){
  const diagnostics=Array.isArray(caseItem.diagnostics)?caseItem.diagnostics:[];
  const failures=diagnostics.filter(item=>item&&item.ok===false);
  const steps=[];

  steps.push({id:'capture-state',label:'Capturar estado técnico',mode:'observe',status:'ready',detail:'Preservar diagnóstico, entorno y evidencia antes de modificar el sistema.'});

  for(const item of failures){
    const id=String(item.id||'unknown');
    if(id==='service-worker')steps.push({id:'repair-service-worker',diagnosticId:id,action:'repair-service-worker',label:'Reparar Service Worker',mode:'auto-safe',status:'ready',detail:'Registrar o actualizar el Service Worker sin borrar datos y verificar nuevamente.'});
    else if(id==='quota')steps.push({id:'request-persistence',diagnosticId:id,action:'request-persistence',label:'Reforzar persistencia',mode:'auto-safe',status:'ready',detail:'Solicitar almacenamiento persistente sin eliminar información existente.'});
    else if(id==='network')steps.push({id:'network-access',diagnosticId:id,label:'Restablecer conectividad',mode:'blocked-access',status:'blocked',detail:'Requiere acceso al dispositivo, Wi-Fi, router o proveedor de red.'});
    else if(id==='origin')steps.push({id:'https-required',diagnosticId:id,label:'Corregir origen seguro',mode:'deployment',status:'blocked',detail:'Requiere servir ATLAS mediante HTTPS o localhost.'});
    else if(id==='api-version')steps.push({id:'backend-route',diagnosticId:id,label:'Restaurar backend ATLAS',mode:'deployment',status:'blocked',detail:'Requiere una ruta /api/version válida en el entorno desplegado.'});
    else if(id.startsWith('adapter:'))steps.push({id,diagnosticId:id,label:item.label||id,mode:'adapter',status:'ready',detail:item.detail||'Ejecutar el adaptador empresarial autorizado y verificar el resultado.'});
    else steps.push({id:`diagnose-${id}`,diagnosticId:id,label:`Profundizar ${item.label||id}`,mode:'diagnostic',status:'ready',detail:item.detail||'Recolectar evidencia adicional antes de aplicar cambios.'});
  }

  steps.push({id:'verify-final',label:'Verificación posterior',mode:'verify',status:'ready',detail:'Volver a ejecutar diagnóstico sin repetir reparaciones y no cerrar el caso hasta comprobar el estado final.'});

  return {
    ok:true,
    source:'local-fallback',
    runbookVersion:VERSION,
    classification:classify(caseItem.summary),
    policy:{autoExecute:'safe-reversible-only',verifyAfterRepair:true,escalateOnlyOnRealBlocker:true},
    steps
  };
}

async function requestPlan(caseItem={}){
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),RUNBOOK_API_TIMEOUT_MS);
  try{
    const response=await fetch('/api/support/plan',{
      method:'POST',
      headers:{'content-type':'application/json','accept':'application/json'},
      cache:'no-store',
      signal:controller.signal,
      body:JSON.stringify({
        caseId:caseItem.id,
        company:caseItem.company,
        summary:caseItem.summary,
        severity:caseItem.severity,
        diagnostics:caseItem.diagnostics||[],
        modules:caseItem.modules||[]
      })
    });
    if(!response.ok)throw new Error(`Runbook API ${response.status}`);
    const payload=await response.json();
    if(!payload||payload.ok!==true||!Array.isArray(payload.steps))throw new Error('Runbook API returned an invalid plan.');
    return payload;
  }finally{clearTimeout(timer);}
}

function diagnosticIdForStep(step={}){
  if(step.diagnosticId)return step.diagnosticId;
  if(step.action==='repair-service-worker')return 'service-worker';
  if(step.action==='request-persistence')return 'quota';
  return step.id||'runbook';
}

function recordRunbookRepair(caseItem,step,result){
  if(!caseItem)return;
  const at=now();
  const normalized=result&&typeof result==='object'?result:{ok:false,detail:String(result??'')};
  caseItem.actions=Array.isArray(caseItem.actions)?caseItem.actions:[];
  caseItem.timeline=Array.isArray(caseItem.timeline)?caseItem.timeline:[];
  caseItem.actions.push({
    id:uid(),
    at,
    diagnosticId:diagnosticIdForStep(step),
    action:step.action,
    source:'runbook-engine',
    runbookStepId:step.id,
    ...normalized
  });
  const type=normalized.ok?'repair-applied':normalized.blocked?'repair-blocked':'repair-failed';
  const message=normalized.detail||`Resultado de ${step.action}.`;
  const event={id:uid(),at,type,message,data:{action:step.action,source:'runbook-engine',runbookStepId:step.id}};
  caseItem.timeline.push(event);
  if(caseItem.timeline.length>MAX_TIMELINE_EVENTS)caseItem.timeline=caseItem.timeline.slice(-MAX_TIMELINE_EVENTS);
  caseItem.updatedAt=at;
  persistSupport();
  window.dispatchEvent(new CustomEvent('atlas:support:event',{detail:{caseId:caseItem.id,event}}));
}

function completeVerificationStep(plan,verifiedCase){
  const verifyStep=(plan.steps||[]).find(step=>step.id==='verify-final');
  if(!verifyStep)return;
  const failures=Array.isArray(verifiedCase?.diagnostics)?verifiedCase.diagnostics.filter(item=>item&&item.ok===false):[];
  verifyStep.status=failures.length?'blocked':'completed';
  verifyStep.result=failures.length
    ?`Verificación completada: ${failures.length} falla(s) activa(s) permanecen.`
    :'Verificación completada sin fallas activas.';
  plan.verification={
    at:now(),
    ok:failures.length===0,
    failures:failures.map(item=>({id:item.id,label:item.label,detail:item.detail}))
  };
}

async function probeApiVersion(){
  if(!navigator.onLine)return {ok:false,detail:'No se prueba backend mientras el dispositivo está offline.'};
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),RUNBOOK_API_TIMEOUT_MS);
  try{
    const response=await fetch('/api/version',{headers:{accept:'application/json'},cache:'no-store',signal:controller.signal});
    const type=response.headers.get('content-type')||'';
    const text=await response.text();
    const json=type.includes('application/json')?JSON.parse(text||'{}'):null;
    const valid=response.ok&&Boolean(json)&&typeof json==='object';
    return {ok:valid,detail:valid?`API activa (${json.version||json.name||response.status}).`:`/api/version respondió ${response.status} ${type||'sin content-type'}; no se recibió JSON válido.`,data:{status:response.status,contentType:type,json}};
  }finally{clearTimeout(timer);}
}

async function verifyDiagnostic(item={}){
  const id=String(item.id||'');
  const support=window.ATLASTechnicalSupport;

  try{
    if(id==='network')return {...item,ok:navigator.onLine,detail:navigator.onLine?'El dispositivo reporta conexión de red.':'El dispositivo reporta estado offline.'};
    if(id==='origin'){
      const ok=window.isSecureContext||['localhost','127.0.0.1','::1'].includes(location.hostname);
      return {...item,ok,detail:ok?'Contexto HTTPS seguro activo.':`Origen actual: ${location.origin}`};
    }
    if(id==='storage'){
      const key=`${SUPPORT_STORAGE_KEY}:verify`;
      localStorage.setItem(key,'ok');
      const ok=localStorage.getItem(key)==='ok';
      localStorage.removeItem(key);
      return {...item,ok,detail:ok?'Lectura/escritura local operativa.':'No se pudo verificar localStorage.'};
    }
    if(id==='quota'){
      if(!navigator.storage?.estimate)return {...item,ok:true,detail:'El navegador no expone estimación de cuota.'};
      const estimate=await navigator.storage.estimate();
      const usage=Number(estimate.usage||0),quota=Number(estimate.quota||0);
      const ratio=quota?usage/quota:0;
      return {...item,ok:ratio<0.92,detail:quota?`${Math.round(ratio*100)}% de la cuota local en uso.`:'Cuota no reportada.',data:{usage,quota,ratio}};
    }
    if(id==='service-worker'){
      if(!('serviceWorker' in navigator))return {...item,ok:false,detail:'Service Worker no soportado por este navegador.'};
      const registration=await navigator.serviceWorker.getRegistration();
      return {...item,ok:Boolean(registration),detail:registration?'Service Worker registrado.':'No hay Service Worker registrado.',data:{scope:registration?.scope||null}};
    }
    if(id==='cache-api')return {...item,ok:'caches' in window,detail:'caches' in window?'Cache API disponible.':'Cache API no disponible.'};
    if(id==='assets'){
      const resources=performance.getEntriesByType('resource');
      const own=resources.filter(entry=>{try{return new URL(entry.name).origin===location.origin;}catch{return false;}});
      const suspicious=own.filter(entry=>entry.duration===0&&entry.transferSize===0&&entry.decodedBodySize===0).map(entry=>entry.name);
      return {...item,ok:suspicious.length===0,detail:suspicious.length?`${suspicious.length} recurso(s) requieren revisión.`:`${own.length} recurso(s) del origen observados sin fallas evidentes.`,data:{suspicious}};
    }
    if(id==='api-version')return {...item,...await probeApiVersion()};
    if(id==='modules'){
      const modules=support?.discoverModules?.()||[];
      return {...item,ok:true,detail:`${modules.length} módulo(s) detectado(s) en el runtime actual.`,data:{modules}};
    }
    if(id==='adapter:browser-runtime')return {...item,ok:document.readyState!=='loading',detail:`Documento: ${document.readyState}.`};
    if(id==='adapter:runbook-engine')return {...item,...await diagnoseRunbookApi()};

    return {...item,verificationSkipped:true};
  }catch(error){
    return {...item,ok:false,detail:error?.message||String(error),verificationError:true};
  }
}

async function runDiagnosticsOnly(caseItem){
  const support=window.ATLASTechnicalSupport;
  if(typeof support?.runDiagnostics==='function'){
    const diagnostics=await support.runDiagnostics({case:caseItem,repair:false});
    return Array.isArray(diagnostics)?diagnostics:[];
  }

  const current=Array.isArray(caseItem?.diagnostics)?caseItem.diagnostics:[];
  const diagnostics=[];
  for(const item of current)diagnostics.push(await verifyDiagnostic(item));
  return diagnostics;
}

async function verifyAfterRunbookRepair(caseItem,plan){
  if(!caseItem?.id)return;
  verifyingRunbookCaseIds.add(caseItem.id);
  try{
    const diagnostics=await runDiagnosticsOnly(caseItem);
    caseItem.diagnostics=diagnostics;
    caseItem.updatedAt=now();
    persistSupport();
    completeVerificationStep(plan,caseItem);
    window.dispatchEvent(new CustomEvent('atlas:support:event',{detail:{caseId:caseItem.id,event:{id:uid(),at:now(),type:'verification-completed',message:'ATLAS completó verificación diagnóstica sin repetir reparaciones.',data:{source:'runbook-engine'}}}}));
  }catch(error){
    const verifyStep=(plan.steps||[]).find(step=>step.id==='verify-final');
    if(verifyStep){
      verifyStep.status='failed';
      verifyStep.result=error?.message||String(error);
    }
    plan.verification={at:now(),ok:false,error:error?.message||String(error)};
  }finally{
    verifyingRunbookCaseIds.delete(caseItem.id);
  }
}

async function executeSafeSteps(caseItem,plan){
  const support=window.ATLASTechnicalSupport;
  if(!support||typeof support.safeRepair!=='function')return plan;

  let attempted=0;
  for(const step of plan.steps||[]){
    if(step.mode!=='auto-safe'||!SAFE_ACTIONS.has(step.action)||step.status==='completed')continue;
    attempted+=1;
    try{
      const result=await support.safeRepair(step.action,{case:caseItem,runbookStep:step});
      step.status=result?.ok?'completed':result?.blocked?'blocked':'failed';
      step.result=result?.detail||'';
      recordRunbookRepair(caseItem,step,result);
    }catch(error){
      const result={ok:false,detail:error?.message||String(error)};
      step.status='failed';
      step.result=result.detail;
      recordRunbookRepair(caseItem,step,result);
    }
  }

  if(attempted>0&&plan.policy?.verifyAfterRepair!==false)await verifyAfterRunbookRepair(caseItem,plan);
  return plan;
}

async function planCase(caseItem,{autoExecute=true}={}){
  if(!caseItem?.id)return null;
  let plan;
  try{plan=await requestPlan(caseItem);}
  catch(error){plan={...localPlan(caseItem),warning:error?.message||String(error)};}

  if(autoExecute)await executeSafeSteps(caseItem,plan);
  plan.caseId=caseItem.id;
  plan.generatedAt=new Date().toISOString();
  state[caseItem.id]=plan;
  persist();
  window.dispatchEvent(new CustomEvent('atlas:support:runbook-ready',{detail:{case:caseItem,plan}}));
  render(caseItem.id);
  return plan;
}

function getPlan(caseId){return caseId?state[caseId]||null:null;}

function activeCase(){
  try{return window.ATLASTechnicalSupport?.getActiveCase?.()||null;}
  catch{return null;}
}

function render(caseId){
  const panel=document.getElementById('atlas-support-panel');
  const output=panel?.querySelector('[data-ats-output]');
  if(!output)return;
  const plan=getPlan(caseId||activeCase()?.id);
  output.querySelector('[data-ats-runbook]')?.remove();
  if(!plan)return;

  const steps=Array.isArray(plan.steps)?plan.steps:[];
  const completed=steps.filter(step=>step.status==='completed').length;
  const blocked=steps.filter(step=>step.status==='blocked').length;
  const card=document.createElement('div');
  card.className='ats-card';
  card.dataset.atsRunbook='true';
  card.innerHTML=`
    <div class="ats-card-title">Runbook técnico · ${esc(plan.classification||'general')}</div>
    <p>${esc(plan.source==='local-fallback'?'Plan local de contingencia activo.':'Plan generado por ATLAS Technical Operations.')}</p>
    <div class="ats-metrics">
      <span><b>${steps.length}</b> pasos</span>
      <span><b>${completed}</b> ejecutados</span>
      <span><b>${blocked}</b> bloqueados</span>
      <span><b>${esc(plan.runbookVersion||VERSION)}</b> versión</span>
    </div>
    <div class="ats-checks">${steps.map(step=>`<div class="ats-check ${step.status==='completed'?'ok':step.status==='blocked'||step.status==='failed'?'fail':'ok'}"><span>${step.status==='completed'?'✓':step.status==='blocked'?'!':'→'}</span><div><strong>${esc(step.label||step.id)}</strong><small>${esc(step.result||step.detail||step.mode||'')}</small></div></div>`).join('')}</div>`;
  output.append(card);
}

async function diagnoseRunbookApi(){
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),RUNBOOK_API_TIMEOUT_MS);
  try{
    const response=await fetch('/api/support/runbooks',{
      headers:{accept:'application/json'},
      cache:'no-store',
      signal:controller.signal
    });
    const payload=await response.json().catch(()=>null);
    return {
      ok:response.ok&&payload?.ok===true,
      detail:response.ok?`Runbook API activa (${payload?.runbookVersion||VERSION}).`:`Runbook API respondió ${response.status}.`,
      data:{available:response.ok&&payload?.ok===true,status:response.status}
    };
  }catch(error){
    const timedOut=error?.name==='AbortError';
    return {
      ok:false,
      detail:timedOut?`Runbook API excedió ${RUNBOOK_API_TIMEOUT_MS} ms.`:(error?.message||String(error)),
      data:{available:false,timeout:timedOut}
    };
  }finally{clearTimeout(timer);}
}

function registerAdapter(){
  const support=window.ATLASTechnicalSupport;
  if(!support?.registerAdapter)return false;
  if(window.ATLAS_SUPPORT_RUNBOOK_API_REQUIRED!==true)return false;
  support.registerAdapter('runbook-engine',{
    label:'ATLAS Runbook Engine',
    detect:()=>window.ATLAS_SUPPORT_RUNBOOK_API_REQUIRED===true,
    diagnose:diagnoseRunbookApi
  });
  return true;
}

async function publishApiAdvisory(){
  const result=await diagnoseRunbookApi();
  window.dispatchEvent(new CustomEvent('atlas:support:runbook-api',{detail:{...result,advisory:true}}));
  return result;
}

function boot(){
  registerAdapter();
  publishApiAdvisory().catch(()=>{});
  const launcher=document.getElementById('atlas-support-launcher');
  launcher?.addEventListener('click',()=>setTimeout(()=>render(activeCase()?.id),0));
  render(activeCase()?.id);
}

window.addEventListener('atlas:support:case-resolved',event=>{
  const caseItem=event.detail?.case;
  if(!caseItem||verifyingRunbookCaseIds.has(caseItem.id))return;
  planCase(caseItem,{autoExecute:true}).catch(()=>{});
});
window.addEventListener('atlas:support:ready',()=>boot());
window.addEventListener('atlas:support:event',()=>setTimeout(()=>render(activeCase()?.id),0));

window.ATLASTechnicalRunbooks={
  version:VERSION,
  policy:{autoExecute:'safe-reversible-only',verifyAfterRepair:true},
  classify,
  planCase,
  getPlan,
  executeSafeSteps,
  diagnoseRunbookApi,
  publishApiAdvisory,
  getState:()=>JSON.parse(JSON.stringify(state))
};

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
else boot();
})();
