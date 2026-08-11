const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json;charset=UTF-8','cache-control':'no-store'}});
const id=()=>crypto.randomUUID();
const ITERATIONS=310000;
const enc=new TextEncoder();

const toHex=(bytes)=>[...bytes].map(b=>b.toString(16).padStart(2,'0')).join('');
const fromHex=(hex)=>new Uint8Array((hex.match(/.{1,2}/g)||[]).map(x=>parseInt(x,16)));
const randomHex=(n)=>{const b=new Uint8Array(n);crypto.getRandomValues(b);return toHex(b);};
async function sha256(value){const d=await crypto.subtle.digest('SHA-256',enc.encode(value));return toHex(new Uint8Array(d));}
async function derive(password,saltHex,iterations=ITERATIONS){
  const material=await crypto.subtle.importKey('raw',enc.encode(password),'PBKDF2',false,['deriveBits']);
  const bits=await crypto.subtle.deriveBits({name:'PBKDF2',hash:'SHA-256',salt:fromHex(saltHex),iterations},material,256);
  return toHex(new Uint8Array(bits));
}
function safeEqualHex(a,b){
  if(typeof a!=='string'||typeof b!=='string'||a.length!==b.length) return false;
  let diff=0; for(let i=0;i<a.length;i++) diff|=a.charCodeAt(i)^b.charCodeAt(i); return diff===0;
}
function passwordError(password){
  if(typeof password!=='string'||password.length<14) return 'Password must be at least 14 characters';
  if(password.length>256) return 'Password is too long';
  if(!/[a-z]/.test(password)||!/[A-Z]/.test(password)||!/[0-9]/.test(password)||!/[^A-Za-z0-9]/.test(password)) return 'Password must include upper, lower, number, and symbol';
  return null;
}
async function ensureSchema(env){
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS atlas_password_credentials (
    user_id TEXT PRIMARY KEY,algorithm TEXT NOT NULL DEFAULT 'PBKDF2-SHA256',iterations INTEGER NOT NULL,
    salt_hex TEXT NOT NULL,password_hash_hex TEXT NOT NULL,must_change INTEGER NOT NULL DEFAULT 0,
    failed_attempts INTEGER NOT NULL DEFAULT 0,locked_until TEXT,created_at TEXT NOT NULL,updated_at TEXT NOT NULL
  )`).run();
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS atlas_activation_tokens (
    id TEXT PRIMARY KEY,user_id TEXT NOT NULL,token_hash TEXT NOT NULL UNIQUE,organization_id TEXT NOT NULL,dba_id TEXT NOT NULL,
    expires_at TEXT NOT NULL,consumed_at TEXT,created_by_user_id TEXT NOT NULL,created_at TEXT NOT NULL
  )`).run();
}
async function sessionActor(request,env){
  const h=request.headers.get('authorization')||''; if(!h.startsWith('Bearer ')) return null;
  const token=h.slice(7).trim(); if(!token) return null;
  const hash=await sha256(token),now=new Date().toISOString();
  return await env.DB.prepare(`SELECT s.id session_id,s.user_id,u.email,u.display_name FROM atlas_sessions s
    JOIN atlas_users u ON u.id=s.user_id WHERE s.token_hash=? AND s.revoked_at IS NULL AND s.expires_at>? AND u.status='active'`)
    .bind(hash,now).first();
}
async function issueSession(env,userId){
  const raw=crypto.randomUUID()+crypto.randomUUID(); const hash=await sha256(raw); const now=new Date().toISOString();
  const expires=new Date(Date.now()+12*60*60*1000).toISOString();
  await env.DB.prepare('INSERT INTO atlas_sessions(id,user_id,token_hash,expires_at,revoked_at,created_at,last_seen_at) VALUES(?,?,?,?,NULL,?,?)')
    .bind(id(),userId,hash,expires,now,now).run();
  return {session_token:raw,expires_at:expires};
}
async function memberships(env,userId){
  const r=await env.DB.prepare(`SELECT organization_id,dba_id,role,status FROM atlas_memberships
    WHERE user_id=? AND status='active' ORDER BY organization_id,dba_id`).bind(userId).all();
  return r.results||[];
}
async function audit(env,{org='',dba='',userId='',action,resourceType='auth',resourceId='',payload={}}){
  if(!org||!dba||!userId) return;
  await env.DB.prepare(`INSERT INTO atlas_audit_events(id,organization_id,dba_id,actor_user_id,action,resource_type,resource_id,payload,created_at)
    VALUES(?,?,?,?,?,?,?,?,?)`).bind(id(),org,dba,userId,action,resourceType,resourceId,JSON.stringify(payload),new Date().toISOString()).run();
}
async function security(env,{userId='',org='',dba='',action,decision,reason}){
  await env.DB.prepare(`INSERT INTO atlas_security_events(id,user_id,organization_id,dba_id,action,resource_type,resource_id,decision,reason,created_at)
    VALUES(?,?,?,?,?,'auth','',?,?,?)`).bind(id(),userId,org,dba,action,decision,reason,new Date().toISOString()).run();
}

