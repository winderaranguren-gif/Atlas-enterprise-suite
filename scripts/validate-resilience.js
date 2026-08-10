'use strict';
const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
const read=name=>fs.readFileSync(path.join(root,name),'utf8');
const required=(condition,message)=>{if(!condition)throw new Error(message);};

const resilience=read('atlas-resilience.js');
const app=read('app.js');
const sw=read('service-worker.js');
const pkg=JSON.parse(read('package.json'));

for(const token of [
  'noBlindRetry:true',
  'changeStrategyAfterFailure:true',
  'verificationRequiredForMutations:true',
  'circuitBreaker:true',
  'registerStrategy',
  'eligibleStrategies',
  'recordFailure',
  'strategy-cooldown',
  'strategies-exhausted',
  'installTechnicalSupportIntegration'
]) required(resilience.includes(token),`ATLAS resilience invariant missing: ${token}`);

required(app.includes("resilience.src='atlas-resilience.js?v=1'"),'app.js does not load ATLAS resilience runtime.');
required(app.includes('resilience.onload=loadSupport'),'ATLAS resilience does not advance to Technical Support after load.');
required(app.includes('resilience.onerror=loadSupport'),'ATLAS resilience loader does not preserve Technical Support fallback.');
required(app.includes('operational.onload=loadResilience'),'ATLAS operational runtime is not wired to load resilience first.');
required(app.includes('operational.onerror=loadResilience'),'ATLAS operational fallback does not preserve resilience load order.');
required(sw.includes("'/atlas-resilience.js'"),'Service Worker app shell is missing atlas-resilience.js.');
const versionMatch=sw.match(/const\s+VERSION\s*=\s*['"]atlas-core-v(\d+)(?:-[^'"]+)?['"]/);
required(versionMatch && Number(versionMatch[1])>=16,'Service Worker cache version does not satisfy the resilience baseline.');
required(pkg.scripts?.['check:resilience']==='node scripts/validate-resilience.js','package.json is missing check:resilience.');
required(pkg.scripts?.['check:js']?.includes('node --check atlas-resilience.js'),'check:js does not syntax-check atlas-resilience.js.');
required(pkg.scripts?.validate?.includes('npm run check:resilience'),'Repository validation does not enforce ATLAS resilience.');

console.log('ATLAS resilience contract verified.');