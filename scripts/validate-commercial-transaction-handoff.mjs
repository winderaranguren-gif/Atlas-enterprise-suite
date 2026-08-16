import { commercialTransactionContract, commercialTransactionHandoffStatus, prepareEnterpriseOrderHandoff } from '../modules/commercial-transaction-handoff.js';

const fail=message=>{console.error(`[commercial-handoff] ${message}`);process.exitCode=1};
const assert=(condition,message)=>{if(!condition)fail(message)};
const now=Date.parse('2026-08-16T16:00:00Z');

const contract=commercialTransactionContract();
assert(contract.authority==='ATLAS_ENTERPRISE_COMMERCIAL_TRANSACTION_CONTRACT','unexpected contract authority');
assert(contract.intendedSystemOfRecord==='enterprise-commercial-transactions','enterprise must own commercial transactions');
assert(contract.persistence==='blocked-until-verified-d1-and-migration-sequence','persistence boundary mismatch');
assert(String(contract.migrationReservation).includes('0016'),'migration reservation must protect pending 0016 work');

const missingContext=prepareEnterpriseOrderHandoff({cart:{lines:[]},context:{}},now);
assert(missingContext.status==='blocked'&&missingContext.persisted===false,'missing enterprise context must block');

const activeOffer={offerId:'atlas-test-us-active-monthly',productId:'atlas-test',status:'active',approvedForSale:true,market:'US',currency:'USD',candidatePrice:25,billingBasis:'monthly'};
const cart={lines:[{lineId:'l1',productId:'atlas-test',sourceType:'atlas-commercial-offer',sourceId:activeOffer.offerId,quantity:2,unitPrice:25,currency:'USD',market:'US',fulfillmentMethod:'digital'}]};
const context={organizationId:'org-1',customerRef:'customer-1',createdBy:'user-1'};
const ready=prepareEnterpriseOrderHandoff({cart,context},now,{atlasOfferFor:id=>id==='atlas-test'?activeOffer:null});
assert(ready.ok===true&&ready.status==='ready_for_enterprise_order_creation','ready cart should create handoff envelope');
assert(ready.persisted===false&&ready.inventoryReserved===false&&ready.paymentAuthorized===false,'handoff must not claim side effects');
assert(ready.orderDraft?.authority==='ATLAS_ENTERPRISE_COMMERCIAL_TRANSACTION_CONTRACT','draft authority mismatch');
assert(ready.orderDraft?.status==='draft'&&ready.orderDraft?.subtotal===50,'draft totals/status mismatch');
assert(ready.orderDraft?.lines?.length===1&&ready.orderDraft.lines[0].sourceId===activeOffer.offerId,'lineage must preserve source offer');
assert(ready.orderDraft?.fulfillmentIntents?.[0]?.status==='pending'&&ready.orderDraft.fulfillmentIntents[0].reservationId===null,'fulfillment intent must not imply reservation');
assert(ready.orderDraft?.financeHandoff?.paymentEventId===null,'payment event must remain absent');

const changed=prepareEnterpriseOrderHandoff({cart:{lines:[{...cart.lines[0],unitPrice:20}]},context},now,{atlasOfferFor:()=>activeOffer});
assert(changed.status==='blocked'&&changed.reasons.includes('cart_changed'),'changed cart must not enter enterprise order creation');
const missingOffer=prepareEnterpriseOrderHandoff({cart,context},now,{atlasOfferFor:()=>null});
assert(missingOffer.status==='blocked'&&missingOffer.reasons.includes('cart_blocked'),'missing source offer must block handoff');

const status=commercialTransactionHandoffStatus();
assert(status.persistence===false&&status.d1Persistence===false&&status.salesOrderSystemOfRecordReady===false,'status must remain truthful about persistence');
assert(status.inventoryReservation===false&&status.paymentExecution===false,'status must not imply inventory/payment execution');
if(!process.exitCode)console.log('[commercial-handoff] ok: COM4 ready -> enterprise draft envelope verified with zero persistence/reservation/payment claims');
