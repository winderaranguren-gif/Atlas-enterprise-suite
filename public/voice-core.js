(()=>{
'use strict';

const allowedAdapters=new Set(['tts','stt','voice-clone','voice-design','voice-conversion','voice-isolation','dubbing','sound-effects','music-generation','conversational-agent']);
const adapters=new Map();
const profiles=new Map();
let recorder=null;
let recordingStream=null;
let recordingChunks=[];
let recognition=null;

const supports={
  tts:typeof window!=='undefined'&&'speechSynthesis'in window&&typeof SpeechSynthesisUtterance!=='undefined',
  stt:typeof window!=='undefined'&&Boolean(window.SpeechRecognition||window.webkitSpeechRecognition),
  recording:typeof navigator!=='undefined'&&Boolean(navigator.mediaDevices?.getUserMedia)&&typeof MediaRecorder!=='undefined'
};

const processes=Object.freeze([
  {id:'tts',name:'Text to Speech',mode:'native+adapter',local:supports.tts},
  {id:'stt',name:'Speech to Text',mode:'native+adapter',local:supports.stt},
  {id:'voice-clone',name:'Voice Cloning',mode:'adapter',local:false,consentRequired:true},
  {id:'voice-design',name:'Voice Design',mode:'adapter',local:false},
  {id:'voice-conversion',name:'Speech to Speech / Voice Changer',mode:'adapter',local:false,consentRequired:true},
  {id:'voice-isolation',name:'Voice Isolation / Cleanup',mode:'adapter',local:false},
  {id:'dubbing',name:'Dubbing & Localization',mode:'adapter',local:false,consentRequired:true},
  {id:'sound-effects',name:'Generative Sound Effects',mode:'adapter',local:false},
  {id:'music-generation',name:'Generative Music',mode:'adapter',local:false},
  {id:'conversational-agent',name:'Conversational Voice Agent',mode:'adapter',local:false,consentRequired:true}
]);

function clamp(v,min,max,fallback){const n=Number(v);return Number.isFinite(n)?Math.max(min,Math.min(max,n)):fallback}
function voices(){if(!supports.tts)return[];return speechSynthesis.getVoices().map(v=>({name:v.name,lang:v.lang,voiceURI:v.voiceURI,localService:Boolean(v.localService),default:Boolean(v.default)}))}
function findVoice(selector){const list=speechSynthesis.getVoices();if(!selector)return list.find(v=>v.default)||list[0]||null;return list.find(v=>v.voiceURI===selector||v.name===selector)||list.find(v=>v.lang===selector)||list.find(v=>v.lang?.toLowerCase().startsWith(String(selector).toLowerCase()))||null}
function speak(text,{voice,lang,rate=1,pitch=1,volume=1}={}){
  if(!supports.tts)throw new Error('Native text-to-speech is unavailable in this browser.');
  const value=String(text||'').trim();if(!value)throw new Error('Text is required.');
  speechSynthesis.cancel();
  const utterance=new SpeechSynthesisUtterance(value);const selected=findVoice(voice||lang);if(selected)utterance.voice=selected;if(lang)utterance.lang=lang;
  utterance.rate=clamp(rate,.5,2,1);utterance.pitch=clamp(pitch,0,2,1);utterance.volume=clamp(volume,0,1,1);
  const started=performance.now();
  utterance.onstart=()=>window.dispatchEvent(new CustomEvent('atlas:voice:speaking',{detail:{text:value,voice:selected?.name||null,lang:utterance.lang||selected?.lang||null}}));
  utterance.onend=()=>window.dispatchEvent(new CustomEvent('atlas:voice:spoken',{detail:{durationMs:Math.round(performance.now()-started)}}));
  utterance.onerror=e=>window.dispatchEvent(new CustomEvent('atlas:voice:error',{detail:{operation:'tts',error:e.error||'unknown'}}));
  speechSynthesis.speak(utterance);return {ok:true,voice:selected?.name||null,lang:utterance.lang||selected?.lang||null};
}
function stopSpeech(){if(supports.tts)speechSynthesis.cancel();return true}

function startTranscription({lang='en-US',continuous=true,interimResults=true,onPartial,onFinal,onError}={}){
  if(!supports.stt)throw new Error('Native speech recognition is unavailable in this browser.');
  stopTranscription();const Recognition=window.SpeechRecognition||window.webkitSpeechRecognition;recognition=new Recognition();
  recognition.lang=lang;recognition.continuous=continuous;recognition.interimResults=interimResults;
  recognition.onresult=e=>{let partial='';let final='';for(let i=e.resultIndex;i<e.results.length;i++){const part=e.results[i][0]?.transcript||'';if(e.results[i].isFinal)final+=part;else partial+=part}if(partial){onPartial?.(partial);window.dispatchEvent(new CustomEvent('atlas:voice:transcript-partial',{detail:{text:partial,lang}}))}if(final){onFinal?.(final);window.dispatchEvent(new CustomEvent('atlas:voice:transcript-final',{detail:{text:final,lang}}))}};
  recognition.onerror=e=>{onError?.(e.error||'unknown');window.dispatchEvent(new CustomEvent('atlas:voice:error',{detail:{operation:'stt',error:e.error||'unknown'}}))};
  recognition.onend=()=>{window.dispatchEvent(new CustomEvent('atlas:voice:transcription-ended'));recognition=null};
  recognition.start();return {ok:true,lang};
}
function stopTranscription(){if(recognition){try{recognition.stop()}catch{}recognition=null}return true}

async function startRecording({audioBitsPerSecond=128000}={}){
  if(!supports.recording)throw new Error('Microphone recording is unavailable in this browser.');
  if(recorder?.state==='recording')throw new Error('A recording is already in progress.');
  recordingStream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true}});recordingChunks=[];
  const preferred=['audio/webm;codecs=opus','audio/mp4','audio/webm'].find(t=>MediaRecorder.isTypeSupported?.(t));
  recorder=new MediaRecorder(recordingStream,{...(preferred?{mimeType:preferred}:{}),audioBitsPerSecond});
  recorder.ondataavailable=e=>{if(e.data?.size)recordingChunks.push(e.data)};recorder.start(250);window.dispatchEvent(new CustomEvent('atlas:voice:recording-started'));return {ok:true,mimeType:recorder.mimeType};
}
function stopRecording(){return new Promise((resolve,reject)=>{if(!recorder||recorder.state!=='recording')return reject(new Error('No active recording.'));const current=recorder;current.onstop=()=>{const blob=new Blob(recordingChunks,{type:current.mimeType||'audio/webm'});const url=URL.createObjectURL(blob);recordingStream?.getTracks().forEach(t=>t.stop());recordingStream=null;recorder=null;recordingChunks=[];const result={blob,url,mimeType:blob.type,size:blob.size,createdAt:new Date().toISOString()};window.dispatchEvent(new CustomEvent('atlas:voice:recording-ready',{detail:{url,mimeType:blob.type,size:blob.size}}));resolve(result)};current.onerror=e=>reject(e.error||new Error('Recording failed.'));current.stop()})}

