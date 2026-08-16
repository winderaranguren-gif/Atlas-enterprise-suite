const ACTIVE_FOR_SALE=new Set([
  // Add a catalog ID here only after ATLAS has explicitly approved real sale/fulfillment readiness.
]);

const COMMUNITY_ONLY=new Set([
  'united-hands-hub'
]);

export function commercialStateFor(id){
  if(ACTIVE_FOR_SALE.has(id))return 'active';
  if(COMMUNITY_ONLY.has(id))return 'community';
  return 'preview';
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
  return {
    policy:'fail-closed',
    activeIds:[...ACTIVE_FOR_SALE],
    communityIds:[...COMMUNITY_ONLY],
    defaultState:'preview',
    rule:'A catalog entry is not in stock unless its ID is explicitly approved in ACTIVE_FOR_SALE.'
  };
}
