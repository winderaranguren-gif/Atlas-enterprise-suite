import core from './index.js';
import { handleIdentityAdmin, redeemInvite, revokeCurrentSession } from './identity-permissions.js';

const READ_ROLES = new Set(['owner','admin','editor','viewer','auditor']);
const WRITE_ROLES = new Set(['owner','admin','editor']);

const json = (data,status=200) => new Response(JSON.stringify(data), {
  status,
  headers: {'content-type':'application/json;charset=UTF-8','cache-control':'no-store'}
});

async function sha256(value) {
  const bytes=new TextEncoder().encode(value);
  const digest=await crypto.subtle.digest('SHA-256',bytes);
  return [...new Uint8Array(digest)].map(b=>b.toString(16).padStart(2,'0')).join('');
}

async function ensureSecurityEvents(env) {
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS atlas_security_events (
    id TEXT PRIMARY KEY,
    user_id TEXT DEFAULT '',
    organization_id TEXT DEFAULT '',
    dba_id TEXT DEFAULT '',
    action TEXT NOT NULL,
    path TEXT NOT NULL,
    decision TEXT NOT NULL,
    reason TEXT NOT NULL,
    created_at TEXT NOT NULL
  )`).run();
  await env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_security_events_scope ON atlas_security_events(organization_id,dba_id,created_at)').run();
}

async function recordDecision(env,{userId='',organizationId='',dbaId='',action,path,decision,reason}) {
  try {
    await ensureSecurityEvents(env);
    await env.DB.prepare(`INSERT INTO atlas_security_events(
      id,user_id,organization_id,dba_id,action,path,decision,reason,created_at
    ) VALUES(?,?,?,?,?,?,?,?,?)`)
      .bind(crypto.randomUUID(),userId,organizationId,dbaId,action,path,decision,reason,new Date().toISOString()).run();
  } catch {
    // Authorization remains fail-closed even if decision logging is unavailable.
  }
}

async function actorFromRequest(request,env) {
  const authorization=request.headers.get('authorization')||'';
  if(!authorization.startsWith('Bearer ')) return null;
  const token=authorization.slice(7).trim();
  if(!token) return null;
  const tokenHash=await sha256(token);
  const timestamp=new Date().toISOString();
  try {
    return await env.DB.prepare(`SELECT s.user_id
      FROM atlas_sessions s JOIN atlas_users u ON u.id=s.user_id
      WHERE s.token_hash=? AND s.revoked_at IS NULL AND s.expires_at>? AND u.status='active'`)
      .bind(tokenHash,timestamp).first();
  } catch {
    return null;
  }
}

async function authorizeScopedRequest(request,env,url,{adminOnly=false}={}) {
  const action=request.method==='GET'?'read':'write';
  const organizationId=request.headers.get('x-atlas-organization')||'';
  const dbaId=request.headers.get('x-atlas-dba')||'';
  const actor=await actorFromRequest(request,env);
  if(!actor){
    await recordDecision(env,{organizationId,dbaId,action,path:url.pathname,decision:'deny',reason:'invalid_session'});
    return {response:json({error:'Unauthorized'},401)};
  }
  if(!organizationId||!dbaId){
    await recordDecision(env,{userId:actor.user_id,organizationId,dbaId,action,path:url.pathname,decision:'deny',reason:'missing_scope'});
    return {response:json({error:'Organization and DBA scope are required'},400)};
  }

  let membership;
  try {
    membership=await env.DB.prepare(`SELECT role,organization_id,dba_id FROM atlas_memberships
      WHERE user_id=? AND organization_id=? AND dba_id=? AND status='active'`)
      .bind(actor.user_id,organizationId,dbaId).first();
  } catch {
    return {response:json({operational:false,error:'Identity schema is unavailable'},503)};
  }
  if(!membership){
    await recordDecision(env,{userId:actor.user_id,organizationId,dbaId,action,path:url.pathname,decision:'deny',reason:'membership_missing'});
    return {response:json({error:'Forbidden'},403)};
  }

  const role=String(membership.role||'').toLowerCase();
  const allowed=adminOnly?['owner','admin'].includes(role):(action==='read'?READ_ROLES.has(role):WRITE_ROLES.has(role));
  if(!allowed){
    await recordDecision(env,{userId:actor.user_id,organizationId,dbaId,action,path:url.pathname,decision:'deny',reason:`role_${role}_not_allowed`});
    return {response:json({error:adminOnly?'Administrator permission required':'Forbidden for role'},403)};
  }
  return {
    actor:{user_id:actor.user_id,role},
    scope:{organization_id:membership.organization_id,dba_id:membership.dba_id}
  };
}

async function secureFetch(request,env,ctx) {
  const url=new URL(request.url);

  if(url.pathname==='/api/system/self-repair'&&request.method==='POST'){
    if(!env.ATLAS_BOOTSTRAP_KEY) return json({operational:false,error:'ATLAS_BOOTSTRAP_KEY is not configured'},503);
    const supplied=request.headers.get('x-atlas-bootstrap-key')||'';
    if(!supplied||supplied!==env.ATLAS_BOOTSTRAP_KEY){
      await recordDecision(env,{action:'self-repair',path:url.pathname,decision:'deny',reason:'bootstrap_key_invalid'});
      return json({error:'Unauthorized'},401);
    }
  }

  if(url.pathname==='/api/auth/redeem-invite'&&request.method==='POST'){
    if(!env.DB) return json({operational:false,error:'D1 binding DB is not configured'},503);
    try{return await redeemInvite(request,env);}catch(error){return json({operational:false,error:error.message},500);}
  }

  if(url.pathname==='/api/auth/logout'&&request.method==='POST'){
    if(!env.DB) return json({operational:false,error:'D1 binding DB is not configured'},503);
    try{return await revokeCurrentSession(request,env);}catch(error){return json({operational:false,error:error.message},500);}
  }

  const identityAdminPath=url.pathname==='/api/users'||url.pathname==='/api/users/invite'||url.pathname.startsWith('/api/memberships/');
  if(identityAdminPath){
    if(!env.DB) return json({operational:false,error:'D1 binding DB is not configured'},503);
    const authz=await authorizeScopedRequest(request,env,url,{adminOnly:true});
    if(authz.response) return authz.response;
    try{return await handleIdentityAdmin(request,env,url,authz);}catch(error){return json({operational:false,error:error.message},500);}
  }

  if(url.pathname.startsWith('/api/crm/')&&url.pathname!=='/api/crm/health'){
    if(!env.DB) return json({operational:false,error:'D1 binding DB is not configured'},503);
    const authz=await authorizeScopedRequest(request,env,url);
    if(authz.response) return authz.response;
  }

  return core.fetch(request,env,ctx);
}

export default {
  fetch:secureFetch,
  scheduled(controller,env,ctx){return core.scheduled(controller,env,ctx);}
};
