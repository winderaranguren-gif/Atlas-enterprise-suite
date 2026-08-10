// ATLAS Cloudflare-native service layer
const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json;charset=UTF-8'}});
const id=()=>crypto.randomUUID();
const CRM_TYPES={accounts:'crm_accounts',contacts:'crm_contacts',leads:'crm_leads',opportunities:'crm_opportunities',tasks:'crm_tasks',activity:'crm_activity'};
const ROLE_PERMISSIONS={
 owner:['*'],
 admin:['crm.read','crm.write','users.read','users.manage','audit.read'],
 manager:['crm.read','crm.write','users.read','audit.read'],
 sales:['crm.read','crm.write'],
 viewer:['crm.read']
};
const EXPECTED_TABLES=[...Object.values(CRM_TYPES),'audit_log','atlas_users','atlas_memberships','atlas_sessions','atlas_system_health','atlas_repair_log'];

async function sha256(value){
 const bytes=new TextEncoder().encode(value);
 const digest=await crypto.subtle.digest('SHA-256',bytes);
 return [...new Uint8Array(digest)].map(b=>b.toString(16).padStart(2,'0')).join('');
}
function newSessionToken(){return `${crypto.randomUUID()}${crypto.randomUUID()}`.replaceAll('-','')}
function bearerToken(request){const value=request.headers.get('authorization')||'';return value.startsWith('Bearer ')?value.slice(7).trim():''}

