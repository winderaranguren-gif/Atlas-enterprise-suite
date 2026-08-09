(()=>{
'use strict';

const DB_NAME='atlas-production-outbox-v1';
const STORE='operations';
const ACTIVE_ORG_KEY='atlas.activeOrg';
const CORE_TABLES=new Set(['customers','vendors','products','invoices','invoice_lines','payments','expense_categories','expenses','chart_of_accounts','journal_entries','journal_lines','employees','documents','organization_modules','atlas_module_registry','atlas_module_records','atlas_events','atlas_workflows','atlas_workflow_runs','atlas_connectors','atlas_outbox','atlas_intelligence_signals']);

let client=null;
let currentSession=null;
let currentOrg=null;
let initialized=false;
let initializePromise=null;

function assertConfigured(){
  const cfg=window.ATLAS_CONFIG||{};
  if(!window.supabase?.createClient)throw new Error('Supabase SDK is unavailable.');
  if(!cfg.supabaseUrl||!cfg.supabasePublishableKey)throw new Error('ATLAS production database configuration is missing.');
  return cfg;
}

function openQueue(){
  return new Promise((resolve,reject)=>{
    const request=indexedDB.open(DB_NAME,1);
    request.onupgradeneeded=()=>{
      const db=request.result;
      if(!db.objectStoreNames.contains(STORE))db.createObjectStore(STORE,{keyPath:'id',autoIncrement:true});
    };
    request.onsuccess=()=>resolve(request.result);
    request.onerror=()=>reject(request.error);
  });
}

async function queueOperation(operation){
  const db=await openQueue();
  await new Promise((resolve,reject)=>{
    const tx=db.transaction(STORE,'readwrite');
    tx.objectStore(STORE).add({...operation,queuedAt:new Date().toISOString()});
    tx.oncomplete=resolve;
    tx.onerror=()=>reject(tx.error);
  });
  db.close();
  window.dispatchEvent(new CustomEvent('atlas:data-queued',{detail:operation}));
  return {queued:true};
}

async function queuedOperations(){
  const db=await openQueue();
  const rows=await new Promise((resolve,reject)=>{
    const tx=db.transaction(STORE,'readonly');
    const request=tx.objectStore(STORE).getAll();
    request.onsuccess=()=>resolve(request.result||[]);
    request.onerror=()=>reject(request.error);
  });
  db.close();
  return rows;
}

async function deleteQueued(id){
  const db=await openQueue();
  await new Promise((resolve,reject)=>{
    const tx=db.transaction(STORE,'readwrite');
    tx.objectStore(STORE).delete(id);
    tx.oncomplete=resolve;
    tx.onerror=()=>reject(tx.error);
  });
  db.close();
}

function ensureTable(table){
  if(!CORE_TABLES.has(table))throw new Error(`Table not allowed through ATLAS Data Fabric: ${table}`);
}

function ensureOrg(orgId){
  const id=orgId||currentOrg?.id;
  if(!id)throw new Error('No active ATLAS organization.');
  return id;
}

function normalizeError(error){
  if(!error)return null;
  const message=error.message||error.error_description||String(error);
  const out=new Error(message);
  out.code=error.code;
  out.details=error.details;
  out.hint=error.hint;
  return out;
}

async function initialize(){
  if(initialized)return api;
  if(initializePromise)return initializePromise;
  initializePromise=(async()=>{
    const cfg=assertConfigured();
    client=window.supabase.createClient(cfg.supabaseUrl,cfg.supabasePublishableKey,{
      auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}
    });
    const {data,error}=await client.auth.getSession();
    if(error)throw normalizeError(error);
    currentSession=data?.session||null;
    client.auth.onAuthStateChange((event,session)=>{
      currentSession=session||null;
      if(!session){currentOrg=null;sessionStorage.removeItem(ACTIVE_ORG_KEY);}
      window.dispatchEvent(new CustomEvent('atlas:auth',{detail:{event,session:Boolean(session)}}));
    });
    initialized=true;
    if(navigator.onLine)flushQueue().catch(()=>{});
    return api;
  })();
  return initializePromise;
}

async function signIn(email,password){
  await initialize();
  const {data,error}=await client.auth.signInWithPassword({email,password});
  if(error)throw normalizeError(error);
  currentSession=data.session;
  return data.session;
}

async function signOut(){
  await initialize();
  const {error}=await client.auth.signOut();
  if(error)throw normalizeError(error);
  currentSession=null;currentOrg=null;sessionStorage.removeItem(ACTIVE_ORG_KEY);
}

async function organizations(){
  await initialize();
  if(!currentSession)return [];
  const {data,error}=await client.from('organization_members')
    .select('org_id,role,status,organizations(id,name,legal_name,industry,active)')
    .eq('status','active');
  if(error)throw normalizeError(error);
  const rows=(data||[]).filter(x=>x.organizations?.active!==false).map(x=>({
    id:x.org_id,name:x.organizations?.name||'ATLAS Organization',legalName:x.organizations?.legal_name||'',industry:x.organizations?.industry||'',role:x.role
  }));
  const remembered=sessionStorage.getItem(ACTIVE_ORG_KEY);
  const chosen=rows.find(x=>x.id===remembered)||rows[0]||null;
  currentOrg=chosen;
  if(chosen)sessionStorage.setItem(ACTIVE_ORG_KEY,chosen.id);
  return rows;
}

function setActiveOrg(org){
  currentOrg=org||null;
  if(org?.id)sessionStorage.setItem(ACTIVE_ORG_KEY,org.id);else sessionStorage.removeItem(ACTIVE_ORG_KEY);
  window.dispatchEvent(new CustomEvent('atlas:organization',{detail:currentOrg}));
  return currentOrg;
}

async function list(table,{orgId,select='*',filters=[],order='updated_at',ascending=false,limit=200}={}){
  await initialize();ensureTable(table);const oid=ensureOrg(orgId);
  let query=client.from(table).select(select).eq(table==='organization_modules'||table==='atlas_module_registry'?'org_id':'org_id',oid);
  for(const [method,column,value] of filters){if(typeof query[method]!=='function')throw new Error(`Unsupported filter: ${method}`);query=query[method](column,value);}
  if(order)query=query.order(order,{ascending});
  if(limit)query=query.limit(limit);
  const {data,error}=await query;
  if(error)throw normalizeError(error);
  return data||[];
}

async function executeWrite(operation,{queueIfOffline=true}={}){
  await initialize();
  if(!currentSession)throw new Error('Authentication required.');
  if(!navigator.onLine&&queueIfOffline)return queueOperation(operation);
  const {type,table,orgId,payload,id}=operation;ensureTable(table);const oid=ensureOrg(orgId);
  let query;
  if(type==='insert')query=client.from(table).insert({...payload,org_id:oid}).select().single();
  else if(type==='update')query=client.from(table).update(payload).eq('org_id',oid).eq('id',id).select().single();
  else if(type==='delete')query=client.from(table).delete().eq('org_id',oid).eq('id',id);
  else throw new Error(`Unsupported write type: ${type}`);
  const {data,error}=await query;
  if(error)throw normalizeError(error);
  return data||{ok:true};
}

const insert=(table,payload,orgId)=>executeWrite({type:'insert',table,payload,orgId});
const update=(table,id,payload,orgId)=>executeWrite({type:'update',table,id,payload,orgId});
const remove=(table,id,orgId)=>executeWrite({type:'delete',table,id,orgId});

async function moduleRecords(moduleCode,recordType=null,orgId=null){
  const filters=[['eq','module_code',moduleCode]];
  if(recordType)filters.push(['eq','record_type',recordType]);
  return list('atlas_module_records',{orgId,filters,order:'updated_at'});
}

async function createModuleRecord(moduleCode,recordType,payload,{orgId=null,externalKey=null,subjectUserId=null,status='active'}={}){
  return insert('atlas_module_records',{module_code:moduleCode,record_type:recordType,external_key:externalKey,subject_user_id:subjectUserId,status,payload,updated_by:currentSession.user.id},orgId);
}

async function updateModuleRecord(id,payload,{orgId=null,status,recordType,moduleCode,externalKey,subjectUserId}={}){
  const patch={payload,updated_by:currentSession.user.id};
  if(status!==undefined)patch.status=status;if(recordType)patch.record_type=recordType;if(moduleCode)patch.module_code=moduleCode;
  if(externalKey!==undefined)patch.external_key=externalKey;if(subjectUserId!==undefined)patch.subject_user_id=subjectUserId;
  return update('atlas_module_records',id,patch,orgId);
}

async function emitEvent(eventType,sourceModule,{targetModule=null,entityType=null,entityId=null,payload={},orgId=null}={}){
  const oid=ensureOrg(orgId);
  return insert('atlas_events',{event_type:eventType,source_module:sourceModule,target_module:targetModule,entity_type:entityType,entity_id:entityId,payload,actor_id:currentSession.user.id},oid);
}

async function listEvents({orgId=null,sourceModule=null,targetModule=null,eventType=null,limit=100}={}){
  const filters=[];
  if(sourceModule)filters.push(['eq','source_module',sourceModule]);
  if(targetModule)filters.push(['eq','target_module',targetModule]);
  if(eventType)filters.push(['eq','event_type',eventType]);
  return list('atlas_events',{orgId,filters,order:'occurred_at',limit});
}

async function flushQueue(){
  await initialize();
  if(!navigator.onLine||!currentSession)return {flushed:0,pending:(await queuedOperations()).length};
  const ops=await queuedOperations();let flushed=0;
  for(const op of ops){
    try{await executeWrite(op,{queueIfOffline:false});await deleteQueued(op.id);flushed++;}
    catch(error){window.dispatchEvent(new CustomEvent('atlas:data-sync-error',{detail:{operation:op,error:error.message}}));break;}
  }
  if(flushed)window.dispatchEvent(new CustomEvent('atlas:data-synced',{detail:{flushed}}));
  return {flushed,pending:Math.max(0,ops.length-flushed)};
}

async function health(){
  await initialize();
  if(!currentSession)return {ok:false,authenticated:false,online:navigator.onLine,organization:null};
  const orgs=await organizations();
  return {ok:Boolean(orgs.length),authenticated:true,online:navigator.onLine,organization:currentOrg,organizations:orgs.length,queued:(await queuedOperations()).length};
}

window.addEventListener('online',()=>flushQueue().catch(()=>{}));

const api={
  version:'1.0.0',mode:'production',initialize,signIn,signOut,organizations,setActiveOrg,
  session:()=>currentSession,client:()=>client,activeOrg:()=>currentOrg,list,insert,update,remove,
  moduleRecords,createModuleRecord,updateModuleRecord,emitEvent,listEvents,flushQueue,health,queuedOperations
};
window.ATLASDataFabric=api;
})();
