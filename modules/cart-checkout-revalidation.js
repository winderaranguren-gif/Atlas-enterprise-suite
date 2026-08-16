import { commercialOfferFor } from './commercial-product-registry.js';
import { merchantOffers, validateMerchantOffer } from './merchant-offer-contract.js';

const SOURCE_TYPES=new Set(['atlas-commercial-offer','merchant-offer']);
const OUTCOMES=new Set(['ready','changed','blocked']);
const MAX_LINES=100;

function finitePositive(value){return Number.isFinite(value)&&value>0}
function sameMoney(a,b){return Number(a)===Number(b)}
function defaultMerchantOfferFor(id){return merchantOffers().find(item=>item.merchantOfferId===id)||null}
function resolvers(custom={}){return {atlasOfferFor:custom.atlasOfferFor||commercialOfferFor,merchantOfferFor:custom.merchantOfferFor||defaultMerchantOfferFor,validateMerchant:custom.validateMerchant||validateMerchantOffer}}

export function cartRevalidationPolicy(){
 return {
  schemaVersion:1,
  authority:'ATLAS_CART_CHECKOUT_REVALIDATION',
  transactional:false,
  createsOrder:false,
  processesPayment:false,
  sourceTypes:[...SOURCE_TYPES],
  outcomes:[...OUTCOMES],
  maxLines:MAX_LINES,
  rule:'Every cart line must be revalidated against its current authoritative offer immediately before order creation. Stale, unavailable, changed-price, invalid-market, invalid-currency, or unsupported-fulfillment lines cannot silently proceed.',
  changedRule:'A price or fulfillment change returns changed and requires explicit cart refresh/re-acceptance before checkout.',
  blockedRule:'Missing, inactive, stale, out-of-stock, unknown-inventory, malformed, or source-mismatched offers return blocked.'
 };
}

function baseLineResult(line,index){
 return {index,lineId:String(line?.lineId||`line-${index+1}`),productId:String(line?.productId||''),sourceType:String(line?.sourceType||''),sourceId:String(line?.sourceId||''),outcome:'blocked',reasons:[],current:null};
}

export function revalidateCartLine(line,index=0,now=Date.now(),customResolvers={}){
 const result=baseLineResult(line,index),source=resolvers(customResolvers);
 if(!line||typeof line!=='object'){result.reasons.push('line_required');return result}
 if(!result.productId)result.reasons.push('product_id_required');
 if(!SOURCE_TYPES.has(result.sourceType))result.reasons.push('source_type_invalid');
 if(!result.sourceId)result.reasons.push('source_id_required');
 if(!finitePositive(line.quantity))result.reasons.push('quantity_invalid');
 if(!Number.isFinite(line.unitPrice)||line.unitPrice<0)result.reasons.push('unit_price_invalid');
 if(!/^[A-Z]{3}$/.test(String(line.currency||'')))result.reasons.push('currency_invalid');
 if(!/^[A-Z]{2}$/.test(String(line.market||'')))result.reasons.push('market_invalid');
 if(result.reasons.length)return result;

 if(result.sourceType==='atlas-commercial-offer'){
  const offer=source.atlasOfferFor(result.productId);
  if(!offer||offer.offerId!==result.sourceId){result.reasons.push('offer_not_found');return result}
  result.current={offerId:offer.offerId,productId:offer.productId,status:offer.status,market:offer.market,currency:offer.currency,unitPrice:offer.candidatePrice,billingBasis:offer.billingBasis};
  if(offer.status!=='active'||offer.approvedForSale!==true){result.reasons.push('offer_not_active');return result}
  if(offer.market!==line.market){result.reasons.push('market_changed');return result}
  if(offer.currency!==line.currency){result.reasons.push('currency_changed');return result}
  if(!sameMoney(offer.candidatePrice,line.unitPrice)){result.outcome='changed';result.reasons.push('price_changed');return result}
  result.outcome='ready';return result;
 }

 const offer=source.merchantOfferFor(result.sourceId);
 if(!offer||offer.productId!==result.productId){result.reasons.push('merchant_offer_not_found');return result}
 const validation=source.validateMerchant(offer,now);
 result.current={merchantOfferId:offer.merchantOfferId,merchantId:offer.merchantId,productId:offer.productId,market:offer.market,currency:offer.currency,unitPrice:offer.unitPrice,inventoryStatus:offer.inventoryStatus,observedAt:offer.observedAt,expiresAt:offer.expiresAt,fulfillmentMethods:[...(offer.fulfillment?.methods||[])]};
 if(!validation.ok){result.reasons.push('merchant_offer_invalid',...validation.errors);return result}
 if(!validation.fresh){result.reasons.push('merchant_offer_stale');return result}
 if(!validation.usable){result.reasons.push('merchant_offer_unavailable');return result}
 if(offer.market!==line.market){result.reasons.push('market_changed');return result}
 if(offer.currency!==line.currency){result.reasons.push('currency_changed');return result}
 const requestedMethod=String(line.fulfillmentMethod||'');
 if(!requestedMethod){result.reasons.push('fulfillment_method_required');return result}
 if(!(offer.fulfillment?.methods||[]).includes(requestedMethod)){result.outcome='changed';result.reasons.push('fulfillment_changed');return result}
 if(!sameMoney(offer.unitPrice,line.unitPrice)){result.outcome='changed';result.reasons.push('price_changed');return result}
 result.outcome='ready';return result;
}

