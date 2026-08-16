import { commercialOfferFor, commercialOffers } from './commercial-product-registry.js';

export function commercialStateFor(id){
  const offer=commercialOfferFor(id);
  return offer?.status||'preview';
}

export function metaAvailabilityFor(state){
  return state==='active'?'in stock':'out of stock';
}

export function commercialCopyFor(item,state){
  if(state==='active')return item.sale>0?`Available for sale. Current ATLAS price: $${item.sale}/month.`:'Available through ATLAS.';
  if(state==='community')return 'Community program listing. This catalog entry is not represented as a retail product for sale.';
  return 'ATLAS catalog preview. Commercial availability has not been approved for sale yet.';
}

export function catalogCommercialPolicy(){
  const offers=commercialOffers();
  const activeIds=offers.filter(item=>item.status==='active'&&item.approvedForSale===true).map(item=>item.productId);
  const communityIds=offers.filter(item=>item.status==='community').map(item=>item.productId);
  return {
    policy:'fail-closed',
    authority:'ATLAS_COMMERCIAL_OFFER_REGISTRY',
    activeIds,
    communityIds,
    defaultState:'preview',
    rule:'A catalog entry is not in stock unless its canonical commercial offer is active and explicitly approved for sale.'
  };
}
