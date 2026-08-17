import fs from 'node:fs';

const alias=fs.readFileSync(new URL('../modules/voice-settings.js',import.meta.url),'utf8');
const settings=fs.readFileSync(new URL('../modules/settings.js',import.meta.url),'utf8');
const worker=fs.readFileSync(new URL('../worker-meta.js',import.meta.url),'utf8');

const requireText=(source,text,label)=>{
  if(!source.includes(text))throw new Error(`voice_settings_validation_failed:${label}`);
};

// Routing: /voice is only a compatibility alias; the canonical implementation
// must be owned by the scoped Settings module instead of duplicated here.
requireText(worker,"import { voiceSettingsRoute } from './modules/voice-settings.js';",'worker_import');
requireText(worker,'await voiceSettingsRoute(request,env,url)','worker_alias_route');
requireText(alias,"url.pathname!=='/voice'",'voice_alias_only');
requireText(alias,"location:'/platform/settings/voice'",'voice_alias_redirect');
if(alias.includes("url.pathname!=='/platform/settings/voice'"))throw new Error('voice_settings_validation_failed:duplicate_canonical_voice_route');

// Canonical Settings owns real persistence, tenant authorization and audit.
requireText(settings,"['voice','Voz','/platform/settings/voice']",'canonical_settings_navigation');
requireText(settings,"path.startsWith('/platform/settings/')",'canonical_settings_route');
requireText(settings,"requireTenantPermission",'tenant_permission_required');
requireText(settings,"appendAuditLedger",'audit_logging_required');
requireText(settings,"fetch('/api/settings'",'settings_api_persistence');
requireText(settings,"'voice.listenAlways'",'voice_listening_preference');
requireText(settings,"'voice.autoRespond'",'voice_auto_response_preference');
requireText(settings,"speechSynthesis",'local_speech_synthesis');
requireText(settings,"permissions-policy':'camera=(), microphone=(), geolocation=()'",'device_permissions_blocked');
requireText(settings,"/assets/atlas-official-logo-512.svg",'official_logo_asset');
requireText(settings,'@media(max-width:980px)','tablet_mobile_breakpoint');
requireText(settings,'@media(max-width:620px)','small_mobile_breakpoint');

// Voice settings must not silently activate capture APIs or fake hash navigation.
if(/getUserMedia\s*\(/.test(settings))throw new Error('voice_settings_validation_failed:microphone_capture_present');
if(/navigator\.mediaDevices/.test(settings))throw new Error('voice_settings_validation_failed:device_capture_api_present');
if(/href=["']#["']/.test(settings))throw new Error('voice_settings_validation_failed:fake_hash_navigation');

console.log('ATLAS Voice canonical Settings validation passed');
