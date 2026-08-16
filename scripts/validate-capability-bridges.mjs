import { readFile } from 'node:fs/promises';

const workerMeta=await readFile(new URL('../worker-meta.js',import.meta.url),'utf8');
const workerCrm=await readFile(new URL('../worker-crm.js',import.meta.url),'utf8');
const streamSubscription=await readFile(new URL('../modules/stream-subscription-control.js',import.meta.url),'utf8');
const finance=await readFile(new URL('../modules/finance.js',import.meta.url),'utf8');
const hrTalent=await readFile(new URL('../modules/hr-talent.js',import.meta.url),'utf8');
const sensory=await readFile(new URL('../modules/sensory.js',import.meta.url),'utf8');
const workspaces=await readFile(new URL('../modules/module-workspaces.js',import.meta.url),'utf8');
const navigation=await readFile(new URL('./validate-functional-navigation.mjs',import.meta.url),'utf8');

const fail=message=>{throw new Error(`[capability-bridges] ${message}`)};
const assert=(condition,message)=>{if(!condition)fail(message)};

const bridges=[
  ['/platform/capabilities/lingua','lingua-localization','/platform/settings'],
  ['/platform/capabilities/language-coach','language-coach-voice','/platform/voice-vision'],
  ['/platform/capabilities/academy','academy-training','/platform/hr-payroll/training'],
  ['/platform/capabilities/tax-compliance','tax-compliance-finance','/platform/finance/taxes'],
  ['/platform/capabilities/tax-pro','tax-pro-finance','/platform/finance/taxes'],
  ['/platform/capabilities/candidate-hub','candidate-recruiting','/platform/hr-payroll/recruiting'],
  ['/platform/capabilities/forms','forms-documents','/platform/documents'],
  ['/platform/capabilities/stream','stream-control','/platform/stream-control'],
  ['/platform/capabilities/subscriptions','subscriptions-control','/platform/subscriptions'],
  ['/platform/capabilities/personalization','personalization-settings','/platform/settings']
];

assert(workerMeta.includes('const CAPABILITY_BRIDGES='),'production entrypoint must define Capability Fusion bridges');
assert(workerMeta.includes('enhanceCapabilityBridge(response,url)'),'production entrypoint must apply Capability Fusion bridges');

for(const [source,id,target] of bridges){
  assert(workerMeta.includes(`'${source}'`),`missing source bridge ${source}`);
  assert(workerMeta.includes(`id:'${id}'`),`missing bridge marker ${id}`);
  assert(workerMeta.includes(`href:'${target}'`),`missing bridge target ${target}`);
}

assert(hrTalent.includes("['Training','/platform/hr-payroll/training']"),'Academy target must remain in HR Talent navigation');
assert(hrTalent.includes("path==='/api/hr-talent/training'"),'Academy system-of-record API must remain available');
assert(finance.includes("['taxes','Taxes','/platform/finance/taxes','%']"),'Tax target must remain in Finance navigation');
assert(navigation.includes("'/platform/hr-payroll#recruitment':'/platform/hr-payroll/recruiting'"),'Candidate Hub recruiting target must remain a canonical navigation route');
assert(workspaces.includes("href:'/platform/documents'"),'Forms target must remain a protected Documents workspace');
assert(workspaces.includes("href:'/platform/settings'"),'Lingua/Personalization target must remain a protected Settings workspace');
assert(workspaces.includes("['Localization','localization'"),'Settings must retain Localization configuration');
assert(sensory.includes("'/platform/voice-vision'"),'Language Coach Voice & Vision target must remain available');
assert(sensory.includes('speechSynthesis'),'Voice & Vision must retain browser speech capability');
for(const route of ['/platform/stream-control','/platform/subscriptions'])assert(streamSubscription.includes(`url.pathname==='${route}'`),`protected browser workspace missing ${route}`);
assert(workerCrm.includes("import { streamSubscriptionRoutes } from './modules/stream-subscription-control.js';"),'protected runtime must import Stream/Subscription routes');
assert(workerCrm.includes("url.pathname==='/platform/stream-control'||url.pathname==='/platform/subscriptions'"),'protected runtime must intercept Stream/Subscription workspaces');
assert(workerCrm.includes('verifiedWorkspaceResponse(request,env,url,workspace)'),'Stream/Subscription workspaces must pass browser-session verification');

console.log(`ATLAS Capability Bridge gate passed: ${bridges.length} ecosystem bridges and their authoritative/protected targets verified.`);
