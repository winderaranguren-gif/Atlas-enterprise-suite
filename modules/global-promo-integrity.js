import { requireTenantPermission } from './tenant.js';
import { appendAuditLedger } from './audit.js';

const json=(body,status=200)=>Response.json(body,{status,headers:{'cache-control':'no-store','x-content-type-options':'nosniff'}});
function text(v,max=500){return String(v??'').trim().replace(/\s+/g,' ').slice(0,max)}
function nullable(v,max=500){const x=text(v,max);return x||null}
async function rawJson(request,maxBytes=1048576){const raw=await request.text();if(raw.length>maxBytes)return{ok:false,response:json({ok:false,error:'payload_too_large'},413)};try{return{ok:true,raw,body:raw.trim()?JSON.parse(raw):{}}}catch{return{ok:false,response:json({ok:false,error:'invalid_json'},400)}}}
async function scope(request,env,action){const authz=await requireTenantPermission(request,env,'module.write',action);if(!authz.ok)return{response:json({ok:false,error:authz.error},authz.status)};return{authz}}
async function account(env,a,id){if(!id)return null;return env.DB.prepare(`SELECT id,name FROM crm_accounts WHERE id=? AND organization_id=? AND dba_id=?`).bind(id,a.organizationId,a.dbaId).first()}
async function quote(env,a,id){if(!id)return null;return env.DB.prepare(`SELECT id,quote_number,title,account_id FROM crm_quotes WHERE id=? AND organization_id=? AND dba_id=?`).bind(id,a.organizationId,a.dbaId).first()}
async function scopedJob(env,a,id){if(!id)return null;return env.DB.prepare(`SELECT id,status FROM global_promo_jobs WHERE id=? AND organization_id=? AND dba_id=?`).bind(id,a.organizationId,a.dbaId).first()}
async function audit(env,a,action,id,metadata){try{await appendAuditLedger(env,{organizationId:a.organizationId,dbaId:a.dbaId,actorUserId:a.session.user_id,category:'global_promo',action,resourceType:'global_promo_job',resourceId:id,decision:'allow',severity:'info',correlationId:a.correlationId,metadata});return true}catch{return false}}

const MATERIAL_TRANSITIONS={
 required:new Set(['ordered','received','cancelled']),ordered:new Set(['received','cancelled']),received:new Set(['allocated','cancelled']),allocated:new Set(['received','issued','cancelled']),issued:new Set(),cancelled:new Set()
};

export function globalPromoPackingGate(total,passed){return Number(total||0)<1||Number(passed||0)<1?'quality_pass_required_before_packing':null}
export function globalPromoDeliveryGate(total,delivered,open){if(Number(total||0)<1)return'package_required_before_delivery';if(Number(delivered||0)<1)return'delivered_package_required';if(Number(open||0)>0)return'packages_not_delivered';return null}
export function globalPromoCommercialContextLocked(currentAccount,currentQuote,requestedAccount,requestedQuote,hasInvoice){return Boolean(hasInvoice&&(requestedAccount!==currentAccount||requestedQuote!==currentQuote))}
export function globalPromoMaterialTransitionAllowed(from,to){return from===to||Boolean(MATERIAL_TRANSITIONS[from]?.has(to))}
export function globalPromoMaterialsGate(total,incomplete){return Number(total||0)>0&&Number(incomplete||0)>0?'materials_not_ready':null}
export function globalPromoWorkOrdersGate(active,completed,open){if(Number(active||0)<1)return'work_order_required_before_quality';if(Number(completed||0)<1)return'completed_work_order_required_before_quality';if(Number(open||0)>0)return'work_orders_incomplete';return null}
export function globalPromoReadyGate(active,incomplete){if(Number(active||0)<1)return'package_required_before_ready';if(Number(incomplete||0)>0)return'packages_not_ready';return null}
export function globalPromoWorkOrderExecutionAllowed(jobStatus,nextStatus){return !['in_progress','completed'].includes(nextStatus)||jobStatus==='production'}
export function globalPromoWorkOrderCreationAllowed(jobStatus){return ['materials','production'].includes(jobStatus)}
export function globalPromoQualityAllowed(jobStatus){return jobStatus==='quality_control'}
export function globalPromoArtworkCreationAllowed(jobStatus){return jobStatus==='artwork'}
export function globalPromoArtworkDecisionAllowed(jobStatus){return jobStatus==='approval'}
export function globalPromoApprovalExitAllowed(currentStatus,nextStatus,approvedCount){return !(currentStatus==='approval'&&nextStatus==='materials')||Number(approvedCount||0)>0}
export function globalPromoPackageCreationAllowed(jobStatus){return jobStatus==='packing'}
export function globalPromoPackageFulfillmentAllowed(jobStatus,nextStatus){if(['packing','packed'].includes(nextStatus))return jobStatus==='packing';if(['shipped','delivered','exception'].includes(nextStatus))return jobStatus==='ready';return true}

