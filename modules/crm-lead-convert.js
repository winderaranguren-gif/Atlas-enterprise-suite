import { auditMutation, authorize, bodyJson, ensureDefaultStages, integer, json, nullableText, text } from './crm-shared.js';

export async function convertLead(request,env,id){
  const gate=await authorize(request,env,'crm.write','crm.lead.convert'); if(gate.response)return gate.response; const {authz}=gate;
  const lead=await env.DB.prepare('SELECT * FROM crm_leads WHERE id=? AND organization_id=? AND dba_id=?').bind(id,authz.organizationId,authz.dbaId).first();
  if(!lead)return json({ok:false,error:'lead_not_found'},404); if(lead.status==='converted')return json({ok:false,error:'lead_already_converted'},409);
  await ensureDefaultStages(env,authz);
  const stage=await env.DB.prepare("SELECT id,probability FROM crm_pipeline_stages WHERE organization_id=? AND dba_id=? AND status='active' AND is_closed=0 ORDER BY position LIMIT 1").bind(authz.organizationId,authz.dbaId).first();
  if(!stage)return json({ok:false,error:'pipeline_stage_unavailable'},409);
  const parsed=await bodyJson(request); if(!parsed.ok)return json({ok:false,error:parsed.error},parsed.status); const b=parsed.body;
  let accountId=lead.account_id, contactId=lead.contact_id;
  if(!accountId&&lead.company_name){
    accountId=crypto.randomUUID();
    await env.DB.prepare("INSERT INTO crm_accounts(id,organization_id,dba_id,name,account_type,email,phone,source,owner_user_id,created_by_user_id) VALUES(?,?,?,?, 'prospect',?,?,?,?,?)").bind(accountId,authz.organizationId,authz.dbaId,lead.company_name,lead.email,lead.phone,lead.source,lead.owner_user_id,authz.session.user_id).run();
  }
  if(!contactId&&lead.person_name){
    const parts=text(lead.person_name,220).split(' '); const first=parts.shift()||'Contact', last=parts.join(' ')||'Unknown';
    contactId=crypto.randomUUID();
    await env.DB.prepare('INSERT INTO crm_contacts(id,organization_id,dba_id,account_id,first_name,last_name,display_name,email,phone,source,owner_user_id,created_by_user_id) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)').bind(contactId,authz.organizationId,authz.dbaId,accountId,first,last,lead.person_name,lead.email,lead.phone,lead.source,lead.owner_user_id,authz.session.user_id).run();
  }
  const opportunityId=crypto.randomUUID(), name=text(b.opportunityName||lead.title,220);
  await env.DB.prepare(`INSERT INTO crm_opportunities(id,organization_id,dba_id,account_id,primary_contact_id,lead_id,stage_id,name,amount_cents,currency,probability,expected_close_date,owner_user_id,source,status,created_by_user_id) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).bind(
    opportunityId,authz.organizationId,authz.dbaId,accountId,contactId,id,stage.id,name,integer(b.amountCents??lead.estimated_value_cents,0),text(b.currency||lead.currency||'USD',3).toUpperCase(),integer(b.probability??stage.probability,stage.probability,0,100),nullableText(b.expectedCloseDate,40),nullableText(b.ownerUserId,128)||lead.owner_user_id,lead.source,'open',authz.session.user_id
  ).run();
  await env.DB.prepare("UPDATE crm_leads SET status='converted',account_id=?,contact_id=?,converted_opportunity_id=?,updated_at=CURRENT_TIMESTAMP WHERE id=? AND organization_id=? AND dba_id=?").bind(accountId,contactId,opportunityId,id,authz.organizationId,authz.dbaId).run();
  await auditMutation(env,authz,'crm.lead.convert','crm_lead',id,{opportunityId,accountId,contactId});
  return json({ok:true,leadId:id,accountId,contactId,opportunityId},201);
}
