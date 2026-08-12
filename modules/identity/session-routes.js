import { json } from '../../platform/runtime/health.js';
import { requireSession } from '../../platform/security/auth.js';
import { audit } from '../../platform/security/audit.js';

export async function sessionRoutes(request,env,url){
  if(url.pathname!=='/api/auth/session' || request.method!=='GET') return null;

  const auth=await requireSession(env,request);
  if(!auth.ok) return json({ok:false,error:auth.error},auth.status);

  const user=await env.DB.prepare(`SELECT id,email,display_name,status FROM users WHERE id=?`).bind(auth.session.user_id).first();
  if(!user || user.status!=='active') return json({ok:false,error:'user_inactive'},403);

  const scopes=await env.DB.prepare(`SELECT m.organization_id,m.dba_id,m.role,o.name AS organization_name,d.name AS dba_name
    FROM memberships m
    JOIN organizations o ON o.id=m.organization_id
    JOIN dbas d ON d.id=m.dba_id AND d.organization_id=m.organization_id
    WHERE m.user_id=? AND m.status='active'
    ORDER BY o.name,d.name`).bind(user.id).all();

  if(!(scopes.results||[]).length) return json({ok:false,error:'active_membership_required'},403);
  const primary=scopes.results[0];
  await audit(env,{actorUserId:user.id,organizationId:primary.organization_id,dbaId:primary.dba_id,action:'auth.session.read',resourceType:'session',resourceId:auth.session.id,decision:'allow'});

  return json({
    ok:true,
    user:{id:user.id,email:user.email,displayName:user.display_name},
    session:{id:auth.session.id,expiresAt:auth.session.expires_at},
    scopes:scopes.results
  });
}
