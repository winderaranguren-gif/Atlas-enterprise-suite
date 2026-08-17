import {
  globalPromoPackingGate,
  globalPromoDeliveryGate,
  globalPromoCommercialContextLocked,
  globalPromoMaterialTransitionAllowed,
  globalPromoMaterialsGate,
  globalPromoWorkOrdersGate,
  globalPromoReadyGate,
  globalPromoWorkOrderExecutionAllowed,
  globalPromoQualityAllowed,
  globalPromoPackageCreationAllowed,
  globalPromoPackageFulfillmentAllowed
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
  [globalPromoCommercialContextLocked('acct1','quote1','acct2','quote2',null)===false,'Commercial context may change before invoice'],
  [globalPromoMaterialTransitionAllowed('required','ordered')===true,'Required material may be ordered'],
  [globalPromoMaterialTransitionAllowed('required','issued')===false,'Required material may not jump directly to issued'],
  [globalPromoMaterialTransitionAllowed('received','allocated')===true,'Received material may be allocated'],
  [globalPromoMaterialTransitionAllowed('issued','received')===false,'Issued material is terminal'],
  [globalPromoMaterialsGate(0,0)===null,'Jobs without material requirements remain valid'],
  [globalPromoMaterialsGate(2,1)==='materials_not_ready','Production must reject pending material requirements'],
  [globalPromoMaterialsGate(2,0)===null,'Production may proceed when existing material requirements are ready'],
  [globalPromoWorkOrdersGate(0,0,0)==='work_order_required_before_quality','Quality Control requires a production work order'],
  [globalPromoWorkOrdersGate(2,0,2)==='completed_work_order_required_before_quality','Quality Control requires completed production evidence'],
  [globalPromoWorkOrdersGate(2,1,1)==='work_orders_incomplete','Quality Control rejects open work orders'],
  [globalPromoWorkOrdersGate(2,2,0)===null,'Quality Control accepts completed work orders'],
  [globalPromoReadyGate(0,0)==='package_required_before_ready','Ready requires a package'],
  [globalPromoReadyGate(2,1)==='packages_not_ready','Ready rejects incomplete package preparation'],
  [globalPromoReadyGate(2,0)===null,'Ready accepts prepared packages'],
  [globalPromoWorkOrderExecutionAllowed('materials','in_progress')===false,'Work order execution may not begin before Production'],
  [globalPromoWorkOrderExecutionAllowed('production','in_progress')===true,'Work order execution is valid during Production'],
  [globalPromoWorkOrderExecutionAllowed('production','completed')===true,'Work order completion is valid during Production'],
  [globalPromoWorkOrderExecutionAllowed('materials','scheduled')===true,'Work orders may be scheduled before Production'],
  [globalPromoQualityAllowed('production')===false,'Final QC may not be recorded during Production'],
  [globalPromoQualityAllowed('quality_control')===true,'QC is valid in Quality Control'],
  [globalPromoPackageCreationAllowed('quality_control')===false,'Packages may not be created before Packing'],
  [globalPromoPackageCreationAllowed('packing')===true,'Packages may be created during Packing'],
  [globalPromoPackageCreationAllowed('ready')===true,'Additional package records may be created while Ready'],
  [globalPromoPackageFulfillmentAllowed('packing','shipped')===false,'Packages may not ship before job Ready'],
  [globalPromoPackageFulfillmentAllowed('ready','shipped')===true,'Packages may ship while job Ready'],
  [globalPromoPackageFulfillmentAllowed('ready','delivered')===true,'Package delivery evidence is valid while job Ready'],
  [globalPromoPackageFulfillmentAllowed('packing','packed')===true,'Packing status remains valid during Packing']
];
for(const [ok,message] of cases)assert(ok,message);
console.log(`Global Promo integrity tests passed: ${cases.length}/${cases.length}`);