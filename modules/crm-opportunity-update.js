import { OPPORTUNITY_STATUSES, auditMutation, authorize, bodyJson, integer, json, nullableText, text } from './crm-shared.js';

export async function patchOpportunity(request,env,id){
  const gate=await authorize(request,env,'crm.write','crm.opportunity.update'); if(gate.response)return gate.response; const {authz}=gate;
  const existing=await env.DB.prepare('SELECT id,status FROM crm_opportunities WHERE id=? AND organization_id=? AND dba_id=?').bind(id,authz.organizationId,authz.dbaId).first(); if(!existing)return json({ok:false,error:'opportunity_not_found'},404);
  const parsed=await bodyJson(request); if(!parsed.ok)return json({ok:false,error:parsed.error},parsed.status); const b=parsed.body, sets=[], binds=[]; const add=(k,v)=>{sets.push(`${k}=?`);binds.push(v)};
  for(const [key,col,max] of [['name','name',220],['description','description',4000],['expectedCloseDate','expected_close_date',40],['ownerUserId','owner_user_id',128],['source','source',120],['lossReason','loss_reason',500],['nextActivityAt','next_activity_at',40],['accountId','account_id',128],['primaryContactId','primary_contact_id',128]])if(key in b)add(col,nullableText(b[key],max));
  if('amountCents'in b)add('amount_cents',integer(b.amountCents,0)); if('probability'in b)add('probability',integer(b.probability,0,0,100));
  if('stageId'in b){const stage=await env.DB.prepare('SELECT id,probability,is_closed,is_won FROM crm_pipeline_stages WHERE id=? AND organization_id=? AND dba_id=?').bind(text(b.stageId,128),authz.organizationId,authz.dbaId).first();if(!stage)return json({ok:false,error:'stage_not_found'},404);add('stage_id',stage.id);add('probability',integer(b.probability??stage.probability,stage.probability,0,100));add('status',stage.is_closed?(stage.is_won?'won':'lost'):'open')} else if('status'in b){const v=text(b.status,24);if(!OPPORTUNITY_STATUSES.has(v))return json({ok:false,error:'invalid_opportunity_status'},400);add('status',v)}
  if(!sets.length)return json({ok:false,error:'no_supported_changes'},400); sets.push('updated_at=CURRENT_TIMESTAMP'); binds.push(id,authz.organizationId,authz.dbaId);
  await env.DB.prepare(`UPDATE crm_opportunities SET ${sets.join(',')} WHERE id=? AND organization_id=? AND dba_id=?`).bind(...binds).run();
  const auditRecorded=await auditMutation(env,authz,'crm.opportunity.update','crm_opportunity',id); return json({ok:true,opportunityId:id,auditRecorded});
}
