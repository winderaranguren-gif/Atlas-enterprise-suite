'use strict';

const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');

function read(file){return fs.readFileSync(path.join(root,file),'utf8');}
function assert(condition,message){if(!condition)throw new Error(`ATLAS Owned Core validation failed: ${message}`);}

const core=read('atlas-owned-core.js');
const provider=read('atlas-local-inference-provider.js');
const server=read('server.js');
const app=read('app.js');
const build=read('scripts/build-cloudflare.js');
const sw=read('service-worker.js');
const pkg=JSON.parse(read('package.json'));

assert(core.includes("externalProviders:false"),'external providers must be disabled by default');
assert(core.includes("ownership:'atlas'"),'native ATLAS provider ownership marker is missing');
assert(core.includes("ownership:'self-hosted'")||provider.includes("ownership:'self-hosted'"),'self-hosted provider ownership marker is missing');
assert(core.includes('requireVerificationForMutations:true'),'mutation verification must be enabled by default');
assert(core.includes("registerProvider('atlas-native-rules'"),'native rules provider is missing');
assert(provider.includes("const INFER_ENDPOINT='/api/atlas-ai/infer'"),'self-hosted inference must use the ATLAS same-origin endpoint');
assert(provider.includes("credentials:'same-origin'"),'self-hosted inference must use same-origin credentials');
assert(server.includes("pathname === '/api/atlas-ai/health'"),'local server is missing the ATLAS Owned AI health route');
assert(server.includes("pathname === '/api/atlas-ai/infer'"),'local server is missing the ATLAS Owned AI inference route');
assert(server.includes("externalProviders:false"),'local server must advertise external providers as disabled');
assert(server.includes("status:'local-generative-engine-not-installed'"),'local server must report the generative-model boundary explicitly');

const forbidden=[
  /api\.openai\.com/i,
  /api\.anthropic\.com/i,
  /generativelanguage\.googleapis\.com/i,
  /api\.cloudflare\.com/i,
  /workers\.dev/i
];
for(const pattern of forbidden){
  assert(!pattern.test(core),`owned core contains forbidden external endpoint ${pattern}`);
  assert(!pattern.test(provider),`self-hosted provider contains forbidden external endpoint ${pattern}`);
  assert(!pattern.test(server),`local ATLAS server contains forbidden external AI endpoint ${pattern}`);
}

assert(app.includes('atlas-owned-core.js?v=1'),'local app boot chain does not load ATLAS Owned Core');
assert(app.includes('atlas-local-inference-provider.js?v=1'),'local app boot chain does not load the self-hosted provider');
assert(build.includes('atlas-owned-core.js'),'Cloudflare build does not include ATLAS Owned Core');
assert(build.includes('atlas-local-inference-provider.js'),'Cloudflare build does not include the self-hosted provider');
assert(sw.includes('/atlas-owned-core.js'),'PWA cache does not include ATLAS Owned Core');
assert(sw.includes('/atlas-local-inference-provider.js'),'PWA cache does not include the self-hosted provider');
assert(pkg.scripts?.['check:owned-core']==='node scripts/validate-owned-core.js','package.json is missing check:owned-core');
assert(pkg.scripts?.['check:owned-ai-server']==='node scripts/validate-owned-ai-server.js','package.json is missing check:owned-ai-server');
assert(pkg.scripts?.validate?.includes('check:owned-core'),'repository validate pipeline does not gate ATLAS Owned Core');
assert(pkg.scripts?.validate?.includes('check:owned-ai-server'),'repository validate pipeline does not test the owned AI server endpoints');

console.log('ATLAS Owned Core validation passed: local-first policy, same-origin inference server, endpoint verification, PWA loading, mutation verification, and external-provider isolation are enforced.');