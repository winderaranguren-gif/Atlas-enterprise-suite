(()=>{
'use strict';

const STORAGE_KEY='atlas-agent-fabric-runs-v1';
const MAX_RUNS=100;
const providers=new Map();
const tools=new Map();
const handlers=new Map();
const now=()=>new Date().toISOString();
const uid=()=>crypto.randomUUID?.()||`aaf-${Date.now()}-${Math.random().toString(16).slice(2)}`;
const clone=value=>JSON.parse(JSON.stringify(value));

function loadRuns(){
  try{
    const value=JSON.parse(localStorage.getItem(STORAGE_KEY)||'[]');
    return Array.isArray(value)?value.slice(0,MAX_RUNS):[];
  }catch{return [];}
}
let runs=loadRuns();

function persist(){
  try{localStorage.setItem(STORAGE_KEY,JSON.stringify(runs.slice(0,MAX_RUNS)));return true;}catch{return false;}
}

function emit(name,detail={}){
  window.dispatchEvent(new CustomEvent(`atlas:agent:${name}`,{detail}));
}

function registry(){
  if(!window.ATLASSkillRegistry)throw new Error('ATLASSkillRegistry is not loaded.');
  return window.ATLASSkillRegistry;
}

function identitySnapshot(){
  const api=window.ATLAS_IDENTITY||window.ATLASIdentity||null;
  let context=null;
  try{
    if(typeof api?.current==='function')context=api.current();
    else if(typeof api?.getContext==='function')context=api.getContext();
    else if(api?.context)context=api.context;
  }catch{}
  const activeOrganization=context?.activeOrganization||
    context?.organizations?.find?.(item=>item?.id===context?.activeOrganizationId)||null;
  const permissions=new Set([
    ...(activeOrganization?.permissions||[]),
    ...(context?.permissions||[]),
    ...(api?.permissions||[])
  ].map(String));
  return {
    available:Boolean(api),
    authenticated:Boolean(context?.user_id||context?.user||context?.userId||context?.subjectId||api?.authenticated),
    organizationId:activeOrganization?.id||context?.activeOrganizationId||context?.organizationId||context?.orgId||null,
    role:activeOrganization?.role||context?.role||null,
    aal:context?.aal||null,
    permissions:[...permissions]
  };
}

function hasPermission(permission,identity=identitySnapshot()){
  if(!permission)return true;
  const api=window.ATLAS_IDENTITY||window.ATLASIdentity||null;
  try{
    if(typeof api?.can==='function')return Boolean(api.can(permission));
    if(typeof api?.hasPermission==='function')return Boolean(api.hasPermission(permission));
  }catch{}
  return identity.permissions.includes(permission)||identity.permissions.includes('*');
}

function discoverState(context={}){
  const support=window.ATLASTechnicalSupport;
  const modules=typeof support?.discoverModules==='function'?support.discoverModules():[];
  const atlasModules=window.ATLAS?.modules||window.ATLAS?.registry||window.ATLAS_MODULES||null;
  return {
    at:now(),
    online:navigator.onLine,
    secureContext:Boolean(window.isSecureContext),
    origin:location.origin,
    page:location.pathname,
    documentState:document.readyState,
    modules:Array.isArray(modules)?modules.slice(0,100):[],
    runtimeModuleRegistry:Boolean(atlasModules),
    identity:identitySnapshot(),
    context:{module:context.module||null,domain:context.domain||null}
  };
}

function evaluatePolicy(skill,{mode='execute',context={}}={}){
  const identity=identitySnapshot();
  const missing=skill.permissions.filter(permission=>!hasPermission(permission,identity));
  const highRisk=skill.risk==='high';
  const destructive=/destructive|deploy|mutation|command/i.test(`${skill.execution} ${skill.capabilities.join(' ')}`);
  const explicitApproval=Boolean(context.approved||context.userApproved||context.explicitApproval);

  if(mode==='plan')return {allowed:true,mode:'plan',identity,missingPermissions:missing,reasons:[]};

  const reasons=[];
  if(identity.available&&missing.length)reasons.push(`Missing permission(s): ${missing.join(', ')}`);
  if(!identity.available&&highRisk)reasons.push('Identity/permission runtime is unavailable for a high-risk execution.');
  if(destructive&&!explicitApproval)reasons.push('Destructive or production-changing execution requires explicit approval in context.');

  return {
    allowed:reasons.length===0,
    mode:reasons.length?'plan-only':'execute',
    identity,
    missingPermissions:missing,
    reasons
  };
}

function buildPlan(task,context={}){
  const matches=registry().match(task,context,{limit:3,minScore:1});
  if(!matches.length)return {
    task:String(task||''),
    primary:null,
    alternatives:[],
    steps:['Discover current state','Clarify domain through runtime context','Select a registered skill before execution'],
    policy:{allowed:false,mode:'plan-only',reasons:['No registered ATLAS skill matched the task.']}
  };
  const primary=matches[0].skill;
  const policy=evaluatePolicy(primary,{mode:'plan',context});
  return {
    task:String(task||''),
    primary,
    alternatives:matches.slice(1).map(item=>({skill:item.skill,score:item.score,matches:item.matches})),
    matchedIntents:matches[0].matches,
    steps:[
      'Discover current state before mutation',
      `Route through ${primary.title}`,
      'Apply policy and permission gates',
      'Execute only the minimum authorized action',
      'Perform a fresh post-action verification',
      'Record an auditable result and exact blockers'
    ],
    policy
  };
}

function registerProvider(name,adapter={}){
  if(!name||typeof name!=='string')throw new TypeError('Provider name is required.');
  if(!adapter||typeof adapter!=='object')throw new TypeError('Provider adapter must be an object.');
  providers.set(name,{name,...adapter});
  emit('provider-registered',{name});
  return ()=>providers.delete(name);
}

function registerTool(name,adapter={}){
  if(!name||typeof name!=='string')throw new TypeError('Tool name is required.');
  if(!adapter||typeof adapter!=='object')throw new TypeError('Tool adapter must be an object.');
  tools.set(name,{name,...adapter});
  emit('tool-registered',{name});
  return ()=>tools.delete(name);
}

function registerHandler(skillId,handler){
  if(typeof handler!=='function')throw new TypeError('Skill handler must be a function.');
  handlers.set(String(skillId),handler);
  emit('handler-registered',{skillId:String(skillId)});
  return ()=>handlers.delete(String(skillId));
}

async function technicalSupportHandler({task,context}){
  const support=window.ATLASTechnicalSupport;
  if(!support?.diagnose)return {
    ok:false,
    blocked:true,
    detail:'ATLAS Technical Support runtime is not loaded yet.',
    required:'Load atlas-technical-support.js and retry.'
  };
  const caseItem=await support.diagnose(task||'ATLAS Agent Fabric diagnosis',context.company||'ATLAS Client');
  return {ok:caseItem.status==='resolved',blocked:caseItem.status==='blocked',caseId:caseItem.id,status:caseItem.status,blockers:caseItem.blockers||[]};
}
registerHandler('technical-support',technicalSupportHandler);

async function runProvider(skill,task,context={}){
  const requested=context.provider||null;
  const candidates=requested?[providers.get(requested)].filter(Boolean):[...providers.values()];
  const adapter=candidates.find(item=>typeof item?.execute==='function'&&(!item.supports||item.supports(skill,context)));
  if(!adapter)return null;
  return adapter.execute({skill,task,context,state:discoverState(context)});
}

function record(run){
  runs.unshift(clone(run));
  runs=runs.slice(0,MAX_RUNS);
  persist();
  return run;
}

async function execute(task,context={}){
  const plan=buildPlan(task,context);
  const run={
    id:uid(),
    task:String(task||''),
    createdAt:now(),
    status:'planning',
    skillId:plan.primary?.id||null,
    plan,
    before:discoverState(context),
    after:null,
    policy:null,
    result:null,
    verification:null,
    error:null
  };
  emit('run-started',{run:clone(run)});

  if(!plan.primary){
    run.status='blocked';
    run.policy=plan.policy;
    run.result={ok:false,blocked:true,detail:'No registered skill matched this task.'};
    run.after=discoverState(context);
    record(run);emit('run-completed',{run:clone(run)});return clone(run);
  }

  const skill=plan.primary;
  const policy=evaluatePolicy(skill,{mode:'execute',context});
  run.policy=policy;
  if(!policy.allowed){
    run.status='plan-only';
    run.result={ok:false,blocked:true,detail:policy.reasons.join(' '),planOnly:true};
    run.after=discoverState(context);
    record(run);emit('run-completed',{run:clone(run)});return clone(run);
  }

  run.status='executing';
  try{
    const handler=handlers.get(skill.id);
    let result=null;
    if(handler)result=await handler({skill,task,context,state:run.before,tools,providers});
    if(result==null)result=await runProvider(skill,task,context);
    if(result==null){
      result={
        ok:true,
        planned:true,
        detail:`${skill.title} routed successfully; no executable provider/tool adapter is registered for this task.`,
        capabilities:skill.capabilities
      };
    }
    run.result=result;
    run.after=discoverState(context);
    run.verification={
      performed:true,
      at:run.after.at,
      freshSnapshot:run.after.at!==run.before.at,
      online:run.after.online,
      secureContext:run.after.secureContext
    };
    run.status=result?.blocked?'blocked':result?.ok===false?'failed':result?.planned?'planned':'completed';
  }catch(error){
    run.status='failed';
    run.error={name:error?.name||'Error',message:error?.message||String(error)};
    run.result={ok:false,detail:run.error.message};
    run.after=discoverState(context);
    run.verification={performed:true,at:run.after.at,freshSnapshot:true};
  }

  record(run);
  emit('run-completed',{run:clone(run)});
  return clone(run);
}

function inspect(){
  return {
    version:'1.0.0',
    policy:{discoverBeforeChange:true,minimumAuthorizedChange:true,verifyAfterChange:true,providerAgnostic:true},
    skills:registry().list(),
    providers:[...providers.keys()],
    tools:[...tools.keys()],
    handlers:[...handlers.keys()],
    state:discoverState(),
    recentRuns:clone(runs.slice(0,20))
  };
}

function clearRuns(){runs=[];persist();emit('runs-cleared',{});return true;}

window.ATLASAgentFabric=Object.freeze({
  version:'1.0.0',
  registerProvider,
  registerTool,
  registerHandler,
  discoverState,
  evaluatePolicy,
  plan:buildPlan,
  execute,
  inspect,
  getRuns:()=>clone(runs),
  clearRuns
});

window.addEventListener('atlas:support:ready',()=>emit('integration-ready',{integration:'technical-support'}));
window.dispatchEvent(new CustomEvent('atlas:agent:ready',{detail:{version:'1.0.0',skills:registry().list().length}}));
})();