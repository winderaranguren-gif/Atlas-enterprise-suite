import {handleStudioLook,LOOK_CAPABILITIES,LOOK_PRESETS} from '../modules/studio-look-worker.js';
import {handleStudioSubject,SUBJECT_CAPABILITIES} from '../modules/studio-subject-worker.js';
import {handleStudioSpeech,SPEECH_CAPABILITIES} from '../modules/studio-speech-worker.js';

function assert(condition,message){if(!condition)throw new Error(message)}
async function jsonFrom(handler,path){const r=handler(new Request('https://atlas.local'+path));assert(r instanceof Response,`No response for ${path}`);assert(r.ok,`${path} returned ${r.status}`);return r.json()}
async function textFrom(handler,path){const r=handler(new Request('https://atlas.local'+path));assert(r instanceof Response,`No response for ${path}`);assert(r.ok,`${path} returned ${r.status}`);return r.text()}
function readyIds(list){return new Set(list.filter(x=>x.state==='ready').map(x=>x.id))}

const look=await jsonFrom(handleStudioLook,'/api/studio/look/capabilities');
assert(look.service==='atlas-look-engine','Look Engine service mismatch');
assert(Array.isArray(look.externalProviders)&&look.externalProviders.length===0,'Look Engine external provider detected');
assert(look.externalProviderRequired===false&&look.localProcessing===true&&look.mediaLeavesDeviceByDefault===false,'Look Engine local-first contract mismatch');
assert(look.identityGeometryMutation===false,'Look Engine must not mutate identity geometry');
const lr=readyIds(look.capabilities);
for(const id of ['histogram','auto-exposure','gray-world','tone-curve','color','vignette','presets','identity-safe'])assert(lr.has(id),`Missing Look capability ${id}`);
assert(LOOK_PRESETS.presenter&&LOOK_PRESETS.cinematic&&LOOK_PRESETS.luxury,'Core Look presets missing');
assert(LOOK_CAPABILITIES.some(x=>x.id==='neural-restyle'&&x.state==='model-not-trained'),'Look neural-restyle state must be honest');
const lookHtml=await textFrom(handleStudioLook,'/studio/look');
for(const marker of ['Analyze frame','Save look recipe','atlas.look.recipe','identityGeometryMutation:false'])assert(lookHtml.includes(marker),`Look UI missing ${marker}`);

const subject=await jsonFrom(handleStudioSubject,'/api/studio/subject/capabilities');
assert(subject.service==='atlas-subject-engine','Subject Engine service mismatch');
assert(Array.isArray(subject.externalProviders)&&subject.externalProviders.length===0,'Subject Engine external provider detected');
assert(subject.externalProviderRequired===false&&subject.localProcessing===true&&subject.mediaLeavesDeviceByDefault===false,'Subject Engine local-first contract mismatch');
const sr=readyIds(subject.capabilities);
for(const id of ['motion-centroid','subject-lock','crop-keyframes','portrait-reframe','safe-margins'])assert(sr.has(id),`Missing Subject capability ${id}`);
assert(SUBJECT_CAPABILITIES.some(x=>x.id==='face-detector'&&x.state==='conditional'),'FaceDetector capability must remain conditional');
const subjectHtml=await textFrom(handleStudioSubject,'/studio/subject');
for(const marker of ['Analyze subject','FaceDetector','motionBox','atlas.subject.plan'])assert(subjectHtml.includes(marker),`Subject UI missing ${marker}`);

const speech=await jsonFrom(handleStudioSpeech,'/api/studio/speech/capabilities');
assert(speech.service==='atlas-speech-engine','Speech Engine service mismatch');
assert(Array.isArray(speech.externalProviders)&&speech.externalProviders.length===0,'Speech Engine external provider detected');
assert(speech.externalProviderRequired===false&&speech.localProcessing===true&&speech.mediaLeavesDeviceByDefault===false,'Speech Engine local-first contract mismatch');
const spr=readyIds(speech.capabilities);
for(const id of ['decode','vad','silence-map','rms','script-timing','srt-export'])assert(spr.has(id),`Missing Speech capability ${id}`);
assert(SPEECH_CAPABILITIES.some(x=>x.id==='transcription'&&x.state==='model-not-trained'),'Transcription must remain model-not-trained');
assert(SPEECH_CAPABILITIES.some(x=>x.id==='voice-clone'&&x.state==='model-not-trained'),'Voice synthesis must remain model-not-trained');
const speechHtml=await textFrom(handleStudioSpeech,'/studio/speech');
for(const marker of ['Analyze speech','noiseFloorDb','editDecisionList','atlas.speech.map','Supplied script timing is not transcription'])assert(speechHtml.includes(marker),`Speech UI missing ${marker}`);

for(const handler of [handleStudioLook,handleStudioSubject,handleStudioSpeech])assert(handler(new Request('https://atlas.local/not-mine'))===null,'Handler must ignore unrelated routes');

console.log(JSON.stringify({ok:true,services:[look.service,subject.service,speech.service],externalProviders:0,lookPresets:Object.keys(LOOK_PRESETS).length,subjectReady:sr.size,speechReady:spr.size},null,2));
