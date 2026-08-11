const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json;charset=UTF-8','cache-control':'no-store'}});
const id=()=>crypto.randomUUID();

const POLICIES={
  accounting:{
    read:new Set(['owner','admin','editor','viewer','auditor']),
    write:new Set(['owner','admin','editor'])
  },
  backup:{
    read:new Set(['owner','admin','auditor']),
    write:new Set(['owner','admin'])
  }
};

async function sha256(value){
  const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map(b=>b.toString(16).padStart(2,'0')).join('');
}

async function securityEvent(env,{userId='',org='',dba='',action,resourceType,decision,reason}){
  await env.DB.prepare(`INSERT INTO atlas_security_events(id,user_id,organization_id,dba_id,action,resource_type,resource_id,decision,reason,created_at)
    VALUES(?,?,?,?,?,?,'',?,?,?)`)
    .bind(id(),userId,org,dba,action,resourceType,decision,reason,new Date().toISOString()).run();
}

async function authenticate(request,env){
  const header=request.headers.get('authorization')||'';
  if(!header.startsWith('Bearer ')) return null;
  const raw=header.slice(7).trim();
  if(!raw) return null;
  const tokenHash=await sha256(raw);
  return env.DB.prepare(`SELECT s.id AS session_id,s.user_id
    FROM atlas_sessions s JOIN atlas_users u ON u.id=s.user_id
    WHERE s.token_hash=? AND s.revoked_at IS NULL AND s.expires_at>? AND u.status='active'`)
    .bind(tokenHash,new Date().toISOString()).first();
}

export async function enforceScopedAuthorization(request,env,{resourceType,mode}){
  const policy=POLICIES[resourceType];
  if(!policy||!policy[mode]) throw new Error(`Unknown authorization policy: ${resourceType}/${mode}`);
  if(!env.DB) return json({operational:false,error:'D1 binding DB is not configured'},503);

  const org=request.headers.get('x-atlas-organization')||'';
  const dba=request.headers.get('x-atlas-dba')||'';
  const actor=await authenticate(request,env);
  if(!actor){
    await securityEvent(env,{org,dba,action:mode,resourceType:`${resourceType}_scope`,decision:'deny',reason:'invalid_session'});
    return json({error:'Unauthorized'},401);
  }
  if(!org||!dba){
    await securityEvent(env,{userId:actor.user_id,org,dba,action:mode,resourceType:`${resourceType}_scope`,decision:'deny',reason:'missing_scope'});
    return json({error:'Organization and DBA scope are required'},400);
  }
  const membership=await env.DB.prepare(`SELECT role FROM atlas_memberships
    WHERE user_id=? AND organization_id=? AND dba_id=? AND status='active'`)
    .bind(actor.user_id,org,dba).first();
  if(!membership){
    await securityEvent(env,{userId:actor.user_id,org,dba,action:mode,resourceType:`${resourceType}_scope`,decision:'deny',reason:'membership_missing'});
    return json({error:'Forbidden'},403);
  }
  const role=String(membership.role||'').toLowerCase();
  if(!policy[mode].has(role)){
    await securityEvent(env,{userId:actor.user_id,org,dba,action:mode,resourceType:`${resourceType}_scope`,decision:'deny',reason:`role_${role}_not_allowed`});
    return json({error:'Forbidden for role'},403);
  }
  await securityEvent(env,{userId:actor.user_id,org,dba,action:mode,resourceType:`${resourceType}_scope`,decision:'allow',reason:`role_${role}`});
  return null;
}

export function authorizationMode(request){
  return request.method==='GET'||request.method==='HEAD'?'read':'write';
}
