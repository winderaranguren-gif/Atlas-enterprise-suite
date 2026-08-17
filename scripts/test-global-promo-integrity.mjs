import {
  globalPromoPackingGate,
  globalPromoDeliveryGate,
  globalPromoCommercialContextLocked
} from '../modules/global-promo-integrity.js';

function assert(condition,message){if(!condition)throw new Error(message)}

const cases=[
  [globalPromoPackingGate(0,0)==='quality_pass_required_before_packing','Packing must reject missing QC'],
  [globalPromoPackingGate(2,1)===null,'Packing must allow at least one passing QC'],
  [globalPromoDeliveryGate(0,0,0)==='package_required_before_delivery','Delivery must require a package'],
  [globalPromoDeliveryGate(1,0,0)==='delivered_package_required','Delivery must require delivered evidence'],
  [globalPromoDeliveryGate(2,1,1)==='packages_not_delivered','Delivery must reject open packages'],
  [globalPromoDeliveryGate(1,1,0)===null,'Delivery must allow completed package evidence'],
  [globalPromoCommercialContextLocked('acct1','quote1','acct2','quote2',{finance_invoice_id:'inv1'})===true,'Commercial context must lock after invoice'],
  [globalPromoCommercialContextLocked('acct1','quote1','acct1','quote1',{finance_invoice_id:'inv1'})===false,'Unchanged commercial context must remain valid'],
  [globalPromoCommercialContextLocked('acct1','quote1','acct2','quote2',null)===false,'Commercial context may change before invoice']
];
for(const [ok,message] of cases)assert(ok,message);
console.log(`Global Promo integrity tests passed: ${cases.length}/${cases.length}`);