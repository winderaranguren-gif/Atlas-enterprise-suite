import { ACTIVITY_STATUSES, ACTIVITY_TYPES, auditMutation, authorize, bodyJson, boundedLimit, json, nullableText, text } from './crm-shared.js';

export async function listActivities(request,env,url){
  const gate=await authorize(request,env,'crm.read','crm.activities.read'); if(gate.response)return gate.response;
  const {authz}=gate, limit=boundedLimit(url), status=text(url.searchParams.get('status'),24), opportunityId=text(url.searchParams.get('opportunityId'),128);
  const clauses=['organization_id=?','dba_id=?'], binds=[authz.organizationId,authz.dbaId];
  if(ACTIVITY_STATUSES.has(status)){clauses.push('status=?');binds.push(status)} if(opportunityId){clauses.push('opportunity_id=?');binds.push(opportunityId)} binds.push(limit);
  const rows=await env.DB.prepare(`SELECT id,account_id,contact_id,lead_id,opportunity_id,activity_type,subject,description,status,due_at,completed_at,owner_user_id,created_at,updated_at FROM crm_activities WHERE ${clauses.join(' AND ')} ORDER BY CASE WHEN due_at IS NULL THEN 1 ELSE 0 END,due_at,created_at DESC LIMIT ?`).bind(...binds).all();
  return json({ok:true,activities:rows.results||[]});
}

export async function createActivity(request,env){
  const gate=await authorize(request,env,'crm.write','crm.activity.create'); if(gate.response)return gate.response; const {authz}=gate;
  const parsed=await bodyJson(request); if(!parsed.ok)return json({ok:false,error:parsed.error},parsed.status); const b=parsed.body, type=text(b.activityType||'task',32), subject=text(b.subject,220);
  if(!ACTIVITY_TYPES.has(type)||subject.length<2)return json({ok:false,error:'valid_activity_required'},400); const status=ACTIVITY_STATUSES.has(text(b.status,24))?text(b.status,24):'open', id=crypto.randomUUID();
  await env.DB.prepare(`INSERT INTO crm_activities(id,organization_id,dba_id,account_id,contact_id,lead_id,opportunity_id,activity_type,subject,description,status,due_at,completed_at,owner_user_id,created_by_user_id) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).bind(id,authz.organizationId,authz.dbaId,nullableText(b.accountId,128),nullableText(b.contactId,128),nullableText(b.leadId,128),nullableText(b.opportunityId,128),type,subject,nullableText(b.description,4000),status,nullableText(b.dueAt,40),status==='completed'?new Date().toISOString():null,nullableText(b.ownerUserId,128),authz.session.user_id).run();
  if(b.opportunityId)await env.DB.prepare('UPDATE crm_opportunities SET last_activity_at=CURRENT_TIMESTAMP,next_activity_at=?,updated_at=CURRENT_TIMESTAMP WHERE id=? AND organization_id=? AND dba_id=?').bind(nullableText(b.dueAt,40),text(b.opportunityId,128),authz.organizationId,authz.dbaId).run();
  const auditRecorded=await auditMutation(env,authz,'crm.activity.create','crm_activity',id,{type,status}); return json({ok:true,activity:{id,type,subject,status},auditRecorded},201);
}
