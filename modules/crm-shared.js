import { requireTenantPermission } from './tenant.js';
import { appendAuditLedger } from './audit.js';

export const ACCOUNT_TYPES = new Set(['prospect','customer','partner','vendor','other']);
export const RECORD_STATUSES = new Set(['active','inactive','archived']);
export const LEAD_STATUSES = new Set(['new','contacted','qualified','unqualified','converted','archived']);
export const OPPORTUNITY_STATUSES = new Set(['open','won','lost','archived']);
export const ACTIVITY_TYPES = new Set(['call','email','meeting','task','note','sms','demo','follow_up']);
export const ACTIVITY_STATUSES = new Set(['open','completed','cancelled']);
export const QUOTE_STATUSES = new Set(['draft','sent','viewed','accepted','rejected','expired','archived']);
export const CHANNELS = new Set(['email','phone','sms','meeting','chat','other']);
export const DIRECTIONS = new Set(['inbound','outbound']);
export const RULE_ENTITIES = new Set(['lead','opportunity','account','contact']);
export const RULE_EVENTS = new Set(['created','updated','stage_changed','status_changed']);
export const RULE_STATUSES = new Set(['active','paused','archived']);

export function json(body, status = 200) {
  return Response.json(body, { status, headers: { 'cache-control': 'no-store' } });
}

export function enabled(env) {
  return String(env.ATLAS_ENABLE_CRM ?? 'true').trim().toLowerCase() !== 'false';
}

export function text(value, max = 240) {
  return String(value ?? '').trim().replace(/\s+/g, ' ').slice(0, max);
}

export function nullableText(value, max = 1000) {
  const result = text(value, max);
  return result || null;
}

export function normalizedEmail(value) {
  const result = text(value, 254).toLowerCase();
  if (!result) return null;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(result) ? result : null;
}

export function normalizedUrl(value) {
  const result = text(value, 500);
  if (!result) return null;
  try {
    const parsed = new URL(result.includes('://') ? result : `https://${result}`);
    return ['http:','https:'].includes(parsed.protocol) ? parsed.toString() : null;
  } catch { return null; }
}

export function integer(value, fallback = 0, min = 0, max = Number.MAX_SAFE_INTEGER) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(max, Math.trunc(parsed)));
}

export function boundedLimit(url, fallback = 50, max = 200) {
  return integer(url.searchParams.get('limit'), fallback, 1, max);
}

export function tagsJson(value) {
  const values = Array.isArray(value) ? value : [];
  return JSON.stringify([...new Set(values.map(v => text(v, 60)).filter(Boolean))].slice(0, 30));
}

export async function bodyJson(request, maxBytes = 262144) {
  const raw = await request.text();
  if (raw.length > maxBytes) return { ok:false, status:413, error:'payload_too_large' };
  if (!raw.trim()) return { ok:true, body:{} };
  try { return { ok:true, body:JSON.parse(raw) }; }
  catch { return { ok:false, status:400, error:'invalid_json' }; }
}

export async function authorize(request, env, permission, action) {
  const authz = await requireTenantPermission(request, env, permission, action);
  if (!authz.ok) return { response:json({ ok:false, error:authz.error }, authz.status) };
  return { authz };
}

export async function auditMutation(env, authz, action, resourceType, resourceId, metadata = null) {
  try {
    await appendAuditLedger(env, {
      organizationId:authz.organizationId,
      dbaId:authz.dbaId,
      actorUserId:authz.session.user_id,
      category:'crm', action, resourceType, resourceId,
      decision:'allow', severity:'info', correlationId:authz.correlationId, metadata
    });
    return true;
  } catch { return false; }
}

export function slug(value) {
  return text(value, 120).toLowerCase().normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '').slice(0, 64);
}

export async function ensureDefaultStages(env, authz) {
  const existing = await env.DB.prepare('SELECT COUNT(*) AS total FROM crm_pipeline_stages WHERE organization_id=? AND dba_id=?')
    .bind(authz.organizationId, authz.dbaId).first();
  if (Number(existing?.total || 0) > 0) return;
  const defaults = [
    ['New','new',10,10,0,0],['Contacted','contacted',20,20,0,0],['Qualified','qualified',30,40,0,0],
    ['Meeting','meeting',40,55,0,0],['Proposal','proposal',50,70,0,0],['Negotiation','negotiation',60,85,0,0],
    ['Won','won',70,100,1,1],['Lost','lost',80,0,1,0]
  ];
  await env.DB.batch(defaults.map(([name,stageSlug,position,probability,isClosed,isWon]) => env.DB.prepare(
    'INSERT OR IGNORE INTO crm_pipeline_stages(id,organization_id,dba_id,name,slug,position,probability,is_closed,is_won,created_by_user_id) VALUES(?,?,?,?,?,?,?,?,?,?)'
  ).bind(crypto.randomUUID(),authz.organizationId,authz.dbaId,name,stageSlug,position,probability,isClosed,isWon,authz.session.user_id)));
}

export function computeLeadScore(lead) {
  let score = 0;
  if (lead.email) score += 20;
  if (lead.phone) score += 15;
  if (lead.companyName || lead.company_name) score += 15;
  if (integer(lead.estimatedValueCents ?? lead.estimated_value_cents, 0) > 0) score += 20;
  if (lead.nextActionAt || lead.next_action_at) score += 10;
  if (['contacted','qualified'].includes(lead.status)) score += 10;
  if (lead.source) score += 5;
  if (lead.ownerUserId || lead.owner_user_id) score += 5;
  return Math.min(100, score);
}

export function nextActionForLead(lead) {
  if (lead.status === 'new') return 'Make first contact';
  if (lead.status === 'contacted') return 'Qualify need, budget and timing';
  if (lead.status === 'qualified') return 'Create opportunity and schedule next meeting';
  if (!(lead.nextActionAt || lead.next_action_at)) return 'Schedule a follow-up';
  return 'Continue planned follow-up';
}
