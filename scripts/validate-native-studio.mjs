import fs from 'node:fs';
const source=fs.readFileSync('modules/studio-native-worker.js','utf8');
const router=fs.readFileSync('rideos-router.js','utf8');
const engine=fs.readFileSync('atlas/native-media-engine.mjs','utf8');
const checks=[
 ['native studio handler',/export function handleStudioNative\(/.test(source)],
 ['production route overridden by native studio',/p==='\/studio\/production'/.test(source)],
 ['zero external providers declared',/externalProviders:\[\]/.test(source)],
 ['local media ingest',/URL\.createObjectURL\(file\)/.test(source)],
 ['motion smart cut',/function vector\(\)/.test(source)&&/function delta\(a,b\)/.test(source)],
 ['canvas rendering',/canvas\.captureStream/.test(source)&&/new MediaRecorder/.test(source)],
 ['native audio dsp',/createBiquadFilter/.test(source)&&/createDynamicsCompressor/.test(source)],
 ['caption engine',/Import SRT/.test(source)&&/Build timed cues from script/.test(source)],
 ['identity safe compare',/Identity-safe mode/.test(source)&&/ATLAS ENHANCED/.test(source)],
 ['owned model registry',/ATLAS first-party/.test(engine)&&/externalInference:false/.test(engine)],
 ['router imports native studio',/handleStudioNative/.test(router)],
 ['router prioritizes native before legacy production',/handleStudioNative\(request,env,ctx\)[\s\S]*handleStudioProduction\(request,env,ctx\)/.test(router)]
];
const forbidden=[
 ['Adobe dependency',/adobe/i],['Descript dependency',/descript/i],['HeyGen dependency',/heygen/i],['Magnific dependency',/magnific/i],
 ['provider endpoint env',/ATLAS_(?:TRANSCRIBE|AVATAR|LIPSYNC|ENHANCE|VIDEO_EDIT)_ENDPOINT/]
];
let failures=[];
for(const [name,ok] of checks){console.log((ok?'PASS':'FAIL')+' '+name);if(!ok)failures.push(name)}
for(const [name,re] of forbidden){const bad=re.test(source)||re.test(engine);console.log((bad?'FAIL':'PASS')+' '+name);if(bad)failures.push(name)}
if(failures.length){console.error('\n'+failures.length+' native studio validation failure(s).');process.exit(1)}
console.log('\nATLAS Native Studio validation passed.');
