import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root=resolve(new URL('..',import.meta.url).pathname);
const origin=(process.env.ATLAS_PRODUCTION_ORIGIN||'https://atlasenterprisesuite.com').replace(/\/$/,'');
let expectedSha=String(process.env.ATLAS_EXPECTED_RELEASE_SHA||'').trim();
if(!expectedSha){try{expectedSha=(await readFile(resolve(root,'.atlas-release-sha'),'utf8')).trim()}catch{}}
if(!/^[0-9a-f]{40}$/i.test(expectedSha))throw new Error('expected_release_sha_unavailable');

const expectedCapabilities=['lingua','language-coach','academy','tax-compliance','tax-pro','candidate-hub','forms','stream','subscriptions','personalization'];
const hasCapabilitySet=data=>{
  const slugs=Array.isArray(data?.capabilities)?data.capabilities.map(item=>item?.slug):[];
  return data?.ok===true&&data?.count===expectedCapabilities.length&&expectedCapabilities.every(slug=>slugs.includes(slug));
};
const hasPublicCapabilitySet=data=>{
  const items=Array.isArray(data?.items)?data.items:[];
  const slugs=items.map(item=>item?.slug);
  return data?.ok===true&&data?.count===expectedCapabilities.length&&data?.generatedFrom==='ATLAS_CAPABILITY_REGISTRY'&&expectedCapabilities.every(slug=>slugs.includes(slug))&&items.every(item=>typeof item?.connectedAtlasWorkspace==='string'&&item.connectedAtlasWorkspace.startsWith('ATLAS '));
};
const hasCommercialTruth=data=>{
  const policy=data?.commercialPolicy,items=Array.isArray(data?.items)?data.items:[];
  if(data?.ok!==true||data?.count!==30||data?.generatedFrom!=='ATLAS_PRODUCT_AND_COMMERCIAL_OFFER_REGISTRIES'||policy?.policy!=='fail-closed'||policy?.authority!=='ATLAS_COMMERCIAL_OFFER_REGISTRY'||policy?.defaultState!=='preview'||!Array.isArray(policy?.activeIds)||!Array.isArray(policy?.communityIds))return false;
  const active=new Set(policy.activeIds);
  for(const item of items){
    if(!['active','preview','community'].includes(item?.commercialStatus))return false;
    if(item?.approvedForSale!==(item.commercialStatus==='active'))return false;
    if(item.commercialStatus==='active'){
      if(item.availability!=='in stock'||!active.has(item.id))return false;
    }else if(item.availability!=='out of stock')return false;
  }
  return true;
};
const hasCommercialStatus=data=>{
  if(data?.ok!==true||data?.commercialPolicy?.policy!=='fail-closed'||data?.commercialPolicy?.authority!=='ATLAS_COMMERCIAL_OFFER_REGISTRY'||typeof data?.commercialCounts!=='object')return false;
  const activeCount=Number(data.commercialCounts.active||0);
  return activeCount===data.commercialPolicy.activeIds.length&&data?.registry?.storage==='repository-source-controlled'&&data?.registry?.dynamicAdmin===false;
};
const hasProductRegistry=data=>{
  const items=Array.isArray(data?.items)?data.items:[];
  const ids=new Set(items.map(item=>item?.id));
  return data?.ok===true&&data?.source==='ATLAS_PRODUCT_REGISTRY'&&data?.storage==='repository-source-controlled'&&data?.dynamicAdmin===false&&data?.count===30&&items.length===30&&ids.size===30&&items.every(item=>item?.id&&item?.title&&item?.category&&item?.description&&item?.image&&item?.brand);
};
const hasOfferRegistry=data=>{
  const items=Array.isArray(data?.items)?data.items:[],offerIds=new Set(items.map(item=>item?.offerId)),productIds=new Set(items.map(item=>item?.productId));
  if(data?.ok!==true||data?.source!=='ATLAS_COMMERCIAL_OFFER_REGISTRY'||data?.storage!=='repository-source-controlled'||data?.dynamicAdmin!==false||data?.productCount!==30||data?.offerCount!==30||items.length!==30||offerIds.size!==30||productIds.size!==30||data?.policy?.policy!=='fail-closed')return false;
  return items.every(item=>{
    if(!['preview','community','active'].includes(item?.status)||item?.market!=='US'||item?.currency!=='USD')return false;
    if(item.status==='active')return item.approvedForSale===true&&Boolean(item.approvedAt&&item.approvedBy&&item.effectiveFrom)&&Array.isArray(item.fulfillmentEvidence)&&item.fulfillmentEvidence.length>0;
    return item.approvedForSale===false;
  });
};
const hasCommerceRegistryStatus=data=>data?.ok===true&&data?.productAuthority==='ATLAS_PRODUCT_REGISTRY'&&data?.offerAuthority==='ATLAS_COMMERCIAL_OFFER_REGISTRY'&&data?.commercialPolicy?.policy==='fail-closed'&&data?.registry?.storage==='repository-source-controlled'&&data?.registry?.dynamicAdmin===false&&data?.d1Persistence===false&&data?.d1PersistenceReason==='verified_d1_identity_pending';
const hasApprovalPolicy=data=>data?.ok===true&&data?.schemaVersion===1&&data?.authority==='ATLAS_COMMERCIAL_APPROVAL_GATE'&&data?.transition==='preview -> active'&&data?.persistence==='disabled-until-verified-d1'&&data?.writeEnabled===false&&Array.isArray(data?.requiredEvidence)&&['approvedForSale','approvedAt','approvedBy','effectiveFrom','fulfillmentEvidence'].every(key=>data.requiredEvidence.includes(key));
const hasApprovalStatus=data=>data?.ok===true&&data?.schemaVersion===1&&data?.authority==='ATLAS_COMMERCIAL_APPROVAL_GATE'&&data?.writeEnabled===false&&data?.persistence==='disabled-until-verified-d1'&&Number(data?.total)===30&&Number(data?.active)===0&&Number(data?.eligibleForActivation)===0&&Number(data?.community)===1&&Number(data?.blocked)===29;
const hasMerchantOfferContract=data=>data?.ok===true&&data?.schemaVersion===1&&data?.authority==='ATLAS_MERCHANT_OFFER_CONTRACT'&&data?.providerBound===true&&Array.isArray(data?.sourceTypes)&&data.sourceTypes.includes('authorized-provider-feed')&&data.sourceTypes.includes('verified-manual-record')&&Array.isArray(data?.requiredFields)&&data.requiredFields.includes('observedAt')&&data.requiredFields.includes('expiresAt');
const hasMerchantOfferStatus=data=>{
  if(data?.ok!==true||data?.authority!=='ATLAS_MERCHANT_OFFER_DIRECTORY'||data?.providerBound!==true)return false;
  const numeric=['total','fresh','usable','stale','invalid','liveProviderCount','verifiedManualOfferCount'];
  if(numeric.some(key=>!Number.isFinite(Number(data?.[key]))||Number(data[key])<0))return false;
  if(Number(data.usable)>Number(data.total)||Number(data.fresh)>Number(data.total))return false;
  if(Number(data.liveProviderCount)===0&&Number(data.verifiedManualOfferCount)===0&&Number(data.total)!==0)return false;
  return true;
};
const hasMerchantOfferFeed=data=>{
  const items=Array.isArray(data?.items)?data.items:[];
  if(data?.ok!==true||data?.source!=='ATLAS_MERCHANT_OFFER_DIRECTORY'||data?.contract?.authority!=='ATLAS_MERCHANT_OFFER_CONTRACT'||data?.status?.authority!=='ATLAS_MERCHANT_OFFER_DIRECTORY'||data?.status?.providerBound!==true)return false;
  if(items.length!==Number(data.status.usable||0))return false;
  if(Number(data.status.liveProviderCount||0)===0&&Number(data.status.verifiedManualOfferCount||0)===0&&items.length!==0)return false;
  return items.every(item=>item?.merchantOfferId&&item?.merchantId&&item?.productId&&item?.market&&item?.currency&&Number.isFinite(item?.unitPrice)&&['in_stock','limited'].includes(item?.inventoryStatus)&&item?.observedAt&&item?.expiresAt&&item?.source?.reference&&Array.isArray(item?.fulfillment?.methods)&&item.fulfillment.methods.length>0);
};

