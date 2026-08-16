import {commercialApprovalPolicy,commercialApprovalStatus,evaluateCommercialActivation} from '../modules/commercial-approval-gate.js';
import {commercialOfferFor} from '../modules/commercial-product-registry.js';

const fail=message=>{console.error(`[commercial-approval] ${message}`);process.exitCode=1};
const assert=(condition,message)=>{if(!condition)fail(message)};
const now=Date.parse('2026-08-16T12:00:00Z');

const policy=commercialApprovalPolicy();
assert(policy.schemaVersion===1,'policy schema mismatch');
assert(policy.authority==='ATLAS_COMMERCIAL_APPROVAL_GATE','approval authority mismatch');
assert(policy.writeEnabled===false,'approval write must remain disabled before verified D1 persistence');
assert(policy.persistence==='disabled-until-verified-d1','approval persistence boundary missing');

const base=commercialOfferFor('atlas-enterprise-suite');
assert(base&&base.status==='preview','expected preview baseline offer');
let result=evaluateCommercialActivation(base,now);
assert(!result.eligible&&result.reasons.includes('sale_approval_required'),'unapproved preview offer must be blocked');

const complete={...base,approvedForSale:true,approvedBy:'atlas-commercial-authority',approvedAt:'2026-08-16T11:55:00Z',effectiveFrom:'2026-08-16T12:00:00Z',fulfillmentEvidence:['release-evidence:test']};
result=evaluateCommercialActivation(complete,now);
assert(result.eligible&&result.targetStatus==='active'&&result.persisted===false,'complete evidence should be activation-eligible but not persisted');

result=evaluateCommercialActivation({...complete,effectiveTo:'2026-08-16T11:59:00Z'},now);
assert(!result.eligible&&result.reasons.includes('effective_window_invalid'),'invalid effective window must be blocked');

const community=commercialOfferFor('united-hands-hub');
result=evaluateCommercialActivation({...community,approvedForSale:true,approvedBy:'x',approvedAt:'2026-08-16T11:55:00Z',effectiveFrom:'2026-08-16T12:00:00Z',fulfillmentEvidence:['x']},now);
assert(!result.eligible&&result.reasons.includes('community_offer_not_retail_activatable'),'community offer must not use retail activation transition');

const status=commercialApprovalStatus(now);
assert(status.authority==='ATLAS_COMMERCIAL_APPROVAL_GATE','status authority mismatch');
assert(status.writeEnabled===false,'status must disclose disabled writes');
assert(status.active===0,'no offer should be active in current canonical registry');
assert(status.eligibleForActivation===0,'no current canonical offer should be activation-eligible without approval evidence');
assert(status.community===1,'expected one community offer');

if(!process.exitCode)console.log(`[commercial-approval] ok: active=${status.active}, eligible=${status.eligibleForActivation}, blocked=${status.blocked}, writes disabled.`);
