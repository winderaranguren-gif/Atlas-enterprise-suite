const origin=(process.env.ATLAS_PRODUCTION_ORIGIN||'https://atlasenterprisesuite.com').replace(/\/$/,'');
const fail=message=>{console.error(`FAIL enterprise-order-handoff: ${message}`);process.exit(45)};

async function json(path,options={}){
 const response=await fetch(origin+path,{...options,headers:{'user-agent':'ATLAS-Order-Handoff-Verifier/1.0','content-type':'application/json',...(options.headers||{})},signal:AbortSignal.timeout(15000)});
 const text=await response.text();
 let data;try{data=JSON.parse(text)}catch{fail(`${path} invalid JSON`)}
 if(response.status!==200)fail(`${path} HTTP ${response.status} · ${text.slice(0,300)}`);
 return data;
}

const contract=await json('/feeds/enterprise/commercial-transaction-contract.json');
if(contract?.ok!==true||contract?.authority!=='ATLAS_ENTERPRISE_COMMERCIAL_TRANSACTION_CONTRACT'||contract?.intendedSystemOfRecord!=='enterprise-commercial-transactions'||contract?.persistence!=='blocked-until-verified-d1-and-migration-sequence'||!String(contract?.migrationReservation||'').includes('0016'))fail('contract boundary mismatch');

const status=await json('/feeds/commerce/order-handoff/status');
if(status?.ok!==true||status?.authority!=='ATLAS_ENTERPRISE_COMMERCIAL_TRANSACTION_HANDOFF'||status?.persistence!==false||status?.d1Persistence!==false||status?.salesOrderSystemOfRecordReady!==false||status?.inventoryReservation!==false||status?.paymentExecution!==false)fail('status boundary mismatch');

const preview=await json('/api/commerce/order/handoff',{method:'POST',body:JSON.stringify({context:{organizationId:'production-boundary-org',customerRef:'production-boundary-customer',createdBy:'production-verifier'},cart:{lines:[{lineId:'production-boundary-check',productId:'atlas-enterprise-suite',sourceType:'atlas-commercial-offer',sourceId:'atlas-enterprise-suite-us-preview-monthly',quantity:1,unitPrice:249,currency:'USD',market:'US',fulfillmentMethod:'digital'}]}})});
if(preview?.status!=='blocked'||preview?.persisted!==false||preview?.inventoryReserved!==false||preview?.paymentAuthorized!==false||preview?.orderDraft!==null||!Array.isArray(preview?.reasons)||!preview.reasons.includes('cart_blocked'))fail('preview cart must not become enterprise order draft');

console.log('PASS enterprise order handoff production boundary: no persisted order/reservation/payment before canonical spine readiness.');
