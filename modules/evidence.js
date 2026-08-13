import { requireTenantPermission } from './tenant.js';

function json(body, status = 200) {
  return Response.json(body, { status, headers: { 'cache-control': 'no-store' } });
}

function boundedLimit(value) {
  const parsed = Number.parseInt(String(value || '100'), 10);
  if (!Number.isFinite(parsed)) return 100;
  return Math.min(200, Math.max(1, parsed));
}

async function listAudit(request, env, url) {
  const authz = await requireTenantPermission(request, env, 'audit.read', 'audit.read');
  if (!authz.ok) return json({ ok: false, error: authz.error }, authz.status);

  const clauses = ['organization_id=?', 'dba_id=?'];
  const binds = [authz.organizationId, authz.dbaId];

  const category = String(url.searchParams.get('category') || '').trim();
  const decision = String(url.searchParams.get('decision') || '').trim();
  const resourceType = String(url.searchParams.get('resource_type') || '').trim();
  const correlationId = String(url.searchParams.get('correlation_id') || '').trim();

  if (category && ['authorization','security','data','system','business'].includes(category)) {
    clauses.push('category=?'); binds.push(category);
  }
  if (decision && ['allow','deny'].includes(decision)) {
    clauses.push('decision=?'); binds.push(decision);
  }
  if (resourceType) {
    clauses.push('resource_type=?'); binds.push(resourceType.slice(0, 120));
  }
  if (correlationId) {
    clauses.push('correlation_id=?'); binds.push(correlationId.slice(0, 128));
  }

  const limit = boundedLimit(url.searchParams.get('limit'));
  const result = await env.DB.prepare(`
    SELECT id,organization_id,dba_id,actor_user_id,category,action,resource_type,resource_id,
           decision,severity,correlation_id,metadata_json,created_at
    FROM audit_ledger
    WHERE ${clauses.join(' AND ')}
    ORDER BY created_at DESC
    LIMIT ?
  `).bind(...binds, limit).all();

  return json({ ok: true, correlationId: authz.correlationId, events: result.results || [], limit });
}

async function listSecurityEvents(request, env, url) {
  const authz = await requireTenantPermission(request, env, 'audit.read', 'security-events.read');
  if (!authz.ok) return json({ ok: false, error: authz.error }, authz.status);

  const clauses = ['organization_id=?', 'dba_id=?'];
  const binds = [authz.organizationId, authz.dbaId];

  const severity = String(url.searchParams.get('severity') || '').trim();
  const eventType = String(url.searchParams.get('event_type') || '').trim();
  const correlationId = String(url.searchParams.get('correlation_id') || '').trim();

  if (severity && ['low','medium','high','critical'].includes(severity)) {
    clauses.push('severity=?'); binds.push(severity);
  }
  if (eventType) {
    clauses.push('event_type=?'); binds.push(eventType.slice(0, 120));
  }
  if (correlationId) {
    clauses.push('correlation_id=?'); binds.push(correlationId.slice(0, 128));
  }

  const limit = boundedLimit(url.searchParams.get('limit'));
  const result = await env.DB.prepare(`
    SELECT id,organization_id,dba_id,actor_user_id,event_type,severity,source,resource_type,
           resource_id,correlation_id,detail_json,created_at
    FROM security_events
    WHERE ${clauses.join(' AND ')}
    ORDER BY created_at DESC
    LIMIT ?
  `).bind(...binds, limit).all();

  return json({ ok: true, correlationId: authz.correlationId, events: result.results || [], limit });
}

export async function evidenceRoutes(request, env, url = new URL(request.url)) {
  if (!env.DB) return null;
  if (url.pathname === '/api/core/audit' && request.method === 'GET') return listAudit(request, env, url);
  if (url.pathname === '/api/core/security-events' && request.method === 'GET') return listSecurityEvents(request, env, url);
  return null;
}
