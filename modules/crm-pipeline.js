import { authorize, ensureDefaultStages, json } from './crm-shared.js';

export async function pipeline(request,env){
  const gate=await authorize(request,env,'crm.read','crm.pipeline.read'); if(gate.response)return gate.response; const {authz}=gate;
  await ensureDefaultStages(env,authz);
  const stages=await env.DB.prepare("SELECT id,name,slug,position,probability,is_closed,is_won FROM crm_pipeline_stages WHERE organization_id=? AND dba_id=? AND status='active' ORDER BY position").bind(authz.organizationId,authz.dbaId).all();
  const opportunities=await env.DB.prepare("SELECT id,stage_id,name,amount_cents,currency,probability,expected_close_date,owner_user_id,status,updated_at FROM crm_opportunities WHERE organization_id=? AND dba_id=? AND status!='archived' ORDER BY updated_at DESC").bind(authz.organizationId,authz.dbaId).all();
  const byStage=new Map((stages.results||[]).map(stage=>[stage.id,{...stage,opportunities:[],valueCents:0}]));
  for(const opportunity of opportunities.results||[]){const bucket=byStage.get(opportunity.stage_id);if(bucket){bucket.opportunities.push(opportunity);bucket.valueCents+=Number(opportunity.amount_cents||0)}}
  return json({ok:true,pipeline:[...byStage.values()]});
}