async function ensureRepairTables(env){
 await env.DB.prepare(`CREATE TABLE IF NOT EXISTS atlas_system_health (component TEXT PRIMARY KEY,status TEXT NOT NULL,details TEXT DEFAULT '{}',checked_at TEXT NOT NULL)`).run();
 await env.DB.prepare(`CREATE TABLE IF NOT EXISTS atlas_repair_log (id TEXT PRIMARY KEY,component TEXT NOT NULL,action TEXT NOT NULL,result TEXT NOT NULL,details TEXT DEFAULT '{}',created_at TEXT NOT NULL)`).run();
}
async function ensureCrmTable(env,table){
 await env.DB.prepare(`CREATE TABLE IF NOT EXISTS ${table} (id TEXT PRIMARY KEY,organization_id TEXT NOT NULL,dba_id TEXT NOT NULL,name TEXT NOT NULL DEFAULT '',email TEXT DEFAULT '',status TEXT DEFAULT 'active',stage TEXT DEFAULT 'new',owner TEXT DEFAULT '',amount REAL,payload TEXT DEFAULT '{}',created_at TEXT NOT NULL,updated_at TEXT NOT NULL)`).run();
 await env.DB.prepare(`CREATE INDEX IF NOT EXISTS idx_${table}_scope ON ${table}(organization_id,dba_id,updated_at)`).run();
}
async function ensureIdentitySchema(env){
 await env.DB.prepare(`CREATE TABLE IF NOT EXISTS atlas_users (id TEXT PRIMARY KEY,email TEXT NOT NULL UNIQUE,name TEXT NOT NULL DEFAULT '',status TEXT NOT NULL DEFAULT 'active',created_at TEXT NOT NULL,updated_at TEXT NOT NULL)`).run();
 await env.DB.prepare(`CREATE TABLE IF NOT EXISTS atlas_memberships (id TEXT PRIMARY KEY,user_id TEXT NOT NULL,organization_id TEXT NOT NULL,dba_id TEXT NOT NULL,role TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'active',created_at TEXT NOT NULL,updated_at TEXT NOT NULL,UNIQUE(user_id,organization_id,dba_id),FOREIGN KEY(user_id) REFERENCES atlas_users(id))`).run();
 await env.DB.prepare(`CREATE TABLE IF NOT EXISTS atlas_sessions (id TEXT PRIMARY KEY,user_id TEXT NOT NULL,token_hash TEXT NOT NULL UNIQUE,created_at TEXT NOT NULL,expires_at TEXT NOT NULL,revoked_at TEXT DEFAULT NULL,FOREIGN KEY(user_id) REFERENCES atlas_users(id))`).run();
 await env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_membership_scope ON atlas_memberships(organization_id,dba_id,user_id,status)').run();
 await env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_sessions_user ON atlas_sessions(user_id,expires_at,revoked_at)').run();
}
async function ensureCoreSchema(env){
 await ensureRepairTables(env);await ensureIdentitySchema(env);
 for(const table of Object.values(CRM_TYPES))await ensureCrmTable(env,table);
 await env.DB.prepare(`CREATE TABLE IF NOT EXISTS audit_log (id TEXT PRIMARY KEY,organization_id TEXT NOT NULL,dba_id TEXT NOT NULL,actor_user_id TEXT DEFAULT '',action TEXT NOT NULL,resource_type TEXT NOT NULL,resource_id TEXT NOT NULL,payload TEXT DEFAULT '{}',created_at TEXT NOT NULL)`).run();
 try{await env.DB.prepare("ALTER TABLE audit_log ADD COLUMN actor_user_id TEXT DEFAULT ''").run()}catch{}
 await env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_audit_scope ON audit_log(organization_id,dba_id,created_at)').run();
}
async function logRepair(env,component,action,result,details={}){await env.DB.prepare('INSERT INTO atlas_repair_log(id,component,action,result,details,created_at) VALUES(?,?,?,?,?,?)').bind(id(),component,action,result,JSON.stringify(details),new Date().toISOString()).run()}
async function setHealth(env,component,status,details={}){const now=new Date().toISOString();await env.DB.prepare(`INSERT INTO atlas_system_health(component,status,details,checked_at) VALUES(?,?,?,?) ON CONFLICT(component) DO UPDATE SET status=excluded.status,details=excluded.details,checked_at=excluded.checked_at`).bind(component,status,JSON.stringify(details),now).run()}
function scopeFrom(request){return {organizationId:request.headers.get('x-atlas-organization')||'',dbaId:request.headers.get('x-atlas-dba')||''}}
function hasPermission(role,permission){const granted=ROLE_PERMISSIONS[role]||[];return granted.includes('*')||granted.includes(permission)}
async function authorize(env,request,permission){
 const scope=scopeFrom(request),token=bearerToken(request);
 if(!scope.organizationId||!scope.dbaId||!token)return {ok:false,status:401,error:'ATLAS session token and organization/DBA scope headers are required'};
 const tokenHash=await sha256(token),now=new Date().toISOString();
 const membership=await env.DB.prepare(`SELECT s.user_id,m.role,m.status,m.dba_id AS membership_dba,u.email,u.name,u.status AS user_status FROM atlas_sessions s JOIN atlas_users u ON u.id=s.user_id JOIN atlas_memberships m ON m.user_id=s.user_id WHERE s.token_hash=? AND s.revoked_at IS NULL AND s.expires_at>? AND m.organization_id=? AND (m.dba_id=? OR m.dba_id='*') ORDER BY CASE WHEN m.dba_id=? THEN 0 ELSE 1 END LIMIT 1`).bind(tokenHash,now,scope.organizationId,scope.dbaId,scope.dbaId).first();
 if(!membership||membership.status!=='active'||membership.user_status!=='active')return {ok:false,status:403,error:'No active ATLAS session and membership for this organization/DBA scope'};
 if(!hasPermission(membership.role,permission))return {ok:false,status:403,error:`Permission denied: ${permission}`};
 return {ok:true,scope,identity:{userId:membership.user_id,email:membership.email,name:membership.name,role:membership.role,membershipDba:membership.membership_dba}};
}
async function createSession(env,userId,hours=12){
 const token=newSessionToken(),tokenHash=await sha256(token),createdAt=new Date().toISOString(),expiresAt=new Date(Date.now()+hours*60*60*1000).toISOString();
 await env.DB.prepare('INSERT INTO atlas_sessions(id,user_id,token_hash,created_at,expires_at,revoked_at) VALUES(?,?,?,?,?,NULL)').bind(id(),userId,tokenHash,createdAt,expiresAt).run();
 return {token,expiresAt};
}
async function audit(env,auth,action,resourceType,resourceId,payload={}){await env.DB.prepare('INSERT INTO audit_log(id,organization_id,dba_id,actor_user_id,action,resource_type,resource_id,payload,created_at) VALUES(?,?,?,?,?,?,?,?,?)').bind(id(),auth.scope.organizationId,auth.scope.dbaId,auth.identity.userId,action,resourceType,resourceId,JSON.stringify(payload),new Date().toISOString()).run()}
async function selfRepair(env){
 if(!env.DB)return {operational:false,error:'D1 binding DB is not configured'};
 const report={checkedAt:new Date().toISOString(),repairs:[],blocked:[]};
 try{await env.DB.prepare('SELECT 1 AS ok').first();await setHealth(env,'d1','healthy')}catch(e){report.blocked.push({component:'d1',error:e.message});return report}
 try{await ensureCoreSchema(env);report.repairs.push({component:'schema',action:'ensure_core_schema',result:'ok'});await logRepair(env,'schema','ensure_core_schema','ok',{tables:EXPECTED_TABLES})}catch(e){report.blocked.push({component:'schema',error:e.message});await ensureRepairTables(env);await logRepair(env,'schema','ensure_core_schema','blocked',{error:e.message})}
 const schema=await env.DB.prepare("SELECT name FROM sqlite_schema WHERE type='table'").all();const existing=new Set((schema.results||[]).map(r=>r.name));const missing=EXPECTED_TABLES.filter(t=>!existing.has(t));
 await setHealth(env,'schema',missing.length?'blocked':'healthy',missing.length?{missing}:{tables:EXPECTED_TABLES.length});
 await setHealth(env,'identity',existing.has('atlas_users')&&existing.has('atlas_memberships')&&existing.has('atlas_sessions')?'healthy':'blocked',{});
 await setHealth(env,'crm',Object.values(CRM_TYPES).every(t=>existing.has(t))?'healthy':'blocked',{});
 await setHealth(env,'self-repair',report.blocked.length?'degraded':'healthy',{repairs:report.repairs.length,blocked:report.blocked.length});return report;
}
async function bootstrap(env,request){
 if(!env.ATLAS_BOOTSTRAP_TOKEN)return json({operational:false,error:'ATLAS_BOOTSTRAP_TOKEN secret is not configured'},503);
 if(bearerToken(request)!==env.ATLAS_BOOTSTRAP_TOKEN)return json({error:'Invalid bootstrap credential'},401);
 const body=await request.json(),email=String(body.email||'').trim().toLowerCase(),name=String(body.name||'').trim(),organizationId=String(body.organizationId||'').trim(),dbaId=String(body.dbaId||'*').trim();
 if(!email||!organizationId)return json({error:'email and organizationId are required'},400);
 const now=new Date().toISOString();let user=await env.DB.prepare('SELECT id FROM atlas_users WHERE email=?').bind(email).first(),userId=user?.id;
 if(!userId){userId=id();await env.DB.prepare('INSERT INTO atlas_users(id,email,name,status,created_at,updated_at) VALUES(?,?,?,?,?,?)').bind(userId,email,name,'active',now,now).run()}
 await env.DB.prepare(`INSERT INTO atlas_memberships(id,user_id,organization_id,dba_id,role,status,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?) ON CONFLICT(user_id,organization_id,dba_id) DO UPDATE SET role='owner',status='active',updated_at=excluded.updated_at`).bind(id(),userId,organizationId,dbaId,'owner','active',now,now).run();
 await env.DB.prepare('UPDATE atlas_sessions SET revoked_at=? WHERE user_id=? AND revoked_at IS NULL').bind(now,userId).run();
 const session=await createSession(env,userId);
 return json({ok:true,userId,organizationId,dbaId,role:'owner',sessionToken:session.token,expiresAt:session.expiresAt},201);
}

