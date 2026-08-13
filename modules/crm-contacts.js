import { RECORD_STATUSES, auditMutation, authorize, bodyJson, boundedLimit, json, normalizedEmail, nullableText, tagsJson, text } from './crm-shared.js';

export async function listContacts(request,env,url){
  const gate=await authorize(request,env,'crm.read','crm.contacts.read'); if(gate.response)return gate.response;
  const {authz}=gate, limit=boundedLimit(url), q=text(url.searchParams.get('q'),120), accountId=text(url.searchParams.get('accountId'),128);
  const clauses=['organization_id=?','dba_id=?'], binds=[authz.organizationId,authz.dbaId];
  if(q){const like=`%${q}%`;clauses.push('(display_name LIKE ? OR email LIKE ? OR phone LIKE ? OR job_title LIKE ?)');binds.push(like,like,like,like)}
  if(accountId){clauses.push('account_id=?');binds.push(accountId)} binds.push(limit);
  const rows=await env.DB.prepare(`SELECT id,account_id,first_name,last_name,display_name,email,phone,mobile,job_title,contact_role,source,owner_user_id,tags_json,status,created_at,updated_at FROM crm_contacts WHERE ${clauses.join(' AND ')} ORDER BY display_name LIMIT ?`).bind(...binds).all();
  return json({ok:true,contacts:rows.results||[]});
}

export async function createContact(request,env){
  const gate=await authorize(request,env,'crm.write','crm.contact.create'); if(gate.response)return gate.response; const {authz}=gate;
  const parsed=await bodyJson(request); if(!parsed.ok)return json({ok:false,error:parsed.error},parsed.status); const b=parsed.body;
  const first=text(b.firstName,100), last=text(b.lastName,100), display=text(b.displayName||`${first} ${last}`,220), mail=b.email?normalizedEmail(b.email):null;
  if(!first||!last||display.length<2)return json({ok:false,error:'valid_contact_name_required'},400); if(b.email&&!mail)return json({ok:false,error:'invalid_email'},400);
  const id=crypto.randomUUID();
  await env.DB.prepare(`INSERT INTO crm_contacts(id,organization_id,dba_id,account_id,first_name,last_name,display_name,email,phone,mobile,job_title,contact_role,source,owner_user_id,tags_json,status,created_by_user_id) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).bind(id,authz.organizationId,authz.dbaId,nullableText(b.accountId,128),first,last,display,mail,nullableText(b.phone,60),nullableText(b.mobile,60),nullableText(b.jobTitle,160),nullableText(b.contactRole,120),nullableText(b.source,120),nullableText(b.ownerUserId,128),tagsJson(b.tags),RECORD_STATUSES.has(text(b.status,24))?text(b.status,24):'active',authz.session.user_id).run();
  const auditRecorded=await auditMutation(env,authz,'crm.contact.create','crm_contact',id); return json({ok:true,contact:{id,displayName:display},auditRecorded},201);
}