async function login(request,env){
  const body=await request.json().catch(()=>({})); const email=String(body.email||'').trim().toLowerCase(); const password=String(body.password||'');
  if(!email||!password) return json({error:'email and password are required'},400);
  const user=await env.DB.prepare(`SELECT u.id,u.email,u.display_name,u.status,c.iterations,c.salt_hex,c.password_hash_hex,c.failed_attempts,c.locked_until,c.must_change
    FROM atlas_users u LEFT JOIN atlas_password_credentials c ON c.user_id=u.id WHERE u.email=?`).bind(email).first();
  if(!user||!user.password_hash_hex||user.status!=='active') { await security(env,{userId:user?.id||'',action:'login',decision:'deny',reason:'invalid_credentials'}); return json({error:'Invalid credentials'},401); }
  const now=Date.now(); if(user.locked_until&&Date.parse(user.locked_until)>now){ await security(env,{userId:user.id,action:'login',decision:'deny',reason:'temporarily_locked'}); return json({error:'Account temporarily locked'},423); }
  const candidate=await derive(password,user.salt_hex,Number(user.iterations)||ITERATIONS);
  if(!safeEqualHex(candidate,user.password_hash_hex)){
    const attempts=Number(user.failed_attempts||0)+1; const lock=attempts>=5?new Date(Date.now()+15*60*1000).toISOString():null;
    await env.DB.prepare('UPDATE atlas_password_credentials SET failed_attempts=?,locked_until=?,updated_at=? WHERE user_id=?').bind(attempts>=5?0:attempts,lock,new Date().toISOString(),user.id).run();
    await security(env,{userId:user.id,action:'login',decision:'deny',reason:lock?'locked_after_failures':'invalid_credentials'}); return json({error:'Invalid credentials'},401);
  }
  await env.DB.prepare('UPDATE atlas_password_credentials SET failed_attempts=0,locked_until=NULL,updated_at=? WHERE user_id=?').bind(new Date().toISOString(),user.id).run();
  const activeMemberships=await memberships(env,user.id); if(activeMemberships.length===0){ await security(env,{userId:user.id,action:'login',decision:'deny',reason:'no_active_membership'}); return json({error:'No active organization membership'},403); }
  const session=await issueSession(env,user.id); const first=activeMemberships[0];
  await security(env,{userId:user.id,org:first.organization_id,dba:first.dba_id,action:'login',decision:'allow',reason:'password_verified'});
  await audit(env,{org:first.organization_id,dba:first.dba_id,userId:user.id,action:'login',resourceId:user.id,payload:{method:'password'}});
  return json({ok:true,user:{id:user.id,email:user.email,display_name:user.display_name,must_change_password:Boolean(user.must_change)},memberships:activeMemberships,...session});
}

async function me(request,env){
  const actor=await sessionActor(request,env); if(!actor) return json({error:'Unauthorized'},401);
  return json({user:{id:actor.user_id,email:actor.email,display_name:actor.display_name},memberships:await memberships(env,actor.user_id)});
}

async function createActivation(request,env){
  const actor=await sessionActor(request,env); if(!actor) return json({error:'Unauthorized'},401);
  const org=request.headers.get('x-atlas-organization')||'',dba=request.headers.get('x-atlas-dba')||'';
  if(!org||!dba) return json({error:'Organization and DBA scope are required'},400);
  const manager=await env.DB.prepare(`SELECT role FROM atlas_memberships WHERE user_id=? AND organization_id=? AND dba_id=? AND status='active'`).bind(actor.user_id,org,dba).first();
  if(!manager||!['owner','admin'].includes(String(manager.role))) return json({error:'Forbidden'},403);
  const body=await request.json().catch(()=>({})); const target=String(body.user_id||''); if(!target) return json({error:'user_id is required'},400);
  const targetMembership=await env.DB.prepare(`SELECT role FROM atlas_memberships WHERE user_id=? AND organization_id=? AND dba_id=? AND status='active'`).bind(target,org,dba).first();
  if(!targetMembership) return json({error:'Target user not active in this scope'},404);
  if(manager.role==='admin'&&targetMembership.role==='owner') return json({error:'Admins cannot provision owner credentials'},403);
  const raw=crypto.randomUUID()+crypto.randomUUID(); const hash=await sha256(raw); const now=new Date().toISOString(); const expires=new Date(Date.now()+24*60*60*1000).toISOString();
  await env.DB.prepare('UPDATE atlas_activation_tokens SET consumed_at=? WHERE user_id=? AND consumed_at IS NULL').bind(now,target).run();
  await env.DB.prepare(`INSERT INTO atlas_activation_tokens(id,user_id,token_hash,organization_id,dba_id,expires_at,consumed_at,created_by_user_id,created_at)
    VALUES(?,?,?,?,?,?,NULL,?,?)`).bind(id(),target,hash,org,dba,expires,actor.user_id,now).run();
  await audit(env,{org,dba,userId:actor.user_id,action:'issue_activation_token',resourceType:'user',resourceId:target,payload:{expires_at:expires}});
  return json({ok:true,user_id:target,activation_token:raw,expires_at:expires},201);
}

