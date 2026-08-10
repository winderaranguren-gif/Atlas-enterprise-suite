import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const required=[
  'package.json','atlas.config.json','public/index.html','public/styles.css','public/core-services.css',
  'public/app.js','public/core-services.js','public/music-core.js','public/manifest.webmanifest','public/sw.js',
  'public/_headers','public/_redirects'
];
for(const file of required){
  if(!fs.existsSync(path.join(root,file)))throw new Error(`Missing required file: ${file}`);
}

const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const pkg=JSON.parse(read('package.json'));
const cfg=JSON.parse(read('atlas.config.json'));
const app=read('public/app.js');
const core=read('public/core-services.js');
const music=read('public/music-core.js');
const sw=read('public/sw.js');
const html=read('public/index.html');

if(pkg.version!==cfg.version)throw new Error('Version mismatch between package.json and atlas.config.json');
if(pkg.version!=='1.1.0')throw new Error('ATLAS Core Services release must be v1.1.0');
if(cfg.contact!=='atlashealthfrontiers@gmail.com')throw new Error('Operational contact mismatch');
if(!Array.isArray(cfg.modules)||cfg.modules.length<25)throw new Error('Module registry is incomplete for v1.1');
if(!Array.isArray(cfg.regions)||cfg.regions.length<10)throw new Error('Regional registry is incomplete');

const requiredServices=['dataFabric','eventFabric','identity','intelligence','agentFabric','workGraph','music','integrations'];
for(const name of requiredServices){
  if(!cfg.services?.[name])throw new Error(`Missing core service configuration: ${name}`);
  if(!['active','verified','ready'].includes(cfg.services[name].status))throw new Error(`Core service is not release-ready: ${name}`);
}
for(const name of ['dataFabric','eventFabric','identity','workGraph']){
  if(cfg.services[name].backendVerified!==true)throw new Error(`Backend verification marker missing: ${name}`);
}

for(const [file,source] of [['public/app.js',app],['public/core-services.js',core],['public/music-core.js',music]]){
  try{new Function(source);}catch(error){throw new Error(`${file} syntax error: ${error.message}`);}
}

const requiredCoreMarkers=[
  'ATLASCoreServices','DataFabric','EventFabric','Identity','Intelligence','AgentFabric','WorkGraph','Integrations',
  'Dependency would create a cycle','High-risk execution requires explicit approval','ATLAS Data Fabric adapter is not connected.',
  "status:'disconnected'","typeof adapter.health!=='function'","result?.ok!==true","c.status==='connected'&&c.health?.ok===true"
];
for(const marker of requiredCoreMarkers){if(!core.includes(marker))throw new Error(`Core services invariant missing: ${marker}`);}
if(core.includes('setStatus(name,status)'))throw new Error('Integrations may not be marked connected by an arbitrary status setter');
if(!core.includes('sessionStorage'))throw new Error('Core services must use bounded session storage for browser runtime state');
if(core.includes('localStorage'))throw new Error('Core services must not persist execution/audit state in localStorage');

const skills=['technical-support','deployment','security','knowledge','accounting','hr','iot-digital-twin'];
for(const skill of skills){if(!core.includes(`'${skill}'`))throw new Error(`Agent Fabric skill missing: ${skill}`);}

for(const title of ['First Light','Horizon Rise','Pulse Core','Focus Flow','Vector Drive','Calm Room']){
  if(!music.includes(title))throw new Error(`ATLAS Original missing: ${title}`);
}
for(const marker of ["owner:'ATLAS Originals'","externalProvider:false","providerIndependent:true"]){
  if(!music.includes(marker))throw new Error(`ATLAS Music rights/provider boundary missing: ${marker}`);
}
for(const forbidden of ['APPLE_MUSIC_DEVELOPER_TOKEN','YOUTUBE_API_KEY','OPENAI_API_KEY','youtube.com','music.apple.com']){
  if(music.includes(forbidden))throw new Error(`ATLAS Music core must not depend on external provider configuration: ${forbidden}`);
}

for(const asset of ['/core-services.css','/core-services.js','/music-core.js','/app.js','/atlas.config.json']){
  if(!sw.includes(`'${asset}'`))throw new Error(`PWA cache missing ${asset}`);
}
if(!sw.includes("CACHE='atlas-v1-1'"))throw new Error('Service worker cache version is not v1.1');
for(const asset of ['/core-services.js','/music-core.js','/app.js']){
  if(!html.includes(`src="${asset}"`))throw new Error(`Shell does not load ${asset}`);
}

const staticSource=[app,core,music,html,read('atlas.config.json')].join('\n');
const secretPatterns=[
  /(?:api[_-]?key|client[_-]?secret|service[_-]?role|access[_-]?token)\s*[:=]\s*['"][^'"]{8,}/i,
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
  /sk-[A-Za-z0-9_-]{20,}/
];
for(const pattern of secretPatterns){if(pattern.test(staticSource))throw new Error(`Possible embedded secret matched ${pattern}`);}

console.log(`ATLAS validation passed: v${cfg.version}, ${cfg.modules.length} modules, ${cfg.regions.length} regions, ${requiredServices.length} core services ready.`);
