import { requireTenantPermission } from './tenant.js';
import { appendAuditLedger } from './audit.js';

const json=(body,status=200)=>Response.json(body,{status,headers:{'cache-control':'no-store','x-content-type-options':'nosniff'}});
function text(v,max=500){return String(v??'').trim().replace(/\s+/g,' ').slice(0,max)}
function nullable(v,max=500){const x=text(v,max);return x||null}
async function rawJson(request,maxBytes=1048576){const raw=await request.text();if(raw.length>maxBytes)return{ok:false,response:json({ok:false,error:'payload_too_large'},413)};try{return{ok:true,raw,body:raw.trim()?JSON.parse(raw):{}}}catch{return{ok:false,response:json({ok:false,error:'invalid_json'},400)}}}
async function scope(request,env,action){const authz=await requireTenantPermission(request,env,'module.write',action);if(!authz.ok)return{response:json({ok:false,error:authz.error},authz.status)};return{authz}}
async function account(env,a,id){if(!id)return null;return env.DB.prepare(`SELECT id,name FROM crm_accounts WHERE id=? AND organization_id=? AND dba_id=?`).bind(id,a.organizationId,a.dbaId).first()}
async function quote(env,a,id){if(!id)return null;return env.DB.prepare(`SELECT id,quote_number,title,account_id FROM crm_quotes WHERE id=? AND organization_id=? AND dba_id=?`).bind(id,a.organizationId,a.dbaId).first()}
async function audit(env,a,action,id,metadata){try{await appendAuditLedger(env,{organizationId:a.organizationId,dbaId:a.dbaId,actorUserId:a.session.user_id,category:'global_promo',action,resourceType:'global_promo_job',resourceId:id,decision:'allow',severity:'info',correlationId:a.correlationId,metadata});return true}catch{return false}}

export async function preflightGlobalPromoRequest(request,env,url=new URL(request.url)){
 if(request.method!=='POST'||!['/api/global-promo/jobs','/api/global-promo/purchase-orders'].includes(url.pathname))return{request};
 const parsed=await rawJson(request.clone());if(!parsed.ok)return{response:parsed.response};
 const action=url.pathname.endsWith('/jobs')?'global_promo.job.create':'global_promo.purchase_order.create';
 const gate=await scope(request,env,action);if(gate.response)return gate;const a=gate.authz,b=parsed.body;
 if(url.pathname==='/api/global-promo/jobs'){
  const accountId=nullable(b.customerAccountId,128),quoteId=nullable(b.quoteId,128);
  const [acct,q]=await Promise.all([accountId?account(env,a,accountId):null,quoteId?quote(env,a,quoteId):null]);
  if(accountId&&!acct)return{response:json({ok:false,error:'customer_account_not_found'},404)};
  if(quoteId&&!q)return{response:json({ok:false,error:'quote_not_found'},404)};
  if(q?.account_id&&accountId&&q.account_id!==accountId)return{response:json({ok:false,error:'quote_customer_scope_mismatch'},409)};
  if(q?.account_id&&!accountId)b.customerAccountId=q.account_id;
 }
 if(url.pathname==='/api/global-promo/purchase-orders'){
  const lines=Array.isArray(b.lines)?b.lines:[];
  const ids=[...new Set(lines.map(line=>nullable(line?.inventoryItemId,128)).filter(Boolean))];
  for(const id of ids){const row=await env.DB.prepare(`SELECT id FROM inventory_items WHERE id=? AND organization_id=? AND dba_id=?`).bind(id,a.organizationId,a.dbaId).first();if(!row)return{response:json({ok:false,error:'purchase_order_inventory_item_not_found',inventoryItemId:id},404)}}
 }
 const headers=new Headers(request.headers);headers.set('content-type','application/json');
 return{request:new Request(request.url,{method:request.method,headers,body:JSON.stringify(b),redirect:request.redirect})};
}

export async function globalPromoCommercialContextRoute(request,env,url=new URL(request.url)){
 const match=url.pathname.match(/^\/api\/global-promo\/jobs\/([^/]+)\/commercial-context$/);
 if(!match||request.method!=='PATCH')return null;
 const gate=await scope(request,env,'global_promo.job.commercial_context.update');if(gate.response)return gate.response;const a=gate.authz,parsed=await rawJson(request);if(!parsed.ok)return parsed.response;
 const id=decodeURIComponent(match[1]),current=await env.DB.prepare(`SELECT id,status,customer_account_id,quote_id,request_reference FROM global_promo_jobs WHERE id=? AND organization_id=? AND dba_id=?`).bind(id,a.organizationId,a.dbaId).first();
 if(!current)return json({ok:false,error:'global_promo_job_not_found'},404);
 const b=parsed.body,requestedAccount=b.customerAccountId===undefined?current.customer_account_id:nullable(b.customerAccountId,128),requestedQuote=b.quoteId===undefined?current.quote_id:nullable(b.quoteId,128),requestReference=b.requestReference===undefined?current.request_reference:nullable(b.requestReference,300);
 const [acct,q]=await Promise.all([requestedAccount?account(env,a,requestedAccount):null,requestedQuote?quote(env,a,requestedQuote):null]);
 if(requestedAccount&&!acct)return json({ok:false,error:'customer_account_not_found'},404);
 if(requestedQuote&&!q)return json({ok:false,error:'quote_not_found'},404);
 if(q?.account_id&&requestedAccount&&q.account_id!==requestedAccount)return json({ok:false,error:'quote_customer_scope_mismatch'},409);
 const accountId=q?.account_id||requestedAccount||null,quoteId=requestedQuote||null,nextStatus=current.status==='request'&&quoteId?'quoted':current.status;
 await env.DB.prepare(`UPDATE global_promo_jobs SET customer_account_id=?,quote_id=?,request_reference=?,status=?,updated_at=CURRENT_TIMESTAMP WHERE id=? AND organization_id=? AND dba_id=?`).bind(accountId,quoteId,requestReference,nextStatus,id,a.organizationId,a.dbaId).run();
 const auditRecorded=await audit(env,a,'global_promo.job.commercial_context.update',id,{customerAccountId:accountId,quoteId,statusFrom:current.status,statusTo:nextStatus});
 return json({ok:true,job:{id,customerAccountId:accountId,quoteId,requestReference,status:nextStatus},auditRecorded});
}
