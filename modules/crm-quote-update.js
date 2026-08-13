import { QUOTE_STATUSES, auditMutation, authorize, bodyJson, json, nullableText, text } from './crm-shared.js';

export async function patchQuote(request,env,id){
  const gate=await authorize(request,env,'crm.write','crm.quote.update'); if(gate.response)return gate.response; const {authz}=gate;
  const found=await env.DB.prepare('SELECT id FROM crm_quotes WHERE id=? AND organization_id=? AND dba_id=?').bind(id,authz.organizationId,authz.dbaId).first(); if(!found)return json({ok:false,error:'quote_not_found'},404);
  const parsed=await bodyJson(request); if(!parsed.ok)return json({ok:false,error:parsed.error},parsed.status); const b=parsed.body, sets=[], binds=[]; const add=(k,v)=>{sets.push(`${k}=?`);binds.push(v)};
  if('title'in b)add('title',text(b.title,220)); if('status'in b){const v=text(b.status,24);if(!QUOTE_STATUSES.has(v))return json({ok:false,error:'invalid_quote_status'},400);add('status',v)} if('validUntil'in b)add('valid_until',nullableText(b.validUntil,40)); if('terms'in b)add('terms',nullableText(b.terms,8000));
  if(!sets.length)return json({ok:false,error:'no_supported_changes'},400); sets.push('updated_at=CURRENT_TIMESTAMP'); binds.push(id,authz.organizationId,authz.dbaId);
  await env.DB.prepare(`UPDATE crm_quotes SET ${sets.join(',')} WHERE id=? AND organization_id=? AND dba_id=?`).bind(...binds).run();
  const auditRecorded=await auditMutation(env,authz,'crm.quote.update','crm_quote',id); return json({ok:true,quoteId:id,auditRecorded});
}
