import { RULE_ENTITIES,RULE_EVENTS,RULE_STATUSES,auditMutation,authorize,bodyJson,json,text } from './crm-shared.js';

export async function listRules(request,env){
  const gate=await authorize(request,env,'crm.admin','crm.rules.read');
  if(gate.response)return gate.response;
  const {authz}=gate;
  const rows=await env.DB.prepare('SELECT id,name,entity_type,event_type,condition_json,action_json,status,created_at,updated_at FROM crm_automation_rules WHERE organization_id=? AND dba_id=? ORDER BY updated_at DESC').bind(authz.organizationId,authz.dbaId).all();
  return json({ok:true,rules:rows.results||[]});
}

export async function createRule(request,env){
  const gate=await authorize(request,env,'crm.admin','crm.rule.create');
  if(gate.response)return gate.response;
  const {authz}=gate, parsed=await bodyJson(request);
  if(!parsed.ok)return json({ok:false,error:parsed.error},parsed.status);
  const body=parsed.body,name=text(body.name,160),entityType=text(body.entityType,32),eventType=text(body.eventType,32),status=RULE_STATUSES.has(text(body.status,24))?text(body.status,24):'active';
  if(name.length<2||!RULE_ENTITIES.has(entityType)||!RULE_EVENTS.has(eventType))return json({ok:false,error:'valid_rule_required'},400);
  let conditionJson='{}',actionJson='{}';
  try{conditionJson=JSON.stringify(body.condition||{});actionJson=JSON.stringify(body.action||{})}catch{return json({ok:false,error:'invalid_rule_json'},400)}
  const id=crypto.randomUUID();
  await env.DB.prepare('INSERT INTO crm_automation_rules(id,organization_id,dba_id,name,entity_type,event_type,condition_json,action_json,status,created_by_user_id) VALUES(?,?,?,?,?,?,?,?,?,?)').bind(id,authz.organizationId,authz.dbaId,name,entityType,eventType,conditionJson,actionJson,status,authz.session.user_id).run();
  const auditRecorded=await auditMutation(env,authz,'crm.rule.create','crm_rule',id);
  return json({ok:true,rule:{id,name,entityType,eventType,status},auditRecorded},201);
}
