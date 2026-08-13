import { RECORD_STATUSES, auditMutation, authorize, bodyJson, json, normalizedEmail, nullableText, tagsJson, text } from './crm-shared.js';

export async function patchContact(request,env,id){
  const gate=await authorize(request,env,'crm.write','crm.contact.update'); if(gate.response)return gate.response; const {authz}=gate;
  const found=await env.DB.prepare('SELECT id FROM crm_contacts WHERE id=? AND organization_id=? AND dba_id=?').bind(id,authz.organizationId,authz.dbaId).first();
  if(!found)return json({ok:false,error:'contact_not_found'},404);
  const parsed=await bodyJson(request); if(!parsed.ok)return json({ok:false,error:parsed.error},parsed.status);
  const b=parsed.body, sets=[], binds=[]; const add=(k,v)=>{sets.push(`${k}=?`);binds.push(v)};
  for(const [key,col,max] of [['firstName','first_name',100],['lastName','last_name',100],['displayName','display_name',220],['phone','phone',60],['mobile','mobile',60],['jobTitle','job_title',160],['contactRole','contact_role',120],['source','source',120],['ownerUserId','owner_user_id',128],['accountId','account_id',128]])if(key in b)add(col,nullableText(b[key],max));
  if('email'in b){const v=b.email?normalizedEmail(b.email):null;if(b.email&&!v)return json({ok:false,error:'invalid_email'},400);add('email',v)}
  if('tags'in b)add('tags_json',tagsJson(b.tags));
  if('status'in b){const v=text(b.status,24);if(!RECORD_STATUSES.has(v))return json({ok:false,error:'invalid_status'},400);add('status',v)}
  if(!sets.length)return json({ok:false,error:'no_supported_changes'},400);
  sets.push('updated_at=CURRENT_TIMESTAMP'); binds.push(id,authz.organizationId,authz.dbaId);
  await env.DB.prepare(`UPDATE crm_contacts SET ${sets.join(',')} WHERE id=? AND organization_id=? AND dba_id=?`).bind(...binds).run();
  const auditRecorded=await auditMutation(env,authz,'crm.contact.update','crm_contact',id);
  return json({ok:true,contactId:id,auditRecorded});
}
