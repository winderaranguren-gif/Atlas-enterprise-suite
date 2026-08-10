// ATLAS Cloudflare-native service layer
// CRM routes are backed by D1. No traditional server is required.
const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json;charset=UTF-8','cache-control':'no-store'}});
const id=()=>crypto.randomUUID();
const TYPES={accounts:'crm_accounts',contacts:'crm_contacts',leads:'crm_leads',opportunities:'crm_opportunities',tasks:'crm_tasks',activity:'crm_activity'};
const EXPECTED_TABLES=[...Object.values(TYPES),'audit_log','atlas_system_health','atlas_repair_log','atlas_users','atlas_memberships','atlas_sessions'];

async function sha256(value){
 const bytes=new TextEncoder().encode(value);
 const digest=await crypto.subtle.digest('SHA-256',bytes);
 return [...new Uint8Array(digest)].map(b=>b.toString(16).padStart(2,'0')).join('');
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

async function ensureIdentitySchema(env){
 await env.DB.prepare(`CREATE TABLE IF NOT EXISTS atlas_users (
   id TEXT PRIMARY KEY,
   email TEXT NOT NULL UNIQUE,
   display_name TEXT DEFAULT '',
   status TEXT NOT NULL DEFAULT 'active',
   created_at TEXT NOT NULL,
   updated_at TEXT NOT NULL
 )`).run();
 await env.DB.prepare(`CREATE TABLE IF NOT EXISTS atlas_memberships (
   id TEXT PRIMARY KEY,
   user_id TEXT NOT NULL,
   organization_id TEXT NOT NULL,
   dba_id TEXT NOT NULL,
   role TEXT NOT NULL,
   status TEXT NOT NULL DEFAULT 'active',
   created_at TEXT NOT NULL,
   updated_at TEXT NOT NULL,
   UNIQUE(user_id,organization_id,dba_id)
 )`).run();
 await env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_membership_user_scope ON atlas_memberships(user_id,organization_id,dba_id,status)').run();
 await env.DB.prepare(`CREATE TABLE IF NOT EXISTS atlas_sessions (
   id TEXT PRIMARY KEY,
   user_id TEXT NOT NULL,
   token_hash TEXT NOT NULL UNIQUE,
   expires_at TEXT NOT NULL,
   revoked_at TEXT,
   created_at TEXT NOT NULL,
   last_seen_at TEXT NOT NULL
 )`).run();
 await env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_sessions_token ON atlas_sessions(token_hash,expires_at,revoked_at)').run();
}

async function ensureCoreSchema(env){
 await ensureRepairTables(env);
 await ensureIdentitySchema(env);
 for(const table of Object.values(TYPES)) await ensureCrmTable(env,table);
 await env.DB.prepare(`CREATE TABLE IF NOT EXISTS audit_log (
   id TEXT PRIMARY KEY,
   organization_id TEXT NOT NULL,
   dba_id TEXT NOT NULL,
   actor_user_id TEXT DEFAULT '',
   action TEXT NOT NULL,
   resource_type TEXT NOT NULL,
   resource_id TEXT NOT NULL,
   payload TEXT DEFAULT '{}',
   created_at TEXT NOT NULL
 )`).run();
 const columns=await env.DB.prepare("PRAGMA table_info(audit_log)").all();
 if(!(columns.results||[]).some(c=>c.name==='actor_user_id')) await env.DB.prepare("ALTER TABLE audit_log ADD COLUMN actor_user_id TEXT DEFAULT ''").run();
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

async function audit(env,scope,actor,action,resourceType,resourceId,payload={}){
 await env.DB.prepare('INSERT INTO audit_log(id,organization_id,dba_id,actor_user_id,action,resource_type,resource_id,payload,created_at) VALUES(?,?,?,?,?,?,?,?,?)')
  .bind(id(),scope.organization_id,scope.dba_id,actor?.user_id||'',action,resourceType,resourceId,JSON.stringify(payload),new Date().toISOString()).run();
}

async function authenticate(request,env){
 const auth=request.headers.get('authorization')||'';
 if(!auth.startsWith('Bearer ')) return {error:'Missing bearer token',status:401};
 const token=auth.slice(7).trim();
 if(!token) return {error:'Missing bearer token',status:401};
 const tokenHash=await sha256(token);
 const now=new Date().toISOString();
 const session=await env.DB.prepare(`SELECT s.id AS session_id,s.user_id,u.email,u.display_name
   FROM atlas_sessions s JOIN atlas_users u ON u.id=s.user_id
   WHERE s.token_hash=? AND s.revoked_at IS NULL AND s.expires_at>? AND u.status='active'`)
  .bind(tokenHash,now).first();
 if(!session) return {error:'Invalid or expired session',status:401};
 await env.DB.prepare('UPDATE atlas_sessions SET last_seen_at=? WHERE id=?').bind(now,session.session_id).run();
 return session;
}

async function authorizeScope(request,env,actor){
 const org=request.headers.get('x-atlas-organization');
 const dba=request.headers.get('x-atlas-dba');
 if(!org||!dba) return {error:'Organization and DBA scope are required',status:400};
 const membership=await env.DB.prepare(`SELECT role,organization_id,dba_id FROM atlas_memberships
   WHERE user_id=? AND organization_id=? AND dba_id=? AND status='active'`)
  .bind(actor.user_id,org,dba).first();
 if(!membership) return {error:'Forbidden for requested organization/DBA scope',status:403};
 return membership;
}

async function bootstrap(request,env){
 if(!env.ATLAS_BOOTSTRAP_KEY) return json({operational:false,error:'ATLAS_BOOTSTRAP_KEY is not configured'},503);
 const supplied=request.headers.get('x-atlas-bootstrap-key')||'';
 if(!supplied || supplied!==env.ATLAS_BOOTSTRAP_KEY) return json({error:'Unauthorized'},401);
 const body=await request.json();
 const email=String(body.email||'').trim().toLowerCase();
 const organizationId=String(body.organization_id||'').trim();
 const dbaId=String(body.dba_id||'').trim();
 if(!email||!organizationId||!dbaId) return json({error:'email, organization_id and dba_id are required'},400);
 const now=new Date().toISOString();
 let user=await env.DB.prepare('SELECT id FROM atlas_users WHERE email=?').bind(email).first();
 if(!user){
  user={id:id()};
  await env.DB.prepare('INSERT INTO atlas_users(id,email,display_name,status,created_at,updated_at) VALUES(?,?,?,?,?,?)')
   .bind(user.id,email,body.display_name||'', 'active',now,now).run();
 }
 await env.DB.prepare(`INSERT INTO atlas_memberships(id,user_id,organization_id,dba_id,role,status,created_at,updated_at)
   VALUES(?,?,?,?,?,'active',?,?) ON CONFLICT(user_id,organization_id,dba_id) DO UPDATE SET role=excluded.role,status='active',updated_at=excluded.updated_at`)
  .bind(id(),user.id,organizationId,dbaId,body.role||'admin',now,now).run();
 const rawToken=crypto.randomUUID()+crypto.randomUUID();
 const tokenHash=await sha256(rawToken);
 const expiresAt=new Date(Date.now()+12*60*60*1000).toISOString();
 const sessionId=id();
 await env.DB.prepare('INSERT INTO atlas_sessions(id,user_id,token_hash,expires_at,revoked_at,created_at,last_seen_at) VALUES(?,?,?,?,NULL,?,?)')
  .bind(sessionId,user.id,tokenHash,expiresAt,now,now).run();
 await audit(env,{organization_id:organizationId,dba_id:dbaId},{user_id:user.id},'bootstrap','session',sessionId,{role:body.role||'admin'});
 return json({ok:true,user_id:user.id,session_token:rawToken,expires_at:expiresAt,organization_id:organizationId,dba_id:dbaId},201);
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
 }else{
  await setHealth(env,'schema','healthy',{tables:EXPECTED_TABLES.length});
 }

 try{
  const staleCutoff=new Date(Date.now()-24*60*60*1000).toISOString();
  const cleanup=await env.DB.prepare('DELETE FROM atlas_repair_log WHERE created_at < ?').bind(staleCutoff).run();
  report.repairs.push({component:'repair-log',action:'prune_old_entries',changed:cleanup.meta?.changes||0});
  await logRepair(env,'repair-log','prune_old_entries','ok',{changed:cleanup.meta?.changes||0});
 }catch(e){
  report.blocked.push({component:'repair-log',error:e.message});
 }

 const missingCrm=Object.values(TYPES).filter(t=>!existing.has(t));
 if(missingCrm.length===0) await setHealth(env,'crm','healthy',{tables:Object.values(TYPES).length});
 else await setHealth(env,'crm','blocked',{missingTables:missingCrm});

 await setHealth(env,'identity',missing.some(t=>['atlas_users','atlas_memberships','atlas_sessions'].includes(t))?'blocked':'healthy');
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
   await ensureCoreSchema(env);
   const r=await env.DB.prepare('SELECT * FROM atlas_system_health ORDER BY component').all();
   return json({operational:true,components:r.results||[]});
  }
  if(!env.DB && url.pathname.startsWith('/api/')) return json({operational:false,error:'D1 binding DB is not configured'},503);

  try{
   if(url.pathname==='/api/auth/bootstrap' && request.method==='POST'){
    await ensureCoreSchema(env);
    return bootstrap(request,env);
   }

   if(!url.pathname.startsWith('/api/crm/')) return env.ASSETS?env.ASSETS.fetch(request):new Response('Not found',{status:404});
   await ensureCoreSchema(env);
   if(url.pathname==='/api/crm/health'){
    const schema=await env.DB.prepare("SELECT name FROM sqlite_schema WHERE type='table'").all();
    const existing=new Set((schema.results||[]).map(r=>r.name));
    const missing=Object.values(TYPES).filter(t=>!existing.has(t));
    return json({operational:missing.length===0,storage:'D1',service:'ATLAS CRM',missingTables:missing});
   }

   const actor=await authenticate(request,env);
   if(actor.error) return json({error:actor.error},actor.status);
   const scope=await authorizeScope(request,env,actor);
   if(scope.error) return json({error:scope.error},scope.status);

   const type=url.pathname.split('/').filter(Boolean)[2];
   const table=TYPES[type];
   if(!table) return json({error:'Unknown CRM resource'},404);
   const org=scope.organization_id;
   const dba=scope.dba_id;
   if(request.method==='GET'){
    const r=await env.DB.prepare(`SELECT * FROM ${table} WHERE organization_id=? AND dba_id=? ORDER BY updated_at DESC`).bind(org,dba).all();
    await audit(env,scope,actor,'read',type,'collection',{count:(r.results||[]).length});
    return json({[type]:r.results||[]});
   }
   if(request.method==='POST'){
    const body=await request.json(); const recordId=id(); const now=new Date().toISOString();
    await env.DB.prepare(`INSERT INTO ${table}(id,organization_id,dba_id,name,email,status,stage,owner,amount,payload,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)`).bind(recordId,org,dba,body.name||body.title||'',body.email||'',body.status||'active',body.stage||'new',body.owner||'',body.amount||null,JSON.stringify(body),now,now).run();
    await audit(env,scope,actor,'create',type,recordId,body);
    return json({ok:true,id:recordId},201);
   }
   return json({error:'Method not allowed'},405);
  }catch(e){return json({operational:false,error:e.message},500)}
 }
};