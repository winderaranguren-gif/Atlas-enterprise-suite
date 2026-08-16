import { readFile } from 'node:fs/promises';

const workerMeta=await readFile(new URL('../worker-meta.js',import.meta.url),'utf8');
const finance=await readFile(new URL('../modules/finance.js',import.meta.url),'utf8');
const hrTalent=await readFile(new URL('../modules/hr-talent.js',import.meta.url),'utf8');
const navigation=await readFile(new URL('./validate-functional-navigation.mjs',import.meta.url),'utf8');

const fail=message=>{throw new Error(`[capability-bridges] ${message}`)};
const assert=(condition,message)=>{if(!condition)fail(message)};

const bridges=[
  ['/platform/capabilities/academy','academy-training','/platform/hr-payroll/training'],
  ['/platform/capabilities/tax-compliance','tax-compliance-finance','/platform/finance/taxes'],
  ['/platform/capabilities/tax-pro','tax-pro-finance','/platform/finance/taxes'],
  ['/platform/capabilities/candidate-hub','candidate-recruiting','/platform/hr-payroll/recruiting']
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

console.log(`ATLAS Capability Bridge gate passed: ${bridges.length} live bridges and their HR/Finance targets verified.`);
