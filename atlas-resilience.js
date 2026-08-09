(()=>{
'use strict';

const STORAGE_KEY='atlas-resilience-v1';
const MAX_HISTORY=200;
const FAILURE_WINDOW_MS=15*60*1000;
const DEFAULT_COOLDOWN_MS=5*60*1000;
const CIRCUIT_THRESHOLD=3;
const strategies=new Map();
const now=()=>new Date().toISOString();
const ts=()=>Date.now();
const uid=()=>crypto.randomUUID?.()||`res-${Date.now()}-${Math.random().toString(16).slice(2)}`;
const clone=value=>JSON.parse(JSON.stringify(value));

function emptyState(){return{history:[],failures:{},circuits:{},installed:{}};}
function loadState(){
  try{
    const parsed=JSON.parse(localStorage.getItem(STORAGE_KEY)||'{}');
    return {
      history:Array.isArray(parsed.history)?parsed.history.slice(0,MAX_HISTORY):[],
      failures:parsed.failures&&typeof parsed.failures==='object'?parsed.failures:{},
      circuits:parsed.circuits&&typeof parsed.circuits==='object'?parsed.circuits:{},
      installed:{}
    };
  }catch{return emptyState();}
}
const state=loadState();
function persist(){
  try{localStorage.setItem(STORAGE_KEY,JSON.stringify(state));return true;}catch{return false;}
}
function emit(name,detail={}){window.dispatchEvent(new CustomEvent(`atlas:resilience:${name}`,{detail}));}
function clean(value){return String(value??'').trim().toLowerCase().replace(/\s+/g,' ').slice(0,500);}
function operationKey(operation,context={}){
  const scope=context.scope||context.module||context.domain||context.provider||'global';
  return `${clean(scope)}::${clean(operation||'unknown-operation')}`;
}
function failureKey(opKey,strategyId,errorCode='failure'){return `${opKey}::${clean(strategyId)}::${clean(errorCode)}`;}
function classifyFailure(value={}){
  const text=clean(`${value.code||''} ${value.name||''} ${value.detail||''} ${value.message||''} ${(value.blockers||[]).map(item=>`${item.code||''} ${item.message||''}`).join(' ')}`);
  if(/runner|github actions|workflow|steps=null|job log/.test(text))return'infrastructure';
  if(/network|offline|dns|connection|timeout/.test(text))return'network';
  if(/permission|forbidden|unauthor|identity|aal|token|credential|secret/.test(text))return'identity-access';
  if(/cloudflare|supabase|provider|api/.test(text))return'provider';
  if(/storage|browser|service worker|cache/.test(text))return'client-runtime';
  if(/syntax|validation|build|test|assert/.test(text))return'code-validation';
  return'unknown';
}
function pruneFailure(record){
  const cutoff=ts()-FAILURE_WINDOW_MS;
  record.attempts=(record.attempts||[]).filter(item=>item.at>=cutoff);
  record.consecutive=record.attempts.length;
  return record;
}
function getFailure(opKey,strategyId,errorCode='failure'){
  const key=failureKey(opKey,strategyId,errorCode);
  const record=state.failures[key]||{key,attempts:[],consecutive:0,lastFailureAt:0,lastDetail:'',layer:'unknown'};
  state.failures[key]=pruneFailure(record);
  return record;
}
function recordFailure(opKey,strategyId,result={}){
  const code=result.code||result.error?.name||result.status||'failure';
  const record=getFailure(opKey,strategyId,code);
  const at=ts();
  record.attempts.push({at,detail:String(result.detail||result.error?.message||'').slice(0,500)});
  record.consecutive=record.attempts.length;
  record.lastFailureAt=at;
  record.lastDetail=String(result.detail||result.error?.message||'').slice(0,500);
  record.layer=classifyFailure(result);
  if(record.consecutive>=CIRCUIT_THRESHOLD){
    state.circuits[opKey]={open:true,openedAt:at,layer:record.layer,reason:record.lastDetail||code};
  }
  persist();
  return clone(record);
}
function clearFailuresFor(opKey,strategyId=null){
  for(const key of Object.keys(state.failures)){
    if(!key.startsWith(`${opKey}::`))continue;
    if(strategyId&&!key.startsWith(`${opKey}::${clean(strategyId)}::`))continue;
    delete state.failures[key];
  }
  delete state.circuits[opKey];
  persist();
}
function recentFailureCount(opKey,strategyId){
  let count=0,lastFailureAt=0;
  for(const [key,record] of Object.entries(state.failures)){
    if(!key.startsWith(`${opKey}::${clean(strategyId)}::`))continue;
    pruneFailure(record);
    count+=record.consecutive||0;
    lastFailureAt=Math.max(lastFailureAt,record.lastFailureAt||0);
  }
  return{count,lastFailureAt};
}
function registerStrategy(id,strategy={}){
  if(!id||typeof id!=='string')throw new TypeError('Resilience strategy id is required.');
  if(typeof strategy.execute!=='function')throw new TypeError(`Strategy ${id} requires execute().`);
  const normalized={
    id,
    label:strategy.label||id,
    priority:Number.isFinite(strategy.priority)?strategy.priority:100,
    mutates:Boolean(strategy.mutates),
    cooldownMs:Number.isFinite(strategy.cooldownMs)?strategy.cooldownMs:DEFAULT_COOLDOWN_MS,
    supports:typeof strategy.supports==='function'?strategy.supports:()=>true,
    execute:strategy.execute,
    verify:typeof strategy.verify==='function'?strategy.verify:null
  };
  strategies.set(id,normalized);
  emit('strategy-registered',{id,label:normalized.label});
  return()=>strategies.delete(id);
}
function eligibleStrategies(operation,context={}){
  const opKey=operationKey(operation,context);
  return [...strategies.values()]
    .filter(item=>{try{return item.supports({operation,context,opKey})!==false;}catch{return false;}})
    .map(item=>{
      const failure=recentFailureCount(opKey,item.id);
      const cooling=failure.count>0&&(ts()-failure.lastFailureAt)<item.cooldownMs;
      return{strategy:item,failure,cooling};
    })
    .sort((a,b)=>Number(a.cooling)-Number(b.cooling)||a.failure.count-b.failure.count||a.strategy.priority-b.strategy.priority);
}
async function verifyResult(strategy,result,{operation,context,before}={}){
  const verifier=context.verify||strategy.verify;
  if(typeof verifier==='function'){
    try{
      const verification=await verifier({operation,context,before,result});
      const normalized=verification&&typeof verification==='object'?verification:{ok:Boolean(verification)};
      return{performed:true,ok:normalized.ok===true,detail:normalized.detail||'',data:normalized.data||null,at:now()};
    }catch(error){return{performed:true,ok:false,detail:error?.message||String(error),at:now()};}
  }
  if(strategy.mutates||context.mutation===true){
    return{performed:false,ok:false,detail:'A mutation cannot be declared successful without a fresh verifier.',at:now()};
  }
  return{performed:false,ok:result?.ok!==false,detail:'Read-only/non-mutating result accepted without post-mutation verification.',at:now()};
}
function historyEntry(base){
  const entry={id:uid(),at:now(),...base};
  state.history.unshift(entry);
  state.history=state.history.slice(0,MAX_HISTORY);
  persist();
  emit('history',{entry:clone(entry)});
  return entry;
}
async function execute(operation,context={}){
  const opKey=operationKey(operation,context);
  const circuit=state.circuits[opKey];
  if(circuit?.open&&!context.overrideCircuit){
    const result={
      ok:false,blocked:true,status:'circuit-open',operation:String(operation||''),opKey,
      layer:circuit.layer||'unknown',
      detail:`Circuit open after repeated failures. ${circuit.reason||''}`.trim(),
      required:'Use a different strategy or resolve the failing infrastructure/access layer before retrying.'
    };
    historyEntry({type:'blocked',opKey,result});
    return result;
  }

  const candidates=eligibleStrategies(operation,context);
  if(!candidates.length){
    const result={ok:false,blocked:true,status:'no-strategy',operation:String(operation||''),opKey,detail:'No registered resilience strategy supports this operation.'};
    historyEntry({type:'blocked',opKey,result});
    return result;
  }

  const available=candidates.filter(item=>!item.cooling);
  if(!available.length){
    const result={
      ok:false,blocked:true,status:'strategy-cooldown',operation:String(operation||''),opKey,
      detail:'All matching strategies recently failed. ATLAS will not repeat the same action blindly.',
      attempted:candidates.map(item=>({strategy:item.strategy.id,failures:item.failure.count,lastFailureAt:item.failure.lastFailureAt})),
      required:'Register/use a different strategy or resolve the identified failing layer.'
    };
    historyEntry({type:'blocked',opKey,result});
    return result;
  }

  const attempts=[];
  for(const candidate of available){
    const strategy=candidate.strategy;
    const before={at:now(),online:navigator.onLine,secureContext:Boolean(window.isSecureContext),origin:location.origin};
    emit('attempt',{operation,opKey,strategy:strategy.id});
    let result;
    try{
      result=await strategy.execute({operation,context,before,previousAttempts:clone(attempts)});
      if(result==null||typeof result!=='object')result={ok:Boolean(result),detail:String(result??'')};
    }catch(error){
      result={ok:false,error:{name:error?.name||'Error',message:error?.message||String(error)},detail:error?.message||String(error)};
    }

    const verification=await verifyResult(strategy,result,{operation,context,before});
    const success=result.ok!==false&&!result.blocked&&verification.ok;
    const attempt={strategy:strategy.id,label:strategy.label,result:clone(result),verification};
    attempts.push(attempt);

    if(success){
      clearFailuresFor(opKey);
      const final={ok:true,status:'verified',operation:String(operation||''),opKey,strategy:strategy.id,result,verification,attempts};
      historyEntry({type:'success',opKey,strategy:strategy.id,result:final});
      emit('verified',{operation,opKey,strategy:strategy.id});
      return clone(final);
    }

    const failureResult={...result,detail:verification.ok?result.detail:(verification.detail||result.detail),verification};
    const failure=recordFailure(opKey,strategy.id,failureResult);
    historyEntry({type:'failure',opKey,strategy:strategy.id,layer:failure.layer,result:failureResult});
  }

  const layers=[...new Set(attempts.map(item=>classifyFailure(item.result)))];
  return {
    ok:false,blocked:true,status:'strategies-exhausted',operation:String(operation||''),opKey,
    detail:'ATLAS exhausted distinct eligible strategies without a verified result.',
    layers,attempts,
    required:'Resolve the exact failing layer or register a materially different strategy before retrying.'
  };
}

function installTechnicalSupportIntegration(){
  const support=window.ATLASTechnicalSupport;
  if(!support||state.installed.technicalSupport||support.__atlasResilienceWrapped)return false;
  const originalDiagnose=typeof support.diagnose==='function'?support.diagnose.bind(support):null;
  if(!originalDiagnose)return false;

  registerStrategy('technical-support-core',{
    label:'ATLAS Technical Support core diagnosis',
    priority:10,
    mutates:false,
    supports:({context})=>context?.resilienceKind==='technical-support',
    execute:async({context})=>{
      const caseItem=await originalDiagnose(context.summary||'Diagnóstico técnico completo',context.company||'ATLAS Client');
      return {
        ok:caseItem?.status==='resolved',
        blocked:caseItem?.status==='blocked',
        status:caseItem?.status||'unknown',
        caseId:caseItem?.id||null,
        blockers:caseItem?.blockers||[],
        diagnostics:caseItem?.diagnostics||[],
        actions:caseItem?.actions||[],
        detail:caseItem?.status==='resolved'?'Technical Support resolved and verified the case.':`Technical Support ended with status ${caseItem?.status||'unknown'}.`
      };
    },
    verify:async({result})=>({
      ok:result?.status==='resolved',
      detail:result?.status==='resolved'?'Case status is resolved after Technical Support verification.':'Case did not reach verified resolved status.'
    })
  });

  support.diagnose=async(summary='',company='ATLAS Client')=>{
    const resilient=await execute(`technical-support:${summary||'diagnosis'}`,{
      resilienceKind:'technical-support',summary,company,scope:'technical-support'
    });
    const inner=resilient.result||{};
    const attemptedBlockers=(resilient.attempts||[]).flatMap(item=>item?.result?.blockers||[]);
    const blockers=inner.blockers?.length?inner.blockers:attemptedBlockers;
    return {
      id:inner.caseId||null,
      status:resilient.ok?'resolved':'blocked',
      diagnostics:inner.diagnostics||[],
      actions:inner.actions||[],
      blockers:blockers.length?blockers:[{
        code:resilient.status||'resilience-blocked',
        message:resilient.detail||'ATLAS resilience blocked this repeated operation.',
        required:resilient.required||'Use a materially different strategy or resolve the failing layer.'
      }],
      resilience:resilient
    };
  };
  support.__atlasResilienceWrapped=true;
  support.policy={...(support.policy||{}),resilience:'ATLASResilience',noBlindRetry:true,requireFreshVerification:true};
  state.installed.technicalSupport=true;
  persist();
  emit('integration-installed',{integration:'technical-support'});
  return true;
}

function installAgentFabricIntegration(){
  const fabric=window.ATLASAgentFabric;
  if(!fabric?.registerTool||state.installed.agentFabric)return false;
  try{
    fabric.registerTool('resilience',{
      label:'ATLAS Resilience Controller',
      execute:({task,context={}})=>execute(task,{...context,scope:context.scope||'agent-fabric'})
    });
    state.installed.agentFabric=true;
    persist();
    emit('integration-installed',{integration:'agent-fabric'});
    return true;
  }catch{return false;}
}

function inspect(){
  const failureSummary=Object.values(state.failures).map(item=>clone(pruneFailure(item))).filter(item=>item.consecutive>0);
  return {
    version:'1.0.0',
    policy:{noBlindRetry:true,changeStrategyAfterFailure:true,minimumSafeChange:true,verificationRequiredForMutations:true,circuitBreaker:true,learnFromFailures:true},
    strategies:[...strategies.values()].map(({execute,verify,supports,...rest})=>rest),
    circuits:clone(state.circuits),
    failures:failureSummary,
    recentHistory:clone(state.history.slice(0,30)),
    installed:clone(state.installed)
  };
}
function reset({operation=null}={}){
  if(operation){
    const opKey=operationKey(operation,{});
    clearFailuresFor(opKey);
    state.history=state.history.filter(item=>item.opKey!==opKey);
  }else{
    state.history=[];state.failures={};state.circuits={};
  }
  persist();emit('reset',{operation});return true;
}

window.ATLASResilience=Object.freeze({
  version:'1.0.0',registerStrategy,execute,inspect,reset,classifyFailure,operationKey,
  policy:Object.freeze({noBlindRetry:true,changeStrategyAfterFailure:true,minimumSafeChange:true,verificationRequiredForMutations:true,circuitBreaker:true,learnFromFailures:true})
});

window.addEventListener('atlas:support:ready',installTechnicalSupportIntegration);
window.addEventListener('atlas:agent:ready',installAgentFabricIntegration);
if(window.ATLASTechnicalSupport)installTechnicalSupportIntegration();
if(window.ATLASAgentFabric)installAgentFabricIntegration();
emit('ready',{version:'1.0.0'});
})();