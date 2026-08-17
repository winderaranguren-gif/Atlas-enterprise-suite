import fs from 'node:fs';

const voice=fs.readFileSync(new URL('../modules/voice-settings.js',import.meta.url),'utf8');
const worker=fs.readFileSync(new URL('../worker-meta.js',import.meta.url),'utf8');

const requireText=(source,text,label)=>{
  if(!source.includes(text))throw new Error(`voice_settings_validation_failed:${label}`);
};

requireText(worker,"import { voiceSettingsRoute } from './modules/voice-settings.js';",'worker_import');
requireText(worker,'await voiceSettingsRoute(request,env,url)','worker_route');
requireText(voice,"url.pathname!=='/platform/settings/voice'",'canonical_route');
requireText(voice,"location:'/platform/settings/voice'",'voice_alias_redirect');
requireText(voice,'requireBrowserSession(request,env)','browser_session_required');
requireText(voice,"permissions-policy':'camera=(), microphone=(), geolocation=()'",'device_permissions_blocked');
requireText(voice,'speechSynthesis','local_speech_synthesis');
requireText(voice,'localStorage.setItem(KEY','preference_persistence');
requireText(voice,'type="range" min="0.5" max="2" step="0.05"','speech_rate_slider');
requireText(voice,'aria-checked','accessible_switch_state');
requireText(voice,'@media(max-width:900px)','tablet_mobile_breakpoint');
requireText(voice,'@media(max-width:520px)','small_mobile_breakpoint');

if(/getUserMedia\s*\(/.test(voice))throw new Error('voice_settings_validation_failed:microphone_capture_present');
if(/navigator\.mediaDevices/.test(voice))throw new Error('voice_settings_validation_failed:device_capture_api_present');
if(/fetch\s*\(/.test(voice))throw new Error('voice_settings_validation_failed:unexpected_external_or_backend_fetch');
if(/href=["']#["']/.test(voice))throw new Error('voice_settings_validation_failed:fake_hash_navigation');

console.log('ATLAS Voice settings validation passed');
