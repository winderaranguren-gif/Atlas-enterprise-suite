const encoder = new TextEncoder();

async function sha256Hex(value){
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(value));
  return [...new Uint8Array(digest)].map(b=>b.toString(16).padStart(2,'0')).join('');
}

export function bearerToken(request){
  const header=request.headers.get('authorization')||'';
  const match=header.match(/^Bearer\s+(.+)$/i);
  return match?.[1]||null;
}

export async function requireSession(env,request){
  const token=bearerToken(request);
  if(!token) return {ok:false,status:401,error:'missing_bearer_token'};
  const tokenHash=await sha256Hex(token);
  const session=await env.DB.prepare(`
    SELECT s.id,s.user_id,u.email,u.display_name
    FROM sessions s JOIN users u ON u.id=s.user_id
    WHERE s.token_hash=? AND s.revoked_at IS NULL AND s.expires_at>CURRENT_TIMESTAMP AND u.status='active'
  `).bind(tokenHash).first();
  return session?{ok:true,session}:{ok:false,status:401,error:'invalid_or_expired_session'};
}

export async function requireScope(env,userId,organizationId,dbaId,allowedRoles){
  const membership=await env.DB.prepare(`
    SELECT id,role FROM memberships
    WHERE user_id=? AND organization_id=? AND dba_id=? AND status='active'
  `).bind(userId,organizationId,dbaId).first();
  if(!membership) return {ok:false,status:403,error:'scope_membership_required'};
  if(allowedRoles && !allowedRoles.includes(membership.role)) return {ok:false,status:403,error:'insufficient_role',membership};
  return {ok:true,membership};
}

export async function hashToken(token){ return sha256Hex(token); }
