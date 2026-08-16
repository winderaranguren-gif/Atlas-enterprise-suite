import {CATALOG,atlasMetaCatalog,metaCatalogCsv} from '../modules/meta-catalog.js';
import {catalogCommercialPolicy,commercialStateFor,metaAvailabilityFor} from '../modules/commercial-catalog-state.js';

const fail=message=>{console.error(`[meta-catalog] ${message}`);process.exitCode=1};
const assert=(condition,message)=>{if(!condition)fail(message)};

assert(CATALOG.length===30,`expected 30 catalog items, found ${CATALOG.length}`);
const ids=new Set(CATALOG.map(item=>item.id));
assert(ids.size===CATALOG.length,'catalog item ids must be unique');
const policy=catalogCommercialPolicy();
assert(policy.policy==='fail-closed','commercial policy must be fail-closed');
assert(policy.defaultState==='preview','default commercial state must be preview');
assert(Array.isArray(policy.activeIds),'activeIds must be explicit');
for(const id of policy.activeIds)assert(ids.has(id),`commercial policy references unknown active id: ${id}`);
for(const id of policy.communityIds||[])assert(ids.has(id),`commercial policy references unknown community id: ${id}`);

for(const item of atlasMetaCatalog()){
 assert(/^atlas-|^united-hands-hub$/.test(item.id),`invalid id: ${item.id}`);
 assert(item.title&&item.description,`missing copy: ${item.id}`);
 assert(Number.isFinite(item.price)&&item.price>=0,`invalid price: ${item.id}`);
 assert(Number.isFinite(item.sale)&&item.sale>=0,`invalid sale price: ${item.id}`);
 assert(item.sale<=item.price||item.price===0,`sale price exceeds regular price: ${item.id}`);
 assert(item.imageLink.startsWith('https://atlasenterprisesuite.com/assets/'),`image must be ATLAS-hosted: ${item.id}`);
 assert(item.link.startsWith('https://atlasenterprisesuite.com/'),`product link must be ATLAS-hosted: ${item.id}`);
 assert(item.commercialStatus===commercialStateFor(item.id),`commercial state mismatch: ${item.id}`);
 assert(item.availability===metaAvailabilityFor(item.commercialStatus),`availability must derive from commercial state: ${item.id}`);
 assert(item.approvedForSale===(item.commercialStatus==='active'),`approvedForSale mismatch: ${item.id}`);
 if(item.availability==='in stock')assert(policy.activeIds.includes(item.id),`in stock without explicit commercial approval: ${item.id}`);
 if(item.commercialStatus!=='active')assert(item.availability==='out of stock',`non-active item must fail closed: ${item.id}`);
}
const csv=metaCatalogCsv();
const lines=csv.trim().split('\n');
assert(lines.length===31,`expected header + 30 rows, found ${lines.length}`);
assert(lines[0]==='id,title,description,availability,condition,price,sale_price,link,image_link,brand,product_type','unexpected CSV header');
assert(!csv.includes('undefined'),'feed contains undefined values');
assert(!csv.includes('Launch price:'),'unapproved catalog must not advertise launch-price sale copy');
if(policy.activeIds.length===0)assert(!csv.includes(',in stock,'),'catalog must contain no in-stock rows until explicitly approved');
if(!process.exitCode)console.log(`[meta-catalog] ok: ${CATALOG.length} items, ${policy.activeIds.length} active-for-sale, fail-closed commercial truth enforced, ${Buffer.byteLength(csv)} bytes`);