const checks=[
  {path:'/',status:200,contains:['ATLAS','href="/capabilities"','>Capabilities</a>']},
  {path:'/login',status:200,contains:['Sign in']},
  {path:'/signup',status:200,contains:['Create your ATLAS account']},
  {path:'/capabilities',status:200,contains:['ATLAS CAPABILITY DIRECTORY','One ecosystem.','Implementation transparency:','Connected: ATLAS Stream Control','Connected: ATLAS Subscription Control']},
  {path:'/feeds/capabilities.json',status:200,json:hasPublicCapabilitySet},
  {path:'/feeds/commerce/products.json',status:200,json:hasProductRegistry},
  {path:'/feeds/commerce/offers.json',status:200,json:hasOfferRegistry},
  {path:'/feeds/commerce/status',status:200,json:hasCommerceRegistryStatus},
  {path:'/feeds/commerce/approval-policy.json',status:200,json:hasApprovalPolicy},
  {path:'/feeds/commerce/approval-status',status:200,json:hasApprovalStatus},
  {path:'/feeds/commerce/merchant-offer-contract.json',status:200,json:hasMerchantOfferContract},
  {path:'/feeds/commerce/merchant-offers.json',status:200,json:hasMerchantOfferFeed},
  {path:'/feeds/commerce/merchant-offers/status',status:200,json:hasMerchantOfferStatus},
  {path:'/feeds/meta/atlas-catalog.json',status:200,json:hasCommercialTruth},
  {path:'/feeds/meta/status',status:200,json:hasCommercialStatus},
  {path:'/sitemap.xml',status:200,contains:[`<loc>${origin}/capabilities</loc>`]},
  {path:'/assets/atlas-capability-security.js',status:200,contains:['__ATLAS_CAPABILITY_SAFE_DOM__','javascript:','data:text/html']},
  {path:'/api/health',status:200,json:d=>d?.ok===true&&d?.state==='operational'},
  {path:'/api/readiness',status:200,json:d=>d?.ok===true&&d?.state==='ready'&&d?.checks?.database===true&&d?.checks?.schema===true&&d?.checks?.firstOwner===true&&d?.checks?.release===true},
  {path:'/api/release',status:200,json:d=>d?.ok===true&&d?.releaseBranch==='main'&&String(d?.releaseSha||'').toLowerCase()===expectedSha.toLowerCase()},
  {path:'/api/capabilities',status:200,json:hasCapabilitySet},
  {path:'/platform/capabilities/stream',status:302,redirect:'manual',locationContains:'/login'},
  {path:'/platform/capabilities/subscriptions',status:302,redirect:'manual',locationContains:'/login'},
  {path:'/platform/stream-control',status:302,redirect:'manual',locationContains:'/login'},
  {path:'/platform/subscriptions',status:302,redirect:'manual',locationContains:'/login'},
  {path:'/platform/forms-control',status:302,redirect:'manual',locationContains:'/login'},
  {path:'/platform/knowledge-reader',status:302,redirect:'manual',locationContains:'/login'}
];

