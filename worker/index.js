// ATLAS Cloudflare-native service layer
// CRM routes are backed by D1. No traditional server is required.
const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json;charset=UTF-8','cache-control':'no-store'}});
const id=()=>crypto.randomUUID();
const TYPES={accounts:'crm_accounts',contacts:'crm_contacts',leads:'crm_leads',opportunities:'crm_opportunities',tasks:'crm_tasks',activity:'crm_activity'};
const EXPECTED_TABLES=[...Object.values(TYPES),'audit_log','atlas_system_health','atlas_repair_log'];
const SCOPE_RE=/^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$/;

function safeEqual(a,b){
 a=String(a||''); b=String(b||'');
 if(a.length!==b.length) return false;
 let diff=0;
 for(let i=0;i<a.length;i++) diff|=a.charCodeAt(i)^b.charCodeAt(i);
 return diff===0;
}

function authenticate(request,env){
 const configured=String(env.ATLAS_API_KEY||'');
 if(!configured) return {ok:false,status:503,error:'ATLAS_API_KEY is not configured'};
 const auth=request.headers.get('authorization')||'';
 const token=auth.startsWith('Bearer ')?auth.slice(7):'';
 if(!safeEqual(token,configured)) return {ok:false,status:401,error:'Unauthorized'};
 return {ok:true};
}

function resolveScope(request){
 const organizationId=(request.headers.get('x-atlas-organization')||'').trim();
 const dbaId=(request.headers.get('x-atlas-dba')||'').trim();
 const actor=(request.headers.get('x-atlas-actor')||'service').trim();
 if(!SCOPE_RE.test(organizationId)) return {ok:false,status:400,error:'Valid x-atlas-organization header is required'};
 if(!SCOPE_RE.test(dbaId)) return {ok:false,status:400,error:'Valid x-atlas-dba header is required'};
 if(!SCOPE_RE.test(actor)) return {ok:false,status:400,error:'Invalid x-atlas-actor header'};
 return {ok:true,organizationId,dbaId,actor};
}

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

async function ensureCrmTable(env,table){
 await env.DB.prepare(`CREATE TABLE IF NOT EXISTS ${table} (
   id TEXT PRIMARY KEY,
   organization_id TEXT NOT NULL,
   dba_id TEXT NOT NULL,
   name TEXT NOT NULL DEFAULT '',
   email TEXT DEFAULT '',
   status TEXT DEFAULT 'active',
   stage TEXT DEFAULT 'new',
   owner TEXT DEFAULT '',
   amount REAL,
   payload TEXT DEFAULT '{}',
   created_at TEXT NOT NULL,
   updated_at TEXT NOT NULL
 )`).run();
 await env.DB.prepare(`CREATE INDEX IF NOT EXISTS idx_${table}_scope ON ${table}(organization_id,dba_id,updated_at)`).run();
}

async function ensureCoreSchema(env){
 await ensureRepairTables(env);
 for(const table of Object.values(TYPES)) await ensureCrmTable(env,table);
 await env.DB.prepare(`CREATE TABLE IF NOT EXISTS audit_log (
   id TEXT PRIMARY KEY,
   organization_id TEXT NOT NULL,
   dba_id TEXT NOT NULL,
   actor TEXT NOT NULL DEFAULT 'system',
   action TEXT NOT NULL,
   resource_type TEXT NOT NULL,
   resource_id TEXT NOT NULL,
   payload TEXT DEFAULT '{}',
   created_at TEXT NOT NULL
 )`).run();
 const columns=await env.DB.prepare("PRAGMA table_info(audit_log)").all();
 if(!(columns.results||[]).some(c=>c.name==='actor')) await env.DB.prepare("ALTER TABLE audit_log ADD COLUMN actor TEXT NOT NULL DEFAULT 'system'").run();
 await env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_audit_scope ON audit_log(organization_id,dba_id,created_at)').run();
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
 const report={checkedAt:new Date().toISOString(),repairs:[],blocked:[]};
 try{
  await env.DB.prepare('SELECT 1 AS ok').first();
  await setHealth(env,'d1','healthy');
 }catch(e){
  report.blocked.push({component:'d1',error:e.message});
  return report;
 }
 try{
  await ensureCoreSchema(env);
  report.repairs.push({component:'schema',action:'ensure_core_schema',result:'ok'});
  await logRepair(env,'schema','ensure_core_schema','ok',{tables:EXPECTED_TABLES});
 }catch(e){
  report.blocked.push({component:'schema',error:e.message});
  await ensureRepairTables(env);
  await logRepair(env,'schema','ensure_core_schema','blocked',{error:e.message});
 }
 const schema=await env.DB.prepare("SELECT name FROM sqlite_schema WHERE type='table'").all();
 const existing=new Set((schema.results||[]).map(r=>r.name));
 const missing=EXPECTED_TABLES.filter(table=>!existing.has(table));
 if(missing.length){
  report.blocked.push({component:'schema',reason:'tables_missing_after_repair',tables:missing});
  await setHealth(env,'schema','blocked',{missing});
 }else await setHealth(env,'schema','healthy',{tables:EXPECTED_TABLES.length});
 try{
  const staleCutoff=new Date(Date.now()-24*60*60*1000).toISOString();
  const cleanup=await env.DB.prepare('DELETE FROM atlas_repair_log WHERE created_at < ?').bind(staleCutoff).run();
  report.repairs.push({component:'repair-log',action:'prune_old_entries',changed:cleanup.meta?.changes||0});
  await logRepair(env,'repair-log','prune_old_entries','ok',{changed:cleanup.meta?.changes||0});
 }catch(e){report.blocked.push({component:'repair-log',error:e.message});}
 const missingCrm=Object.values(TYPES).filter(t=>!existing.has(t));
 await setHealth(env,'crm',missingCrm.length?'blocked':'healthy',missingCrm.length?{missingTables:missingCrm}:{tables:Object.values(TYPES).length});
 await setHealth(env,'self-repair',report.blocked.length?'degraded':'healthy',{repairs:report.repairs.length,blocked:report.blocked.length});
 return report;
}

