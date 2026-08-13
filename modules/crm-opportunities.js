import { OPPORTUNITY_STATUSES, auditMutation, authorize, bodyJson, boundedLimit, ensureDefaultStages, integer, json, nullableText, text } from './crm-shared.js';

export async function listOpportunities(request,env,url){
  const gate=await authorize(request,env,'crm.read','crm.opportunities.read'); if(gate.response)return gate.response;
  const {authz}=gate, limit=boundedLimit(url), status=text(url.searchParams.get('status'),24), stageId=text(url.searchParams.get('stageId'),128);
  const clauses=['o.organization_id=?','o.dba_id=?'], binds=[authz.organizationId,authz.dbaId];
  if(OPPORTUNITY_STATUSES.has(status)){clauses.push('o.status=?');binds.push(status)} if(stageId){clauses.push('o.stage_id=?');binds.push(stageId)} binds.push(limit);
  const rows=await env.DB.prepare(`SELECT o.id,o.account_id,o.primary_contact_id,o.lead_id,o.stage_id,s.name AS stage_name,o.name,o.description,o.amount_cents,o.currency,o.probability,o.expected_close_date,o.owner_user_id,o.source,o.status,o.loss_reason,o.last_activity_at,o.next_activity_at,o.created_at,o.updated_at FROM crm_opportunities o JOIN crm_pipeline_stages s ON s.id=o.stage_id AND s.organization_id=o.organization_id AND s.dba_id=o.dba_id WHERE ${clauses.join(' AND ')} ORDER BY o.updated_at DESC LIMIT ?`).bind(...binds).all();
  return json({ok:true,opportunities:rows.results||[]});
}

export async function createOpportunity(request,env){
  const gate=await authorize(request,env,'crm.write','crm.opportunity.create'); if(gate.response)return gate.response; const {authz}=gate;
  await ensureDefaultStages(env,authz); const parsed=await bodyJson(request); if(!parsed.ok)return json({ok:false,error:parsed.error},parsed.status); const b=parsed.body, name=text(b.name,220);
  if(name.length<2)return json({ok:false,error:'valid_opportunity_name_required'},400);
  let stageId=nullableText(b.stageId,128); if(!stageId){const first=await env.DB.prepare("SELECT id FROM crm_pipeline_stages WHERE organization_id=? AND dba_id=? AND status='active' AND is_closed=0 ORDER BY position LIMIT 1").bind(authz.organizationId,authz.dbaId).first();stageId=first?.id}
  const stage=await env.DB.prepare('SELECT id,probability,is_closed,is_won FROM crm_pipeline_stages WHERE id=? AND organization_id=? AND dba_id=?').bind(stageId,authz.organizationId,authz.dbaId).first(); if(!stage)return json({ok:false,error:'stage_not_found'},404);
  const status=stage.is_closed?(stage.is_won?'won':'lost'):'open', id=crypto.randomUUID();
  await env.DB.prepare(`INSERT INTO crm_opportunities(id,organization_id,dba_id,account_id,primary_contact_id,lead_id,stage_id,name,description,amount_cents,currency,probability,expected_close_date,owner_user_id,source,status,next_activity_at,created_by_user_id) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).bind(id,authz.organizationId,authz.dbaId,nullableText(b.accountId,128),nullableText(b.primaryContactId,128),nullableText(b.leadId,128),stageId,name,nullableText(b.description,4000),integer(b.amountCents,0),text(b.currency||'USD',3).toUpperCase(),integer(b.probability??stage.probability,stage.probability,0,100),nullableText(b.expectedCloseDate,40),nullableText(b.ownerUserId,128),nullableText(b.source,120),status,nullableText(b.nextActivityAt,40),authz.session.user_id).run();
  const auditRecorded=await auditMutation(env,authz,'crm.opportunity.create','crm_opportunity',id,{stageId,status}); return json({ok:true,opportunity:{id,name,stageId,status},auditRecorded},201);
}
