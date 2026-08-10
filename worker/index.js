const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json;charset=UTF-8','cache-control':'no-store'}});
const id=()=>crypto.randomUUID();
const TYPES={accounts:'crm_accounts',contacts:'crm_contacts',leads:'crm_leads',opportunities:'crm_opportunities',tasks:'crm_tasks',activity:'crm_activity'};
const READ_ROLES=new Set(['owner','admin','editor','viewer','auditor']);
const WRITE_ROLES=new Set(['owner','admin','editor']);

async function sha256(value){
 const bytes=new TextEncoder().encode(value);
 const digest=await crypto.subtle.digest('SHA-256',bytes);
 return [...new Uint8Array(digest)].map(b=>b.toString(16).padStart(2,'0')).join('');
}

async function ensureCoreSchema(env){
 for(const table of Object.values(TYPES)){
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
 await env.DB.prepare(`CREATE TABLE IF NOT EXISTS atlas_users (
  id TEXT PRIMARY KEY,email TEXT NOT NULL UNIQUE,display_name TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'active',created_at TEXT NOT NULL,updated_at TEXT NOT NULL
 )`).run();
 await env.DB.prepare(`CREATE TABLE IF NOT EXISTS atlas_memberships (
  id TEXT PRIMARY KEY,user_id TEXT NOT NULL,organization_id TEXT NOT NULL,dba_id TEXT NOT NULL,
  role TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'active',created_at TEXT NOT NULL,updated_at TEXT NOT NULL,
  UNIQUE(user_id,organization_id,dba_id)
 )`).run();
 await env.DB.prepare(`CREATE TABLE IF NOT EXISTS atlas_sessions (
  id TEXT PRIMARY KEY,user_id TEXT NOT NULL,token_hash TEXT NOT NULL UNIQUE,expires_at TEXT NOT NULL,
  revoked_at TEXT,created_at TEXT NOT NULL,last_seen_at TEXT NOT NULL
 )`).run();
 await env.DB.prepare(`CREATE TABLE IF NOT EXISTS atlas_security_events (
  id TEXT PRIMARY KEY,user_id TEXT NOT NULL DEFAULT '',organization_id TEXT NOT NULL DEFAULT '',dba_id TEXT NOT NULL DEFAULT '',
  action TEXT NOT NULL,resource_type TEXT NOT NULL,resource_id TEXT NOT NULL DEFAULT '',decision TEXT NOT NULL,reason TEXT NOT NULL,created_at TEXT NOT NULL
 )`).run();
 await env.DB.prepare(`CREATE TABLE IF NOT EXISTS atlas_audit_events (
  id TEXT PRIMARY KEY,organization_id TEXT NOT NULL,dba_id TEXT NOT NULL,actor_user_id TEXT NOT NULL,
  action TEXT NOT NULL,resource_type TEXT NOT NULL,resource_id TEXT NOT NULL,payload TEXT NOT NULL DEFAULT '{}',created_at TEXT NOT NULL
 )`).run();
}

async function securityEvent(env,{userId='',org='',dba='',action,resourceType,resourceId='',decision,reason}){
 await env.DB.prepare(`INSERT INTO atlas_security_events(id,user_id,organization_id,dba_id,action,resource_type,resource_id,decision,reason,created_at)
 VALUES(?,?,?,?,?,?,?,?,?,?)`).bind(id(),userId,org,dba,action,resourceType,resourceId,decision,reason,new Date().toISOString()).run();
}

async function audit(env,{org,dba,userId,action,resourceType,resourceId,payload={}}){
 await env.DB.prepare(`INSERT INTO atlas_audit_events(id,organization_id,dba_id,actor_user_id,action,resource_type,resource_id,payload,created_at)
 VALUES(?,?,?,?,?,?,?,?,?)`).bind(id(),org,dba,userId,action,resourceType,resourceId,JSON.stringify(payload),new Date().toISOString()).run();
}

async function authenticate(request,env){
 const header=request.headers.get('authorization')||'';
 if(!header.startsWith('Bearer ')) return null;
 const token=header.slice(7).trim();
 if(!token) return null;
 const tokenHash=await sha256(token);
 const now=new Date().toISOString();
 const session=await env.DB.prepare(`SELECT s.id AS session_id,s.user_id,u.email,u.display_name
 FROM atlas_sessions s JOIN atlas_users u ON u.id=s.user_id
 WHERE s.token_hash=? AND s.revoked_at IS NULL AND s.expires_at>? AND u.status='active'`).bind(tokenHash,now).first();
 if(session) await env.DB.prepare('UPDATE atlas_sessions SET last_seen_at=? WHERE id=?').bind(now,session.session_id).run();
 return session||null;
}

async function authorize(request,env,mode='read'){
 const actor=await authenticate(request,env);
 const org=request.headers.get('x-atlas-organization')||'';
 const dba=request.headers.get('x-atlas-dba')||'';
 if(!actor){
  await securityEvent(env,{org,dba,action:mode,resourceType:'scope',decision:'deny',reason:'invalid_session'});
  return {error:json({error:'Unauthorized'},401)};
 }
 if(!org||!dba){
  await securityEvent(env,{userId:actor.user_id,org,dba,action:mode,resourceType:'scope',decision:'deny',reason:'missing_scope'});
  return {error:json({error:'Organization and DBA scope are required'},400)};
 }
 const membership=await env.DB.prepare(`SELECT role,organization_id,dba_id FROM atlas_memberships
 WHERE user_id=? AND organization_id=? AND dba_id=? AND status='active'`).bind(actor.user_id,org,dba).first();
 if(!membership){
  await securityEvent(env,{userId:actor.user_id,org,dba,action:mode,resourceType:'scope',decision:'deny',reason:'membership_missing'});
  return {error:json({error:'Forbidden'},403)};
 }
 const role=String(membership.role||'').toLowerCase();
 const allowed=mode==='read'?READ_ROLES.has(role):WRITE_ROLES.has(role);
 if(!allowed){
  await securityEvent(env,{userId:actor.user_id,org,dba,action:mode,resourceType:'scope',decision:'deny',reason:`role_${role}_not_allowed`});
  return {error:json({error:'Forbidden for role'},403)};
 }
 await securityEvent(env,{userId:actor.user_id,org,dba,action:mode,resourceType:'scope',decision:'allow',reason:`role_${role}`});
 return {actor,org,dba,role};
}

async function bootstrap(request,env){
 if(!env.ATLAS_BOOTSTRAP_TOKEN) return json({operational:false,error:'ATLAS_BOOTSTRAP_TOKEN is not configured'},503);
 const supplied=request.headers.get('x-atlas-bootstrap-token')||'';
 if(!supplied||supplied!==env.ATLAS_BOOTSTRAP_TOKEN) return json({error:'Unauthorized'},401);
 const body=await request.json();
 const email=String(body.email||'').trim().toLowerCase();
 const org=String(body.organization_id||'').trim();
 const dba=String(body.dba_id||'').trim();
 if(!email||!org||!dba) return json({error:'email, organization_id and dba_id are required'},400);
 const now=new Date().toISOString();
 let user=await env.DB.prepare('SELECT id FROM atlas_users WHERE email=?').bind(email).first();
 if(!user){
  user={id:id()};
  await env.DB.prepare('INSERT INTO atlas_users(id,email,display_name,status,created_at,updated_at) VALUES(?,?,?,?,?,?)')
   .bind(user.id,email,String(body.display_name||''),'active',now,now).run();
 }
 await env.DB.prepare(`INSERT INTO atlas_memberships(id,user_id,organization_id,dba_id,role,status,created_at,updated_at)
 VALUES(?,?,?,?,?,'active',?,?) ON CONFLICT(user_id,organization_id,dba_id) DO UPDATE SET role='owner',status='active',updated_at=excluded.updated_at`)
  .bind(id(),user.id,org,dba,'owner',now,now).run();
 const rawToken=crypto.randomUUID()+crypto.randomUUID();
 const tokenHash=await sha256(rawToken);
 const expiresAt=new Date(Date.now()+12*60*60*1000).toISOString();
 await env.DB.prepare('INSERT INTO atlas_sessions(id,user_id,token_hash,expires_at,revoked_at,created_at,last_seen_at) VALUES(?,?,?,?,NULL,?,?)')
  .bind(id(),user.id,tokenHash,expiresAt,now,now).run();
 await audit(env,{org,dba,userId:user.id,action:'bootstrap',resourceType:'user',resourceId:user.id,payload:{email}});
 return json({ok:true,user_id:user.id,session_token:rawToken,expires_at:expiresAt,organization_id:org,dba_id:dba},201);
}

export default {
 async fetch(request,env){
  const url=new URL(request.url);
  if(!url.pathname.startsWith('/api/')) return env.ASSETS?env.ASSETS.fetch(request):new Response('Not found',{status:404});
  if(!env.DB) return json({operational:false,error:'D1 binding DB is not configured'},503);
  try{
   await ensureCoreSchema(env);
   if(url.pathname==='/api/system/health'&&request.method==='GET'){
    const r=await env.DB.prepare("SELECT name FROM sqlite_schema WHERE type='table'").all();
    const names=new Set((r.results||[]).map(x=>x.name));
    const required=[...Object.values(TYPES),'atlas_users','atlas_memberships','atlas_sessions','atlas_security_events','atlas_audit_events'];
    const missing=required.filter(x=>!names.has(x));
    return json({operational:missing.length===0,service:'ATLAS Commercial Pilot Core',storage:'D1',missingTables:missing});
   }
   if(url.pathname==='/api/admin/bootstrap'&&request.method==='POST') return bootstrap(request,env);
   if(url.pathname==='/api/auth/logout'&&request.method==='POST'){
    const actor=await authenticate(request,env); if(!actor) return json({error:'Unauthorized'},401);
    await env.DB.prepare('UPDATE atlas_sessions SET revoked_at=? WHERE id=?').bind(new Date().toISOString(),actor.session_id).run();
    return json({ok:true});
   }
   if(url.pathname==='/api/users'&&request.method==='GET'){
    const auth=await authorize(request,env,'read'); if(auth.error) return auth.error;
    const r=await env.DB.prepare(`SELECT u.id,u.email,u.display_name,m.role,m.status FROM atlas_memberships m JOIN atlas_users u ON u.id=m.user_id
     WHERE m.organization_id=? AND m.dba_id=? ORDER BY u.email`).bind(auth.org,auth.dba).all();
    return json({users:r.results||[]});
   }
   if(url.pathname==='/api/audit'&&request.method==='GET'){
    const auth=await authorize(request,env,'read'); if(auth.error) return auth.error;
    const r=await env.DB.prepare('SELECT * FROM atlas_audit_events WHERE organization_id=? AND dba_id=? ORDER BY created_at DESC LIMIT 200').bind(auth.org,auth.dba).all();
    return json({events:r.results||[]});
   }
   if(url.pathname.startsWith('/api/crm/')){
    if(url.pathname==='/api/crm/health') return json({operational:true,storage:'D1',service:'ATLAS CRM'});
    const type=url.pathname.split('/').filter(Boolean)[2];
    const table=TYPES[type]; if(!table) return json({error:'Unknown CRM resource'},404);
    const mode=request.method==='GET'?'read':'write';
    const auth=await authorize(request,env,mode); if(auth.error) return auth.error;
    if(request.method==='GET'){
     const r=await env.DB.prepare(`SELECT * FROM ${table} WHERE organization_id=? AND dba_id=? ORDER BY updated_at DESC`).bind(auth.org,auth.dba).all();
     await audit(env,{org:auth.org,dba:auth.dba,userId:auth.actor.user_id,action:'read',resourceType:type,resourceId:'collection',payload:{count:(r.results||[]).length}});
     return json({[type]:r.results||[]});
    }
    if(request.method==='POST'){
     const body=await request.json(); const recordId=id(); const now=new Date().toISOString();
     await env.DB.prepare(`INSERT INTO ${table}(id,organization_id,dba_id,name,email,status,stage,owner,amount,payload,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)`)
      .bind(recordId,auth.org,auth.dba,body.name||body.title||'',body.email||'',body.status||'active',body.stage||'new',body.owner||'',body.amount??null,JSON.stringify(body),now,now).run();
     await audit(env,{org:auth.org,dba:auth.dba,userId:auth.actor.user_id,action:'create',resourceType:type,resourceId:recordId,payload:body});
     return json({ok:true,id:recordId},201);
    }
    return json({error:'Method not allowed'},405);
   }
   return json({error:'Not found'},404);
  }catch(e){ return json({operational:false,error:e.message},500); }
 }
};
