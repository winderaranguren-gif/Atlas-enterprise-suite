(()=>{
'use strict';

const fabric=()=>window.ATLASDataFabric;
const registry=new Map();
let started=false;
let processing=new Set();

function requireFabric(){if(!fabric())throw new Error('ATLAS Data Fabric is unavailable.');return fabric();}
function orgId(){return requireFabric().activeOrg()?.id;}
function uid(){return requireFabric().session()?.user?.id;}

async function registerProductionModules(){
  const f=requireFabric();
  const rows=await f.list('atlas_module_registry',{order:'module_code'});
  registry.clear();
  for(const row of rows)registry.set(row.module_code,row);
  window.dispatchEvent(new CustomEvent('atlas:intelligence-registry',{detail:{modules:[...registry.values()]}}));
  return [...registry.values()];
}

async function createSignal(sourceModule,signalType,{severity='info',title,summary='',evidence={},subjectUserId=null}={}){
  const f=requireFabric();
  const payload={source_module:sourceModule,signal_type:signalType,severity,title:title||signalType,summary,evidence,subject_user_id:subjectUserId,created_by:uid()};
  return f.insert('atlas_intelligence_signals',payload,orgId());
}

async function queueOutbox(channel,payload,{destinationRef=null,eventId=null}={}){
  const f=requireFabric();
  return f.insert('atlas_outbox',{event_id:eventId,channel,destination_ref:destinationRef,payload,status:'queued',created_by:uid()},orgId());
}

function resolveTemplate(value,event){
  if(typeof value==='string'){
    return value.replace(/\{\{([^}]+)\}\}/g,(_,path)=>{
      const parts=path.trim().split('.');let current=event;
      for(const part of parts)current=current?.[part];
      return current==null?'':String(current);
    });
  }
  if(Array.isArray(value))return value.map(v=>resolveTemplate(v,event));
  if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([k,v])=>[k,resolveTemplate(v,event)]));
  return value;
}

async function executeAction(action,event){
  const f=requireFabric();
  const type=action?.type;
  if(type==='create_record'){
    return f.createModuleRecord(action.module||event.target_module||event.source_module,action.recordType||'automation',resolveTemplate(action.payload||{},event),{
      externalKey:resolveTemplate(action.externalKey||null,event),subjectUserId:action.subjectUserId==='actor'?event.actor_id:null
    });
  }
  if(type==='emit_event'){
    return emit(resolveTemplate(action.eventType,event),action.sourceModule||'automation',{
      targetModule:action.targetModule||null,entityType:event.entity_type,entityId:event.entity_id,payload:resolveTemplate(action.payload||event.payload||{},event),skipWorkflows:Boolean(action.skipWorkflows)
    });
  }
  if(type==='signal'){
    return createSignal(action.sourceModule||event.source_module,action.signalType||event.event_type,{
      severity:action.severity||'info',title:resolveTemplate(action.title||event.event_type,event),summary:resolveTemplate(action.summary||'',event),evidence:resolveTemplate(action.evidence||event.payload||{},event)
    });
  }
  if(type==='outbox'){
    return queueOutbox(action.channel||'webhook',resolveTemplate(action.payload||event.payload||{},event),{destinationRef:resolveTemplate(action.destinationRef||null,event),eventId:event.id||null});
  }
  throw new Error(`Unsupported ATLAS workflow action: ${type||'unknown'}`);
}

async function runWorkflow(workflow,event){
  const f=requireFabric();
  let run=await f.insert('atlas_workflow_runs',{
    workflow_id:workflow.id,event_id:event.id||null,status:'running',input:event,actor_id:uid(),started_at:new Date().toISOString()
  },orgId());
  try{
    const actions=Array.isArray(workflow.definition?.actions)?workflow.definition.actions:[];
    const output=[];
    for(const action of actions)output.push(await executeAction(action,event));
    if(!run?.queued&&run?.id)run=await f.update('atlas_workflow_runs',run.id,{status:'completed',output:{actions:output.length},completed_at:new Date().toISOString()},orgId());
    return run;
  }catch(error){
    if(!run?.queued&&run?.id)await f.update('atlas_workflow_runs',run.id,{status:'failed',error_message:error.message,completed_at:new Date().toISOString()},orgId()).catch(()=>{});
    throw error;
  }
}

