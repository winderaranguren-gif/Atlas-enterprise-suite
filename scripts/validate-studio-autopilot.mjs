import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { handleStudioAutopilot } from '../modules/studio-autopilot-worker.js';

const source=await readFile(new URL('../modules/studio-autopilot-worker.js',import.meta.url),'utf8');
const router=await readFile(new URL('../rideos-router.js',import.meta.url),'utf8');

for(const marker of [
  "externalProviders:[]",
  "mediaLeavesDeviceByDefault:false",
  "atlas.creator.recipe",
  "decodeAudioData",
  "analyzeMotion",
  "selectVariants",
  "FaceDetector",
  "drawTextBox",
  "MediaRecorder",
  "captureStream",
  "studio/autopilot"
]) assert(source.includes(marker),`missing Studio Autopilot marker: ${marker}`);

assert(router.includes("handleStudioAutopilot"),'router must import Studio Autopilot');
assert(router.includes("/studio/autopilot"),'router must surface Studio Autopilot');

const capabilities=handleStudioAutopilot(new Request('https://atlas.local/api/studio/autopilot/capabilities'));
assert(capabilities,'capabilities response missing');
const cap=await capabilities.json();
assert.equal(cap.service,'atlas-studio-autopilot');
assert.deepEqual(cap.externalProviders,[]);
assert.equal(cap.mediaLeavesDeviceByDefault,false);
assert(cap.capabilities.some((x)=>x.id==='audio-energy'&&x.state==='ready'));
assert(cap.capabilities.some((x)=>x.id==='subject-track'&&x.state==='browser-conditional'));
assert(cap.capabilities.some((x)=>x.id==='batch-render'&&x.state==='ready'));

const health=handleStudioAutopilot(new Request('https://atlas.local/api/studio/autopilot/health'));
assert.equal(health.status,200);
assert.deepEqual((await health.json()).externalProviders,[]);

const page=handleStudioAutopilot(new Request('https://atlas.local/studio/autopilot'));
assert.equal(page.status,200);
const html=await page.text();
for(const marker of ['Studio Autopilot','Analyze and build variants','Render all variants','0 external providers']) assert(html.includes(marker),`page missing ${marker}`);

console.log(JSON.stringify({ok:true,service:'atlas-studio-autopilot',checks:23,externalProviders:[]},null,2));