function registerVoiceProfile({id,name,owner,consent=false,consentRecord=null,notes=''}){
  if(consent!==true)throw new Error('Explicit voice-owner consent is required before registering a clonable voice profile.');
  const profileId=id||`voice-${crypto.randomUUID?.()||Math.random().toString(36).slice(2)}`;const profile=Object.freeze({id:profileId,name:String(name||'Untitled voice'),owner:String(owner||'Unknown owner'),consent:true,consentRecord:consentRecord||new Date().toISOString(),notes:String(notes||''),createdAt:new Date().toISOString()});profiles.set(profileId,profile);sessionStorage.setItem('atlas.voice.profile.ids',JSON.stringify([...profiles.keys()]));return {...profile};
}
function listVoiceProfiles(){return [...profiles.values()].map(x=>({...x}))}

async function attachAdapter(name,adapter){
  if(!allowedAdapters.has(name))throw new Error(`Unsupported ATLAS Voice adapter: ${name}`);if(!adapter||typeof adapter.health!=='function'||typeof adapter.run!=='function')throw new Error('Adapter must implement health() and run(input).');
  const health=await adapter.health();if(!health?.ok)throw new Error(`Adapter ${name} failed health verification.`);adapters.set(name,{adapter,health:{...health},connectedAt:new Date().toISOString()});window.dispatchEvent(new CustomEvent('atlas:voice:adapter-connected',{detail:{name}}));return {name,status:'connected',health:{...health}};
}
function detachAdapter(name){adapters.delete(name);return true}
function adapterStatus(name){const item=adapters.get(name);return item?{connected:true,health:{...item.health},connectedAt:item.connectedAt}:{connected:false}}
function requireConsent(name,input){const p=processes.find(x=>x.id===name);if(!p?.consentRequired)return;if(input?.consentVerified===true)return;const profile=input?.voiceProfileId&&profiles.get(input.voiceProfileId);if(profile?.consent===true)return;throw new Error(`${p.name} requires verified authorization from the voice owner.`)}
async function execute(name,input={}){if(!allowedAdapters.has(name))throw new Error(`Unknown ATLAS Voice process: ${name}`);requireConsent(name,input);const item=adapters.get(name);if(!item)throw new Error(`${name} requires a verified ATLAS same-origin model/provider adapter.`);const health=await item.adapter.health();if(!health?.ok){adapters.delete(name);throw new Error(`${name} adapter is no longer healthy.`)}const output=await item.adapter.run(input);window.dispatchEvent(new CustomEvent('atlas:voice:process-complete',{detail:{name}}));return output}
function status(){return {active:true,version:'1.3.0',providerIndependent:true,native:{...supports},profiles:profiles.size,processes:processes.map(p=>({...p,adapter:adapterStatus(p.id).connected}))}}

if(supports.tts){speechSynthesis.onvoiceschanged=()=>window.dispatchEvent(new CustomEvent('atlas:voice:voices-changed',{detail:{count:voices().length}}))}
window.ATLASVoiceCore=Object.freeze({version:'1.3.0',voices,speak,stopSpeech,startTranscription,stopTranscription,startRecording,stopRecording,registerVoiceProfile,listVoiceProfiles,attachAdapter,detachAdapter,adapterStatus,execute,processes:()=>processes.map(x=>({...x})),status});
})();