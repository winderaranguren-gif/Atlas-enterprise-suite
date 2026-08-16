import { catalogCommercialPolicy, commercialCopyFor, commercialStateFor, metaAvailabilityFor } from './commercial-catalog-state.js';
import { commercialOfferFor, commercialOffers, commercialRegistrySummary, productDefinitions } from './commercial-product-registry.js';

const ORIGIN='https://atlasenterprisesuite.com';

const CATALOG=Object.freeze(productDefinitions().map(product=>{
 const offer=commercialOfferFor(product.id);
 if(!offer)throw new Error(`commercial_offer_missing:${product.id}`);
 return Object.freeze({...product,price:offer.listPrice,sale:offer.candidatePrice});
}));

function csvCell(value=''){const text=String(value??'');return /[",\n\r]/.test(text)?`"${text.replaceAll('"','""')}"`:text}
function money(value){return `${Number(value).toFixed(2)} USD`}
function itemLink(item){return `${ORIGIN}/?product=${encodeURIComponent(item.id)}`}
function imageLink(item){return `${ORIGIN}${item.image}`}

export function atlasMetaCatalog(){return CATALOG.map(item=>{const commercialStatus=commercialStateFor(item.id);return {...item,countryOfOrigin:'US',commercialStatus,approvedForSale:commercialStatus==='active'&&commercialOfferFor(item.id)?.approvedForSale===true,availability:metaAvailabilityFor(commercialStatus),condition:'new',link:itemLink(item),imageLink:imageLink(item)}})}

export function metaCatalogCsv(){
 const header=['id','title','description','availability','condition','price','sale_price','link','image_link','brand','product_type'];
 const rows=atlasMetaCatalog().map(item=>[
  item.id,item.title,`${item.description} ${commercialCopyFor(item,item.commercialStatus)}`,
  item.availability,item.condition,money(item.price),money(item.sale),item.link,item.imageLink,item.brand,item.category
 ]);
 return [header,...rows].map(row=>row.map(csvCell).join(',')).join('\n')+'\n';
}

export async function metaCatalogRoutes(request,env,url){
 if(request.method!=='GET')return null;
 if(url.pathname==='/feeds/meta/atlas-catalog.csv')return new Response(metaCatalogCsv(),{headers:{'content-type':'text/csv; charset=utf-8','cache-control':'public,max-age=900','content-disposition':'inline; filename="atlas-catalog.csv"','x-content-type-options':'nosniff','access-control-allow-origin':'*'}});
 if(url.pathname==='/feeds/meta/atlas-catalog.json')return Response.json({ok:true,source:'ATLAS Enterprise Suite',generatedFrom:'ATLAS_PRODUCT_AND_COMMERCIAL_OFFER_REGISTRIES',currency:'USD',countryOfOrigin:'US',count:CATALOG.length,commercialPolicy:catalogCommercialPolicy(),items:atlasMetaCatalog()},{headers:{'cache-control':'public,max-age=900','access-control-allow-origin':'*'}});
 if(url.pathname==='/feeds/meta/status'){
  const items=atlasMetaCatalog(),counts=items.reduce((acc,item)=>{acc[item.commercialStatus]=(acc[item.commercialStatus]||0)+1;return acc},{});
  return Response.json({ok:true,feed:`${ORIGIN}/feeds/meta/atlas-catalog.csv`,count:CATALOG.length,mode:'scheduled-feed',credentialsRequired:false,commercialPolicy:catalogCommercialPolicy(),commercialCounts:counts,registry:commercialRegistrySummary()},{headers:{'cache-control':'no-store'}});
 }
 if(url.pathname==='/feeds/commerce/products.json')return Response.json({ok:true,source:'ATLAS_PRODUCT_REGISTRY',storage:'repository-source-controlled',dynamicAdmin:false,count:CATALOG.length,items:productDefinitions()},{headers:{'cache-control':'public,max-age=900','access-control-allow-origin':'*'}});
 if(url.pathname==='/feeds/commerce/offers.json')return Response.json({ok:true,source:'ATLAS_COMMERCIAL_OFFER_REGISTRY',policy:catalogCommercialPolicy(),...commercialRegistrySummary(),items:commercialOffers()},{headers:{'cache-control':'public,max-age=900','access-control-allow-origin':'*'}});
 if(url.pathname==='/feeds/commerce/status')return Response.json({ok:true,productAuthority:'ATLAS_PRODUCT_REGISTRY',offerAuthority:'ATLAS_COMMERCIAL_OFFER_REGISTRY',commercialPolicy:catalogCommercialPolicy(),registry:commercialRegistrySummary(),d1Persistence:false,d1PersistenceReason:'verified_d1_identity_pending'},{headers:{'cache-control':'no-store'}});
 return null;
}

export {CATALOG};
