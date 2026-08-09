(()=>{
'use strict';

if(window.ATLASOwnedCore)return;

const VERSION='1.0.0';
const STORAGE_KEY='atlas-owned-core-v1';
const MAX_MEMORY_ENTRIES=500;
const providers=new Map();
const tools=new Map();
const policy={
  preferOwned:true,
  externalProviders:false,
  persistence:'local-first',
  requireVerificationForMutations:true,
  sameOriginInference:true
};

const now=()=>new Date().toISOString();
const uid=()=>crypto.randomUUID?.()||`atlas-${Date.now()}-${Math.random().toString(16).slice(2)}`;
const clone=value=>value==null?value:JSON.parse(JSON.stringify(value));
const clean=value=>String(value??'').trim();
const normalize=value=>clean(value).toLowerCase().replace(/\s+/g,' ');

function emptyState(){return{memory:[],history:[],settings:{}};}
function loadState(){
  try{
    const parsed=JSON.parse(localStorage.getItem(STORAGE_KEY)||'{}');
    return{
      memory:Array.isArray(parsed.memory)?parsed.memory.slice(0,MAX_MEMORY_ENTRIES):[],
      history:Array.isArray(parsed.history)?parsed.history.slice(0,200):[],
      settings:parsed.settings&&typeof parsed.settings==='object'?parsed.settings:{}
    };
  }catch{return emptyState();}
}
const state=loadState();

function persist(){
  try{
    localStorage.setItem(STORAGE_KEY,JSON.stringify(state));
    return true;
  }catch{return false;}
}
function emit(name,detail={}){
  window.dispatchEvent(new CustomEvent(`atlas:owned-core:${name}`,{detail}));
}
function history(entry){
  const item={id:uid(),at:now(),...entry};
  state.history.unshift(item);
  state.history=state.history.slice(0,200);
  persist();
  emit('history',{entry:clone(item)});
  return item;
}

const intentRules=[
  ['technical-support',/error|fallo|failed|deploy|build|workflow|runner|cloudflare|github|repair|repar|diagnostic|debug|bug/],
  ['accounting',/account|ledger|journal|invoice|expense|payable|receivable|reconcile|tax|payroll|contab|factura|gasto|impuesto|n[oó]mina/],
  ['health',/health|patient|hospital|clinical|medic|salud|paciente|hospital|cl[ií]nic/],
  ['documents',/document|pdf|spreadsheet|sheet|excel|word|contract|documento|contrato/],
  ['navigation',/route|map|gps|traffic|navigate|ruta|mapa|tr[aá]fico|naveg/],
  ['identity',/login|auth|identity|permission|credential|signin|sesion|sesi[oó]n|identidad|permiso/],
  ['communications',/email|message|chat|call|video|correo|mensaje|llamada/]
];

function classify(input){
  const text=normalize(typeof input==='string'?input:input?.text||input?.prompt||'');
  const matches=intentRules.filter(([,pattern])=>pattern.test(text)).map(([intent])=>intent);
  const primary=matches[0]||'general';
  const sensitivity=/password|secret|token|ssn|social security|medical record|bank account|contrase[nñ]a|secreto|historial m[eé]dico/.test(text)?'sensitive':'normal';
  return{intent:primary,matches,sensitivity,textLength:text.length,local:true,at:now()};
}

function ownershipRank(value){
  if(value==='atlas')return 0;
  if(value==='self-hosted')return 1;
  return 2;
}
function registerProvider(id,adapter={}){
  const key=clean(id);
  if(!key)throw new TypeError('Provider id is required.');
  if(typeof adapter.infer!=='function')throw new TypeError(`Provider ${key} requires infer().`);
  const provider={
    id:key,
    label:adapter.label||key,
    ownership:['atlas','self-hosted','external'].includes(adapter.ownership)?adapter.ownership:'external',
    priority:Number.isFinite(adapter.priority)?adapter.priority:100,
    enabled:adapter.enabled!==false,
    network:Boolean(adapter.network),
    recurringCost:Boolean(adapter.recurringCost),
    supports:typeof adapter.supports==='function'?adapter.supports:()=>true,
    infer:adapter.infer,
    health:typeof adapter.health==='function'?adapter.health:null
  };
  providers.set(key,provider);
  emit('provider-registered',{provider:safeProvider(provider)});
  return()=>providers.delete(key);
}
function safeProvider(provider){
  return{
    id:provider.id,label:provider.label,ownership:provider.ownership,priority:provider.priority,
    enabled:provider.enabled,network:provider.network,recurringCost:provider.recurringCost
  };
}
function eligibleProviders(request={},options={}){
  const allowExternal=policy.externalProviders===true&&options.allowExternal===true;
  return[...providers.values()]
    .filter(provider=>provider.enabled)
    .filter(provider=>provider.ownership!=='external'||allowExternal)
    .filter(provider=>{try{return provider.supports(request,options)!==false;}catch{return false;}})
    .sort((a,b)=>ownershipRank(a.ownership)-ownershipRank(b.ownership)||Number(a.recurringCost)-Number(b.recurringCost)||a.priority-b.priority);
}

async function infer(input,options={}){
  const request={
    id:uid(),
    input:typeof input==='string'?input:input?.input??input?.prompt??input,
    task:options.task||input?.task||'generate',
    context:options.context||input?.context||{},
    classification:classify(typeof input==='string'?input:input?.input??input?.prompt??'')
  };
  const candidates=eligibleProviders(request,options);
  if(!candidates.length){
    const result={ok:false,blocked:true,status:'no-owned-provider',detail:'No ATLAS-owned or self-hosted provider can satisfy this request. External providers remain disabled by policy.',request};
    history({type:'inference-blocked',result});
    return result;
  }

  const attempts=[];
  for(const provider of candidates){
    try{
      const raw=await provider.infer(clone(request),clone(options));
      const result=raw&&typeof raw==='object'?raw:{ok:true,output:raw};
      const success=result.ok!==false&&!result.blocked;
      attempts.push({provider:provider.id,ok:success,status:result.status||null});
      if(success){
        const final={ok:true,status:'completed',provider:provider.id,ownership:provider.ownership,result,attempts,requestId:request.id};
        history({type:'inference-success',provider:provider.id,task:request.task});
        emit('inference',{provider:provider.id,task:request.task,ok:true});
        return final;
      }
    }catch(error){
      attempts.push({provider:provider.id,ok:false,status:'exception',detail:error?.message||String(error)});
    }
  }
  const final={ok:false,blocked:true,status:'owned-providers-exhausted',detail:'ATLAS exhausted eligible owned/self-hosted providers without a successful result.',attempts,requestId:request.id};
  history({type:'inference-failed',task:request.task,attempts});
  return final;
}

function registerTool(id,tool={}){
  const key=clean(id);
  if(!key)throw new TypeError('Tool id is required.');
  if(typeof tool.execute!=='function')throw new TypeError(`Tool ${key} requires execute().`);
  const normalized={
    id:key,
    label:tool.label||key,
    scope:tool.scope||'general',
    mutates:Boolean(tool.mutates),
    risk:tool.risk||'low',
    execute:tool.execute,
    verify:typeof tool.verify==='function'?tool.verify:null
  };
  tools.set(key,normalized);
  emit('tool-registered',{id:key,scope:normalized.scope,mutates:normalized.mutates,risk:normalized.risk});
  return()=>tools.delete(key);
}

async function executeTool(id,input={},context={}){
  const tool=tools.get(clean(id));
  if(!tool)return{ok:false,blocked:true,status:'tool-not-found',detail:`ATLAS tool ${id} is not registered.`};
  if(tool.mutates&&policy.requireVerificationForMutations&&!tool.verify&&typeof context.verify!=='function'){
    return{ok:false,blocked:true,status:'verification-required',detail:'Mutation-capable ATLAS tools require a fresh verifier.'};
  }
  const before={at:now(),tool:tool.id};
  let result;
  try{result=await tool.execute(clone(input),clone(context));}
  catch(error){result={ok:false,status:'exception',detail:error?.message||String(error)};}
  if(result==null||typeof result!=='object')result={ok:Boolean(result),output:result};

  let verification={performed:false,ok:result.ok!==false};
  const verifier=context.verify||tool.verify;
  if(typeof verifier==='function'){
    try{
      const checked=await verifier({before,result:clone(result),input:clone(input),context:clone(context)});
      verification=checked&&typeof checked==='object'?{performed:true,...checked}:{performed:true,ok:Boolean(checked)};
    }catch(error){verification={performed:true,ok:false,detail:error?.message||String(error)};}
  }
  const ok=result.ok!==false&&!result.blocked&&verification.ok!==false;
  history({type:'tool-execution',tool:tool.id,ok,mutates:tool.mutates});
  return{ok,status:ok?'verified':'failed',tool:tool.id,result,verification};
}

function remember(key,value,meta={}){
  const normalizedKey=clean(key);
  if(!normalizedKey)throw new TypeError('Memory key is required.');
  const item={id:uid(),key:normalizedKey,value:clone(value),meta:clone(meta),updatedAt:now()};
  const index=state.memory.findIndex(entry=>entry.key===normalizedKey);
  if(index>=0)state.memory.splice(index,1);
  state.memory.unshift(item);
  state.memory=state.memory.slice(0,MAX_MEMORY_ENTRIES);
  persist();
  emit('memory',{action:'remember',key:normalizedKey});
  return clone(item);
}
function recall(key,fallback=null){
  const item=state.memory.find(entry=>entry.key===clean(key));
  return item?clone(item.value):fallback;
}
function forget(key){
  const normalizedKey=clean(key);
  const before=state.memory.length;
  state.memory=state.memory.filter(entry=>entry.key!==normalizedKey);
  const changed=state.memory.length!==before;
  if(changed){persist();emit('memory',{action:'forget',key:normalizedKey});}
  return changed;
}
function listMemory({prefix='',limit=50}={}){
  const normalizedPrefix=clean(prefix);
  return clone(state.memory.filter(item=>!normalizedPrefix||item.key.startsWith(normalizedPrefix)).slice(0,Math.max(1,Math.min(Number(limit)||50,MAX_MEMORY_ENTRIES))));
}

function configure(changes={}){
  if(Object.prototype.hasOwnProperty.call(changes,'externalProviders'))policy.externalProviders=changes.externalProviders===true;
  if(Object.prototype.hasOwnProperty.call(changes,'requireVerificationForMutations'))policy.requireVerificationForMutations=changes.requireVerificationForMutations!==false;
  state.settings={...state.settings,externalProviders:policy.externalProviders,requireVerificationForMutations:policy.requireVerificationForMutations};
  persist();
  emit('policy',{policy:clone(policy)});
  return clone(policy);
}
function inspect(){
  return{
    version:VERSION,
    policy:clone(policy),
    providers:[...providers.values()].map(safeProvider),
    tools:[...tools.values()].map(tool=>({id:tool.id,label:tool.label,scope:tool.scope,mutates:tool.mutates,risk:tool.risk})),
    memoryEntries:state.memory.length,
    recentHistory:clone(state.history.slice(0,30))
  };
}

registerProvider('atlas-native-rules',{
  label:'ATLAS Native Rules Engine',
  ownership:'atlas',
  priority:1,
  network:false,
  recurringCost:false,
  supports:request=>['classify','route'].includes(request.task),
  infer:async request=>{
    const classification=classify(request.input);
    return{
      ok:true,
      status:'local-rules',
      output:{classification,recommendedScope:classification.intent,requiresExternalAI:false}
    };
  }
});

window.ATLASOwnedCore=Object.freeze({
  version:VERSION,
  classify,infer,registerProvider,registerTool,executeTool,
  remember,recall,forget,listMemory,configure,inspect,
  policy
});

emit('ready',{version:VERSION,policy:clone(policy)});
})();