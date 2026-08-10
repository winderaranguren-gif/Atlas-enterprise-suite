'use strict';
const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
const read=name=>fs.readFileSync(path.join(root,name),'utf8');
const required=(condition,message)=>{if(!condition)throw new Error(message);};

const resilience=read('atlas-resilience.js');
const support=read('atlas-technical-support.js');
const uiGuard=read('atlas-resilience-ui-guard.js');
const index=read('index.html');
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
  'installTechnicalSupportIntegration',
  'operation-in-flight',
  'inFlight',
  'currentCircuit',
  'FAILURE_WINDOW_MS',
  'result?.ok===true',
  'clearFailuresFor(opKey,strategy.id,{clearCircuit:false})',
  'result:evidence',
  'scope=null',
  'pruneExpiredFailures'
]) required(resilience.includes(token),`ATLAS resilience regression guard missing: ${token}`);

required(!resilience.includes("ok:result?.ok!==false"),'Read-only resilience must never infer success from the absence of ok=false.');
required(!resilience.includes('const opKey=operationKey(operation,{})'),'Scoped resets must not collapse back to the global operation key.');
required(/version:'1\.1\.0'/.test(resilience),'Resilience runtime version must reflect the P1/P2 repair release.');
required(support.includes('handleResolve'),'Technical Support UI resolver is missing.');

for(const token of [
  '[data-ats-resolve],[data-ats-diagnose]',
  'stopImmediatePropagation',
  'support.diagnose(summary,company)',
  '__atlasResilienceWrapped',
  '__atlasResilienceUiGuard'
]) required(uiGuard.includes(token),`Technical Support resilience UI guard missing: ${token}`);
required(index.includes('atlas-resilience-ui-guard.js?v=1'),'index.html must load the Technical Support resilience UI guard.');

required(app.includes("resilience.src='atlas-resilience.js?v=1'"),'app.js does not load ATLAS resilience runtime.');
required(app.includes('resilience.onload=loadSupport'),'ATLAS resilience does not advance to Technical Support after load.');
required(app.includes('resilience.onerror=loadSupport'),'ATLAS resilience loader does not preserve Technical Support fallback.');
required(app.includes('operational.onload=loadResilience'),'ATLAS operational runtime is not wired to load resilience first.');
required(app.includes('operational.onerror=loadResilience'),'ATLAS operational fallback does not preserve resilience load order.');
required(sw.includes("'/atlas-resilience.js'"),'Service Worker app shell is missing atlas-resilience.js.');
required(sw.includes("'/atlas-resilience-ui-guard.js'"),'Service Worker app shell is missing atlas-resilience-ui-guard.js.');
required(sw.includes("const VERSION = 'atlas-core-v17-resilience'"),'Service Worker cache version must advance to the resilience P1/P2 repair release.');
required(pkg.scripts?.['check:resilience']==='node scripts/validate-resilience.js','package.json is missing check:resilience.');
required(pkg.scripts?.['check:js']?.includes('node --check atlas-resilience.js'),'check:js does not syntax-check atlas-resilience.js.');
required(pkg.scripts?.validate?.includes('npm run check:resilience'),'Repository validation does not enforce ATLAS resilience.');

console.log('ATLAS resilience contract verified with post-review P1/P2 regression guards and UI routing protection.');