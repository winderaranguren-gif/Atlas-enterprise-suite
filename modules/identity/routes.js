import { json } from '../../platform/runtime/health.js';
import { requireSession, requireScope, hashToken } from '../../platform/security/auth.js';
import { audit } from '../../platform/security/audit.js';

async function scopeFrom(request){
  const url=new URL(request.url);
  const organizationId=url.searchParams.get('organization_id')||request.headers.get('x-atlas-organization');
  const dbaId=url.searchParams.get('dba_id')||request.headers.get('x-atlas-dba');
  return {organizationId,dbaId};
}

async function authorize(env,request,roles,action){
  const auth=await requireSession(env,request);
  if(!auth.ok) return {response:json({ok:false,error:auth.error},auth.status)};
  const {organizationId,dbaId}=await scopeFrom(request);
  if(!organizationId||!dbaId) return {response:json({ok:false,error:'organization_and_dba_required'},400)};
  const scoped=await requireScope(env,auth.session.user_id,organizationId,dbaId,roles);
  if(!scoped.ok){
    await audit(env,{actorUserId:auth.session.user_id,organizationId,dbaId,action,resourceType:'identity',decision:'deny',metadata:{error:scoped.error}});
    return {response:json({ok:false,error:scoped.error},scoped.status)};
  }
  return {auth:auth.session,membership:scoped.membership,organizationId,dbaId};
}

async function bootstrap(request,env){
  if(!env.ATLAS_BOOTSTRAP_TOKEN) return json({ok:false,error:'bootstrap_not_configured'},503);
  if(request.headers.get('x-atlas-bootstrap-token')!==env.ATLAS_BOOTSTRAP_TOKEN) return json({ok:false,error:'invalid_bootstrap_token'},401);
  const existing=await env.DB.prepare("SELECT id FROM memberships WHERE role='owner' LIMIT 1").first();
  if(existing) return json({ok:false,error:'bootstrap_already_completed'},409);
  const body=await request.json().catch(()=>null);
  if(!body?.organizationName||!body?.dbaName||!body?.email||!body?.displayName) return json({ok:false,error:'organizationName_dbaName_email_displayName_required'},400);

  const organizationId=crypto.randomUUID();
  const dbaId=crypto.randomUUID();
  const userId=crypto.randomUUID();
  const membershipId=crypto.randomUUID();
  const sessionId=crypto.randomUUID();
  const token=`atlas_${crypto.randomUUID()}_${crypto.randomUUID()}`;
  const tokenHash=await hashToken(token);

  try{
    await env.DB.batch([
      env.DB.prepare('INSERT INTO organizations(id,name) VALUES(?,?)').bind(organizationId,body.organizationName),
      env.DB.prepare('INSERT INTO dbas(id,organization_id,name) VALUES(?,?,?)').bind(dbaId,organizationId,body.dbaName),
      env.DB.prepare("INSERT INTO users(id,email,display_name,status) VALUES(?,?,?,'active')").bind(userId,String(body.email).trim().toLowerCase(),body.displayName),
      env.DB.prepare("INSERT INTO memberships(id,user_id,organization_id,dba_id,role,status) VALUES(?,?,?,?, 'owner','active')").bind(membershipId,userId,organizationId,dbaId),
      env.DB.prepare("INSERT INTO sessions(id,token_hash,user_id,expires_at) VALUES(?,?,?,datetime('now','+12 hours'))").bind(sessionId,tokenHash,userId)
    ]);
  }catch(error){
    return json({ok:false,error:'bootstrap_failed',detail:String(error?.message||error)},409);
  }

  await audit(env,{actorUserId:userId,organizationId,dbaId,action:'identity.bootstrap',resourceType:'identity',resourceId:userId,decision:'allow'});
  return json({ok:true,organizationId,dbaId,userId,session:{token,expiresInHours:12}},201);
}

