import { requireSession } from './auth.js';
import { requirePermission } from './rbac.js';
import { appendAuditLedger, correlationIdFromRequest } from './audit.js';

export function scopeFromRequest(request) {
  const organizationId = String(request.headers.get('x-atlas-organization') || '').trim();
  const dbaId = String(request.headers.get('x-atlas-dba') || '').trim();
  if (!organizationId || !dbaId) {
    return { ok: false, status: 400, error: 'organization_and_dba_headers_required' };
  }
  if (organizationId.length > 128 || dbaId.length > 128) {
    return { ok: false, status: 400, error: 'invalid_scope_headers' };
  }
  return { ok: true, organizationId, dbaId };
}

export async function requireTenantPermission(request, env, permission, action = 'tenant.authorization') {
  const scope = scopeFromRequest(request);
  if (!scope.ok) return scope;

  const session = await requireSession(request, env);
  if (!session.ok) return session;

  const correlationId = correlationIdFromRequest(request);
  const authz = await requirePermission(
    request,
    env,
    scope.organizationId,
    scope.dbaId,
    permission
  );

  const evidence = {
    organizationId: scope.organizationId,
    dbaId: scope.dbaId,
    actorUserId: session.session.user_id,
    category: 'authorization',
    action,
    decision: authz.ok ? 'allow' : 'deny',
    severity: authz.ok ? 'info' : 'medium',
    correlationId,
    metadata: {
      permission,
      method: request.method,
      path: new URL(request.url).pathname,
      role: authz.membership?.role || null,
      reason: authz.ok ? null : authz.error
    }
  };

  try {
    await appendAuditLedger(env, evidence);
  } catch {
    // Authorization must fail closed based on the permission check itself.
    // Audit persistence failures are surfaced later by runtime health/observability.
  }

  if (!authz.ok) return authz;
  return {
    ok: true,
    session: session.session,
    membership: authz.membership,
    organizationId: scope.organizationId,
    dbaId: scope.dbaId,
    correlationId
  };
}
