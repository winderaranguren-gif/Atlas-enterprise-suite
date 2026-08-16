import { Script } from 'node:vm';
import { ATLAS_CAPABILITY_REGISTRY, capabilityFusionRoutes } from '../modules/capability-fusion.js';

const expectedSlugs=[
  'lingua','language-coach','academy','tax-compliance','tax-pro',
  'candidate-hub','forms','stream','subscriptions','personalization'
];

const fail=(message)=>{throw new Error(`[capability-fusion] ${message}`)};
const assert=(condition,message)=>{if(!condition)fail(message)};
const compileInlineScripts=(html,slug)=>{
  const sources=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(match=>match[1]);
  for(let i=0;i<sources.length;i+=1){
    try{new Script(sources[i],{filename:`capability-${slug}-${i}.browser.js`})}
    catch(error){fail(`${slug} browser script ${i+1} does not compile: ${error.message}`)}
  }
  return sources.length;
};

assert(Array.isArray(ATLAS_CAPABILITY_REGISTRY),'registry must be an array');
assert(ATLAS_CAPABILITY_REGISTRY.length===expectedSlugs.length,`expected ${expectedSlugs.length} capabilities, found ${ATLAS_CAPABILITY_REGISTRY.length}`);

const slugs=ATLAS_CAPABILITY_REGISTRY.map(item=>item.slug);
assert(new Set(slugs).size===slugs.length,'capability slugs must be unique');
for(const slug of expectedSlugs)assert(slugs.includes(slug),`missing capability: ${slug}`);

for(const item of ATLAS_CAPABILITY_REGISTRY){
  assert(item.name?.startsWith('ATLAS '),`${item.slug} must use ATLAS naming`);
  assert(typeof item.summary==='string'&&item.summary.length>=40,`${item.slug} summary is incomplete`);
  assert(Array.isArray(item.features)&&item.features.length>=6,`${item.slug} must expose at least six capabilities`);
  assert(['foundation','workflow-ready','native-browser'].includes(item.state),`${item.slug} has unsupported state ${item.state}`);
}

const makeUrl=path=>new URL(`https://atlas.validation.local${path}`);
const call=async path=>capabilityFusionRoutes(new Request(makeUrl(path),{method:'GET'}),{},makeUrl(path));

const api=await call('/api/capabilities');
assert(api?.status===200,'registry API must return 200');
const apiBody=await api.json();
assert(apiBody.ok===true,'registry API must report ok');
assert(apiBody.count===expectedSlugs.length,'registry API count mismatch');

for(const slug of expectedSlugs){
  const detail=await call(`/api/capabilities/${slug}`);
  assert(detail?.status===200,`${slug} API must return 200`);
  const body=await detail.json();
  assert(body?.capability?.slug===slug,`${slug} API payload mismatch`);
}

const missing=await call('/api/capabilities/does-not-exist');
assert(missing?.status===404,'unknown capability API must return 404');

const grid=await call('/platform/capabilities');
assert(grid?.status===200,'capability grid must return 200');
const gridHtml=await grid.text();
for(const slug of expectedSlugs)assert(gridHtml.includes(`/platform/capabilities/${slug}`),`grid missing link for ${slug}`);

let compiledBrowserScripts=0;
for(const item of ATLAS_CAPABILITY_REGISTRY){
  const page=await call(`/platform/capabilities/${item.slug}`);
  assert(page?.status===200,`${item.slug} workspace must return 200`);
  const body=await page.text();
  assert(body.includes(item.name),`${item.slug} workspace must render its ATLAS name`);
  assert(body.includes('/platform/capabilities'),`${item.slug} workspace must retain Capability Grid navigation`);
  compiledBrowserScripts+=compileInlineScripts(body,item.slug);
  if(['language-coach','candidate-hub','forms','subscriptions'].includes(item.slug))assert(body.includes('const safe='),`${item.slug} must escape user-controlled values before innerHTML rendering`);
}

console.log(`ATLAS Capability Fusion gate passed: ${expectedSlugs.length} workspaces, ${compiledBrowserScripts} browser scripts compiled, APIs and routes verified.`);