export async function preflightGlobalPromoRequest(request,env,url=new URL(request.url)){
 const path=url.pathname.length>1?url.pathname.replace(/\/+$/,''):url.pathname;
 const jobUpdateMatch=path.match(/^\/api\/global-promo\/jobs\/([^/]+)$/);
 const materialUpdateMatch=path.match(/^\/api\/global-promo\/materials\/([^/]+)$/);
 const workOrderUpdateMatch=path.match(/^\/api\/global-promo\/work-orders\/([^/]+)$/);
 const packageUpdateMatch=path.match(/^\/api\/global-promo\/packages\/([^/]+)$/);
 const artworkDecisionMatch=path.match(/^\/api\/global-promo\/artwork\/([^/]+)\/decision$/);
 const jobCreate=request.method==='POST'&&path==='/api/global-promo/jobs';
 const artworkCreate=request.method==='POST'&&path==='/api/global-promo/artwork';
 const purchaseOrderCreate=request.method==='POST'&&path==='/api/global-promo/purchase-orders';
 const workOrderCreate=request.method==='POST'&&path==='/api/global-promo/work-orders';
 const qualityCreate=request.method==='POST'&&path==='/api/global-promo/quality';
 const packageCreate=request.method==='POST'&&path==='/api/global-promo/packages';
 const artworkDecision=request.method==='POST'&&Boolean(artworkDecisionMatch);
 const jobUpdate=request.method==='PATCH'&&Boolean(jobUpdateMatch);
 const materialUpdate=request.method==='PATCH'&&Boolean(materialUpdateMatch);
 const workOrderUpdate=request.method==='PATCH'&&Boolean(workOrderUpdateMatch);
 const packageUpdate=request.method==='PATCH'&&Boolean(packageUpdateMatch);
 if(!jobCreate&&!artworkCreate&&!purchaseOrderCreate&&!workOrderCreate&&!qualityCreate&&!packageCreate&&!artworkDecision&&!jobUpdate&&!materialUpdate&&!workOrderUpdate&&!packageUpdate)return{request};
 const parsed=await rawJson(request.clone());if(!parsed.ok)return{response:parsed.response};
 const action=jobCreate?'global_promo.job.create':artworkCreate?'global_promo.artwork.create':purchaseOrderCreate?'global_promo.purchase_order.create':workOrderCreate?'global_promo.work_order.create':qualityCreate?'global_promo.quality.create':packageCreate?'global_promo.package.create':artworkDecision?'global_promo.artwork.decide':materialUpdate?'global_promo.material.update':workOrderUpdate?'global_promo.work_order.update':packageUpdate?'global_promo.package.update':'global_promo.job.update';
 const gate=await scope(request,env,action);if(gate.response)return gate;const a=gate.authz,b=parsed.body;
 if(jobCreate){
  const accountId=nullable(b.customerAccountId,128),quoteId=nullable(b.quoteId,128);
  const [acct,q]=await Promise.all([accountId?account(env,a,accountId):null,quoteId?quote(env,a,quoteId):null]);
  if(accountId&&!acct)return{response:json({ok:false,error:'customer_account_not_found'},404)};
  if(quoteId&&!q)return{response:json({ok:false,error:'quote_not_found'},404)};
  if(q?.account_id&&accountId&&q.account_id!==accountId)return{response:json({ok:false,error:'quote_customer_scope_mismatch'},409)};
  if(q?.account_id&&!accountId)b.customerAccountId=q.account_id;
 }
 if(artworkCreate){
  const jobId=text(b.jobId,128),owner=await scopedJob(env,a,jobId);if(!owner)return{response:json({ok:false,error:'global_promo_job_not_found'},404)};
  if(!globalPromoArtworkCreationAllowed(owner.status))return{response:json({ok:false,error:'artwork_requires_artwork_phase',jobStatus:owner.status},409)};
 }
 if(artworkDecision){
  const id=decodeURIComponent(artworkDecisionMatch[1]);const row=await env.DB.prepare(`SELECT av.id,av.job_id,j.status AS job_status FROM global_promo_artwork_versions av JOIN global_promo_jobs j ON j.id=av.job_id AND j.organization_id=av.organization_id AND j.dba_id=av.dba_id WHERE av.id=? AND av.organization_id=? AND av.dba_id=?`).bind(id,a.organizationId,a.dbaId).first();
  if(!row)return{response:json({ok:false,error:'artwork_not_found'},404)};
  if(!globalPromoArtworkDecisionAllowed(row.job_status))return{response:json({ok:false,error:'artwork_decision_requires_approval',jobStatus:row.job_status},409)};
 }
 if(purchaseOrderCreate){
  const lines=Array.isArray(b.lines)?b.lines:[];
  const ids=[...new Set(lines.map(line=>nullable(line?.inventoryItemId,128)).filter(Boolean))];
  for(const id of ids){const row=await env.DB.prepare(`SELECT id FROM inventory_items WHERE id=? AND organization_id=? AND dba_id=?`).bind(id,a.organizationId,a.dbaId).first();if(!row)return{response:json({ok:false,error:'purchase_order_inventory_item_not_found',inventoryItemId:id},404)}}
 }
 if(workOrderCreate){
  const jobId=text(b.jobId,128),owner=await scopedJob(env,a,jobId);if(!owner)return{response:json({ok:false,error:'global_promo_job_not_found'},404)};
  if(!globalPromoWorkOrderCreationAllowed(owner.status))return{response:json({ok:false,error:'work_order_requires_materials_or_production',jobStatus:owner.status},409)};
 }
 if(materialUpdate){
  const id=decodeURIComponent(materialUpdateMatch[1]);const row=await env.DB.prepare(`SELECT id,status FROM global_promo_material_requirements WHERE id=? AND organization_id=? AND dba_id=?`).bind(id,a.organizationId,a.dbaId).first();
  if(!row)return{response:json({ok:false,error:'material_requirement_not_found'},404)};const next=text(b.status||row.status,30);
  if(!globalPromoMaterialTransitionAllowed(row.status,next))return{response:json({ok:false,error:'invalid_material_transition',from:row.status,to:next},409)};
 }
 if(workOrderUpdate){
  const id=decodeURIComponent(workOrderUpdateMatch[1]);const row=await env.DB.prepare(`SELECT id,job_id,status FROM global_promo_work_orders WHERE id=? AND organization_id=? AND dba_id=?`).bind(id,a.organizationId,a.dbaId).first();
  if(!row)return{response:json({ok:false,error:'work_order_not_found'},404)};const owner=await scopedJob(env,a,row.job_id),next=text(b.status||row.status,30);
  if(!owner)return{response:json({ok:false,error:'global_promo_job_not_found'},404)};
  if(!globalPromoWorkOrderExecutionAllowed(owner.status,next))return{response:json({ok:false,error:'work_order_execution_requires_production',jobStatus:owner.status,to:next},409)};
 }
 if(qualityCreate){
  const jobId=text(b.jobId,128),owner=await scopedJob(env,a,jobId);if(!owner)return{response:json({ok:false,error:'global_promo_job_not_found'},404)};
  if(!globalPromoQualityAllowed(owner.status))return{response:json({ok:false,error:'quality_check_requires_quality_control',jobStatus:owner.status},409)};
  const workOrderId=nullable(b.workOrderId,128);if(workOrderId){const work=await env.DB.prepare(`SELECT id,status FROM global_promo_work_orders WHERE id=? AND job_id=? AND organization_id=? AND dba_id=?`).bind(workOrderId,jobId,a.organizationId,a.dbaId).first();if(!work)return{response:json({ok:false,error:'work_order_not_found_for_job'},404)};if(work.status!=='completed')return{response:json({ok:false,error:'quality_work_order_not_completed',workOrderStatus:work.status},409)}}
 }
 if(packageCreate){
  const jobId=text(b.jobId,128),owner=await scopedJob(env,a,jobId);if(!owner)return{response:json({ok:false,error:'global_promo_job_not_found'},404)};
  if(!globalPromoPackageCreationAllowed(owner.status))return{response:json({ok:false,error:'package_requires_packing',jobStatus:owner.status},409)};
 }
 if(packageUpdate){
  const id=decodeURIComponent(packageUpdateMatch[1]);const row=await env.DB.prepare(`SELECT p.id,p.job_id,p.status,j.status AS job_status FROM global_promo_packages p JOIN global_promo_jobs j ON j.id=p.job_id AND j.organization_id=p.organization_id AND j.dba_id=p.dba_id WHERE p.id=? AND p.organization_id=? AND p.dba_id=?`).bind(id,a.organizationId,a.dbaId).first();
  if(!row)return{response:json({ok:false,error:'package_not_found'},404)};const next=text(b.status||row.status,30);
  if(!globalPromoPackageFulfillmentAllowed(row.job_status,next))return{response:json({ok:false,error:'package_status_incompatible_with_job_phase',jobStatus:row.job_status,to:next},409)};
 }
 if(jobUpdate){
  const jobId=decodeURIComponent(jobUpdateMatch[1]),status=text(b.status,30);
  const current=await scopedJob(env,a,jobId);if(!current)return{response:json({ok:false,error:'global_promo_job_not_found'},404)};
  if(current.status==='approval'&&status==='materials'){
   const artwork=await env.DB.prepare(`SELECT COUNT(*) approved FROM global_promo_artwork_versions WHERE job_id=? AND organization_id=? AND dba_id=? AND status='approved'`).bind(jobId,a.organizationId,a.dbaId).first();
   if(!globalPromoApprovalExitAllowed(current.status,status,artwork?.approved))return{response:json({ok:false,error:'approved_artwork_required_before_materials'},409)};
  }
  if(status==='production'){
   const materials=await env.DB.prepare(`SELECT COUNT(*) total,SUM(CASE WHEN status NOT IN ('allocated','issued','cancelled') THEN 1 ELSE 0 END) incomplete FROM global_promo_material_requirements WHERE job_id=? AND organization_id=? AND dba_id=?`).bind(jobId,a.organizationId,a.dbaId).first();
   const error=globalPromoMaterialsGate(materials?.total,materials?.incomplete);if(error)return{response:json({ok:false,error},409)};
  }
  if(status==='quality_control'){
   const work=await env.DB.prepare(`SELECT SUM(CASE WHEN status<>'cancelled' THEN 1 ELSE 0 END) active,SUM(CASE WHEN status='completed' THEN 1 ELSE 0 END) completed,SUM(CASE WHEN status NOT IN ('completed','cancelled') THEN 1 ELSE 0 END) open FROM global_promo_work_orders WHERE job_id=? AND organization_id=? AND dba_id=?`).bind(jobId,a.organizationId,a.dbaId).first();
   const error=globalPromoWorkOrdersGate(work?.active,work?.completed,work?.open);if(error)return{response:json({ok:false,error},409)};
  }
  if(status==='packing'){
   const qc=await env.DB.prepare(`SELECT COUNT(*) total,SUM(CASE WHEN result='pass' THEN 1 ELSE 0 END) passed FROM global_promo_quality_checks WHERE job_id=? AND organization_id=? AND dba_id=?`).bind(jobId,a.organizationId,a.dbaId).first();
   const error=globalPromoPackingGate(qc?.total,qc?.passed);if(error)return{response:json({ok:false,error},409)};
  }
  if(status==='ready'){
   const packages=await env.DB.prepare(`SELECT SUM(CASE WHEN status<>'cancelled' THEN 1 ELSE 0 END) active,SUM(CASE WHEN status IN ('packing','exception') THEN 1 ELSE 0 END) incomplete FROM global_promo_packages WHERE job_id=? AND organization_id=? AND dba_id=?`).bind(jobId,a.organizationId,a.dbaId).first();
   const error=globalPromoReadyGate(packages?.active,packages?.incomplete);if(error)return{response:json({ok:false,error},409)};
  }
  if(status==='delivered'){
   const packages=await env.DB.prepare(`SELECT COUNT(*) total,SUM(CASE WHEN status='delivered' THEN 1 ELSE 0 END) delivered,SUM(CASE WHEN status NOT IN ('delivered','cancelled') THEN 1 ELSE 0 END) open FROM global_promo_packages WHERE job_id=? AND organization_id=? AND dba_id=?`).bind(jobId,a.organizationId,a.dbaId).first();
   const error=globalPromoDeliveryGate(packages?.total,packages?.delivered,packages?.open);if(error)return{response:json({ok:false,error},409)};
  }
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
 let invoiceLink=null;try{invoiceLink=await env.DB.prepare(`SELECT finance_invoice_id FROM global_promo_finance_links WHERE job_id=? AND organization_id=? AND dba_id=?`).bind(id,a.organizationId,a.dbaId).first()}catch{}
 if(globalPromoCommercialContextLocked(current.customer_account_id,current.quote_id,requestedAccount,requestedQuote,invoiceLink))return json({ok:false,error:'commercial_context_locked_after_invoice',financeInvoiceId:invoiceLink.finance_invoice_id},409);
 const [acct,q]=await Promise.all([requestedAccount?account(env,a,requestedAccount):null,requestedQuote?quote(env,a,requestedQuote):null]);
 if(requestedAccount&&!acct)return json({ok:false,error:'customer_account_not_found'},404);
 if(requestedQuote&&!q)return json({ok:false,error:'quote_not_found'},404);
 if(q?.account_id&&requestedAccount&&q.account_id!==requestedAccount)return json({ok:false,error:'quote_customer_scope_mismatch'},409);
 const accountId=q?.account_id||requestedAccount||null,quoteId=requestedQuote||null,nextStatus=current.status==='request'&&quoteId?'quoted':current.status;
 await env.DB.prepare(`UPDATE global_promo_jobs SET customer_account_id=?,quote_id=?,request_reference=?,status=?,updated_at=CURRENT_TIMESTAMP WHERE id=? AND organization_id=? AND dba_id=?`).bind(accountId,quoteId,requestReference,nextStatus,id,a.organizationId,a.dbaId).run();
 const auditRecorded=await audit(env,a,'global_promo.job.commercial_context.update',id,{customerAccountId:accountId,quoteId,statusFrom:current.status,statusTo:nextStatus});
 return json({ok:true,job:{id,customerAccountId:accountId,quoteId,requestReference,status:nextStatus},auditRecorded});
}