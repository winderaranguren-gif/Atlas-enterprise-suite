const ALL_ROLES = new Set(['owner','admin','editor','viewer','auditor']);
const ADMIN_MANAGED_ROLES = new Set(['editor','viewer','auditor']);

const json = (data,status=200) => new Response(JSON.stringify(data), {
  status,
  headers:{'content-type':'application/json;charset=UTF-8','cache-control':'no-store'}
});
const uid = () => crypto.randomUUID();
const now = () => new Date().toISOString();

async function sha256(value) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256',bytes);
  return [...new Uint8Array(digest)].map(b=>b.toString(16).padStart(2,'0')).join('');
}

async function parseJson(request) {
  try { return {body:await request.json()}; }
  catch { return {response:json({error:'Request body must be valid JSON'},400)}; }
}

function auditStatement(env,scope,actor,action,resourceType,resourceId,payload={}) {
  return env.DB.prepare(`INSERT INTO audit_log(
    id,organization_id,dba_id,actor_user_id,action,resource_type,resource_id,payload,created_at
  ) VALUES(?,?,?,?,?,?,?,?,?)`).bind(
    uid(),scope.organization_id,scope.dba_id,actor.user_id,action,resourceType,resourceId,JSON.stringify(payload),now()
  );
}

function roleCanGrant(actorRole,targetRole) {
  if (actorRole === 'owner') return ALL_ROLES.has(targetRole);
  if (actorRole === 'admin') return ADMIN_MANAGED_ROLES.has(targetRole);
  return false;
}

export async function revokeCurrentSession(request,env) {
  const authorization = request.headers.get('authorization') || '';
  if (!authorization.startsWith('Bearer ')) return json({error:'Unauthorized'},401);
  const token = authorization.slice(7).trim();
  if (!token) return json({error:'Unauthorized'},401);
  const tokenHash = await sha256(token);
  const timestamp = now();
  const result = await env.DB.prepare(`UPDATE atlas_sessions SET revoked_at=?
    WHERE token_hash=? AND revoked_at IS NULL`).bind(timestamp,tokenHash).run();
  if (!(result.meta?.changes>0)) return json({error:'Session not found or already revoked'},401);
  return json({ok:true,revoked_at:timestamp});
}

export async function redeemInvite(request,env) {
  const parsed = await parseJson(request); if (parsed.response) return parsed.response;
  const rawToken = String(parsed.body?.invite_token||'').trim();
  if (!rawToken) return json({error:'invite_token is required'},400);
  const tokenHash = await sha256(rawToken);
  const timestamp = now();
  const invite = await env.DB.prepare(`SELECT i.id,i.user_id,i.organization_id,i.dba_id,i.role,u.email,u.status AS user_status,m.status AS membership_status
    FROM atlas_invites i
    JOIN atlas_users u ON u.id=i.user_id
    JOIN atlas_memberships m ON m.user_id=i.user_id AND m.organization_id=i.organization_id AND m.dba_id=i.dba_id
    WHERE i.token_hash=? AND i.consumed_at IS NULL AND i.revoked_at IS NULL AND i.expires_at>?
    LIMIT 1`).bind(tokenHash,timestamp).first();
  if (!invite || invite.user_status !== 'active' || invite.membership_status !== 'active') {
    return json({error:'Invite is invalid, expired, revoked, or already used'},401);
  }

  const sessionToken = uid()+uid();
  const sessionHash = await sha256(sessionToken);
  const sessionId = uid();
  const expiresAt = new Date(Date.now()+12*60*60*1000).toISOString();
  const scope = {organization_id:invite.organization_id,dba_id:invite.dba_id};
  const actor = {user_id:invite.user_id};
  await env.DB.batch([
    env.DB.prepare('UPDATE atlas_invites SET consumed_at=? WHERE id=? AND consumed_at IS NULL').bind(timestamp,invite.id),
    env.DB.prepare(`INSERT INTO atlas_sessions(id,user_id,token_hash,expires_at,revoked_at,created_at,last_seen_at)
      VALUES(?,?,?,?,NULL,?,?)`).bind(sessionId,invite.user_id,sessionHash,expiresAt,timestamp,timestamp),
    auditStatement(env,scope,actor,'redeem','invite',invite.id,{session_id:sessionId,role:invite.role})
  ]);
  return json({
    ok:true,
    session_token:sessionToken,
    expires_at:expiresAt,
    organization_id:invite.organization_id,
    dba_id:invite.dba_id,
    role:invite.role,
    email:invite.email
  },201);
}

