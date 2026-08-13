import { CHANNELS, DIRECTIONS, auditMutation, authorize, bodyJson, boundedLimit, json, nullableText, text } from './crm-shared.js';

export async function listCommunications(request,env,url){
  const gate=await authorize(request,env,'crm.read','crm.communications.read'); if(gate.response)return gate.response; const {authz}=gate, limit=boundedLimit(url);
  const rows=await env.DB.prepare('SELECT id,account_id,contact_id,lead_id,opportunity_id,channel,direction,subject,body,provider_message_id,delivery_status,occurred_at,created_at FROM crm_communications WHERE organization_id=? AND dba_id=? ORDER BY occurred_at DESC LIMIT ?').bind(authz.organizationId,authz.dbaId,limit).all();
  return json({ok:true,communications:rows.results||[]});
}

export async function logCommunication(request,env){
  const gate=await authorize(request,env,'crm.write','crm.communication.log'); if(gate.response)return gate.response; const {authz}=gate;
  const parsed=await bodyJson(request); if(!parsed.ok)return json({ok:false,error:parsed.error},parsed.status); const b=parsed.body, channel=text(b.channel,24), direction=text(b.direction||'outbound',16);
  if(!CHANNELS.has(channel)||!DIRECTIONS.has(direction))return json({ok:false,error:'invalid_communication_channel_or_direction'},400); const id=crypto.randomUUID();
  await env.DB.prepare(`INSERT INTO crm_communications(id,organization_id,dba_id,account_id,contact_id,lead_id,opportunity_id,channel,direction,subject,body,provider_message_id,delivery_status,occurred_at,created_by_user_id) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).bind(id,authz.organizationId,authz.dbaId,nullableText(b.accountId,128),nullableText(b.contactId,128),nullableText(b.leadId,128),nullableText(b.opportunityId,128),channel,direction,nullableText(b.subject,500),nullableText(b.body,12000),nullableText(b.providerMessageId,300),text(b.deliveryStatus||'logged',24),nullableText(b.occurredAt,40)||new Date().toISOString(),authz.session.user_id).run();
  const auditRecorded=await auditMutation(env,authz,'crm.communication.log','crm_communication',id,{channel,direction}); return json({ok:true,communicationId:id,auditRecorded},201);
}
