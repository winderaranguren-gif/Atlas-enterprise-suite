import { requireSession } from './auth.js';

const ROLES = new Set(['owner','admin','manager','member','auditor','viewer']);

function json(body, status = 200) {
  return Response.json(body, { status, headers: { 'cache-control': 'no-store' } });
}

function cleanName(value) {
  return String(value || '').trim().replace(/\s+/g, ' ').slice(0, 120);
}

function slugify(value) {
  return cleanName(value).toLowerCase().normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
}

async function authorizationAudit(env, { userId = null, organizationId = null, dbaId = null, action, permission = null, decision, metadata = null }) {
  if (!env.DB) return;
  await env.DB.prepare(
    'INSERT INTO authorization_audit_events(id,user_id,organization_id,dba_id,action,permission,decision,metadata_json) VALUES(?,?,?,?,?,?,?,?)'
  ).bind(
    crypto.randomUUID(), userId, organizationId, dbaId, action, permission, decision,
    metadata ? JSON.stringify(metadata) : null
  ).run();
}

export async function requirePermission(request, env, organizationId, dbaId, permission) {
  const auth = await requireSession(request, env);
  if (!auth.ok) return auth;
  if (!organizationId || !dbaId || !permission) {
    return { ok: false, status: 400, error: 'organization_dba_permission_required' };
  }

  const membership = await env.DB.prepare(`
    SELECT m.id,m.role,m.status,o.status AS organization_status,d.status AS dba_status
    FROM memberships m
    JOIN organizations o ON o.id=m.organization_id
    JOIN dbas d ON d.id=m.dba_id AND d.organization_id=m.organization_id
    WHERE m.user_id=? AND m.organization_id=? AND m.dba_id=?
  `).bind(auth.session.user_id, organizationId, dbaId).first();

  if (!membership || membership.status !== 'active' || membership.organization_status !== 'active' || membership.dba_status !== 'active') {
    await authorizationAudit(env, {
      userId: auth.session.user_id, organizationId, dbaId, action: 'authorization.check', permission,
      decision: 'deny', metadata: { reason: 'active_membership_required' }
    });
    return { ok: false, status: 403, error: 'scope_forbidden' };
  }

  const allowed = await env.DB.prepare(
    'SELECT 1 AS allowed FROM role_permissions WHERE role=? AND permission=?'
  ).bind(membership.role, permission).first();

  if (!allowed) {
    await authorizationAudit(env, {
      userId: auth.session.user_id, organizationId, dbaId, action: 'authorization.check', permission,
      decision: 'deny', metadata: { reason: 'permission_denied', role: membership.role }
    });
    return { ok: false, status: 403, error: 'permission_denied' };
  }

  await authorizationAudit(env, {
    userId: auth.session.user_id, organizationId, dbaId, action: 'authorization.check', permission,
    decision: 'allow', metadata: { role: membership.role }
  });
  return { ok: true, session: auth.session, membership };
}

async function requireOrganizationAdmin(request, env, organizationId) {
  const auth = await requireSession(request, env);
  if (!auth.ok) return auth;
  const membership = await env.DB.prepare(`
    SELECT m.role,o.status AS organization_status
    FROM memberships m
    JOIN organizations o ON o.id=m.organization_id
    JOIN dbas d ON d.id=m.dba_id AND d.organization_id=m.organization_id
    WHERE m.user_id=? AND m.organization_id=? AND m.status='active' AND d.status='active'
      AND m.role IN ('owner','admin')
    LIMIT 1
  `).bind(auth.session.user_id, organizationId).first();
  if (!membership || membership.organization_status !== 'active') {
    await authorizationAudit(env, {
      userId: auth.session.user_id, organizationId, action: 'organization.authorization', permission: 'dba.manage', decision: 'deny'
    });
    return { ok: false, status: 403, error: 'organization_admin_required' };
  }
  return { ok: true, session: auth.session, membership };
}