let failed=false;
for(const check of checks){
  const url=origin+check.path;
  let thisFailed=false;
  try{
    const response=await fetch(url,{redirect:check.redirect||'follow',headers:{'user-agent':'ATLAS-Production-Verifier/4.0'},signal:AbortSignal.timeout(15000)});
    const text=await response.text();
    if(response.status!==check.status){console.error(`FAIL ${check.path}: HTTP ${response.status}, expected ${check.status}${text?` · ${text.slice(0,300)}`:''}`);failed=thisFailed=true;continue}
    if(check.locationContains){const location=response.headers.get('location')||'';if(!location.includes(check.locationContains)){console.error(`FAIL ${check.path}: redirect location ${JSON.stringify(location)} missing ${JSON.stringify(check.locationContains)}`);failed=thisFailed=true}}
    for(const needle of check.contains||[]){if(!text.includes(needle)){console.error(`FAIL ${check.path}: missing expected marker ${JSON.stringify(needle)}`);failed=thisFailed=true}}
    if(check.json){let data;try{data=JSON.parse(text)}catch{console.error(`FAIL ${check.path}: invalid JSON`);failed=thisFailed=true;continue}if(!check.json(data)){console.error(`FAIL ${check.path}: production state/identity mismatch · ${text.slice(0,500)}`);failed=thisFailed=true}}
    if(!thisFailed)console.log(`PASS ${check.path}`);
  }catch(error){console.error(`FAIL ${check.path}: ${error?.message||error}`);failed=true}
}

if(failed){console.error(`ATLAS production verification failed. Expected release ${expectedSha}. Release must not be called LIVE.`);process.exit(43)}
console.log(`ATLAS production verified LIVE @ ${expectedSha}.`);