async function applyBuiltInIntelligence(event){
  if(event.event_type==='inventory.stock.low'){
    await createSignal('inventory','reorder_required',{severity:'high',title:'Inventory reorder required',summary:`Low stock detected for ${event.entity_id||'an item'}.`,evidence:event.payload});
  }
  if(event.event_type==='finance.invoice.overdue'){
    await createSignal('finance','collection_attention',{severity:'high',title:'Overdue receivable',summary:`Invoice ${event.entity_id||''} requires collection attention.`,evidence:event.payload});
  }
  if(event.event_type==='field.sale.completed'){
    await emit('analytics.revenue.changed','intelligence',{targetModule:'analytics',entityType:event.entity_type,entityId:event.entity_id,payload:event.payload,skipWorkflows:true});
  }
}

async function processEvent(event){
  if(!event?.event_type||!orgId())return;
  const key=`${event.id||'local'}:${event.event_type}`;
  if(processing.has(key))return;
  processing.add(key);
  try{
    await applyBuiltInIntelligence(event);
    const f=requireFabric();
    const workflows=await f.list('atlas_workflows',{filters:[['eq','enabled',true],['eq','trigger_event',event.event_type]],order:'updated_at',limit:100});
    for(const workflow of workflows){
      try{await runWorkflow(workflow,event);}
      catch(error){window.dispatchEvent(new CustomEvent('atlas:intelligence-error',{detail:{workflowId:workflow.id,error:error.message}}));}
    }
  }finally{processing.delete(key);}
}

async function emit(eventType,sourceModule,{targetModule=null,entityType=null,entityId=null,payload={},skipWorkflows=false}={}){
  const f=requireFabric();
  const saved=await f.emitEvent(eventType,sourceModule,{targetModule,entityType,entityId,payload,orgId:orgId()});
  const event=saved?.queued?{event_type:eventType,source_module:sourceModule,target_module:targetModule,entity_type:entityType,entity_id:entityId,payload,actor_id:uid()}:saved;
  window.dispatchEvent(new CustomEvent('atlas:event',{detail:event}));
  if(!skipWorkflows&&!saved?.queued)await processEvent(event);
  return saved;
}

async function status(){
  const f=requireFabric();
  const health=await f.health();
  if(!health.authenticated)return {...health,intelligence:false};
  const [modules,signals,workflows,connectors]=await Promise.all([
    registerProductionModules(),
    f.list('atlas_intelligence_signals',{filters:[['eq','status','open']],order:'created_at',limit:25}),
    f.list('atlas_workflows',{filters:[['eq','enabled',true]],order:'updated_at',limit:100}),
    f.list('atlas_connectors',{order:'updated_at',limit:100}).catch(()=>[])
  ]);
  return {...health,intelligence:true,modules:modules.length,signals:signals.length,workflows:workflows.length,connectors:{connected:connectors.filter(x=>x.status==='connected').length,total:connectors.length}};
}

async function start(){
  if(started)return api;
  const f=requireFabric();
  await f.initialize();
  if(f.session()&&f.activeOrg())await registerProductionModules();
  window.addEventListener('atlas:organization',()=>registerProductionModules().catch(()=>{}));
  window.addEventListener('atlas:event',event=>processEvent(event.detail).catch(()=>{}));
  started=true;
  return api;
}

const api={version:'1.0.0',mode:'production',start,status,emit,processEvent,createSignal,queueOutbox,registerProductionModules,moduleRegistry:()=>new Map(registry),runWorkflow};
window.ATLASIntelligence=api;
})();
