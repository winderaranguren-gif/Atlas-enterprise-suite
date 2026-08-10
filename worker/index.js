// ATLAS Cloudflare-native service layer
// CRM routes are backed by D1. No traditional server is required.
const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json;charset=UTF-8'}});
const id=()=>crypto.randomUUID();
const TYPES={accounts:'crm_accounts',contacts:'crm_contacts',leads:'crm_leads',opportunities:'crm_opportunities',tasks:'crm_tasks',activity:'crm_activity'};
const EXPECTED_TABLES=[...Object.values(TYPES),'audit_log','atlas_system_health','atlas_repair_log'];

async function ensureRepairTables(env){
 await env.DB.prepare(`CREATE TABLE IF NOT EXISTS atlas_system_health (
   component TEXT PRIMARY KEY,
   status TEXT NOT NULL,
   details TEXT DEFAULT '{}',
   checked_at TEXT NOT NULL
 )`).run();
 await env.DB.prepare(`CREATE TABLE IF NOT EXISTS atlas_repair_log (
   id TEXT PRIMARY KEY,
   component TEXT NOT NULL,
   action TEXT NOT NULL,
   result TEXT NOT NULL,
   details TEXT DEFAULT '{}',
   created_at TEXT NOT NULL
 )`).run();
}

async function logRepair(env,component,action,result,details={}){
 await env.DB.prepare('INSERT INTO atlas_repair_log(id,component,action,result,details,created_at) VALUES(?,?,?,?,?,?)')
  .bind(id(),component,action,result,JSON.stringify(details),new Date().toISOString()).run();
}

async function setHealth(env,component,status,details={}){
 const now=new Date().toISOString();
 await env.DB.prepare(`INSERT INTO atlas_system_health(component,status,details,checked_at)
 VALUES(?,?,?,?) ON CONFLICT(component) DO UPDATE SET status=excluded.status,details=excluded.details,checked_at=excluded.checked_at`)
  .bind(component,status,JSON.stringify(details),now).run();
}

async function selfRepair(env){
 if(!env.DB) return {operational:false,error:'D1 binding DB is not configured'};
 await ensureRepairTables(env);
 const report={checkedAt:new Date().toISOString(),repairs:[],blocked:[]};

 try{
  await env.DB.prepare('SELECT 1 AS ok').first();
  await setHealth(env,'d1','healthy');
 }catch(e){
  report.blocked.push({component:'d1',error:e.message});
  return report;
 }

 const schema=await env.DB.prepare("SELECT name FROM sqlite_schema WHERE type='table'").all();
 const existing=new Set((schema.results||[]).map(r=>r.name));
 for(const table of EXPECTED_TABLES){
  if(!existing.has(table)){
   await logRepair(env,'schema','detect_missing_table','blocked',{table});
   report.blocked.push({component:'schema',table,reason:'migration_required'});
  }
 }

 // Safe, reversible maintenance only.
 try{
  const staleCutoff=new Date(Date.now()-24*60*60*1000).toISOString();
  const cleanup=await env.DB.prepare('DELETE FROM atlas_repair_log WHERE created_at < ?').bind(staleCutoff).run();
  report.repairs.push({component:'repair-log',action:'prune_old_entries',changed:cleanup.meta?.changes||0});
  await logRepair(env,'repair-log','prune_old_entries','ok',{changed:cleanup.meta?.changes||0});
 }catch(e){
  report.blocked.push({component:'repair-log',error:e.message});
 }

 const crmTables=Object.values(TYPES);
 const missingCrm=crmTables.filter(t=>!existing.has(t));
 if(missingCrm.length===0){
  await setHealth(env,'crm','healthy',{tables:crmTables.length});
 }else{
  await setHealth(env,'crm','blocked',{missingTables:missingCrm});
 }

 await setHealth(env,'self-repair',report.blocked.length?'degraded':'healthy',{repairs:report.repairs.length,blocked:report.blocked.length});
 return report;
}

export default {
 async scheduled(controller,env,ctx){
  ctx.waitUntil(selfRepair(env));
 },
 async fetch(request,env){
  const url=new URL(request.url);

  if(url.pathname==='/api/system/self-repair' && request.method==='POST'){
   const report=await selfRepair(env);
   return json(report,report.error?503:200);
  }
  if(url.pathname==='/api/system/health' && request.method==='GET'){
   if(!env.DB) return json({operational:false,error:'D1 binding DB is not configured'},503);
   await ensureRepairTables(env);
   const r=await env.DB.prepare('SELECT * FROM atlas_system_health ORDER BY component').all();
   return json({operational:true,components:r.results||[]});
  }

  if(!url.pathname.startsWith('/api/crm/')) return env.ASSETS?env.ASSETS.fetch(request):new Response('Not found',{status:404});
  if(!env.DB) return json({operational:false,error:'D1 binding DB is not configured'},503);
  try{
   if(url.pathname==='/api/crm/health'){
    await env.DB.prepare('SELECT 1 AS ok').first();
    const schema=await env.DB.prepare("SELECT name FROM sqlite_schema WHERE type='table'").all();
    const existing=new Set((schema.results||[]).map(r=>r.name));
    const missing=Object.values(TYPES).filter(t=>!existing.has(t));
    return json({operational:missing.length===0,storage:'D1',service:'ATLAS CRM',missingTables:missing});
   }
   const type=url.pathname.split('/').filter(Boolean)[2];
   const table=TYPES[type];
   if(!table) return json({error:'Unknown CRM resource'},404);
   const org=request.headers.get('x-atlas-organization')||'atlas';
   const dba=request.headers.get('x-atlas-dba')||'default';
   if(request.method==='GET'){
    const r=await env.DB.prepare(`SELECT * FROM ${table} WHERE organization_id=? AND dba_id=? ORDER BY updated_at DESC`).bind(org,dba).all();
    return json({[type]:r.results||[]});
   }
   if(request.method==='POST'){
    const body=await request.json(); const recordId=id(); const now=new Date().toISOString();
    await env.DB.prepare(`INSERT INTO ${table}(id,organization_id,dba_id,name,email,status,stage,owner,amount,payload,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)`).bind(recordId,org,dba,body.name||body.title||'',body.email||'',body.status||'active',body.stage||'new',body.owner||'',body.amount||null,JSON.stringify(body),now,now).run();
    await env.DB.prepare('INSERT INTO audit_log(id,organization_id,dba_id,action,resource_type,resource_id,payload,created_at) VALUES(?,?,?,?,?,?,?,?)').bind(id(),org,dba,'create',type,recordId,JSON.stringify(body),now).run();
    return json({ok:true,id:recordId},201);
   }
   return json({error:'Method not allowed'},405);
  }catch(e){return json({operational:false,error:e.message},500)}
 }
};