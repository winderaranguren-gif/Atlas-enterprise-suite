import { ACCOUNT_TYPES, RECORD_STATUSES, auditMutation, authorize, bodyJson, boundedLimit, json, normalizedEmail, normalizedUrl, nullableText, tagsJson, text } from './crm-shared.js';

export async function listAccounts(request,env,url){
  const gate=await authorize(request,env,'crm.read','crm.accounts.read'); if(gate.response)return gate.response;
  const {authz}=gate, limit=boundedLimit(url), q=text(url.searchParams.get('q'),120), status=text(url.searchParams.get('status'),24);
  const clauses=['organization_id=?','dba_id=?'], binds=[authz.organizationId,authz.dbaId];
  if(q){const like=`%${q}%`;clauses.push('(name LIKE ? OR industry LIKE ? OR email LIKE ? OR phone LIKE ?)');binds.push(like,like,like,like)}
  if(RECORD_STATUSES.has(status)){clauses.push('status=?');binds.push(status)} binds.push(limit);
  const rows=await env.DB.prepare(`SELECT id,name,account_type,industry,website,email,phone,city,region,country,source,owner_user_id,tags_json,status,created_at,updated_at FROM crm_accounts WHERE ${clauses.join(' AND ')} ORDER BY updated_at DESC LIMIT ?`).bind(...binds).all();
  return json({ok:true,accounts:rows.results||[]});
}

export async function createAccount(request,env){
  const gate=await authorize(request,env,'crm.write','crm.account.create'); if(gate.response)return gate.response; const {authz}=gate;
  const parsed=await bodyJson(request); if(!parsed.ok)return json({ok:false,error:parsed.error},parsed.status); const b=parsed.body;
  const name=text(b.name,220), accountType=text(b.accountType||'prospect',32), mail=b.email?normalizedEmail(b.email):null, site=b.website?normalizedUrl(b.website):null;
  if(name.length<2)return json({ok:false,error:'valid_account_name_required'},400);
  if(!ACCOUNT_TYPES.has(accountType))return json({ok:false,error:'invalid_account_type'},400);
  if(b.email&&!mail)return json({ok:false,error:'invalid_email'},400); if(b.website&&!site)return json({ok:false,error:'invalid_website'},400);
  const id=crypto.randomUUID();
  await env.DB.prepare(`INSERT INTO crm_accounts(id,organization_id,dba_id,name,account_type,industry,website,email,phone,address_line1,address_line2,city,region,postal_code,country,source,owner_user_id,tags_json,status,created_by_user_id) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).bind(
    id,authz.organizationId,authz.dbaId,name,accountType,nullableText(b.industry,160),site,mail,nullableText(b.phone,60),nullableText(b.addressLine1,220),nullableText(b.addressLine2,220),nullableText(b.city,120),nullableText(b.region,120),nullableText(b.postalCode,40),nullableText(b.country,100),nullableText(b.source,120),nullableText(b.ownerUserId,128),tagsJson(b.tags),RECORD_STATUSES.has(text(b.status,24))?text(b.status,24):'active',authz.session.user_id
  ).run();
  const auditRecorded=await auditMutation(env,authz,'crm.account.create','crm_account',id,{accountType});
  return json({ok:true,account:{id,name,accountType},auditRecorded},201);
}

export async function patchAccount(request,env,id){
  const gate=await authorize(request,env,'crm.write','crm.account.update'); if(gate.response)return gate.response; const {authz}=gate;
  const found=await env.DB.prepare('SELECT id FROM crm_accounts WHERE id=? AND organization_id=? AND dba_id=?').bind(id,authz.organizationId,authz.dbaId).first(); if(!found)return json({ok:false,error:'account_not_found'},404);
  const parsed=await bodyJson(request); if(!parsed.ok)return json({ok:false,error:parsed.error},parsed.status); const b=parsed.body, sets=[], binds=[]; const add=(k,v)=>{sets.push(`${k}=?`);binds.push(v)};
  if('name'in b){const v=text(b.name,220);if(v.length<2)return json({ok:false,error:'invalid_name'},400);add('name',v)}
  if('accountType'in b){const v=text(b.accountType,32);if(!ACCOUNT_TYPES.has(v))return json({ok:false,error:'invalid_account_type'},400);add('account_type',v)}
  for(const [key,col,max] of [['industry','industry',160],['phone','phone',60],['city','city',120],['region','region',120],['country','country',100],['source','source',120],['ownerUserId','owner_user_id',128]])if(key in b)add(col,nullableText(b[key],max));
  if('email'in b){const v=b.email?normalizedEmail(b.email):null;if(b.email&&!v)return json({ok:false,error:'invalid_email'},400);add('email',v)}
  if('website'in b){const v=b.website?normalizedUrl(b.website):null;if(b.website&&!v)return json({ok:false,error:'invalid_website'},400);add('website',v)}
  if('tags'in b)add('tags_json',tagsJson(b.tags)); if('status'in b){const v=text(b.status,24);if(!RECORD_STATUSES.has(v))return json({ok:false,error:'invalid_status'},400);add('status',v)}
  if(!sets.length)return json({ok:false,error:'no_supported_changes'},400); sets.push('updated_at=CURRENT_TIMESTAMP'); binds.push(id,authz.organizationId,authz.dbaId);
  await env.DB.prepare(`UPDATE crm_accounts SET ${sets.join(',')} WHERE id=? AND organization_id=? AND dba_id=?`).bind(...binds).run();
  const auditRecorded=await auditMutation(env,authz,'crm.account.update','crm_account',id); return json({ok:true,accountId:id,auditRecorded});
}
