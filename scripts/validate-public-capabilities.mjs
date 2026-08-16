import { capabilityPublicRoutes } from '../modules/capability-public.js';
import { ATLAS_CAPABILITY_REGISTRY } from '../modules/capability-fusion.js';

const expected=['lingua','language-coach','academy','tax-compliance','tax-pro','candidate-hub','forms','stream','subscriptions','personalization'];
const fail=message=>{throw new Error(`[public-capabilities] ${message}`)};
const assert=(condition,message)=>{if(!condition)fail(message)};
const makeUrl=path=>new URL(`https://atlas.validation.local${path}`);
const call=async path=>capabilityPublicRoutes(new Request(makeUrl(path),{method:'GET'}),{},makeUrl(path));

assert(ATLAS_CAPABILITY_REGISTRY.length===expected.length,'public directory must derive from the complete capability registry');
for(const slug of expected)assert(ATLAS_CAPABILITY_REGISTRY.some(item=>item.slug===slug),`registry missing ${slug}`);

const page=await call('/capabilities');
assert(page?.status===200,'public capability page must return 200');
const html=await page.text();
for(const marker of ['ATLAS CAPABILITY DIRECTORY','One ecosystem.','Implementation transparency:'])assert(html.includes(marker),`public page missing ${marker}`);
for(const slug of expected)assert(html.includes(`/platform/capabilities/${slug}`),`public page missing protected workspace link for ${slug}`);
for(const prohibited of ['in stock','Launch price:','$299','$99/month'])assert(!html.includes(prohibited),`public capability directory must not invent commerce state: ${prohibited}`);

const feed=await call('/feeds/capabilities.json');
assert(feed?.status===200,'public capability feed must return 200');
const body=await feed.json();
assert(body?.ok===true&&body?.count===expected.length,'public capability feed count mismatch');
assert(body?.generatedFrom==='ATLAS_CAPABILITY_REGISTRY','public feed must identify registry source');
for(const item of body.items||[]){
  assert(expected.includes(item.slug),`unexpected capability ${item.slug}`);
  assert(['native-browser','workflow-ready','foundation'].includes(item.implementationState),`${item.slug} has invalid implementation state`);
  assert(Array.isArray(item.features)&&item.features.length>=6,`${item.slug} public features incomplete`);
  assert(String(item.workspace||'').startsWith('https://atlasenterprisesuite.com/platform/capabilities/'),`${item.slug} public workspace URL invalid`);
}

const miss=await call('/not-capabilities');
assert(miss===null,'unrelated route must fall through');
console.log(`ATLAS public Capability directory passed: ${expected.length} items, honest states, public page and JSON feed verified.`);
