const SOURCE_TYPES=new Set(['authorized-provider-feed','verified-manual-record']);
const INVENTORY_STATES=new Set(['in_stock','limited','out_of_stock','unknown']);
const FULFILLMENT_METHODS=new Set(['pickup','delivery','shipping','digital']);

// Intentionally empty until an authorized provider feed or verified manual merchant record exists.
const MERCHANT_OFFERS=Object.freeze([]);

function asTime(value){const t=Date.parse(String(value||''));return Number.isFinite(t)?t:null}
function finiteNonnegative(value){return Number.isFinite(value)&&value>=0}

export function merchantOfferContract(){
 return {
  schemaVersion:1,
  authority:'ATLAS_MERCHANT_OFFER_CONTRACT',
  providerBound:true,
  sourceTypes:[...SOURCE_TYPES],
  inventoryStates:[...INVENTORY_STATES],
  fulfillmentMethods:[...FULFILLMENT_METHODS],
  requiredFields:['merchantOfferId','merchantId','productId','market','currency','unitPrice','inventoryStatus','observedAt','expiresAt','source.type','source.reference','fulfillment.methods'],
  freshnessRule:'Offer is usable only when source is accepted, observedAt is valid, expiresAt is in the future, price is nonnegative, inventory is not unknown/out_of_stock, and at least one fulfillment method is declared.',
  staleRule:'Expired, source-less, unknown-inventory, out-of-stock, or malformed offers must not be presented as usable live offers.'
 };
}

export function validateMerchantOffer(offer,now=Date.now()){
 const errors=[];
 if(!offer||typeof offer!=='object')return {ok:false,errors:['offer_required'],fresh:false,usable:false};
 if(!offer.merchantOfferId)errors.push('merchant_offer_id_required');
 if(!offer.merchantId)errors.push('merchant_id_required');
 if(!offer.productId)errors.push('product_id_required');
 if(!/^[A-Z]{2}$/.test(String(offer.market||'')))errors.push('market_invalid');
 if(!/^[A-Z]{3}$/.test(String(offer.currency||'')))errors.push('currency_invalid');
 if(!finiteNonnegative(offer.unitPrice))errors.push('unit_price_invalid');
 if(!INVENTORY_STATES.has(offer.inventoryStatus))errors.push('inventory_status_invalid');
 const observed=asTime(offer.observedAt),expires=asTime(offer.expiresAt);
 if(observed===null)errors.push('observed_at_invalid');
 if(expires===null)errors.push('expires_at_invalid');
 if(observed!==null&&expires!==null&&expires<=observed)errors.push('expiry_must_follow_observation');
 if(observed!==null&&observed>Number(now)+5*60_000)errors.push('observed_at_in_future');
 if(!offer.source||!SOURCE_TYPES.has(offer.source.type))errors.push('source_type_not_accepted');
 if(!String(offer.source?.reference||'').trim())errors.push('source_reference_required');
 const methods=Array.isArray(offer.fulfillment?.methods)?offer.fulfillment.methods:[];
 if(!methods.length)errors.push('fulfillment_method_required');
 if(methods.some(method=>!FULFILLMENT_METHODS.has(method)))errors.push('fulfillment_method_invalid');
 const fresh=errors.length===0&&expires>Number(now);
 const usable=fresh&&['in_stock','limited'].includes(offer.inventoryStatus);
 return {ok:errors.length===0,errors,fresh,usable};
}

export function merchantOffers(){return MERCHANT_OFFERS.map(item=>structuredClone(item))}
export function usableMerchantOffers(now=Date.now()){return MERCHANT_OFFERS.filter(item=>validateMerchantOffer(item,now).usable).map(item=>structuredClone(item))}
export function merchantOfferStatus(now=Date.now()){
 let fresh=0,usable=0,stale=0,invalid=0;
 for(const offer of MERCHANT_OFFERS){const result=validateMerchantOffer(offer,now);if(!result.ok)invalid++;else if(!result.fresh)stale++;else fresh++;if(result.usable)usable++;}
 return {schemaVersion:1,authority:'ATLAS_MERCHANT_OFFER_DIRECTORY',providerBound:true,total:MERCHANT_OFFERS.length,fresh,usable,stale,invalid,liveProviderCount:0,verifiedManualOfferCount:0,rule:'No live merchant offer is published without accepted source provenance and freshness.'};
}

export async function merchantOfferRoutes(request,_env,url){
 if(request.method!=='GET')return null;
 if(url.pathname==='/feeds/commerce/merchant-offer-contract.json')return Response.json({ok:true,...merchantOfferContract()},{headers:{'cache-control':'public,max-age=900','access-control-allow-origin':'*'}});
 if(url.pathname==='/feeds/commerce/merchant-offers.json')return Response.json({ok:true,source:'ATLAS_MERCHANT_OFFER_DIRECTORY',contract:merchantOfferContract(),status:merchantOfferStatus(),items:usableMerchantOffers()},{headers:{'cache-control':'no-store','access-control-allow-origin':'*'}});
 if(url.pathname==='/feeds/commerce/merchant-offers/status')return Response.json({ok:true,...merchantOfferStatus()},{headers:{'cache-control':'no-store'}});
 return null;
}

export {MERCHANT_OFFERS};
