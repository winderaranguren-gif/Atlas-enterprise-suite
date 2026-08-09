'use strict';

const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const json=file=>JSON.parse(read(file));
const failures=[];
const pass=(condition,message)=>{if(!condition)failures.push(message);};

const required=['atlas-gps-entry.js','atlas-gps-4d.html','atlas-gps-4d.css','atlas-gps-4d.js','gps-platform/security/policy.json'];
for(const file of required)pass(fs.existsSync(path.join(root,file)),`Missing GPS local-core file: ${file}`);

if(!failures.length){
  const html=read('atlas-gps-4d.html');
  const runtime=read('atlas-gps-4d.js');
  const entry=read('atlas-gps-entry.js');
  const policy=json('gps-platform/security/policy.json');
  const serviceWorker=read('service-worker.js');

  pass(!/https?:\/\//i.test(html),'GPS local-core HTML must not require third-party CDN URLs.');
  pass(!/getCurrentPosition\s*\(|watchPosition\s*\(/.test(runtime.split("$('location-button').addEventListener")[0].split('function enableLocation')[0]),'GPS must not request location before explicit user action.');
  pass(runtime.includes("$('location-button').addEventListener('click',enableLocation)"),'Location permission must be bound to explicit user action.');
  pass(runtime.includes("$('camera-button').addEventListener('click'"),'Camera permission must be bound to explicit user action.');
  pass(runtime.includes("routePersistence:'session-only'"),'Runtime must declare session-only route persistence.');
  pass(runtime.includes('registerProvider'),'Runtime must expose an optional provider registration boundary.');
  pass(runtime.includes('localRoute'),'Runtime must preserve a provider-independent local fallback.');
  pass(runtime.includes('clearSession'),'Runtime must expose local-session purge behavior.');
  pass(entry.includes("data-module='gps4d'")||entry.includes('data-module="gps4d"')||entry.includes("link.dataset.module='gps4d'"),'GPS must register as a discoverable ATLAS module.');
  pass(policy.defaults?.locationHistory===false,'Location history must be disabled by policy.');
  pass(policy.defaults?.rawCameraUpload===false,'Raw camera upload must be disabled by policy.');
  pass(policy.defaults?.routePersistence==='session-only','Policy must require session-only route persistence.');
  pass(policy.providerBoundary?.criticalDrivingDependency===false,'External providers must not be a critical local-core dependency.');
  pass(serviceWorker.includes("'/atlas-gps-4d.html'"),'PWA shell must cache the GPS local core.');
}

if(failures.length){
  console.error('ATLAS GPS local-core validation failed:');
  failures.forEach(failure=>console.error(`- ${failure}`));
  process.exit(1);
}

console.log(`ATLAS GPS local-core validation passed (${required.length} required files, privacy/provider gates enforced).`);