async function createOrganization(request, env) {
  const auth = await requireSession(request, env);
  if (!auth.ok) return json({ ok: false, error: auth.error }, auth.status);
  const body = await request.json().catch(() => null);
  const name = cleanName(body?.name);
  const slug = slugify(body?.slug || name);
  const dbaName = cleanName(body?.dbaName || name || 'Primary');
  const dbaSlug = slugify(body?.dbaSlug || dbaName);
  if (name.length < 2 || !slug || dbaName.length < 2 || !dbaSlug) {
    return json({ ok: false, error: 'valid_organization_and_dba_required' }, 400);
  }

  const organizationId = crypto.randomUUID();
  const dbaId = crypto.randomUUID();
  const membershipId = crypto.randomUUID();
  try {
    await env.DB.batch([
      env.DB.prepare('INSERT INTO organizations(id,name,slug,created_by_user_id) VALUES(?,?,?,?)')
        .bind(organizationId, name, slug, auth.session.user_id),
      env.DB.prepare('INSERT INTO dbas(id,organization_id,name,slug,created_by_user_id) VALUES(?,?,?,?,?)')
        .bind(dbaId, organizationId, dbaName, dbaSlug, auth.session.user_id),
      env.DB.prepare("INSERT INTO memberships(id,user_id,organization_id,dba_id,role,created_by_user_id) VALUES(?,?,?,?, 'owner', ?)")
        .bind(membershipId, auth.session.user_id, organizationId, dbaId, auth.session.user_id)
    ]);
  } catch (error) {
    return json({ ok: false, error: 'organization_create_conflict' }, 409);
  }

  await authorizationAudit(env, {
    userId: auth.session.user_id, organizationId, dbaId, action: 'organization.create',
    permission: 'organization.manage', decision: 'allow'
  });
  return json({
    ok: true,
    organization: { id: organizationId, name, slug },
    dba: { id: dbaId, name: dbaName, slug: dbaSlug },
    membership: { role: 'owner' }
  }, 201);
}

async function getContext(request, env) {
  const auth = await requireSession(request, env);
  if (!auth.ok) return json({ ok: false, error: auth.error }, auth.status);
  const rows = await env.DB.prepare(`
    SELECT m.organization_id,m.dba_id,m.role,m.status,o.name AS organization_name,o.slug AS organization_slug,
           d.name AS dba_name,d.slug AS dba_slug,rp.permission
    FROM memberships m
    JOIN organizations o ON o.id=m.organization_id
    JOIN dbas d ON d.id=m.dba_id AND d.organization_id=m.organization_id
    LEFT JOIN role_permissions rp ON rp.role=m.role
    WHERE m.user_id=? AND m.status='active' AND o.status='active' AND d.status='active'
    ORDER BY o.name,d.name,rp.permission
  `).bind(auth.session.user_id).all();

  const scopes = new Map();
  for (const row of rows.results || []) {
    const key = `${row.organization_id}:${row.dba_id}`;
    if (!scopes.has(key)) scopes.set(key, {
      organization: { id: row.organization_id, name: row.organization_name, slug: row.organization_slug },
      dba: { id: row.dba_id, name: row.dba_name, slug: row.dba_slug },
      role: row.role,
      permissions: []
    });
    if (row.permission) scopes.get(key).permissions.push(row.permission);
  }
  return json({ ok: true, userId: auth.session.user_id, scopes: [...scopes.values()] });
}

