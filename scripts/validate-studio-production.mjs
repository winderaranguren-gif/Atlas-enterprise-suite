import fs from 'node:fs';

const modulePath='modules/studio-production-worker.js';
const routerPath='rideos-router.js';

const moduleSource=fs.readFileSync(modulePath,'utf8');
const routerSource=fs.readFileSync(routerPath,'utf8');

const checks=[
  ['exports production handler',/export function handleStudioProduction\(/.test(moduleSource)],
  ['serves production UI route',/\/studio\/production/.test(moduleSource)],
  ['serves production health route',/\/api\/studio\/production\/health/.test(moduleSource)],
  ['serves capability contract',/\/api\/studio\/production\/capabilities/.test(moduleSource)],
  ['declares local-first privacy',/mediaLeavesDeviceByDefault:false/.test(moduleSource)],
  ['implements local Smart Cut',/Smart Cut/.test(moduleSource)&&/frameVector\(/.test(moduleSource)&&/diff\(a,b\)/.test(moduleSource)],
  ['implements trim controls',/trimIn/.test(moduleSource)&&/trimOut/.test(moduleSource)&&/setInBtn/.test(moduleSource)&&/setOutBtn/.test(moduleSource)],
  ['implements vertical reframe',/9:16 Reel \/ Short/.test(moduleSource)&&/Fit \+ blurred background/.test(moduleSource)],
  ['implements SRT captions',/parseSrt\(/.test(moduleSource)&&/burnCaptions/.test(moduleSource)],
  ['implements browser audio cleanup',/createBiquadFilter/.test(moduleSource)&&/createDynamicsCompressor/.test(moduleSource)],
  ['implements real browser render',/canvas\.captureStream/.test(moduleSource)&&/new MediaRecorder/.test(moduleSource)],
  ['probes output MIME support',/MediaRecorder\.isTypeSupported/.test(moduleSource)],
  ['gates model-backed features by env',/ATLAS_AVATAR_ENDPOINT/.test(moduleSource)&&/ATLAS_LIPSYNC_ENDPOINT/.test(moduleSource)&&/ATLAS_ENHANCE_ENDPOINT/.test(moduleSource)&&/ATLAS_VIDEO_EDIT_ENDPOINT/.test(moduleSource)],
  ['router imports production handler',/handleStudioProduction/.test(routerSource)],
  ['router prioritizes production route',/const production=handleStudioProduction\(request,env,ctx\)/.test(routerSource)],
  ['studio navigation surfaces production',/href=\"\/studio\/production\"/.test(routerSource)]
];

const failures=checks.filter(([,ok])=>!ok);
for(const [name,ok] of checks)console.log(`${ok?'PASS':'FAIL'} ${name}`);

const forbidden=[
  ['coming soon placeholder',/Coming Soon/i],
  ['fake model connected copy',/MODEL CONNECTED/i],
  ['hardcoded provider secret',/(api[_-]?key|secret)\s*[:=]\s*["'][A-Za-z0-9_-]{20,}/i]
];
for(const [name,re] of forbidden){
  if(re.test(moduleSource))failures.push([`forbidden: ${name}`,false]);
}

if(failures.length){
  console.error(`\n${failures.length} Studio Production validation failure(s).`);
  process.exit(1);
}

console.log('\nATLAS Studio Production contract validation passed.');
