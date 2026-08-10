(()=>{
'use strict';

const SESSION_KEY='atlas.core.services.v1';
const clone=value=>JSON.parse(JSON.stringify(value));
const uid=prefix=>`${prefix}-${crypto.randomUUID?.()||`${Date.now()}-${Math.random().toString(16).slice(2)}`}`;
const now=()=>new Date().toISOString();
const bounded=(items,max=200)=>items.slice(0,max);

function loadSession(){
  try{
    const parsed=JSON.parse(sessionStorage.getItem(SESSION_KEY)||'{}');
    return parsed&&typeof parsed==='object'?parsed:{};
  }catch{return {};}
}
const state={config:null,events:[],signals:[],projects:[],workUnits:[],dependencies:[],evidence:[],runs:[],...loadSession()};
function save(){
  const safe={events:bounded(state.events),signals:bounded(state.signals),projects:bounded(state.projects,100),workUnits:bounded(state.workUnits,500),dependencies:bounded(state.dependencies,1000),evidence:bounded(state.evidence,500),runs:bounded(state.runs,100)};
  try{sessionStorage.setItem(SESSION_KEY,JSON.stringify(safe));}catch{}
}
function notify(type,detail={}){window.dispatchEvent(new CustomEvent(`atlas:${type}`,{detail}));}

const adapters={data:null,identity:null,providers:new Map(),tools:new Map(),handlers:new Map(),connectors:new Map(),integrationAdapters:new Map()};

const Identity=Object.freeze({
  registerAdapter(adapter){if(!adapter||typeof adapter!=='object')throw new TypeError('Identity adapter required');adapters.identity=adapter;notify('identity:adapter',{connected:true});return true;},
  current(){try{return adapters.identity?.current?.()||null;}catch{return null;}},
  authenticated(){const c=this.current();return Boolean(c?.userId||c?.user_id||c?.subjectId||c?.user);},
  can(permission){if(!permission)return true;try{if(typeof adapters.identity?.can==='function')return Boolean(adapters.identity.can(permission));}catch{}const c=this.current();const p=new Set([...(c?.permissions||[])]);return p.has(permission)||p.has('*');},
  status(){return {backendVerified:Boolean(state.config?.services?.identity?.backendVerified),adapterConnected:Boolean(adapters.identity),authenticated:this.authenticated()};}
});

const DataFabric=Object.freeze({
  registerAdapter(adapter){if(!adapter||typeof adapter!=='object')throw new TypeError('Data adapter required');adapters.data=adapter;notify('data:adapter',{connected:true});return true;},
  async list(resource,options={}){if(typeof adapters.data?.list!=='function')throw new Error('ATLAS Data Fabric adapter is not connected.');return adapters.data.list(resource,options);},
  async write(operation){if(typeof adapters.data?.write!=='function')throw new Error('ATLAS Data Fabric adapter is not connected.');return adapters.data.write(operation);},
  status(){return {backendVerified:Boolean(state.config?.services?.dataFabric?.backendVerified),adapterConnected:Boolean(adapters.data)};}
});

const EventFabric=Object.freeze({
  emit(eventType,sourceModule,{targetModule=null,entityType=null,entityId=null,payload={}}={}){
    const event={id:uid('evt'),eventType:String(eventType),sourceModule:String(sourceModule),targetModule,entityType,entityId,payload:clone(payload),occurredAt:now()};
    state.events.unshift(event);state.events=bounded(state.events);save();notify('event',{event:clone(event)});Intelligence.process(event);return clone(event);
  },
  list({limit=50,eventType=null,sourceModule=null}={}){return clone(state.events.filter(e=>(!eventType||e.eventType===eventType)&&(!sourceModule||e.sourceModule===sourceModule)).slice(0,limit));},
  clear(){state.events=[];save();return true;},
  status(){return {active:true,sessionEvents:state.events.length,backendVerified:Boolean(state.config?.services?.eventFabric?.backendVerified)};}
});

function workUnit(id){return state.workUnits.find(item=>item.id===id)||null;}
function wouldCycle(predecessor,successor){
  const downstream=new Set([successor]);
  let changed=true;
  while(changed){changed=false;for(const dep of state.dependencies){if(downstream.has(dep.predecessor)&&!downstream.has(dep.successor)){downstream.add(dep.successor);changed=true;}}}
  return downstream.has(predecessor);
}
const WorkGraph=Object.freeze({
  createProject(title,{description='',priority='medium',metadata={}}={}){const item={id:uid('wg'),title:String(title),description:String(description),priority,status:'active',metadata:clone(metadata),createdAt:now()};state.projects.unshift(item);save();EventFabric.emit('work.project.created','work-graph',{entityType:'project',entityId:item.id,payload:{title:item.title}});return clone(item);},
  createWorkUnit(projectId,title,{type='task',priority='medium',assignedAgent=null,acceptanceCriteria=[]}={}){if(!state.projects.some(p=>p.id===projectId))throw new Error('Project not found');const item={id:uid('wu'),projectId,title:String(title),type,priority,status:'ready',assignedAgent,acceptanceCriteria:clone(acceptanceCriteria),createdAt:now()};state.workUnits.unshift(item);save();EventFabric.emit('work.unit.created','work-graph',{entityType:'work-unit',entityId:item.id,payload:{projectId,title:item.title}});return clone(item);},
  addDependency(predecessor,successor){if(predecessor===successor)throw new Error('A work unit cannot depend on itself');if(!workUnit(predecessor)||!workUnit(successor))throw new Error('Work unit not found');if(wouldCycle(predecessor,successor))throw new Error('Dependency would create a cycle');const dep={id:uid('dep'),predecessor,successor,status:'active',createdAt:now()};state.dependencies.push(dep);save();return clone(dep);},
  addEvidence(workUnitId,type,summary,payload={}){if(!workUnit(workUnitId))throw new Error('Work unit not found');const item={id:uid('evidence'),workUnitId,type:String(type),summary:String(summary),payload:clone(payload),createdAt:now()};state.evidence.unshift(item);save();return clone(item);},
  updateStatus(workUnitId,status){const item=workUnit(workUnitId);if(!item)throw new Error('Work unit not found');item.status=String(status);item.updatedAt=now();save();EventFabric.emit('work.unit.status.changed','work-graph',{entityType:'work-unit',entityId:item.id,payload:{status:item.status}});return clone(item);},
  snapshot(){return clone({projects:state.projects,workUnits:state.workUnits,dependencies:state.dependencies,evidence:state.evidence});},
  status(){return {active:true,backendVerified:Boolean(state.config?.services?.workGraph?.backendVerified),projects:state.projects.length,workUnits:state.workUnits.length};}
});

const intelligenceRules=[];
function signal(source,signalType,{severity='info',title=signalType,summary='',evidence={}}={}){const item={id:uid('sig'),source,signalType,severity,title,summary,evidence:clone(evidence),status:'open',createdAt:now()};state.signals.unshift(item);state.signals=bounded(state.signals);save();notify('intelligence:signal',{signal:clone(item)});return item;}
const Intelligence=Object.freeze({
  registerRule(rule){if(!rule||typeof rule.match!=='function'||typeof rule.run!=='function')throw new TypeError('Intelligence rule requires match and run');intelligenceRules.push(rule);return true;},
  process(event){for(const rule of intelligenceRules){try{if(rule.match(event))rule.run(event);}catch(error){notify('intelligence:error',{message:error.message});}}},
  createSignal:signal,
  signals({limit=50,status='open'}={}){return clone(state.signals.filter(s=>!status||s.status===status).slice(0,limit));},
  status(){return {active:true,mode:'atlas-native',rules:intelligenceRules.length,signals:state.signals.length};}
});
Intelligence.registerRule({match:e=>e.eventType==='inventory.stock.low',run:e=>signal('inventory','reorder-required',{severity:'high',title:'Inventory reorder required',summary:'Low-stock event requires attention.',evidence:e.payload})});
Intelligence.registerRule({match:e=>e.eventType==='finance.invoice.overdue',run:e=>signal('finance','collection-attention',{severity:'high',title:'Overdue receivable',summary:'An overdue invoice requires collection attention.',evidence:e.payload})});

const skills=new Map();
const builtinSkills=[
  ['technical-support','support','core.read','medium',['support','diagnose','repair','error','failure','falla','reparar']],
  ['deployment','deployment','organization.manage','high',['deploy','deployment','release','rollback','ci','producción']],
  ['security','security','security.events.read','high',['security','identity','permission','mfa','seguridad','identidad']],
  ['knowledge','knowledge','documents.read','low',['knowledge','document','research','conocimiento']],
  ['accounting','accounting','accounting.read','medium',['accounting','invoice','journal','reconcile','contabilidad','factura']],
  ['hr','hr','hr.read','medium',['hr','employee','candidate','payroll','rrhh','empleado','nómina']],
  ['iot-digital-twin','iot','modules.manage','high',['iot','digital twin','telemetry','sensor','gemelo digital']]
];
for(const [id,domain,permission,risk,intents] of builtinSkills)skills.set(id,{id,domain,permission,risk,intents});
function matchSkill(task){const text=String(task||'').toLowerCase();let best=null;let score=0;for(const skill of skills.values()){const current=skill.intents.reduce((sum,intent)=>sum+(text.includes(intent.toLowerCase())?1:0),0);if(current>score){best=skill;score=current;}}return best;}
const AgentFabric=Object.freeze({
  registerSkill(skill){if(!skill?.id)throw new TypeError('Skill id required');skills.set(skill.id,{...skill});return true;},
  registerProvider(name,adapter){if(!name||!adapter)throw new TypeError('Provider adapter required');adapters.providers.set(name,adapter);return true;},
  registerTool(name,adapter){if(!name||!adapter)throw new TypeError('Tool adapter required');adapters.tools.set(name,adapter);return true;},
  registerHandler(skillId,handler){if(typeof handler!=='function')throw new TypeError('Handler required');adapters.handlers.set(skillId,handler);return true;},
  plan(task,context={}){const skill=matchSkill(task);if(!skill)return {task,skill:null,mode:'plan-only',steps:['Discover current state','Select a registered ATLAS skill']};const missing=!Identity.can(skill.permission);const needsApproval=skill.risk==='high'&&!context.approved;return {task,skill,mode:missing||needsApproval?'plan-only':'execute',reasons:[missing?`Missing permission: ${skill.permission}`:null,needsApproval?'High-risk execution requires explicit approval.':null].filter(Boolean),steps:['Discover current state before mutation',`Route through ${skill.id}`,'Apply policy and permission gates','Execute only the minimum authorized action','Perform a fresh post-action verification']};},
  async execute(task,context={}){const plan=this.plan(task,context);const run={id:uid('run'),task,plan,status:'planning',startedAt:now()};if(!plan.skill||plan.mode!=='execute'){run.status='plan-only';run.completedAt=now();state.runs.unshift(run);save();return clone(run);}const before={at:now(),online:navigator.onLine};try{const handler=adapters.handlers.get(plan.skill.id);let result=handler?await handler({task,context,skill:plan.skill}):null;if(result==null){for(const provider of adapters.providers.values()){if(typeof provider.execute==='function'&&(!provider.supports||provider.supports(plan.skill,context))){result=await provider.execute({task,context,skill:plan.skill});break;}}}if(result==null)result={planned:true,detail:'Skill routed; no executable adapter is registered.'};run.result=result;run.status=result.planned?'planned':'completed';run.verification={before,after:{at:now(),online:navigator.onLine},performed:true};}catch(error){run.status='failed';run.error=error.message;run.verification={before,after:{at:now(),online:navigator.onLine},performed:true};}run.completedAt=now();state.runs.unshift(run);state.runs=bounded(state.runs,100);save();return clone(run);},
  status(){return {active:true,skills:skills.size,providers:adapters.providers.size,tools:adapters.tools.size,recentRuns:state.runs.length};}
});

const Integrations=Object.freeze({
  register(name,{kind='api',metadata={}}={}){
    if(!name)throw new TypeError('Connector name required');
    const connector={name:String(name),kind,status:'disconnected',metadata:clone(metadata),health:null,updatedAt:now()};
    adapters.connectors.set(connector.name,connector);adapters.integrationAdapters.delete(connector.name);return clone(connector);
  },
  async connect(name,adapter){
    const item=adapters.connectors.get(name);if(!item)throw new Error('Connector not registered');
    if(!adapter||typeof adapter.health!=='function')throw new TypeError('Authorized connector adapter with health() is required');
    const result=await adapter.health();
    if(result?.ok!==true){item.status='disconnected';item.health={ok:false,checkedAt:now()};item.updatedAt=now();throw new Error('Connector health check did not verify a live authorized connection.');}
    adapters.integrationAdapters.set(name,adapter);item.status='connected';item.health={ok:true,checkedAt:now()};item.updatedAt=now();notify('integration:connected',{name});return clone(item);
  },
  disconnect(name){const item=adapters.connectors.get(name);if(!item)throw new Error('Connector not registered');adapters.integrationAdapters.delete(name);item.status='disconnected';item.health=null;item.updatedAt=now();notify('integration:disconnected',{name});return clone(item);},
  list(){return clone([...adapters.connectors.values()]);},
  status(){return {gatewayActive:true,connected:[...adapters.connectors.values()].filter(c=>c.status==='connected'&&c.health?.ok===true).length,total:adapters.connectors.size};}
});

function configure(config){state.config=config||{};save();notify('core-services:ready',{status:inspect()});return inspect();}
function inspect(){return {dataFabric:DataFabric.status(),eventFabric:EventFabric.status(),identity:Identity.status(),intelligence:Intelligence.status(),agentFabric:AgentFabric.status(),workGraph:WorkGraph.status(),integrations:Integrations.status()};}
function resetSession(){state.events=[];state.signals=[];state.projects=[];state.workUnits=[];state.dependencies=[];state.evidence=[];state.runs=[];save();return true;}

window.ATLASCoreServices=Object.freeze({version:'1.1.0',configure,inspect,resetSession,Identity,DataFabric,EventFabric,Intelligence,AgentFabric,WorkGraph,Integrations});
notify('core-services:loaded',{version:'1.1.0'});
})();