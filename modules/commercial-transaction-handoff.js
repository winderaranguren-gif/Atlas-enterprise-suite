import { revalidateCart } from './cart-checkout-revalidation.js';

export function commercialTransactionContract(){
 return {
  schemaVersion:1,
  authority:'ATLAS_ENTERPRISE_COMMERCIAL_TRANSACTION_CONTRACT',
  intendedSystemOfRecord:'enterprise-commercial-transactions',
  persistence:'blocked-until-verified-d1-and-migration-sequence',
  migrationReservation:'0016 is already reserved by pending Capability State work; this contract does not consume that number.',
  orderStatuses:['draft','confirmed','allocated','fulfilling','fulfilled','cancelled'],
  fulfillmentStatuses:['pending','reserved','in_progress','completed','cancelled'],
  requiredOrderFields:['organizationId','customerRef','market','currency','lines','sourceRevalidationAt','createdBy'],
  requiredLineFields:['productId','sourceType','sourceId','quantity','unitPrice','currency','market','fulfillmentMethod'],
  rule:'Commerce may prepare an enterprise order handoff only from a fresh COM4 ready decision. Enterprise owns the durable commercial transaction. Commerce must not create a parallel order ledger.'
 };
}

function validContext(context){
 const errors=[];
 if(!String(context?.organizationId||'').trim())errors.push('organization_id_required');
 if(!String(context?.customerRef||'').trim())errors.push('customer_ref_required');
 if(!String(context?.createdBy||'').trim())errors.push('created_by_required');
 return errors;
}

export function prepareEnterpriseOrderHandoff({cart,context}={},now=Date.now(),customResolvers={}){
 const contextErrors=validContext(context);
 if(contextErrors.length)return {ok:false,status:'blocked',reasons:contextErrors,persisted:false,inventoryReserved:false,paymentAuthorized:false,orderDraft:null};
 const revalidation=revalidateCart(cart,now,customResolvers);
 if(revalidation.outcome!=='ready')return {ok:false,status:'blocked',reasons:[`cart_${revalidation.outcome}`],revalidation,persisted:false,inventoryReserved:false,paymentAuthorized:false,orderDraft:null};
 const lines=revalidation.lines.map((line,index)=>({
  lineNumber:index+1,
  productId:line.productId,
  sourceType:line.sourceType,
  sourceId:line.sourceId,
  quantity:Number(cart.lines[index].quantity),
  unitPrice:Number(line.current?.unitPrice),
  currency:String(line.current?.currency||cart.lines[index].currency),
  market:String(line.current?.market||cart.lines[index].market),
  fulfillmentMethod:String(cart.lines[index].fulfillmentMethod||line.current?.billingBasis||'digital'),
  lineage:{revalidationLineId:line.lineId,merchantId:line.current?.merchantId||null,observedAt:line.current?.observedAt||null,expiresAt:line.current?.expiresAt||null}
 }));
 const currencies=new Set(lines.map(line=>line.currency)),markets=new Set(lines.map(line=>line.market));
 if(currencies.size!==1)return {ok:false,status:'blocked',reasons:['mixed_currency_order_not_supported'],revalidation,persisted:false,inventoryReserved:false,paymentAuthorized:false,orderDraft:null};
 if(markets.size!==1)return {ok:false,status:'blocked',reasons:['mixed_market_order_not_supported'],revalidation,persisted:false,inventoryReserved:false,paymentAuthorized:false,orderDraft:null};
 const subtotal=lines.reduce((sum,line)=>sum+line.unitPrice*line.quantity,0);
 const orderDraft={
  authority:'ATLAS_ENTERPRISE_COMMERCIAL_TRANSACTION_CONTRACT',
  organizationId:String(context.organizationId),
  customerRef:String(context.customerRef),
  createdBy:String(context.createdBy),
  market:[...markets][0],currency:[...currencies][0],
  status:'draft',
  lines,
  subtotal:Number(subtotal.toFixed(2)),
  tax:null,shipping:null,total:null,
  sourceRevalidationAt:revalidation.revalidatedAt,
  fulfillmentIntents:lines.map(line=>({lineNumber:line.lineNumber,method:line.fulfillmentMethod,status:'pending',reservationId:null})),
  financeHandoff:{invoiceId:null,receivableId:null,paymentEventId:null}
 };
 return {ok:true,status:'ready_for_enterprise_order_creation',revalidation,persisted:false,inventoryReserved:false,paymentAuthorized:false,orderDraft,rule:'This envelope is not an order until Enterprise persists it in the canonical commercial transaction spine.'};
}

export function commercialTransactionHandoffStatus(){
 return {schemaVersion:1,authority:'ATLAS_ENTERPRISE_COMMERCIAL_TRANSACTION_HANDOFF',contract:commercialTransactionContract().authority,persistence:false,d1Persistence:false,d1Reason:'verified_d1_identity_and_migration_sequence_pending',salesOrderSystemOfRecordReady:false,inventoryReservation:false,paymentExecution:false};
}

export async function commercialTransactionHandoffRoutes(request,_env,url){
 if(request.method==='GET'&&url.pathname==='/feeds/enterprise/commercial-transaction-contract.json')return Response.json({ok:true,...commercialTransactionContract()},{headers:{'cache-control':'public,max-age=900','access-control-allow-origin':'*'}});
 if(request.method==='GET'&&url.pathname==='/feeds/commerce/order-handoff/status')return Response.json({ok:true,...commercialTransactionHandoffStatus()},{headers:{'cache-control':'no-store'}});
 if(request.method==='POST'&&url.pathname==='/api/commerce/order/handoff'){
  const length=Number(request.headers.get('content-length')||0);
  if(length>96_000)return Response.json({ok:false,error:'payload_too_large'},{status:413,headers:{'cache-control':'no-store'}});
  let body;try{body=await request.json()}catch{return Response.json({ok:false,error:'invalid_json'},{status:400,headers:{'cache-control':'no-store'}})}
  return Response.json(prepareEnterpriseOrderHandoff(body),{headers:{'cache-control':'no-store'}});
 }
 return null;
}
