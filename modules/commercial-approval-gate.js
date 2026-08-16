import { commercialOffers } from './commercial-product-registry.js';

const ACTIVATABLE_FROM=new Set(['preview']);

function parseTime(value){const time=Date.parse(String(value||''));return Number.isFinite(time)?time:null}
function nonempty(value){return Boolean(String(value||'').trim())}

export function commercialApprovalPolicy(){
 return {
  schemaVersion:1,
  authority:'ATLAS_COMMERCIAL_APPROVAL_GATE',
  transition:'preview -> active',
  persistence:'disabled-until-verified-d1',
  writeEnabled:false,
  requiredEvidence:['approvedForSale','approvedAt','approvedBy','effectiveFrom','fulfillmentEvidence'],
  rules:[
   'community offers cannot be activated as retail offers through this transition',
   'approval identity and timestamp are mandatory',
   'effectiveFrom must be a valid timestamp',
   'effectiveTo, when present, must follow effectiveFrom',
   'at least one fulfillment evidence reference is mandatory',
   'market, currency, list price and candidate price must remain valid',
   'decision eligibility does not persist or activate the offer by itself'
  ]
 };
}

export function evaluateCommercialActivation(offer,now=Date.now()){
 const reasons=[];
 if(!offer||typeof offer!=='object')return {eligible:false,reasons:['offer_required'],targetStatus:null};
 if(offer.status==='community')reasons.push('community_offer_not_retail_activatable');
 else if(offer.status==='active'){
  // Revalidate active records against the same evidence rules.
 }else if(!ACTIVATABLE_FROM.has(offer.status))reasons.push('source_status_not_activatable');
 if(offer.approvedForSale!==true)reasons.push('sale_approval_required');
 if(!nonempty(offer.approvedBy))reasons.push('approved_by_required');
 const approvedAt=parseTime(offer.approvedAt);if(approvedAt===null)reasons.push('approved_at_required');
 else if(approvedAt>Number(now)+5*60_000)reasons.push('approved_at_in_future');
 const effectiveFrom=parseTime(offer.effectiveFrom);if(effectiveFrom===null)reasons.push('effective_from_required');
 const effectiveTo=offer.effectiveTo?parseTime(offer.effectiveTo):null;
 if(offer.effectiveTo&&effectiveTo===null)reasons.push('effective_to_invalid');
 if(effectiveFrom!==null&&effectiveTo!==null&&effectiveTo<=effectiveFrom)reasons.push('effective_window_invalid');
 if(!Array.isArray(offer.fulfillmentEvidence)||offer.fulfillmentEvidence.length===0)reasons.push('fulfillment_evidence_required');
 if(!/^[A-Z]{2}$/.test(String(offer.market||'')))reasons.push('market_invalid');
 if(!/^[A-Z]{3}$/.test(String(offer.currency||'')))reasons.push('currency_invalid');
 if(!Number.isFinite(offer.listPrice)||offer.listPrice<0)reasons.push('list_price_invalid');
 if(!Number.isFinite(offer.candidatePrice)||offer.candidatePrice<0)reasons.push('candidate_price_invalid');
 if(Number.isFinite(offer.listPrice)&&Number.isFinite(offer.candidatePrice)&&offer.listPrice!==0&&offer.candidatePrice>offer.listPrice)reasons.push('candidate_price_exceeds_list_price');
 return {eligible:reasons.length===0,reasons,targetStatus:reasons.length===0?'active':null,decisionOnly:true,persisted:false};
}

export function commercialApprovalStatus(now=Date.now()){
 const offers=commercialOffers();let active=0,eligible=0,blocked=0,community=0;
 for(const offer of offers){
  if(offer.status==='community'){community++;continue}
  if(offer.status==='active')active++;
  const decision=evaluateCommercialActivation(offer,now);
  if(decision.eligible)eligible++;else blocked++;
 }
 return {schemaVersion:1,authority:'ATLAS_COMMERCIAL_APPROVAL_GATE',total:offers.length,active,eligibleForActivation:eligible,blocked,community,writeEnabled:false,persistence:'disabled-until-verified-d1'};
}

export async function commercialApprovalRoutes(request,_env,url){
 if(request.method!=='GET')return null;
 if(url.pathname==='/feeds/commerce/approval-policy.json')return Response.json({ok:true,...commercialApprovalPolicy()},{headers:{'cache-control':'public,max-age=900','access-control-allow-origin':'*'}});
 if(url.pathname==='/feeds/commerce/approval-status')return Response.json({ok:true,...commercialApprovalStatus()},{headers:{'cache-control':'no-store'}});
 return null;
}
