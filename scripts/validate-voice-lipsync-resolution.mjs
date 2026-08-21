import {handleStudioVoice,VOICE_CAPABILITIES} from '../modules/studio-voice-worker.js';
import {handleStudioLipSync,LIPSYNC_CAPABILITIES} from '../modules/studio-lipsync-worker.js';
import {handleStudioResolution,RESOLUTION_CAPABILITIES} from '../modules/studio-resolution-worker.js';

function assert(condition,message){if(!condition)throw new Error(message)}
async function jsonFrom(handler,path){const r=handler(new Request('https://atlas.local'+path));assert(r instanceof Response,`No response for ${path}`);assert(r.ok,`${path} returned ${r.status}`);return r.json()}
async function textFrom(handler,path){const r=handler(new Request('https://atlas.local'+path));assert(r instanceof Response,`No response for ${path}`);assert(r.ok,`${path} returned ${r.status}`);return r.text()}
function ready(list){return new Set(list.filter(x=>x.state==='ready').map(x=>x.id))}

const voice=await jsonFrom(handleStudioVoice,'/api/studio/voice/capabilities');
assert(voice.service==='atlas-voice-engine','Voice service mismatch');
assert(Array.isArray(voice.externalProviders)&&voice.externalProviders.length===0,'Voice external provider detected');
assert(voice.externalProviderRequired===false&&voice.localProcessing===true&&voice.mediaLeavesDeviceByDefault===false,'Voice local-first contract mismatch');
assert(voice.policy?.voiceIdentitySynthesisRequiresConsent===true,'Voice consent gate missing');
const vr=ready(voice.capabilities);
for(const id of ['decode','metering','noise-gate','filters','eq','compressor','normalization','offline-render','wav-export'])assert(vr.has(id),`Missing Voice capability ${id}`);
for(const id of ['voice-synthesis-model','voice-clone-model'])assert(VOICE_CAPABILITIES.some(x=>x.id===id&&x.state==='model-not-trained'),`${id} must remain model-not-trained`);
const voiceHtml=await textFrom(handleStudioVoice,'/studio/voice');
for(const marker of ['Render cleaned WAV','OfflineAudioContext','wavBlob','atlas.voice.recipe','explicit consent'])assert(voiceHtml.includes(marker),`Voice UI missing ${marker}`);

const lipsync=await jsonFrom(handleStudioLipSync,'/api/studio/lipsync/capabilities');
assert(lipsync.service==='atlas-lipsync-engine','Lip Sync service mismatch');
assert(Array.isArray(lipsync.externalProviders)&&lipsync.externalProviders.length===0,'Lip Sync external provider detected');
assert(lipsync.externalProviderRequired===false&&lipsync.localProcessing===true&&lipsync.mediaLeavesDeviceByDefault===false,'Lip Sync local-first contract mismatch');
assert(lipsync.policy?.approximateTimingIsNotPhonemeRecognition===true,'Lip Sync honesty policy missing');
const lr=ready(lipsync.capabilities);
for(const id of ['speech-map-handoff','script-tokenization','orthography-viseme','segment-alignment','coalescing','timeline-export'])assert(lr.has(id),`Missing Lip Sync capability ${id}`);
for(const id of ['neural-phoneme-model','facial-animation-model'])assert(LIPSYNC_CAPABILITIES.some(x=>x.id===id&&x.state==='model-not-trained'),`${id} must remain model-not-trained`);
const lipHtml=await textFrom(handleStudioLipSync,'/studio/lipsync');
for(const marker of ['Build viseme timing','orthography-viseme-heuristic','atlas.lipsync.timeline','not transcription','neural lip sync'])assert(lipHtml.toLowerCase().includes(marker.toLowerCase()),`Lip Sync UI missing ${marker}`);

const resolution=await jsonFrom(handleStudioResolution,'/api/studio/resolution/capabilities');
assert(resolution.service==='atlas-resolution-engine','Resolution service mismatch');
assert(Array.isArray(resolution.externalProviders)&&resolution.externalProviders.length===0,'Resolution external provider detected');
assert(resolution.externalProviderRequired===false&&resolution.localProcessing===true&&resolution.mediaLeavesDeviceByDefault===false,'Resolution local-first contract mismatch');
assert(resolution.policy?.deterministicResampleIsNotNeuralDetailRecovery===true,'Resolution honesty policy missing');
const rr=ready(resolution.capabilities);
for(const id of ['image-ingest','video-frame','multipass-resample','unsharp-mask','edge-metric','png-export','recipe'])assert(rr.has(id),`Missing Resolution capability ${id}`);
for(const id of ['neural-super-resolution','temporal-detail-recovery'])assert(RESOLUTION_CAPABILITIES.some(x=>x.id===id&&x.state==='model-not-trained'),`${id} must remain model-not-trained`);
const resHtml=await textFrom(handleStudioResolution,'/studio/resolution');
for(const marker of ['Upscale locally','imageSmoothingQuality','sharpenCanvas','edgeMetric','atlas.resolution.recipe','not equivalent to generating genuine new 4K detail'])assert(resHtml.includes(marker),`Resolution UI missing ${marker}`);

for(const handler of [handleStudioVoice,handleStudioLipSync,handleStudioResolution])assert(handler(new Request('https://atlas.local/unrelated'))===null,'Handler must ignore unrelated paths');
console.log(JSON.stringify({ok:true,services:[voice.service,lipsync.service,resolution.service],externalProviders:0,readyCapabilities:{voice:vr.size,lipsync:lr.size,resolution:rr.size},untrainedModels:6},null,2));
