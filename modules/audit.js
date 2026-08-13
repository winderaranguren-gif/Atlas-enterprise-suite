const MAX_METADATA_BYTES = 8192;

function boundedJson(value) {
  if (value == null) return null;
  const text = JSON.stringify(value);
  if (text.length <= MAX_METADATA_BYTES) return text;
  return JSON.stringify({ truncated: true, originalLength: text.length });
}

export function correlationIdFromRequest(request) {
  const supplied = String(request.headers.get('x-atlas-correlation-id') || '').trim();
  if (/^[A-Za-z0-9._:-]{8,128}$/.test(supplied)) return supplied;
  return crypto.randomUUID();
}

export async function appendAuditLedger(env, {
  organizationId,
  dbaId,
  actorUserId = null,
  category,
  action,
  resourceType = null,
  resourceId = null,
  decision = null,
  severity = 'info',
  correlationId = null,
  metadata = null
}) {
  if (!env.DB) throw new Error('audit_database_unavailable');
  if (!organizationId || !dbaId || !category || !action) throw new Error('audit_scope_and_action_required');

  const id = crypto.randomUUID();
  await env.DB.prepare(`
    INSERT INTO audit_ledger(
      id,organization_id,dba_id,actor_user_id,category,action,resource_type,resource_id,
      decision,severity,correlation_id,metadata_json
    ) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)
  `).bind(
    id, organizationId, dbaId, actorUserId, category, action, resourceType, resourceId,
    decision, severity, correlationId, boundedJson(metadata)
  ).run();
  return id;
}

export async function appendSecurityEvent(env, {
  organizationId,
  dbaId,
  actorUserId = null,
  eventType,
  severity,
  source = 'atlas',
  resourceType = null,
  resourceId = null,
  correlationId = null,
  detail = null
}) {
  if (!env.DB) throw new Error('security_event_database_unavailable');
  if (!organizationId || !dbaId || !eventType || !severity) throw new Error('security_event_scope_required');

  const id = crypto.randomUUID();
  await env.DB.prepare(`
    INSERT INTO security_events(
      id,organization_id,dba_id,actor_user_id,event_type,severity,source,resource_type,
      resource_id,correlation_id,detail_json
    ) VALUES(?,?,?,?,?,?,?,?,?,?,?)
  `).bind(
    id, organizationId, dbaId, actorUserId, eventType, severity, source, resourceType,
    resourceId, correlationId, boundedJson(detail)
  ).run();
  return id;
}
