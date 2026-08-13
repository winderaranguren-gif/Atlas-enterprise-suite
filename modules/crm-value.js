import { authorize, json } from './crm-shared.js';
export async function pipelineValue(request,env){
  const gate=await authorize(request,env,'crm.read','crm.value.read');
  if(gate.response)return gate.response;
  const {authz}=gate;
  const row=await env.DB.prepare("SELECT COALESCE(SUM(amount_cents),0) AS total FROM crm_opportunities WHERE organization_id=? AND dba_id=? AND status='open'").bind(authz.organizationId,authz.dbaId).first();
  return json({ok:true,pipelineCents:Number(row?.total||0)});
}
