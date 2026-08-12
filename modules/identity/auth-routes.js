import { json } from '../../platform/runtime/health.js';
import { requireSession, requireScope, hashToken, createPasswordCredential, verifyPassword } from '../../platform/security/auth.js';
import { audit } from '../../platform/security/audit.js';

function clean(value,max=320){
  if(value===undefined||value===null) return null;
  return String(value).trim().slice(0,max);
}

function scopeFrom(request,url){
  return {
    organizationId:url.searchParams.get('organization_id')||request.headers.get('x-atlas-organization'),
    dbaId:url.searchParams.get('dba_id')||request.headers.get('x-atlas-dba')
  };
}

async function issueSession(env,userId,hours=12){
  const token=`atlas_${crypto.randomUUID()}_${crypto.randomUUID()}`;
  const tokenHash=await hashToken(token);
  const id=crypto.randomUUID();
  await env.DB.prepare("INSERT INTO sessions(id,token_hash,user_id,expires_at) VALUES(?,?,?,datetime('now',?))")
    .bind(id,tokenHash,userId,`+${hours} hours`).run();
  return {id,token,expiresInHours:hours};
}

async function firstActiveScope(env,userId){
  return env.DB.prepare(`SELECT organization_id,dba_id,role FROM memberships WHERE user_id=? AND status='active' ORDER BY created_at LIMIT 1`).bind(userId).first();
}

