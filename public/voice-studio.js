(()=>{
'use strict';
const $=s=>document.querySelector(s);
const core=()=>window.ATLASVoiceCore;
let latestRecording=null;

function setBadge(id,ok,label){const el=$(id);if(!el)return;el.textContent=label;el.classList.toggle('safe',Boolean(ok));}
function refreshVoices(){const list=core()?.voices?.()||[];const select=$('#voiceSelect');if(select){select.innerHTML=list.length?list.map(v=>`<option value="${String(v.voiceURI).replace(/"/g,'&quot;')}">${v.default?'★ ':''}${v.name} · ${v.lang}${v.localService?' · local':''}</option>`).join(''):'<option value="">No native voices detected</option>';}$('#metricVoices').textContent=String(list.length);}
function renderProcesses(){const items=core()?.status?.().processes||[];$('#processGrid').innerHTML=items.map(p=>{const state=p.local?'LOCAL':p.adapter?'CONNECTED':'ADAPTER READY';const cls=p.local?'local':p.adapter?'connected':'';const desc=p.local?'Runs with the browser-native ATLAS runtime.':p.adapter?'Verified model adapter connected.':'Waiting for a verified ATLAS model/server adapter.';return `<article class="process-card"><div><small>${p.id.toUpperCase()}</small><h3>${p.name}</h3><p>${desc}${p.consentRequired?' Voice-owner authorization enforced.':''}</p></div><div class="process-state ${cls}"><i></i>${state}</div></article>`}).join('');}
function renderProfiles(){const profiles=core()?.listVoiceProfiles?.()||[];$('#profileList').innerHTML=profiles.length?profiles.map(p=>`<div class="profile-item"><strong>${p.name}</strong><small>${p.owner} · consent verified</small></div>`).join(''):'<div class="event-line">No authorized voice profiles in this session.</div>';}
function refreshStatus(){const status=core()?.status?.();if(!status)return;$('#runtimeStatus').textContent='ATLAS Voice Core active';$('#metricRuntime').textContent='ACTIVE';setBadge('#ttsBadge',status.native.tts,status.native.tts?'NATIVE':'ADAPTER');setBadge('#sttBadge',status.native.stt,status.native.stt?'NATIVE':'ADAPTER');setBadge('#recordBadge',status.native.recording,status.native.recording?'LOCAL':'UNAVAILABLE');refreshVoices();renderProcesses();renderProfiles();}

function bind(){
  $('#speakBtn')?.addEventListener('click',()=>{try{core().speak($('#ttsText').value,{voice:$('#voiceSelect').value,lang:$('#ttsLang').value,rate:$('#ttsRate').value,pitch:$('#ttsPitch').value});$('#ttsEvent').textContent='Speaking with ATLAS Voice runtime.';$('#ttsEvent').className='event-line ok';}catch(err){$('#ttsEvent').textContent=err.message;$('#ttsEvent').className='event-line notice';}});
  $('#stopSpeakBtn')?.addEventListener('click',()=>core()?.stopSpeech?.());
  $('#startSttBtn')?.addEventListener('click',()=>{const box=$('#transcript');box.textContent='';try{core().startTranscription({lang:$('#sttLang').value,onPartial:text=>{box.textContent=(box.dataset.final||'')+text},onFinal:text=>{box.dataset.final=(box.dataset.final||'')+text+' ';box.textContent=box.dataset.final}})}catch(err){box.textContent=err.message;box.classList.add('notice')}});
  $('#stopSttBtn')?.addEventListener('click',()=>core()?.stopTranscription?.());
  $('#startRecordBtn')?.addEventListener('click',async()=>{try{await core().startRecording();$('#recordOrb').classList.add('active');$('#recordState').textContent='Recording microphone locally…';$('#startRecordBtn').disabled=true;$('#stopRecordBtn').disabled=false;$('#saveRecording').hidden=true;}catch(err){$('#recordState').textContent=err.message;$('#recordState').classList.add('notice')}});
  $('#stopRecordBtn')?.addEventListener('click',async()=>{try{latestRecording=await core().stopRecording();const player=$('#recordingPlayer');player.src=latestRecording.url;player.hidden=false;$('#recordOrb').classList.remove('active');$('#recordState').textContent=`Recording ready · ${(latestRecording.size/1024).toFixed(1)} KB`;$('#startRecordBtn').disabled=false;$('#stopRecordBtn').disabled=true;const save=$('#saveRecording');save.href=latestRecording.url;save.download=`atlas-voice-${Date.now()}.${latestRecording.mimeType.includes('mp4')?'m4a':'webm'}`;save.hidden=false;}catch(err){$('#recordState').textContent=err.message}});
  $('#registerProfileBtn')?.addEventListener('click',()=>{try{core().registerVoiceProfile({name:$('#profileName').value,owner:$('#profileOwner').value,consent:$('#profileConsent').checked});$('#profileName').value='';$('#profileOwner').value='';$('#profileConsent').checked=false;renderProfiles()}catch(err){$('#profileList').innerHTML=`<div class="event-line notice">${err.message}</div>`}});
  window.addEventListener('atlas:voice:voices-changed',refreshVoices);
}
function boot(){if(!core()){setTimeout(boot,40);return}refreshStatus();bind();}
document.readyState==='loading'?document.addEventListener('DOMContentLoaded',boot):boot();
})();