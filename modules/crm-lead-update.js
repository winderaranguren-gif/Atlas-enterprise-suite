import { LEAD_STATUSES, auditMutation, authorize, bodyJson, computeLeadScore, integer, json, nextActionForLead, normalizedEmail, nullableText, text } from './crm-shared.js';

export async function patchLead(request,env,id){
  const gate=await authorize(request,env,'crm.write','crm.lead.update'); if(gate.response)return gate.response; const {authz}=gate;
  const existing=await env.DB.prepare('SELECT id,status FROM crm_leads WHERE id=? AND organization_id=? AND dba_id=?').bind(id,authz.organizationId,authz.dbaId).first(); if(!existing)return json({ok:false,error:'lead_not_found'},404);
  const parsed=await bodyJson(request); if(!parsed.ok)return json({ok:false,error:parsed.error},parsed.status); const b=parsed.body, sets=[], binds=[]; const add=(k,v)=>{sets.push(`${k}=?`);binds.push(v)};
  for(const [key,col,max] of [['title','title',220],['companyName','company_name',220],['personName','person_name',220],['phone','phone',60],['source','source',120],['ownerUserId','owner_user_id',128],['nextAction','next_action',500],['nextActionAt','next_action_at',40],['notes','notes',4000],['accountId','account_id',128],['contactId','contact_id',128]])if(key in b)add(col,nullableText(b[key],max));
  if('email'in b){const v=b.email?normalizedEmail(b.email):null;if(b.email&&!v)return json({ok:false,error:'invalid_email'},400);add('email',v)}
  if('status'in b){const v=text(b.status,32);if(!LEAD_STATUSES.has(v))return json({ok:false,error:'invalid_lead_status'},400);add('status',v)}
  if('score'in b)add('score',integer(b.score,0,0,100)); if('estimatedValueCents'in b)add('estimated_value_cents',integer(b.estimatedValueCents,0));
  if(!sets.length)return json({ok:false,error:'no_supported_changes'},400); sets.push('updated_at=CURRENT_TIMESTAMP'); binds.push(id,authz.organizationId,authz.dbaId);
  await env.DB.prepare(`UPDATE crm_leads SET ${sets.join(',')} WHERE id=? AND organization_id=? AND dba_id=?`).bind(...binds).run();
  const auditRecorded=await auditMutation(env,authz,'crm.lead.update','crm_lead',id); return json({ok:true,leadId:id,auditRecorded});
}

export async function scoreLead(request,env,id){
  const gate=await authorize(request,env,'crm.write','crm.lead.score'); if(gate.response)return gate.response; const {authz}=gate;
  const lead=await env.DB.prepare('SELECT * FROM crm_leads WHERE id=? AND organization_id=? AND dba_id=?').bind(id,authz.organizationId,authz.dbaId).first(); if(!lead)return json({ok:false,error:'lead_not_found'},404);
  const score=computeLeadScore(lead); await env.DB.prepare('UPDATE crm_leads SET score=?,updated_at=CURRENT_TIMESTAMP WHERE id=? AND organization_id=? AND dba_id=?').bind(score,id,authz.organizationId,authz.dbaId).run();
  await auditMutation(env,authz,'crm.lead.score','crm_lead',id,{score}); return json({ok:true,leadId:id,score,recommendedNextAction:nextActionForLead(lead)});
}
