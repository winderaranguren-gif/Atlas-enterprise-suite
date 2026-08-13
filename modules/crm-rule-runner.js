import { authorize,bodyJson,json,text } from './crm-shared.js';

export async function runRules(request,env){
  const gate=await authorize(request,env,'crm.write','crm.rules.run');
  if(gate.response)return gate.response;
  const {authz}=gate,parsed=await bodyJson(request);
  if(!parsed.ok)return json({ok:false,error:parsed.error},parsed.status);
  const entityType=text(parsed.body.entityType,32),eventType=text(parsed.body.eventType,32);
  const rows=await env.DB.prepare("SELECT id,name FROM crm_automation_rules WHERE organization_id=? AND dba_id=? AND status='active' AND entity_type=? AND event_type=?").bind(authz.organizationId,authz.dbaId,entityType,eventType).all();
  return json({ok:true,matchedRules:rows.results||[]});
}
