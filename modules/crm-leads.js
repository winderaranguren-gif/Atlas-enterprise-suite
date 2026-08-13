import { LEAD_STATUSES, auditMutation, authorize, bodyJson, boundedLimit, computeLeadScore, integer, json, nextActionForLead, normalizedEmail, nullableText, text } from './crm-shared.js';

export async function listLeads(request,env,url){
  const gate=await authorize(request,env,'crm.read','crm.leads.read'); if(gate.response)return gate.response;
  const {authz}=gate, limit=boundedLimit(url), q=text(url.searchParams.get('q'),120), status=text(url.searchParams.get('status'),32);
  const clauses=['organization_id=?','dba_id=?'], binds=[authz.organizationId,authz.dbaId];
  if(q){const like=`%${q}%`;clauses.push('(title LIKE ? OR company_name LIKE ? OR person_name LIKE ? OR email LIKE ?)');binds.push(like,like,like,like)}
  if(LEAD_STATUSES.has(status)){clauses.push('status=?');binds.push(status)} binds.push(limit);
  const rows=await env.DB.prepare(`SELECT id,account_id,contact_id,title,company_name,person_name,email,phone,source,status,score,estimated_value_cents,currency,owner_user_id,next_action,next_action_at,converted_opportunity_id,created_at,updated_at FROM crm_leads WHERE ${clauses.join(' AND ')} ORDER BY score DESC,updated_at DESC LIMIT ?`).bind(...binds).all();
  return json({ok:true,leads:(rows.results||[]).map(row=>({...row,recommendedNextAction:nextActionForLead(row)}))});
}

export async function createLead(request,env){
  const gate=await authorize(request,env,'crm.write','crm.lead.create'); if(gate.response)return gate.response; const {authz}=gate;
  const parsed=await bodyJson(request); if(!parsed.ok)return json({ok:false,error:parsed.error},parsed.status); const b=parsed.body;
  const title=text(b.title||b.companyName||b.personName,220), status=LEAD_STATUSES.has(text(b.status,32))?text(b.status,32):'new', mail=b.email?normalizedEmail(b.email):null;
  if(title.length<2)return json({ok:false,error:'valid_lead_title_required'},400); if(b.email&&!mail)return json({ok:false,error:'invalid_email'},400);
  const score=Number.isFinite(Number(b.score))?integer(b.score,0,0,100):computeLeadScore({...b,status,email:mail}), id=crypto.randomUUID();
  await env.DB.prepare(`INSERT INTO crm_leads(id,organization_id,dba_id,account_id,contact_id,title,company_name,person_name,email,phone,source,status,score,estimated_value_cents,currency,owner_user_id,next_action,next_action_at,notes,created_by_user_id) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).bind(
    id,authz.organizationId,authz.dbaId,nullableText(b.accountId,128),nullableText(b.contactId,128),title,nullableText(b.companyName,220),nullableText(b.personName,220),mail,nullableText(b.phone,60),nullableText(b.source,120),status,score,integer(b.estimatedValueCents,0),text(b.currency||'USD',3).toUpperCase(),nullableText(b.ownerUserId,128),nullableText(b.nextAction,500),nullableText(b.nextActionAt,40),nullableText(b.notes,4000),authz.session.user_id
  ).run();
  const auditRecorded=await auditMutation(env,authz,'crm.lead.create','crm_lead',id,{status,score});
  return json({ok:true,lead:{id,title,status,score,recommendedNextAction:nextActionForLead({status,nextActionAt:b.nextActionAt})},auditRecorded},201);
}
