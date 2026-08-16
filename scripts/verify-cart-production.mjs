const origin=(process.env.ATLAS_PRODUCTION_ORIGIN||'https://atlasenterprisesuite.com').replace(/\/$/,'');
const fail=message=>{console.error(`FAIL cart-revalidation: ${message}`);process.exit(44)};

async function json(path,options={}){
 const response=await fetch(origin+path,{...options,headers:{'user-agent':'ATLAS-Cart-Revalidation-Verifier/1.0','content-type':'application/json',...(options.headers||{})},signal:AbortSignal.timeout(15000)});
 const text=await response.text();
 let data;try{data=JSON.parse(text)}catch{fail(`${path} invalid JSON`)}
 if(response.status!==200)fail(`${path} HTTP ${response.status} · ${text.slice(0,300)}`);
 return data;
}

const policy=await json('/feeds/commerce/cart-revalidation-policy.json');
if(policy?.ok!==true||policy?.authority!=='ATLAS_CART_CHECKOUT_REVALIDATION'||policy?.transactional!==false||policy?.createsOrder!==false||policy?.processesPayment!==false||!Array.isArray(policy?.outcomes)||!['ready','changed','blocked'].every(value=>policy.outcomes.includes(value)))fail('policy mismatch');

const status=await json('/feeds/commerce/cart-revalidation/status');
if(status?.ok!==true||status?.authority!=='ATLAS_CART_CHECKOUT_REVALIDATION'||status?.stateless!==true||status?.persistence!==false||status?.orderCreation!==false||status?.paymentExecution!==false)fail('status boundary mismatch');

const empty=await json('/api/commerce/cart/revalidate',{method:'POST',body:JSON.stringify({lines:[]})});
if(empty?.outcome!=='blocked'||empty?.canCreateOrder!==false||empty?.canProcessPayment!==false)fail('empty cart must remain blocked');

const preview=await json('/api/commerce/cart/revalidate',{method:'POST',body:JSON.stringify({lines:[{lineId:'production-boundary-check',productId:'atlas-enterprise-suite',sourceType:'atlas-commercial-offer',sourceId:'atlas-enterprise-suite-us-preview-monthly',quantity:1,unitPrice:249,currency:'USD',market:'US'}]})});
if(preview?.outcome!=='blocked'||preview?.canCreateOrder!==false||preview?.canProcessPayment!==false||!Array.isArray(preview?.lines)||!preview.lines[0]?.reasons?.includes('offer_not_active'))fail('preview offer must not pass checkout gate');

console.log('PASS cart-revalidation production boundary: stateless, fail-closed, no order/payment execution.');
