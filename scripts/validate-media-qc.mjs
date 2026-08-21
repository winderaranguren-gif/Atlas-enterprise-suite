import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { handleStudioMediaQC } from '../modules/studio-media-qc-worker.js';

const source=await readFile(new URL('../modules/studio-media-qc-worker.js',import.meta.url),'utf8');
const router=await readFile(new URL('../rideos-router.js',import.meta.url),'utf8');
for(const marker of [
  "externalProviders:[]",
  "mediaLeavesDeviceByDefault:false",
  "frameMetrics",
  "brightness",
  "contrast",
  "sharpness",
  "blackFrameRatio",
  "decodeAudioData",
  "clippingRatio",
  "silenceRatio",
  "atlas.media.qc",
  "studio/qc"
]) assert(source.includes(marker),`missing Media QC marker: ${marker}`);
assert(router.includes('handleStudioMediaQC'),'router must import Media QC');
assert(router.includes('/studio/qc'),'router must surface Media QC');

const cap=handleStudioMediaQC(new Request('https://atlas.local/api/studio/qc/capabilities'));
assert(cap);
const body=await cap.json();
assert.equal(body.service,'atlas-media-qc');
assert.deepEqual(body.externalProviders,[]);
assert.equal(body.mediaLeavesDeviceByDefault,false);
const ready=(body.capabilities||[]).filter(x=>x.state==='ready').map(x=>x.id);
for(const id of ['frame-sampling','exposure','contrast','sharpness','black-frames','audio-rms','audio-clipping','silence','release-report']) assert(ready.includes(id),`missing ready capability ${id}`);

const health=handleStudioMediaQC(new Request('https://atlas.local/api/studio/qc/health'));
assert.equal(health.status,200);
assert.deepEqual((await health.json()).externalProviders,[]);
const page=handleStudioMediaQC(new Request('https://atlas.local/studio/qc'));
assert.equal(page.status,200);
const html=await page.text();
for(const marker of ['Media QC','Run technical QC','Release readiness','0 external providers']) assert(html.includes(marker),`page missing ${marker}`);
console.log(JSON.stringify({ok:true,service:'atlas-media-qc',externalProviders:[],checks:27},null,2));