export async function handleIdentityAdmin(request,env,url,{actor,scope}) {
  if (!['owner','admin'].includes(actor.role)) return json({error:'Administrator permission required'},403);
  const parts = url.pathname.split('/').filter(Boolean);

  if (url.pathname === '/api/users' && request.method === 'GET') {
    const result = await env.DB.prepare(`SELECT u.id,u.email,u.display_name,u.status,m.role,m.status AS membership_status,m.created_at,m.updated_at
      FROM atlas_memberships m JOIN atlas_users u ON u.id=m.user_id
      WHERE m.organization_id=? AND m.dba_id=? ORDER BY u.email`).bind(scope.organization_id,scope.dba_id).all();
    await auditStatement(env,scope,actor,'read','users','collection',{count:(result.results||[]).length}).run();
    return json({users:result.results||[]});
  }

  if (url.pathname === '/api/users/invite' && request.method === 'POST') {
    const parsed = await parseJson(request); if (parsed.response) return parsed.response;
    const body = parsed.body || {};
    const email = String(body.email||'').trim().toLowerCase();
    const displayName = String(body.display_name||'').trim();
    const role = String(body.role||'viewer').trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(email)) return json({error:'A valid email is required'},400);
    if (!ALL_ROLES.has(role)) return json({error:'Invalid role'},400);
    if (!roleCanGrant(actor.role,role)) return json({error:'Cannot grant a role equal to or above your administration level'},403);

    const timestamp = now();
    let user = await env.DB.prepare('SELECT id,status FROM atlas_users WHERE email=?').bind(email).first();
    if (user?.status && user.status !== 'active') return json({error:'User account is not active'},409);
    const userId = user?.id || uid();
    if (!user) {
      await env.DB.prepare(`INSERT INTO atlas_users(id,email,display_name,status,created_at,updated_at)
        VALUES(?,?,?,'active',?,?)`).bind(userId,email,displayName,timestamp,timestamp).run();
    } else if (displayName) {
      await env.DB.prepare('UPDATE atlas_users SET display_name=?,updated_at=? WHERE id=?').bind(displayName,timestamp,userId).run();
    }

    const rawInvite = uid()+uid();
    const tokenHash = await sha256(rawInvite);
    const inviteId = uid();
    const expiresAt = new Date(Date.now()+24*60*60*1000).toISOString();
    await env.DB.batch([
      env.DB.prepare(`INSERT INTO atlas_memberships(id,user_id,organization_id,dba_id,role,status,created_at,updated_at)
        VALUES(?,?,?,?,?,'active',?,?)
        ON CONFLICT(user_id,organization_id,dba_id) DO UPDATE SET role=excluded.role,status='active',updated_at=excluded.updated_at`)
        .bind(uid(),userId,scope.organization_id,scope.dba_id,role,timestamp,timestamp),
      env.DB.prepare(`UPDATE atlas_invites SET revoked_at=?
        WHERE user_id=? AND organization_id=? AND dba_id=? AND consumed_at IS NULL AND revoked_at IS NULL`)
        .bind(timestamp,userId,scope.organization_id,scope.dba_id),
      env.DB.prepare(`INSERT INTO atlas_invites(
        id,user_id,organization_id,dba_id,role,token_hash,expires_at,consumed_at,revoked_at,created_by,created_at
      ) VALUES(?,?,?,?,?,?,?,NULL,NULL,?,?)`).bind(
        inviteId,userId,scope.organization_id,scope.dba_id,role,tokenHash,expiresAt,actor.user_id,timestamp
      ),
      auditStatement(env,scope,actor,'invite','user',userId,{email,role,invite_id:inviteId,expires_at:expiresAt})
    ]);
    return json({ok:true,user_id:userId,email,role,invite_token:rawInvite,expires_at:expiresAt},201);
  }

  if (parts[1] === 'memberships' && parts[2] && request.method === 'PATCH') {
    const targetUserId = parts[2];
    const current = await env.DB.prepare(`SELECT role,status FROM atlas_memberships
      WHERE user_id=? AND organization_id=? AND dba_id=?`).bind(targetUserId,scope.organization_id,scope.dba_id).first();
    if (!current) return json({error:'Membership not found'},404);
    if (actor.role === 'admin' && !ADMIN_MANAGED_ROLES.has(String(current.role).toLowerCase())) {
      return json({error:'Admin cannot modify owner/admin memberships'},403);
    }
    const parsed = await parseJson(request); if (parsed.response) return parsed.response;
    const requestedRole = parsed.body?.role === undefined ? String(current.role).toLowerCase() : String(parsed.body.role).toLowerCase();
    const requestedStatus = parsed.body?.status === undefined ? String(current.status).toLowerCase() : String(parsed.body.status).toLowerCase();
    if (!ALL_ROLES.has(requestedRole)) return json({error:'Invalid role'},400);
    if (!['active','suspended'].includes(requestedStatus)) return json({error:'status must be active or suspended'},400);
    if (!roleCanGrant(actor.role,requestedRole)) return json({error:'Cannot grant requested role'},403);
    if (targetUserId === actor.user_id && requestedStatus !== 'active') return json({error:'You cannot suspend your own current membership'},409);

    const timestamp = now();
    await env.DB.batch([
      env.DB.prepare(`UPDATE atlas_memberships SET role=?,status=?,updated_at=?
        WHERE user_id=? AND organization_id=? AND dba_id=?`).bind(
        requestedRole,requestedStatus,timestamp,targetUserId,scope.organization_id,scope.dba_id
      ),
      env.DB.prepare(`UPDATE atlas_invites SET revoked_at=?
        WHERE user_id=? AND organization_id=? AND dba_id=? AND consumed_at IS NULL AND revoked_at IS NULL`)
        .bind(timestamp,targetUserId,scope.organization_id,scope.dba_id),
      auditStatement(env,scope,actor,'update','membership',targetUserId,{role:requestedRole,status:requestedStatus})
    ]);
    if (requestedStatus === 'suspended') {
      await env.DB.prepare(`UPDATE atlas_sessions SET revoked_at=?
        WHERE user_id=? AND revoked_at IS NULL`).bind(timestamp,targetUserId).run();
    }
    return json({ok:true,user_id:targetUserId,role:requestedRole,status:requestedStatus});
  }

  return json({error:'Unknown Users/Permissions resource'},404);
}