export default {
 async scheduled(controller,env,ctx){ctx.waitUntil(selfRepair(env));},
 async fetch(request,env){
  const url=new URL(request.url);
  if(url.pathname==='/api/system/self-repair' && request.method==='POST'){
   const auth=authenticate(request,env); if(!auth.ok) return json({operational:false,error:auth.error},auth.status);
   const report=await selfRepair(env); return json(report,report.error?503:200);
  }
  if(url.pathname==='/api/system/health' && request.method==='GET'){
   if(!env.DB) return json({operational:false,error:'D1 binding DB is not configured'},503);
   await ensureCoreSchema(env);
   const r=await env.DB.prepare('SELECT * FROM atlas_system_health ORDER BY component').all();
   return json({operational:true,components:r.results||[]});
  }
  if(!url.pathname.startsWith('/api/crm/')) return env.ASSETS?env.ASSETS.fetch(request):new Response('Not found',{status:404});
  if(!env.DB) return json({operational:false,error:'D1 binding DB is not configured'},503);
  try{
   await ensureCoreSchema(env);
   if(url.pathname==='/api/crm/health'){
    const schema=await env.DB.prepare("SELECT name FROM sqlite_schema WHERE type='table'").all();
    const existing=new Set((schema.results||[]).map(r=>r.name));
    const missing=Object.values(TYPES).filter(t=>!existing.has(t));
    return json({operational:missing.length===0,storage:'D1',service:'ATLAS CRM',authentication:env.ATLAS_API_KEY?'configured':'blocked',missingTables:missing});
   }
   const auth=authenticate(request,env); if(!auth.ok) return json({operational:false,error:auth.error},auth.status);
   const scope=resolveScope(request); if(!scope.ok) return json({error:scope.error},scope.status);
   const {organizationId:org,dbaId:dba,actor}=scope;
   const type=url.pathname.split('/').filter(Boolean)[2];
   const table=TYPES[type];
   if(!table) return json({error:'Unknown CRM resource'},404);
   if(request.method==='GET'){
    const r=await env.DB.prepare(`SELECT * FROM ${table} WHERE organization_id=? AND dba_id=? ORDER BY updated_at DESC`).bind(org,dba).all();
    return json({[type]:r.results||[],scope:{organizationId:org,dbaId:dba}});
   }
   if(request.method==='POST'){
    const body=await request.json(); const recordId=id(); const now=new Date().toISOString();
    await env.DB.prepare(`INSERT INTO ${table}(id,organization_id,dba_id,name,email,status,stage,owner,amount,payload,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)`).bind(recordId,org,dba,body.name||body.title||'',body.email||'',body.status||'active',body.stage||'new',body.owner||'',body.amount??null,JSON.stringify(body),now,now).run();
    await env.DB.prepare('INSERT INTO audit_log(id,organization_id,dba_id,actor,action,resource_type,resource_id,payload,created_at) VALUES(?,?,?,?,?,?,?,?,?)').bind(id(),org,dba,actor,'create',type,recordId,JSON.stringify(body),now).run();
    return json({ok:true,id:recordId,scope:{organizationId:org,dbaId:dba}},201);
   }
   return json({error:'Method not allowed'},405);
  }catch(e){return json({operational:false,error:e.message},500);}
 }
};