async function createDba(request, env, organizationId) {
  const authz = await requireOrganizationAdmin(request, env, organizationId);
  if (!authz.ok) return json({ ok: false, error: authz.error }, authz.status);
  const body = await request.json().catch(() => null);
  const name = cleanName(body?.name);
  const slug = slugify(body?.slug || name);
  if (name.length < 2 || !slug) return json({ ok: false, error: 'valid_dba_required' }, 400);

  const dbaId = crypto.randomUUID();
  try {
    await env.DB.batch([
      env.DB.prepare('INSERT INTO dbas(id,organization_id,name,slug,created_by_user_id) VALUES(?,?,?,?,?)')
        .bind(dbaId, organizationId, name, slug, authz.session.user_id),
      env.DB.prepare('INSERT INTO memberships(id,user_id,organization_id,dba_id,role,created_by_user_id) VALUES(?,?,?,?,?,?)')
        .bind(crypto.randomUUID(), authz.session.user_id, organizationId, dbaId, authz.membership.role, authz.session.user_id)
    ]);
  } catch {
    return json({ ok: false, error: 'dba_create_conflict' }, 409);
  }

  await authorizationAudit(env, {
    userId: authz.session.user_id, organizationId, dbaId, action: 'dba.create', permission: 'dba.manage', decision: 'allow'
  });
  return json({ ok: true, dba: { id: dbaId, organizationId, name, slug }, role: authz.membership.role }, 201);
}

async function upsertMembership(request, env) {
  const body = await request.json().catch(() => null);
  const organizationId = String(body?.organizationId || '');
  const dbaId = String(body?.dbaId || '');
  const userId = String(body?.userId || '');
  const role = String(body?.role || '');
  if (!organizationId || !dbaId || !userId || !ROLES.has(role)) {
    return json({ ok: false, error: 'valid_membership_scope_required' }, 400);
  }

  const authz = await requirePermission(request, env, organizationId, dbaId, 'membership.manage');
  if (!authz.ok) return json({ ok: false, error: authz.error }, authz.status);
  if (role === 'owner' && authz.membership.role !== 'owner') {
    return json({ ok: false, error: 'only_owner_can_assign_owner' }, 403);
  }

  const targetUser = await env.DB.prepare("SELECT id FROM users WHERE id=? AND status='active'").bind(userId).first();
  const targetDba = await env.DB.prepare("SELECT id FROM dbas WHERE id=? AND organization_id=? AND status='active'")
    .bind(dbaId, organizationId).first();
  if (!targetUser || !targetDba) return json({ ok: false, error: 'membership_target_not_found' }, 404);

  const existing = await env.DB.prepare(
    'SELECT id FROM memberships WHERE user_id=? AND organization_id=? AND dba_id=?'
  ).bind(userId, organizationId, dbaId).first();

  if (existing) {
    await env.DB.prepare("UPDATE memberships SET role=?,status='active',updated_at=CURRENT_TIMESTAMP WHERE id=?")
      .bind(role, existing.id).run();
  } else {
    await env.DB.prepare(
      'INSERT INTO memberships(id,user_id,organization_id,dba_id,role,created_by_user_id) VALUES(?,?,?,?,?,?)'
    ).bind(crypto.randomUUID(), userId, organizationId, dbaId, role, authz.session.user_id).run();
  }

  await authorizationAudit(env, {
    userId: authz.session.user_id, organizationId, dbaId, action: 'membership.upsert',
    permission: 'membership.manage', decision: 'allow', metadata: { targetUserId: userId, role }
  });
  return json({ ok: true, membership: { userId, organizationId, dbaId, role, status: 'active' } });
}

export async function rbacRoutes(request, env, url = new URL(request.url)) {
  if (!url.pathname.startsWith('/api/core/')) return null;
  if (!env.DB) return json({ ok: false, error: 'identity_database_unavailable' }, 503);

  if (url.pathname === '/api/core/organizations' && request.method === 'POST') return createOrganization(request, env);
  if (url.pathname === '/api/core/context' && request.method === 'GET') return getContext(request, env);
  if (url.pathname === '/api/core/memberships' && request.method === 'POST') return upsertMembership(request, env);

  const dbaMatch = url.pathname.match(/^\/api\/core\/organizations\/([^/]+)\/dbas$/);
  if (dbaMatch && request.method === 'POST') return createDba(request, env, decodeURIComponent(dbaMatch[1]));
  return null;
}