export default {
 async scheduled(controller,env,ctx){ctx.waitUntil(selfRepair(env))},
 async fetch(request,env){
  const url=new URL(request.url);
  if(!env.DB&&url.pathname.startsWith('/api/'))return json({operational:false,error:'D1 binding DB is not configured'},503);
  if(url.pathname==='/api/system/self-repair'&&request.method==='POST'){const report=await selfRepair(env);return json(report,report.error?503:200)}
  if(url.pathname==='/api/system/health'&&request.method==='GET'){await ensureCoreSchema(env);const r=await env.DB.prepare('SELECT * FROM atlas_system_health ORDER BY component').all();return json({operational:true,components:r.results||[]})}
  if(url.pathname==='/api/admin/bootstrap'&&request.method==='POST'){await ensureCoreSchema(env);return bootstrap(env,request)}
  if(url.pathname==='/api/users/health'&&request.method==='GET'){await ensureCoreSchema(env);const counts=await env.DB.prepare(`SELECT (SELECT COUNT(*) FROM atlas_users) users,(SELECT COUNT(*) FROM atlas_memberships) memberships,(SELECT COUNT(*) FROM atlas_sessions WHERE revoked_at IS NULL AND expires_at>datetime('now')) activeSessions`).first();return json({operational:true,storage:'D1',service:'ATLAS Identity',...counts})}
  if(url.pathname==='/api/users'&&request.method==='GET'){
   await ensureCoreSchema(env);const auth=await authorize(env,request,'users.read');if(!auth.ok)return json({error:auth.error},auth.status);
   const r=await env.DB.prepare(`SELECT u.id,u.email,u.name,u.status,m.role,m.dba_id FROM atlas_memberships m JOIN atlas_users u ON u.id=m.user_id WHERE m.organization_id=? AND (m.dba_id=? OR m.dba_id='*') ORDER BY u.name,u.email`).bind(auth.scope.organizationId,auth.scope.dbaId).all();return json({users:r.results||[]});
  }
  if(url.pathname==='/api/users'&&request.method==='POST'){
   await ensureCoreSchema(env);const auth=await authorize(env,request,'users.manage');if(!auth.ok)return json({error:auth.error},auth.status);const body=await request.json(),email=String(body.email||'').trim().toLowerCase(),role=String(body.role||'viewer'),targetDba=String(body.dbaId||auth.scope.dbaId);
   if(!email||!ROLE_PERMISSIONS[role])return json({error:'Valid email and role are required'},400);
   const mayCrossDba=auth.identity.role==='owner'&&auth.identity.membershipDba==='*';if(targetDba!==auth.scope.dbaId&&!mayCrossDba)return json({error:'Cannot grant membership outside the authenticated DBA scope'},403);
   const now=new Date().toISOString();let user=await env.DB.prepare('SELECT id FROM atlas_users WHERE email=?').bind(email).first(),userId=user?.id;
   if(!userId){userId=id();await env.DB.prepare('INSERT INTO atlas_users(id,email,name,status,created_at,updated_at) VALUES(?,?,?,?,?,?)').bind(userId,email,String(body.name||''),'active',now,now).run()}
   await env.DB.prepare(`INSERT INTO atlas_memberships(id,user_id,organization_id,dba_id,role,status,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?) ON CONFLICT(user_id,organization_id,dba_id) DO UPDATE SET role=excluded.role,status='active',updated_at=excluded.updated_at`).bind(id(),userId,auth.scope.organizationId,targetDba,role,'active',now,now).run();await audit(env,auth,'grant_membership','user',userId,{email,role,dbaId:targetDba});return json({ok:true,userId,role,dbaId:targetDba},201);
  }
  if(url.pathname==='/api/session'&&request.method==='DELETE'){
   await ensureCoreSchema(env);const auth=await authorize(env,request,'crm.read');if(!auth.ok)return json({error:auth.error},auth.status);const tokenHash=await sha256(bearerToken(request));await env.DB.prepare('UPDATE atlas_sessions SET revoked_at=? WHERE token_hash=? AND user_id=?').bind(new Date().toISOString(),tokenHash,auth.identity.userId).run();await audit(env,auth,'revoke_session','session',auth.identity.userId,{});return json({ok:true});
  }
  if(url.pathname==='/api/audit'&&request.method==='GET'){
   await ensureCoreSchema(env);const auth=await authorize(env,request,'audit.read');if(!auth.ok)return json({error:auth.error},auth.status);const r=await env.DB.prepare('SELECT * FROM audit_log WHERE organization_id=? AND dba_id=? ORDER BY created_at DESC LIMIT 250').bind(auth.scope.organizationId,auth.scope.dbaId).all();return json({audit:r.results||[]});
  }
  if(!url.pathname.startsWith('/api/crm/'))return env.ASSETS?env.ASSETS.fetch(request):new Response('Not found',{status:404});
  try{
   await ensureCoreSchema(env);
   if(url.pathname==='/api/crm/health'){const schema=await env.DB.prepare("SELECT name FROM sqlite_schema WHERE type='table'").all();const existing=new Set((schema.results||[]).map(r=>r.name));const missing=Object.values(CRM_TYPES).filter(t=>!existing.has(t));return json({operational:missing.length===0,storage:'D1',service:'ATLAS CRM',missingTables:missing})}
   const type=url.pathname.split('/').filter(Boolean)[2],table=CRM_TYPES[type];if(!table)return json({error:'Unknown CRM resource'},404);
   const permission=request.method==='GET'?'crm.read':request.method==='POST'?'crm.write':null;if(!permission)return json({error:'Method not allowed'},405);const auth=await authorize(env,request,permission);if(!auth.ok)return json({error:auth.error},auth.status);
   const {organizationId:org,dbaId:dba}=auth.scope;
   if(request.method==='GET'){const r=await env.DB.prepare(`SELECT * FROM ${table} WHERE organization_id=? AND dba_id=? ORDER BY updated_at DESC`).bind(org,dba).all();return json({[type]:r.results||[]})}
   const body=await request.json(),recordId=id(),now=new Date().toISOString();await env.DB.prepare(`INSERT INTO ${table}(id,organization_id,dba_id,name,email,status,stage,owner,amount,payload,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)`).bind(recordId,org,dba,body.name||body.title||'',body.email||'',body.status||'active',body.stage||'new',body.owner||'',body.amount||null,JSON.stringify(body),now,now).run();await audit(env,auth,'create',type,recordId,body);return json({ok:true,id:recordId},201);
  }catch(e){return json({operational:false,error:e.message},500)}
 }
};