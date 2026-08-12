import { json } from '../../platform/runtime/health.js';
import { requireSession, requireScope, hashToken } from '../../platform/security/auth.js';
import { audit } from '../../platform/security/audit.js';

const ROLES=['owner','admin','auditor','member','viewer'];

async function scopeFrom(request){
  const url=new URL(request.url);
  const organizationId=url.searchParams.get('organization_id')||request.headers.get('x-atlas-organization');
  const dbaId=url.searchParams.get('dba_id')||request.headers.get('x-atlas-dba');
  return {organizationId,dbaId};
}

function clean(value,max=320){
  if(value===undefined||value===null) return null;
  return String(value).trim().slice(0,max);
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

function canGrantRole(ctx,role){
  if(!ROLES.includes(role)) return {ok:false,status:400,error:'invalid_role'};
  if(role==='owner' && ctx.membership.role!=='owner') return {ok:false,status:403,error:'owner_role_requires_owner'};
  return {ok:true};
}

async function lastActiveOwner(env,organizationId,dbaId,membershipId){
  const row=await env.DB.prepare(`SELECT COUNT(*) AS count FROM memberships WHERE organization_id=? AND dba_id=? AND role='owner' AND status='active' AND id<>?`)
    .bind(organizationId,dbaId,membershipId).first();
  return Number(row?.count||0)===0;
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
      env.DB.prepare('INSERT INTO organizations(id,name) VALUES(?,?)').bind(organizationId,clean(body.organizationName,200)),
      env.DB.prepare('INSERT INTO dbas(id,organization_id,name) VALUES(?,?,?)').bind(dbaId,organizationId,clean(body.dbaName,200)),
      env.DB.prepare("INSERT INTO users(id,email,display_name,status) VALUES(?,?,?,'active')").bind(userId,clean(body.email,320).toLowerCase(),clean(body.displayName,200)),
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

  if(url.pathname==='/api/identity/dbas' && request.method==='GET'){
    const ctx=await authorize(env,request,['owner','admin','auditor'],'dba.list');
    if(ctx.response) return ctx.response;
    const rows=await env.DB.prepare(`SELECT id,name,created_at FROM dbas WHERE organization_id=? ORDER BY name`).bind(ctx.organizationId).all();
    await audit(env,{actorUserId:ctx.auth.user_id,organizationId:ctx.organizationId,dbaId:ctx.dbaId,action:'dba.list',resourceType:'dba',decision:'allow'});
    return json({ok:true,dbas:rows.results||[]});
  }

  if(url.pathname==='/api/identity/dbas' && request.method==='POST'){
    const ctx=await authorize(env,request,['owner','admin'],'dba.create');
    if(ctx.response) return ctx.response;
    const body=await request.json().catch(()=>null);
    const name=clean(body?.name,200);
    if(!name) return json({ok:false,error:'dba_name_required'},400);
    const id=crypto.randomUUID();
    try{
      await env.DB.prepare('INSERT INTO dbas(id,organization_id,name) VALUES(?,?,?)').bind(id,ctx.organizationId,name).run();
    }catch(error){
      return json({ok:false,error:'dba_create_failed',detail:String(error?.message||error)},409);
    }
    await audit(env,{actorUserId:ctx.auth.user_id,organizationId:ctx.organizationId,dbaId:ctx.dbaId,action:'dba.create',resourceType:'dba',resourceId:id,decision:'allow',metadata:{name}});
    return json({ok:true,id,name},201);
  }

  if(url.pathname==='/api/identity/users' && request.method==='POST'){
    const ctx=await authorize(env,request,['owner','admin'],'user.provision');
    if(ctx.response) return ctx.response;
    const body=await request.json().catch(()=>null);
    const email=clean(body?.email,320)?.toLowerCase();
    const displayName=clean(body?.displayName,200);
    const role=clean(body?.role,30);
    if(!email||!displayName||!role) return json({ok:false,error:'email_displayName_role_required'},400);
    const grant=canGrantRole(ctx,role);
    if(!grant.ok){
      await audit(env,{actorUserId:ctx.auth.user_id,organizationId:ctx.organizationId,dbaId:ctx.dbaId,action:'user.provision',resourceType:'user',decision:'deny',metadata:{email,role,error:grant.error}});
      return json({ok:false,error:grant.error},grant.status);
    }

    let user=await env.DB.prepare('SELECT id,email,display_name,status FROM users WHERE email=?').bind(email).first();
    let createdUser=false;
    if(user?.status==='suspended') return json({ok:false,error:'user_suspended'},409);
    if(!user){
      const userId=crypto.randomUUID();
      try{
        await env.DB.prepare("INSERT INTO users(id,email,display_name,status) VALUES(?,?,?,'active')").bind(userId,email,displayName).run();
      }catch(error){
        return json({ok:false,error:'user_create_failed',detail:String(error?.message||error)},409);
      }
      user={id:userId,email,display_name:displayName,status:'active'};
      createdUser=true;
    }

    const existing=await env.DB.prepare('SELECT id,role,status FROM memberships WHERE user_id=? AND organization_id=? AND dba_id=?')
      .bind(user.id,ctx.organizationId,ctx.dbaId).first();
    if(existing) return json({ok:false,error:'membership_already_exists',membership:existing},409);

    const membershipId=crypto.randomUUID();
    try{
      await env.DB.prepare("INSERT INTO memberships(id,user_id,organization_id,dba_id,role,status) VALUES(?,?,?,?,?,'active')")
        .bind(membershipId,user.id,ctx.organizationId,ctx.dbaId,role).run();
    }catch(error){
      return json({ok:false,error:'membership_create_failed',detail:String(error?.message||error)},409);
    }
    await audit(env,{actorUserId:ctx.auth.user_id,organizationId:ctx.organizationId,dbaId:ctx.dbaId,action:'user.provision',resourceType:'membership',resourceId:membershipId,decision:'allow',metadata:{userId:user.id,email,role,createdUser}});
    return json({ok:true,user:{id:user.id,email:user.email,displayName:user.display_name},membership:{id:membershipId,role,status:'active'},createdUser},201);
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
    const grant=canGrantRole(ctx,body.role);
    if(!grant.ok) return json({ok:false,error:grant.error},grant.status);
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
    const current=await env.DB.prepare('SELECT id,user_id,role,status FROM memberships WHERE id=? AND organization_id=? AND dba_id=?')
      .bind(id,ctx.organizationId,ctx.dbaId).first();
    if(!current) return json({ok:false,error:'membership_not_found'},404);
    if(current.role==='owner' && ctx.membership.role!=='owner') return json({ok:false,error:'owner_membership_requires_owner'},403);

    const body=await request.json().catch(()=>null);
    if(!body) return json({ok:false,error:'invalid_json'},400);
    const fields=[]; const values=[];
    if(body.role!==undefined){
      const grant=canGrantRole(ctx,body.role);
      if(!grant.ok) return json({ok:false,error:grant.error},grant.status);
      fields.push('role=?'); values.push(body.role);
    }
    if(body.status!==undefined){
      if(!['active','suspended'].includes(body.status)) return json({ok:false,error:'invalid_status'},400);
      fields.push('status=?'); values.push(body.status);
    }
    if(!fields.length) return json({ok:false,error:'no_supported_changes'},400);

    const removesActiveOwner=current.role==='owner'&&current.status==='active'&&((body.role!==undefined&&body.role!=='owner')||body.status==='suspended');
    if(removesActiveOwner && await lastActiveOwner(env,ctx.organizationId,ctx.dbaId,id)) return json({ok:false,error:'last_active_owner_required'},409);

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
