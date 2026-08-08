(()=>{
'use strict';

const STORAGE_KEY='atlas-support-runbooks-v1';
const SUPPORT_STORAGE_KEY='atlas-technical-support-v1';
const VERSION='1.0.0';
const RUNBOOK_API_TIMEOUT_MS=4500;
const MAX_TIMELINE_EVENTS=250;
const SAFE_ACTIONS=new Set(['repair-service-worker','request-persistence']);
const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const now=()=>new Date().toISOString();
const uid=()=>crypto.randomUUID?.()||`ats-runbook-${Date.now()}-${Math.random().toString(16).slice(2)}`;
let verifyingRunbookRepair=false;

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

  steps.push({id:'verify-final',label:'Verificación posterior',mode:'verify',status:'ready',detail:'Volver a ejecutar diagnóstico y no cerrar el caso hasta comprobar el estado final.'});

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
  const timer=setTimeout(()=>controller.abort(),5000);
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

async function verifyAfterRunbookRepair(caseItem,plan){
  const support=window.ATLASTechnicalSupport;
  if(!support||typeof support.resolveCase!=='function')return;
  verifyingRunbookRepair=true;
  try{
    const verifiedCase=await support.resolveCase(caseItem);
    completeVerificationStep(plan,verifiedCase);
  }catch(error){
    const verifyStep=(plan.steps||[]).find(step=>step.id==='verify-final');
    if(verifyStep){
      verifyStep.status='failed';
      verifyStep.result=error?.message||String(error);
    }
    plan.verification={at:now(),ok:false,error:error?.message||String(error)};
  }finally{
    verifyingRunbookRepair=false;
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
  if(verifyingRunbookRepair)return;
  const caseItem=event.detail?.case;
  if(caseItem)planCase(caseItem,{autoExecute:true}).catch(()=>{});
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
