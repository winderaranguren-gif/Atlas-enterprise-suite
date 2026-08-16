import {COMMERCIAL_OFFERS,PRODUCT_DEFINITIONS,commercialOfferFor,commercialRegistrySummary,productDefinitionFor} from '../modules/commercial-product-registry.js';
import {catalogCommercialPolicy} from '../modules/commercial-catalog-state.js';

const fail=message=>{console.error(`[commerce-registry] ${message}`);process.exitCode=1};
const assert=(condition,message)=>{if(!condition)fail(message)};

assert(PRODUCT_DEFINITIONS.length===30,`expected 30 product definitions, found ${PRODUCT_DEFINITIONS.length}`);
assert(COMMERCIAL_OFFERS.length===30,`expected 30 commercial offers, found ${COMMERCIAL_OFFERS.length}`);

const productIds=new Set(),offerIds=new Set(),offerProductIds=new Set();
for(const product of PRODUCT_DEFINITIONS){
 assert(product.id&&/^atlas-|^united-hands-hub$/.test(product.id),`invalid product id: ${product.id}`);
 assert(!productIds.has(product.id),`duplicate product id: ${product.id}`);productIds.add(product.id);
 assert(product.title&&product.category&&product.description&&product.image,`product definition incomplete: ${product.id}`);
 assert(productDefinitionFor(product.id)?.id===product.id,`product lookup mismatch: ${product.id}`);
}

for(const offer of COMMERCIAL_OFFERS){
 assert(offer.offerId&&offer.productId,`offer identity incomplete: ${offer.offerId||'unknown'}`);
 assert(!offerIds.has(offer.offerId),`duplicate offer id: ${offer.offerId}`);offerIds.add(offer.offerId);
 assert(!offerProductIds.has(offer.productId),`multiple canonical offers for same product/market baseline: ${offer.productId}`);offerProductIds.add(offer.productId);
 assert(productIds.has(offer.productId),`offer references unknown product: ${offer.productId}`);
 assert(offer.market==='US',`baseline market must be US: ${offer.offerId}`);
 assert(offer.currency==='USD',`baseline currency must be USD: ${offer.offerId}`);
 assert(['preview','community','active'].includes(offer.status),`invalid offer status: ${offer.offerId}:${offer.status}`);
 assert(Number.isFinite(offer.listPrice)&&offer.listPrice>=0,`invalid list price: ${offer.offerId}`);
 assert(Number.isFinite(offer.candidatePrice)&&offer.candidatePrice>=0,`invalid candidate price: ${offer.offerId}`);
 assert(offer.candidatePrice<=offer.listPrice||offer.listPrice===0,`candidate price exceeds list price: ${offer.offerId}`);
 assert(commercialOfferFor(offer.productId)?.offerId===offer.offerId,`offer lookup mismatch: ${offer.offerId}`);
 if(offer.status==='active'){
  assert(offer.approvedForSale===true,`active offer must be approved: ${offer.offerId}`);
  assert(Boolean(offer.approvedAt&&offer.approvedBy&&offer.effectiveFrom),`active offer requires approval/effective evidence: ${offer.offerId}`);
  assert(Array.isArray(offer.fulfillmentEvidence)&&offer.fulfillmentEvidence.length>0,`active offer requires fulfillment evidence: ${offer.offerId}`);
 }else{
  assert(offer.approvedForSale===false,`non-active offer cannot be approved for sale: ${offer.offerId}`);
 }
}

for(const id of productIds)assert(offerProductIds.has(id),`product missing canonical baseline offer: ${id}`);
const policy=catalogCommercialPolicy();
assert(policy.policy==='fail-closed','catalog commercial policy must remain fail-closed');
assert(policy.authority==='ATLAS_COMMERCIAL_OFFER_REGISTRY','commercial policy must derive from canonical offer registry');
assert(policy.activeIds.length===COMMERCIAL_OFFERS.filter(item=>item.status==='active'&&item.approvedForSale).length,'active allowlist must derive from active approved offers');
const summary=commercialRegistrySummary();
assert(summary.productCount===PRODUCT_DEFINITIONS.length,'registry product count mismatch');
assert(summary.offerCount===COMMERCIAL_OFFERS.length,'registry offer count mismatch');
assert(summary.storage==='repository-source-controlled','current registry authority must disclose source-controlled storage');
assert(summary.dynamicAdmin===false,'registry must not imply dynamic admin before durable persistence is verified');

if(!process.exitCode)console.log(`[commerce-registry] ok: ${summary.productCount} products, ${summary.offerCount} offers, ${policy.activeIds.length} active-for-sale, source-controlled authority.`);
