import {CATALOG,atlasMetaCatalog,metaCatalogCsv} from '../modules/meta-catalog.js';

const fail=message=>{console.error(`[meta-catalog] ${message}`);process.exitCode=1};
const assert=(condition,message)=>{if(!condition)fail(message)};

assert(CATALOG.length===30,`expected 30 catalog items, found ${CATALOG.length}`);
const ids=new Set(CATALOG.map(item=>item.id));
assert(ids.size===CATALOG.length,'catalog item ids must be unique');
for(const item of atlasMetaCatalog()){
 assert(/^atlas-|^united-hands-hub$/.test(item.id),`invalid id: ${item.id}`);
 assert(item.title&&item.description,`missing copy: ${item.id}`);
 assert(Number.isFinite(item.price)&&item.price>=0,`invalid price: ${item.id}`);
 assert(Number.isFinite(item.sale)&&item.sale>=0,`invalid sale price: ${item.id}`);
 assert(item.sale<=item.price||item.price===0,`sale price exceeds regular price: ${item.id}`);
 assert(item.imageLink.startsWith('https://atlasenterprisesuite.com/assets/'),`image must be ATLAS-hosted: ${item.id}`);
 assert(item.link.startsWith('https://atlasenterprisesuite.com/'),`product link must be ATLAS-hosted: ${item.id}`);
}
const csv=metaCatalogCsv();
const lines=csv.trim().split('\n');
assert(lines.length===31,`expected header + 30 rows, found ${lines.length}`);
assert(lines[0]==='id,title,description,availability,condition,price,sale_price,link,image_link,brand,product_type','unexpected CSV header');
assert(!csv.includes('undefined'),'feed contains undefined values');
if(!process.exitCode)console.log(`[meta-catalog] ok: ${CATALOG.length} items, ${Buffer.byteLength(csv)} bytes`);
