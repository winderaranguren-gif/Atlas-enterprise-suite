import {MERCHANT_OFFERS,merchantOfferContract,merchantOfferStatus,usableMerchantOffers,validateMerchantOffer} from '../modules/merchant-offer-contract.js';
import {productDefinitionFor} from '../modules/commercial-product-registry.js';

const fail=message=>{console.error(`[merchant-offers] ${message}`);process.exitCode=1};
const assert=(condition,message)=>{if(!condition)fail(message)};
const now=Date.parse('2026-08-16T12:00:00Z');
const contract=merchantOfferContract();

assert(contract.schemaVersion===1,'contract schema version mismatch');
assert(contract.authority==='ATLAS_MERCHANT_OFFER_CONTRACT','contract authority mismatch');
assert(contract.providerBound===true,'merchant offer data must remain provider-bound');

const sample={merchantOfferId:'test-offer-1',merchantId:'test-merchant',productId:'atlas-enterprise-suite',market:'US',currency:'USD',unitPrice:249,inventoryStatus:'in_stock',observedAt:'2026-08-16T11:55:00Z',expiresAt:'2026-08-16T12:15:00Z',source:{type:'verified-manual-record',reference:'test-evidence'},fulfillment:{methods:['digital']}};
let result=validateMerchantOffer(sample,now);
assert(result.ok&&result.fresh&&result.usable,'valid fresh offer must be usable');

result=validateMerchantOffer({...sample,merchantOfferId:'stale',expiresAt:'2026-08-16T11:59:00Z'},now);
assert(result.ok&&!result.fresh&&!result.usable,'expired offer must fail freshness');
result=validateMerchantOffer({...sample,merchantOfferId:'unknown-stock',inventoryStatus:'unknown'},now);
assert(result.ok&&result.fresh&&!result.usable,'unknown inventory must not be usable');
result=validateMerchantOffer({...sample,merchantOfferId:'bad-source',source:{type:'other',reference:'x'}},now);
assert(!result.ok&&!result.usable,'unsupported source must be rejected');

for(const offer of MERCHANT_OFFERS){
 assert(productDefinitionFor(offer.productId),`merchant offer references unknown ATLAS product: ${offer.productId}`);
 const check=validateMerchantOffer(offer,Date.now());
 assert(check.ok,`stored merchant offer invalid: ${offer.merchantOfferId}`);
}
const usable=usableMerchantOffers(Date.now()),status=merchantOfferStatus(Date.now());
assert(usable.length===status.usable,'usable offer count mismatch');
assert(status.total===MERCHANT_OFFERS.length,'status total mismatch');
assert(status.providerBound===true,'merchant directory must remain provider-bound');
if(status.liveProviderCount===0&&status.verifiedManualOfferCount===0)assert(status.total===0,'offers must not appear without verified source ownership');

if(!process.exitCode)console.log(`[merchant-offers] ok: contract v${contract.schemaVersion}, stored=${status.total}, usable=${status.usable}.`);
