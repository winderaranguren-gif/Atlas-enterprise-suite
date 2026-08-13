import { ACTIVITY_STATUSES, auditMutation, authorize, bodyJson, json, nullableText, text } from './crm-shared.js';

export async function patchActivity(request,env,id){
  const gate=await authorize(request,env,'crm.write','crm.activity.update'); if(gate.response)return gate.response; const {authz}=gate;
  const found=await env.DB.prepare('SELECT id FROM crm_activities WHERE id=? AND organization_id=? AND dba_id=?').bind(id,authz.organizationId,authz.dbaId).first(); if(!found)return json({ok:false,error:'activity_not_found'},404);
  const parsed=await bodyJson(request); if(!parsed.ok)return json({ok:false,error:parsed.error},parsed.status); const b=parsed.body, sets=[], binds=[]; const add=(k,v)=>{sets.push(`${k}=?`);binds.push(v)};
  if('subject'in b)add('subject',text(b.subject,220)); if('description'in b)add('description',nullableText(b.description,4000)); if('dueAt'in b)add('due_at',nullableText(b.dueAt,40)); if('ownerUserId'in b)add('owner_user_id',nullableText(b.ownerUserId,128));
  if('status'in b){const v=text(b.status,24);if(!ACTIVITY_STATUSES.has(v))return json({ok:false,error:'invalid_activity_status'},400);add('status',v);add('completed_at',v==='completed'?new Date().toISOString():null)}
  if(!sets.length)return json({ok:false,error:'no_supported_changes'},400); sets.push('updated_at=CURRENT_TIMESTAMP'); binds.push(id,authz.organizationId,authz.dbaId);
  await env.DB.prepare(`UPDATE crm_activities SET ${sets.join(',')} WHERE id=? AND organization_id=? AND dba_id=?`).bind(...binds).run();
  const auditRecorded=await auditMutation(env,authz,'crm.activity.update','crm_activity',id); return json({ok:true,activityId:id,auditRecorded});
}