export function revalidateCart(cart,now=Date.now(),customResolvers={}){
 const lines=Array.isArray(cart?.lines)?cart.lines:[];
 if(!cart||typeof cart!=='object')return {ok:false,outcome:'blocked',reasons:['cart_required'],lineCount:0,lines:[],canCreateOrder:false,canProcessPayment:false};
 if(!lines.length)return {ok:false,outcome:'blocked',reasons:['cart_empty'],lineCount:0,lines:[],canCreateOrder:false,canProcessPayment:false};
 if(lines.length>MAX_LINES)return {ok:false,outcome:'blocked',reasons:['cart_line_limit_exceeded'],lineCount:lines.length,lines:[],canCreateOrder:false,canProcessPayment:false};
 const results=lines.map((line,index)=>revalidateCartLine(line,index,now,customResolvers));
 const blocked=results.some(item=>item.outcome==='blocked');
 const changed=results.some(item=>item.outcome==='changed');
 const outcome=blocked?'blocked':changed?'changed':'ready';
 return {ok:true,outcome,reasons:[],lineCount:results.length,lines:results,canCreateOrder:outcome==='ready',canProcessPayment:false,revalidatedAt:new Date(Number(now)).toISOString(),rule:'ready means offer inputs are current enough for the next order-creation gate; it does not create an order or process payment.'};
}

export function cartRevalidationStatus(){
 return {schemaVersion:1,authority:'ATLAS_CART_CHECKOUT_REVALIDATION',stateless:true,persistence:false,orderCreation:false,paymentExecution:false,currentMerchantOffers:merchantOffers().length,rule:'No checkout state is trusted without revalidation.'};
}

export async function cartRevalidationRoutes(request,_env,url){
 if(request.method==='GET'&&url.pathname==='/feeds/commerce/cart-revalidation-policy.json')return Response.json({ok:true,...cartRevalidationPolicy()},{headers:{'cache-control':'public,max-age=900','access-control-allow-origin':'*'}});
 if(request.method==='GET'&&url.pathname==='/feeds/commerce/cart-revalidation/status')return Response.json({ok:true,...cartRevalidationStatus()},{headers:{'cache-control':'no-store'}});
 if(request.method==='POST'&&url.pathname==='/api/commerce/cart/revalidate'){
  const length=Number(request.headers.get('content-length')||0);
  if(length>64_000)return Response.json({ok:false,error:'payload_too_large'},{status:413,headers:{'cache-control':'no-store'}});
  let body;try{body=await request.json()}catch{return Response.json({ok:false,error:'invalid_json'},{status:400,headers:{'cache-control':'no-store'}})}
  return Response.json(revalidateCart(body),{headers:{'cache-control':'no-store'}});
 }
 return null;
}
