import { auditMutation, authorize, bodyJson, integer, json, slug, text } from './crm-shared.js';

export async function listStages(request,env){
  const gate=await authorize(request,env,'crm.read','crm.stages.read');
  if(gate.response)return gate.response;
  const {authz}=gate;
  const rows=await env.DB.prepare('SELECT id,name,slug,position,probability,is_closed,is_won,status FROM crm_pipeline_stages WHERE organization_id=? AND dba_id=? ORDER BY position').bind(authz.organizationId,authz.dbaId).all();
  return json({ok:true,stages:rows.results||[]});
}

export async function createStage(request,env){
  const gate=await authorize(request,env,'crm.admin','crm.stage.create');
  if(gate.response)return gate.response;
  const {authz}=gate;
  const parsed=await bodyJson(request);
  if(!parsed.ok)return json({ok:false,error:parsed.error},parsed.status);
  const b=parsed.body, name=text(b.name,120), stageSlug=slug(b.slug||name);
  if(name.length<2||!stageSlug)return json({ok:false,error:'valid_stage_required'},400);
  const id=crypto.randomUUID();
  await env.DB.prepare('INSERT INTO crm_pipeline_stages(id,organization_id,dba_id,name,slug,position,probability,is_closed,is_won,status,created_by_user_id) VALUES(?,?,?,?,?,?,?,?,?,?,?)').bind(id,authz.organizationId,authz.dbaId,name,stageSlug,integer(b.position,10,0,999),integer(b.probability,0,0,100),b.isClosed?1:0,b.isWon?1:0,'active',authz.session.user_id).run();
  const auditRecorded=await auditMutation(env,authz,'crm.stage.create','crm_stage',id);
  return json({ok:true,stage:{id,name,slug:stageSlug},auditRecorded},201);
}