async function activate(request,env){
  const body=await request.json().catch(()=>({})); const token=String(body.activation_token||''); const password=String(body.password||'');
  const err=passwordError(password); if(!token) return json({error:'activation_token is required'},400); if(err) return json({error:err},400);
  const hash=await sha256(token),nowIso=new Date().toISOString();
  const row=await env.DB.prepare(`SELECT id,user_id,organization_id,dba_id FROM atlas_activation_tokens WHERE token_hash=? AND consumed_at IS NULL AND expires_at>?`).bind(hash,nowIso).first();
  if(!row) return json({error:'Invalid or expired activation token'},401);
  const salt=randomHex(16),derived=await derive(password,salt,ITERATIONS);
  await env.DB.prepare(`INSERT INTO atlas_password_credentials(user_id,algorithm,iterations,salt_hex,password_hash_hex,must_change,failed_attempts,locked_until,created_at,updated_at)
    VALUES(?,'PBKDF2-SHA256',?,?,?,?,0,NULL,?,?)
    ON CONFLICT(user_id) DO UPDATE SET algorithm='PBKDF2-SHA256',iterations=excluded.iterations,salt_hex=excluded.salt_hex,password_hash_hex=excluded.password_hash_hex,must_change=0,failed_attempts=0,locked_until=NULL,updated_at=excluded.updated_at`)
    .bind(row.user_id,ITERATIONS,salt,derived,0,nowIso,nowIso).run();
  await env.DB.prepare('UPDATE atlas_activation_tokens SET consumed_at=? WHERE id=?').bind(nowIso,row.id).run();
  await env.DB.prepare('UPDATE atlas_sessions SET revoked_at=? WHERE user_id=? AND revoked_at IS NULL').bind(nowIso,row.user_id).run();
  await audit(env,{org:row.organization_id,dba:row.dba_id,userId:row.user_id,action:'activate_password',resourceId:row.user_id,payload:{}});
  return json({ok:true});
}

async function enrollOwner(request,env){
  if(!env.ATLAS_BOOTSTRAP_TOKEN) return json({operational:false,error:'ATLAS_BOOTSTRAP_TOKEN is not configured'},503);
  if((request.headers.get('x-atlas-bootstrap-token')||'')!==env.ATLAS_BOOTSTRAP_TOKEN) return json({error:'Unauthorized'},401);
  const body=await request.json().catch(()=>({})); const password=String(body.password||''); const err=passwordError(password); if(err) return json({error:err},400);
  const owner=await env.DB.prepare(`SELECT b.owner_user_id user_id,b.organization_id,b.dba_id FROM atlas_bootstrap_state b WHERE b.id='primary'`).first();
  if(!owner) return json({error:'Bootstrap has not been completed'},409);
  const existing=await env.DB.prepare('SELECT user_id FROM atlas_password_credentials WHERE user_id=?').bind(owner.user_id).first();
  if(existing) return json({error:'Owner credentials already enrolled'},409);
  const salt=randomHex(16),derived=await derive(password,salt,ITERATIONS),now=new Date().toISOString();
  await env.DB.prepare(`INSERT INTO atlas_password_credentials(user_id,algorithm,iterations,salt_hex,password_hash_hex,must_change,failed_attempts,locked_until,created_at,updated_at)
    VALUES(?,'PBKDF2-SHA256',?,?,?,?,0,NULL,?,?)`).bind(owner.user_id,ITERATIONS,salt,derived,0,now,now).run();
  await audit(env,{org:owner.organization_id,dba:owner.dba_id,userId:owner.user_id,action:'enroll_owner_password',resourceId:owner.user_id,payload:{}});
  return json({ok:true,user_id:owner.user_id},201);
}

export async function handlePasswordAuth(request,env){
  const url=new URL(request.url); if(!env.DB) return json({operational:false,error:'D1 binding DB is not configured'},503); await ensureSchema(env);
  if(url.pathname==='/api/auth/login'&&request.method==='POST') return login(request,env);
  if(url.pathname==='/api/auth/me'&&request.method==='GET') return me(request,env);
  if(url.pathname==='/api/auth/activation-tokens'&&request.method==='POST') return createActivation(request,env);
  if(url.pathname==='/api/auth/activate'&&request.method==='POST') return activate(request,env);
  if(url.pathname==='/api/auth/enroll-owner'&&request.method==='POST') return enrollOwner(request,env);
  return null;
}
