import { cartRevalidationPolicy, cartRevalidationStatus, revalidateCart, revalidateCartLine } from '../modules/cart-checkout-revalidation.js';

const fail=message=>{console.error(`[cart-revalidation] ${message}`);process.exitCode=1};
const assert=(condition,message)=>{if(!condition)fail(message)};
const now=Date.parse('2026-08-16T15:00:00Z');

const policy=cartRevalidationPolicy();
assert(policy.authority==='ATLAS_CART_CHECKOUT_REVALIDATION','unexpected authority');
assert(policy.transactional===false&&policy.createsOrder===false&&policy.processesPayment===false,'revalidation must remain decision-only');
assert(policy.outcomes.includes('ready')&&policy.outcomes.includes('changed')&&policy.outcomes.includes('blocked'),'missing required outcomes');

const activeOffer={offerId:'atlas-test-us-active-monthly',productId:'atlas-test',status:'active',approvedForSale:true,market:'US',currency:'USD',candidatePrice:25,billingBasis:'monthly'};
const atlasResolvers={atlasOfferFor:id=>id==='atlas-test'?activeOffer:null};
const baseAtlasLine={lineId:'l1',productId:'atlas-test',sourceType:'atlas-commercial-offer',sourceId:activeOffer.offerId,quantity:1,unitPrice:25,currency:'USD',market:'US'};
assert(revalidateCartLine(baseAtlasLine,0,now,atlasResolvers).outcome==='ready','active unchanged ATLAS offer should be ready');
const changedPrice=revalidateCartLine({...baseAtlasLine,unitPrice:20},0,now,atlasResolvers);
assert(changedPrice.outcome==='changed'&&changedPrice.reasons.includes('price_changed'),'ATLAS price change must require refresh/re-acceptance');
const inactive=revalidateCartLine(baseAtlasLine,0,now,{atlasOfferFor:()=>({...activeOffer,status:'preview',approvedForSale:false})});
assert(inactive.outcome==='blocked'&&inactive.reasons.includes('offer_not_active'),'inactive ATLAS offer must block');

const merchantOffer={merchantOfferId:'merchant-offer-1',merchantId:'merchant-1',productId:'product-1',market:'US',currency:'USD',unitPrice:10,inventoryStatus:'in_stock',observedAt:'2026-08-16T14:55:00Z',expiresAt:'2026-08-16T15:20:00Z',source:{type:'verified-manual-record',reference:'test-evidence'},fulfillment:{methods:['pickup','delivery']}};
const merchantResolvers={merchantOfferFor:id=>id===merchantOffer.merchantOfferId?merchantOffer:null,validateMerchant:()=>({ok:true,errors:[],fresh:true,usable:true})};
const merchantLine={lineId:'m1',productId:'product-1',sourceType:'merchant-offer',sourceId:'merchant-offer-1',quantity:2,unitPrice:10,currency:'USD',market:'US',fulfillmentMethod:'pickup'};
assert(revalidateCartLine(merchantLine,0,now,merchantResolvers).outcome==='ready','fresh merchant offer should be ready');
const changedFulfillment=revalidateCartLine({...merchantLine,fulfillmentMethod:'shipping'},0,now,merchantResolvers);
assert(changedFulfillment.outcome==='changed'&&changedFulfillment.reasons.includes('fulfillment_changed'),'fulfillment change must require refresh');
const stale=revalidateCartLine(merchantLine,0,now,{...merchantResolvers,validateMerchant:()=>({ok:true,errors:[],fresh:false,usable:false})});
assert(stale.outcome==='blocked'&&stale.reasons.includes('merchant_offer_stale'),'stale merchant offer must block');

const readyCart=revalidateCart({lines:[baseAtlasLine,merchantLine]},now,{...atlasResolvers,...merchantResolvers});
assert(readyCart.outcome==='ready'&&readyCart.canCreateOrder===true&&readyCart.canProcessPayment===false,'fully current cart should be ready only for order gate');
const changedCart=revalidateCart({lines:[{...baseAtlasLine,unitPrice:20}]},now,atlasResolvers);
assert(changedCart.outcome==='changed'&&changedCart.canCreateOrder===false,'changed cart must not create order');
const blockedCart=revalidateCart({lines:[baseAtlasLine]},now,{atlasOfferFor:()=>null});
assert(blockedCart.outcome==='blocked'&&blockedCart.canCreateOrder===false,'missing offer must block order creation');
assert(revalidateCart({lines:[]},now).outcome==='blocked','empty cart must block');

const status=cartRevalidationStatus();
assert(status.stateless===true&&status.persistence===false&&status.orderCreation===false&&status.paymentExecution===false,'status must preserve non-transaction boundary');
if(!process.exitCode)console.log('[cart-revalidation] ok: ready/changed/blocked gates verified; no order or payment execution');