export async function identityRoutes(request,env,url){
  if(url.pathname==='/api/identity/bootstrap' && request.method==='POST') return bootstrap(request,env);

  if(url.pathname==='/api/auth/me' && request.method==='GET'){
    const auth=await requireSession(env,request);
    if(!auth.ok) return json({ok:false,error:auth.error},auth.status);
    return json({ok:true,user:{id:auth.session.user_id,email:auth.session.email,displayName:auth.session.display_name}});
  }

  if(url.pathname==='/api/identity/memberships' && request.method==='GET'){
    const ctx=await authorize(env,request,['owner','admin','auditor'],'membership.list');
    if(ctx.response) return ctx.response;
    const rows=await env.DB.prepare(`
      SELECT m.id,m.user_id,u.email,u.display_name,m.role,m.status
      FROM memberships m JOIN users u ON u.id=m.user_id
      WHERE m.organization_id=? AND m.dba_id=? ORDER BY u.email
    `).bind(ctx.organizationId,ctx.dbaId).all();
    await audit(env,{actorUserId:ctx.auth.user_id,organizationId:ctx.organizationId,dbaId:ctx.dbaId,action:'membership.list',resourceType:'membership',decision:'allow'});
    return json({ok:true,memberships:rows.results||[]});
  }

  if(url.pathname==='/api/identity/memberships' && request.method==='POST'){
    const ctx=await authorize(env,request,['owner','admin'],'membership.create');
    if(ctx.response) return ctx.response;
    const body=await request.json().catch(()=>null);
    if(!body?.userId||!body?.role) return json({ok:false,error:'userId_and_role_required'},400);
    if(!['owner','admin','auditor','member','viewer'].includes(body.role)) return json({ok:false,error:'invalid_role'},400);
    const id=crypto.randomUUID();
    try{
      await env.DB.prepare(`INSERT INTO memberships(id,user_id,organization_id,dba_id,role,status) VALUES(?,?,?,?,?,'active')`)
        .bind(id,body.userId,ctx.organizationId,ctx.dbaId,body.role).run();
    }catch(error){
      return json({ok:false,error:'membership_create_failed',detail:String(error?.message||error)},409);
    }
    await audit(env,{actorUserId:ctx.auth.user_id,organizationId:ctx.organizationId,dbaId:ctx.dbaId,action:'membership.create',resourceType:'membership',resourceId:id,decision:'allow',metadata:{userId:body.userId,role:body.role}});
    return json({ok:true,id},201);
  }

  if(url.pathname.startsWith('/api/identity/memberships/') && request.method==='PATCH'){
    const ctx=await authorize(env,request,['owner','admin'],'membership.update');
    if(ctx.response) return ctx.response;
    const id=decodeURIComponent(url.pathname.split('/').pop());
    const body=await request.json().catch(()=>null);
    if(!body) return json({ok:false,error:'invalid_json'},400);
    const fields=[]; const values=[];
    if(body.role!==undefined){ if(!['owner','admin','auditor','member','viewer'].includes(body.role)) return json({ok:false,error:'invalid_role'},400); fields.push('role=?'); values.push(body.role); }
    if(body.status!==undefined){ if(!['active','suspended'].includes(body.status)) return json({ok:false,error:'invalid_status'},400); fields.push('status=?'); values.push(body.status); }
    if(!fields.length) return json({ok:false,error:'no_supported_changes'},400);
    values.push(id,ctx.organizationId,ctx.dbaId);
    const result=await env.DB.prepare(`UPDATE memberships SET ${fields.join(',')} WHERE id=? AND organization_id=? AND dba_id=?`).bind(...values).run();
    if(!result.meta?.changes) return json({ok:false,error:'membership_not_found'},404);
    await audit(env,{actorUserId:ctx.auth.user_id,organizationId:ctx.organizationId,dbaId:ctx.dbaId,action:'membership.update',resourceType:'membership',resourceId:id,decision:'allow',metadata:body});
    return json({ok:true,id});
  }

  if(url.pathname==='/api/audit-events' && request.method==='GET'){
    const ctx=await authorize(env,request,['owner','admin','auditor'],'audit.list');
    if(ctx.response) return ctx.response;
    const rows=await env.DB.prepare(`SELECT id,actor_user_id,action,resource_type,resource_id,decision,metadata_json,created_at FROM audit_events WHERE organization_id=? AND dba_id=? ORDER BY created_at DESC LIMIT 200`)
      .bind(ctx.organizationId,ctx.dbaId).all();
    return json({ok:true,events:rows.results||[]});
  }

  return null;
}