export async function authRoutes(request,env,url){
  if(url.pathname==='/api/auth/setup-token' && request.method==='POST'){
    const auth=await requireSession(env,request);
    if(!auth.ok) return json({ok:false,error:auth.error},auth.status);
    const {organizationId,dbaId}=scopeFrom(request,url);
    if(!organizationId||!dbaId) return json({ok:false,error:'organization_and_dba_required'},400);
    const scoped=await requireScope(env,auth.session.user_id,organizationId,dbaId,['owner','admin']);
    if(!scoped.ok){
      await audit(env,{actorUserId:auth.session.user_id,organizationId,dbaId,action:'auth.setup_token.issue',resourceType:'credential',decision:'deny',metadata:{error:scoped.error}});
      return json({ok:false,error:scoped.error},scoped.status);
    }
    const body=await request.json().catch(()=>null);
    const userId=clean(body?.userId,100);
    if(!userId) return json({ok:false,error:'userId_required'},400);
    const target=await env.DB.prepare(`SELECT m.id,u.email,u.status FROM memberships m JOIN users u ON u.id=m.user_id WHERE m.user_id=? AND m.organization_id=? AND m.dba_id=? AND m.status='active'`)
      .bind(userId,organizationId,dbaId).first();
    if(!target) return json({ok:false,error:'active_membership_required'},404);
    if(target.status!=='active') return json({ok:false,error:'user_suspended'},409);

    await env.DB.prepare(`UPDATE credential_setup_tokens SET used_at=CURRENT_TIMESTAMP WHERE user_id=? AND organization_id=? AND dba_id=? AND used_at IS NULL`).bind(userId,organizationId,dbaId).run();
    const token=`atlas_setup_${crypto.randomUUID()}_${crypto.randomUUID()}`;
    const tokenHash=await hashToken(token);
    const id=crypto.randomUUID();
    await env.DB.prepare("INSERT INTO credential_setup_tokens(id,token_hash,user_id,organization_id,dba_id,expires_at,created_by_user_id) VALUES(?,?,?,?,?,datetime('now','+30 minutes'),?)")
      .bind(id,tokenHash,userId,organizationId,dbaId,auth.session.user_id).run();
    await audit(env,{actorUserId:auth.session.user_id,organizationId,dbaId,action:'auth.setup_token.issue',resourceType:'credential',resourceId:userId,decision:'allow'});
    return json({ok:true,setupToken:token,expiresInMinutes:30,user:{id:userId,email:target.email}},201);
  }

  if(url.pathname==='/api/auth/activate' && request.method==='POST'){
    const body=await request.json().catch(()=>null);
    const setupToken=clean(body?.setupToken,500);
    const password=body?.password;
    if(!setupToken||!password) return json({ok:false,error:'setupToken_and_password_required'},400);
    const tokenHash=await hashToken(setupToken);
    const setup=await env.DB.prepare(`SELECT id,user_id,organization_id,dba_id FROM credential_setup_tokens WHERE token_hash=? AND used_at IS NULL AND expires_at>CURRENT_TIMESTAMP`).bind(tokenHash).first();
    if(!setup) return json({ok:false,error:'invalid_or_expired_setup_token'},401);
    const credential=await createPasswordCredential(password);
    if(!credential.ok) return json({ok:false,error:credential.error},400);
    try{
      await env.DB.batch([
        env.DB.prepare(`INSERT INTO password_credentials(user_id,salt_hex,password_hash_hex,iterations,updated_at) VALUES(?,?,?,?,CURRENT_TIMESTAMP)
          ON CONFLICT(user_id) DO UPDATE SET salt_hex=excluded.salt_hex,password_hash_hex=excluded.password_hash_hex,iterations=excluded.iterations,updated_at=CURRENT_TIMESTAMP`)
          .bind(setup.user_id,credential.saltHex,credential.passwordHashHex,credential.iterations),
        env.DB.prepare('UPDATE credential_setup_tokens SET used_at=CURRENT_TIMESTAMP WHERE id=? AND used_at IS NULL').bind(setup.id),
        env.DB.prepare('UPDATE sessions SET revoked_at=CURRENT_TIMESTAMP WHERE user_id=? AND revoked_at IS NULL').bind(setup.user_id)
      ]);
    }catch(error){
      return json({ok:false,error:'credential_activation_failed',detail:String(error?.message||error)},409);
    }
    const session=await issueSession(env,setup.user_id);
    await audit(env,{actorUserId:setup.user_id,organizationId:setup.organization_id,dbaId:setup.dba_id,action:'auth.activate',resourceType:'credential',resourceId:setup.user_id,decision:'allow'});
    return json({ok:true,session:{token:session.token,expiresInHours:session.expiresInHours}},201);
  }

  if(url.pathname==='/api/auth/login' && request.method==='POST'){
    const body=await request.json().catch(()=>null);
    const email=clean(body?.email,320)?.toLowerCase();
    const password=body?.password;
    if(!email||!password) return json({ok:false,error:'email_and_password_required'},400);
    const user=await env.DB.prepare(`SELECT u.id,u.email,u.display_name,u.status,c.salt_hex,c.password_hash_hex,c.iterations FROM users u LEFT JOIN password_credentials c ON c.user_id=u.id WHERE u.email=?`).bind(email).first();
    if(!user||user.status!=='active'||!user.password_hash_hex||!(await verifyPassword(password,user))) return json({ok:false,error:'invalid_credentials'},401);
    const scopes=await env.DB.prepare(`SELECT m.organization_id,m.dba_id,m.role,o.name AS organization_name,d.name AS dba_name FROM memberships m JOIN organizations o ON o.id=m.organization_id JOIN dbas d ON d.id=m.dba_id AND d.organization_id=m.organization_id WHERE m.user_id=? AND m.status='active' ORDER BY o.name,d.name`).bind(user.id).all();
    if(!(scopes.results||[]).length) return json({ok:false,error:'active_membership_required'},403);
    const session=await issueSession(env,user.id);
    const primary=scopes.results[0];
    await audit(env,{actorUserId:user.id,organizationId:primary.organization_id,dbaId:primary.dba_id,action:'auth.login',resourceType:'session',resourceId:session.id,decision:'allow'});
    return json({ok:true,user:{id:user.id,email:user.email,displayName:user.display_name},session:{token:session.token,expiresInHours:session.expiresInHours},scopes:scopes.results});
  }

  if(url.pathname==='/api/auth/logout' && request.method==='POST'){
    const auth=await requireSession(env,request);
    if(!auth.ok) return json({ok:false,error:auth.error},auth.status);
    await env.DB.prepare('UPDATE sessions SET revoked_at=CURRENT_TIMESTAMP WHERE id=? AND revoked_at IS NULL').bind(auth.session.id).run();
    const scope=await firstActiveScope(env,auth.session.user_id);
    if(scope) await audit(env,{actorUserId:auth.session.user_id,organizationId:scope.organization_id,dbaId:scope.dba_id,action:'auth.logout',resourceType:'session',resourceId:auth.session.id,decision:'allow'});
    return json({ok:true});
  }

  return null;
}
