const modules = [
  { id: "core", name: "ATLAS Core", status: "active", route: "/api/status", version: "0.2.0" },
  { id: "dashboard", name: "ATLAS Dashboard", status: "active", route: "/", version: "0.1.0" },
  { id: "users-permissions", name: "Users & Permissions", status: "active", route: "/api/users", version: "0.1.0" }
];

const json = (data, status = 200) => new Response(JSON.stringify(data, null, 2), {
  status,
  headers: {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    "x-atlas-runtime": "core-0.2.0"
  }
});

const id = (prefix) => `${prefix}_${crypto.randomUUID()}`;
const now = () => new Date().toISOString();
const plusHours = (hours) => new Date(Date.now() + hours * 3600000).toISOString();

async function sha256(value) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function bodyJson(request) {
  try { return await request.json(); } catch { return null; }
}

async function audit(env, event) {
  await env.ATLAS_DB.prepare(`
    INSERT INTO audit_events
      (id, actor_user_id, organization_id, dba_id, action, resource_type, resource_id, decision, metadata_json, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    id("audit"), event.actorUserId || null, event.organizationId || null, event.dbaId || null,
    event.action, event.resourceType, event.resourceId || null, event.decision,
    JSON.stringify(event.metadata || {}), now()
  ).run();
}

function requestedScope(request) {
  return {
    organizationId: request.headers.get("x-atlas-organization-id"),
    dbaId: request.headers.get("x-atlas-dba-id")
  };
}

async function authenticate(request, env, roles = null, action = "access", resourceType = "scope") {
  const authorization = request.headers.get("authorization") || "";
  const token = authorization.startsWith("Bearer ") ? authorization.slice(7).trim() : "";
  const scope = requestedScope(request);

  if (!token || !scope.organizationId || !scope.dbaId) {
    return { error: json({ ok: false, error: "AUTH_OR_SCOPE_REQUIRED" }, 401) };
  }

  const tokenHash = await sha256(token);
  const session = await env.ATLAS_DB.prepare(`
    SELECT s.id AS session_id, s.user_id, s.expires_at, u.email, u.display_name, u.status AS user_status
    FROM sessions s JOIN users u ON u.id = s.user_id
    WHERE s.token_hash = ? AND s.revoked_at IS NULL AND s.expires_at > ?
  `).bind(tokenHash, now()).first();

  if (!session || session.user_status !== "active") {
    await audit(env, { action, resourceType, decision: "deny", organizationId: scope.organizationId, dbaId: scope.dbaId, metadata: { reason: "invalid_session" } });
    return { error: json({ ok: false, error: "INVALID_SESSION" }, 401) };
  }

  const membership = await env.ATLAS_DB.prepare(`
    SELECT m.id, m.role, m.status
    FROM memberships m
    JOIN dbas d ON d.id = m.dba_id AND d.organization_id = m.organization_id
    WHERE m.user_id = ? AND m.organization_id = ? AND m.dba_id = ? AND m.status = 'active'
  `).bind(session.user_id, scope.organizationId, scope.dbaId).first();

  if (!membership) {
    await audit(env, { actorUserId: session.user_id, organizationId: scope.organizationId, dbaId: scope.dbaId, action, resourceType, decision: "deny", metadata: { reason: "missing_active_membership" } });
    return { error: json({ ok: false, error: "ACTIVE_MEMBERSHIP_REQUIRED" }, 403) };
  }

  if (roles && !roles.includes(membership.role)) {
    await audit(env, { actorUserId: session.user_id, organizationId: scope.organizationId, dbaId: scope.dbaId, action, resourceType, decision: "deny", metadata: { reason: "role_denied", role: membership.role } });
    return { error: json({ ok: false, error: "ROLE_DENIED" }, 403) };
  }

  await audit(env, { actorUserId: session.user_id, organizationId: scope.organizationId, dbaId: scope.dbaId, action, resourceType, decision: "allow", metadata: { role: membership.role } });
  return { session, membership, ...scope };
}

async function bootstrap(request, env) {
  if (request.method !== "POST") return json({ ok: false, error: "METHOD_NOT_ALLOWED" }, 405);
  const supplied = request.headers.get("x-atlas-bootstrap-token") || "";
  if (!env.ATLAS_BOOTSTRAP_TOKEN || supplied !== env.ATLAS_BOOTSTRAP_TOKEN) return json({ ok: false, error: "BOOTSTRAP_DENIED" }, 403);

  const existing = await env.ATLAS_DB.prepare("SELECT COUNT(*) AS count FROM users").first();
  if (Number(existing?.count || 0) !== 0) return json({ ok: false, error: "BOOTSTRAP_ALREADY_COMPLETED" }, 409);

  const body = await bodyJson(request);
  if (!body?.email || !body?.displayName || !body?.organizationName || !body?.dbaName) return json({ ok: false, error: "INVALID_BOOTSTRAP_PAYLOAD" }, 400);

  const organizationId = id("org");
  const dbaId = id("dba");
  const userId = id("usr");
  const membershipId = id("mem");
  const sessionId = id("ses");
  const bearerToken = `${crypto.randomUUID()}${crypto.randomUUID()}`.replaceAll("-", "");
  const tokenHash = await sha256(bearerToken);

  await env.ATLAS_DB.batch([
    env.ATLAS_DB.prepare("INSERT INTO organizations (id, legal_name) VALUES (?, ?)").bind(organizationId, body.organizationName.trim()),
    env.ATLAS_DB.prepare("INSERT INTO dbas (id, organization_id, name) VALUES (?, ?, ?)").bind(dbaId, organizationId, body.dbaName.trim()),
    env.ATLAS_DB.prepare("INSERT INTO users (id, email, display_name) VALUES (?, ?, ?)").bind(userId, body.email.trim().toLowerCase(), body.displayName.trim()),
    env.ATLAS_DB.prepare("INSERT INTO memberships (id, user_id, organization_id, dba_id, role) VALUES (?, ?, ?, ?, 'owner')").bind(membershipId, userId, organizationId, dbaId),
    env.ATLAS_DB.prepare("INSERT INTO sessions (id, user_id, token_hash, expires_at) VALUES (?, ?, ?, ?)").bind(sessionId, userId, tokenHash, plusHours(12))
  ]);

  await audit(env, { actorUserId: userId, organizationId, dbaId, action: "bootstrap", resourceType: "organization", resourceId: organizationId, decision: "allow", metadata: { initialRole: "owner" } });
  return json({ ok: true, bearerToken, organizationId, dbaId, user: { id: userId, email: body.email.trim().toLowerCase(), displayName: body.displayName.trim(), role: "owner" } }, 201);
}

async function me(request, env) {
  const auth = await authenticate(request, env, null, "auth.me", "identity");
  if (auth.error) return auth.error;
  return json({ ok: true, user: { id: auth.session.user_id, email: auth.session.email, displayName: auth.session.display_name }, membership: { id: auth.membership.id, role: auth.membership.role, organizationId: auth.organizationId, dbaId: auth.dbaId } });
}

async function users(request, env) {
  if (request.method === "GET") {
    const auth = await authenticate(request, env, ["owner", "admin", "auditor"], "users.list", "user_scope");
    if (auth.error) return auth.error;
    const result = await env.ATLAS_DB.prepare(`
      SELECT u.id, u.email, u.display_name, u.status, m.id AS membership_id, m.role, m.status AS membership_status
      FROM memberships m JOIN users u ON u.id = m.user_id
      WHERE m.organization_id = ? AND m.dba_id = ?
      ORDER BY u.display_name COLLATE NOCASE
    `).bind(auth.organizationId, auth.dbaId).all();
    return json({ ok: true, users: result.results || [] });
  }

  if (request.method === "POST") {
    const auth = await authenticate(request, env, ["owner", "admin"], "users.create", "user_scope");
    if (auth.error) return auth.error;
    const body = await bodyJson(request);
    const allowedRoles = auth.membership.role === "owner" ? ["owner", "admin", "accountant", "manager", "viewer", "auditor"] : ["admin", "accountant", "manager", "viewer", "auditor"];
    if (!body?.email || !body?.displayName || !allowedRoles.includes(body?.role)) return json({ ok: false, error: "INVALID_USER_PAYLOAD" }, 400);

    let user = await env.ATLAS_DB.prepare("SELECT id, email, display_name, status FROM users WHERE email = ? COLLATE NOCASE").bind(body.email.trim()).first();
    if (!user) {
      user = { id: id("usr"), email: body.email.trim().toLowerCase(), display_name: body.displayName.trim(), status: "active" };
      await env.ATLAS_DB.prepare("INSERT INTO users (id, email, display_name) VALUES (?, ?, ?)").bind(user.id, user.email, user.display_name).run();
    }

    const membershipId = id("mem");
    try {
      await env.ATLAS_DB.prepare("INSERT INTO memberships (id, user_id, organization_id, dba_id, role) VALUES (?, ?, ?, ?, ?)")
        .bind(membershipId, user.id, auth.organizationId, auth.dbaId, body.role).run();
    } catch {
      return json({ ok: false, error: "MEMBERSHIP_ALREADY_EXISTS" }, 409);
    }
    await audit(env, { actorUserId: auth.session.user_id, organizationId: auth.organizationId, dbaId: auth.dbaId, action: "membership.create", resourceType: "membership", resourceId: membershipId, decision: "allow", metadata: { targetUserId: user.id, role: body.role } });
    return json({ ok: true, user: { id: user.id, email: user.email, displayName: user.display_name }, membership: { id: membershipId, role: body.role } }, 201);
  }

  return json({ ok: false, error: "METHOD_NOT_ALLOWED" }, 405);
}

async function membershipUpdate(request, env, membershipId) {
  if (request.method !== "PATCH") return json({ ok: false, error: "METHOD_NOT_ALLOWED" }, 405);
  const auth = await authenticate(request, env, ["owner", "admin"], "membership.update", "membership");
  if (auth.error) return auth.error;
  const body = await bodyJson(request);
  const target = await env.ATLAS_DB.prepare("SELECT id, user_id, role, status FROM memberships WHERE id = ? AND organization_id = ? AND dba_id = ?")
    .bind(membershipId, auth.organizationId, auth.dbaId).first();
  if (!target) return json({ ok: false, error: "MEMBERSHIP_NOT_FOUND" }, 404);
  if (target.role === "owner" && auth.membership.role !== "owner") return json({ ok: false, error: "OWNER_MEMBERSHIP_REQUIRES_OWNER" }, 403);

  const nextStatus = body?.status ?? target.status;
  const nextRole = body?.role ?? target.role;
  const validStatus = ["active", "suspended"].includes(nextStatus);
  const roles = auth.membership.role === "owner" ? ["owner", "admin", "accountant", "manager", "viewer", "auditor"] : ["admin", "accountant", "manager", "viewer", "auditor"];
  if (!validStatus || !roles.includes(nextRole)) return json({ ok: false, error: "INVALID_MEMBERSHIP_UPDATE" }, 400);
  if (target.user_id === auth.session.user_id && nextStatus === "suspended") return json({ ok: false, error: "SELF_SUSPENSION_DENIED" }, 409);

  await env.ATLAS_DB.prepare("UPDATE memberships SET role = ?, status = ? WHERE id = ? AND organization_id = ? AND dba_id = ?")
    .bind(nextRole, nextStatus, membershipId, auth.organizationId, auth.dbaId).run();
  await audit(env, { actorUserId: auth.session.user_id, organizationId: auth.organizationId, dbaId: auth.dbaId, action: "membership.update", resourceType: "membership", resourceId: membershipId, decision: "allow", metadata: { role: nextRole, status: nextStatus } });
  return json({ ok: true, membership: { id: membershipId, role: nextRole, status: nextStatus } });
}

async function auditList(request, env) {
  const auth = await authenticate(request, env, ["owner", "admin", "auditor"], "audit.list", "audit_scope");
  if (auth.error) return auth.error;
  const result = await env.ATLAS_DB.prepare(`
    SELECT id, actor_user_id, action, resource_type, resource_id, decision, metadata_json, created_at
    FROM audit_events WHERE organization_id = ? AND dba_id = ? ORDER BY created_at DESC LIMIT 200
  `).bind(auth.organizationId, auth.dbaId).all();
  return json({ ok: true, events: result.results || [] });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/status") return json({ ok: true, system: "ATLAS Enterprise Suite", coreVersion: "0.2.0", architecture: "modular-monorepo", timestamp: now() });
    if (url.pathname === "/api/ready") {
      if (!env.ATLAS_DB) return json({ ok: false, ready: false, error: "ATLAS_DB_BINDING_MISSING" }, 503);
      try {
        await env.ATLAS_DB.prepare("SELECT 1 AS ok").first();
        return json({ ok: true, ready: true, d1: true });
      } catch { return json({ ok: false, ready: false, d1: false }, 503); }
    }
    if (url.pathname === "/api/modules") return json({ modules });
    if (url.pathname === "/api/bootstrap") return bootstrap(request, env);
    if (url.pathname === "/api/auth/me") return me(request, env);
    if (url.pathname === "/api/users") return users(request, env);
    if (url.pathname.startsWith("/api/memberships/")) return membershipUpdate(request, env, decodeURIComponent(url.pathname.slice("/api/memberships/".length)));
    if (url.pathname === "/api/audit") return auditList(request, env);
    if (url.pathname.startsWith("/api/")) return json({ ok: false, error: "ATLAS_API_ROUTE_NOT_FOUND" }, 404);
    return env.ASSETS.fetch(request);
  }
};
