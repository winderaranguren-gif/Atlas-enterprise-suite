import fs from 'node:fs';
import path from 'node:path';
const root=process.cwd();
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
const fail=m=>{console.error(`ATLAS v1.2 validation failed: ${m}`);process.exit(1)};
const required=['package.json','atlas.config.json','wrangler.toml','scripts/build.mjs','scripts/runtime-test.mjs','public/index.html','public/styles.css','public/app.js','public/core-services.js','public/core-services.css','public/music-core.js','public/voice-core.js','public/voice-studio.html','public/voice-studio.css','public/voice-studio.js','public/repertoire-ui.js','public/update-core.js','public/surface-mode.js','public/surface-mode.css','public/atlas-repertoire.json','public/atlas.release.json','public/atlas.config.json','public/manifest.webmanifest','public/sw.js','public/_headers','public/_redirects'];
for(const f of required)if(!fs.existsSync(path.join(root,f)))fail(`missing ${f}`);
const pkg=JSON.parse(read('package.json'));const cfg=JSON.parse(read('atlas.config.json'));const pcfg=JSON.parse(read('public/atlas.config.json'));const release=JSON.parse(read('public/atlas.release.json'));const repertoire=JSON.parse(read('public/atlas-repertoire.json'));
const html=read('public/index.html'),app=read('public/app.js'),core=read('public/core-services.js'),music=read('public/music-core.js'),voice=read('public/voice-core.js'),voiceStudio=read('public/voice-studio.html'),sw=read('public/sw.js'),headers=read('public/_headers'),wrangler=read('wrangler.toml'),redirects=read('public/_redirects');
if(pkg.version!=='1.2.0'||cfg.version!=='1.2.0'||release.version!=='1.2.0')fail('package/config/release version must be 1.2.0');
if(JSON.stringify(cfg)!==JSON.stringify(pcfg))fail('root/public config mismatch');
if(cfg.contact!=='atlashealthfrontiers@gmail.com')fail('operational contact mismatch');
if(!Array.isArray(cfg.modules)||cfg.modules.length<25)fail('production module registry incomplete');
if(!Array.isArray(repertoire.modules)||repertoire.modules.length<40)fail('ATLAS Repertoire incomplete');
if(release.autoApply!==true||release.rollbackCapable!==true)fail('Update Fabric release contract incomplete');
if(!Array.isArray(release.scope)||!release.scope.includes('web')||!release.scope.includes('pwa')||!release.scope.includes('design'))fail('release scope incomplete');
for(const marker of ['Command Center','Repertoire','Enterprise','People','Mobility','Health','Media','Research','Finance','Core Services','Settings','globalSearch','profileName'])if(!html.includes(marker))fail(`design-lock shell marker missing: ${marker}`);
for(const asset of ['/core-services.js','/music-core.js','/update-core.js','/repertoire-ui.js','/surface-mode.js','/app.js']){if(!html.includes(`src="${asset}"`))fail(`missing script ${asset}`)}
if(/<script(?![^>]*\bsrc=)[^>]*>/i.test(html))fail('inline scripts forbidden');
if(/<script(?![^>]*\bsrc=)[^>]*>/i.test(voiceStudio))fail('inline scripts forbidden in Voice Studio');
function walk(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>{const p=path.join(dir,e.name);return e.isDirectory()?walk(p):[p]})}
for(const f of walk(path.join(root,'public')).filter(f=>/\.(?:js|mjs)$/i.test(f))){try{new Function(fs.readFileSync(f,'utf8'))}catch(e){fail(`JavaScript syntax error in ${path.relative(root,f)}: ${e.message}`)}}
const browser=[app,core,music,voice,read('public/voice-studio.js'),read('public/update-core.js'),read('public/repertoire-ui.js'),read('public/surface-mode.js')].join('\n');if(/https?:\/\//i.test(browser))fail('browser runtime must not hard-code remote endpoints');
const services=['dataFabric','eventFabric','identity','intelligence','agentFabric','workGraph','music','integrations'];for(const s of services){if(!cfg.services?.[s])fail(`missing service ${s}`);if(!['active','verified','ready'].includes(cfg.services[s].status))fail(`service not ready: ${s}`)}
for(const s of ['dataFabric','eventFabric','identity','workGraph'])if(cfg.services[s].backendVerified!==true)fail(`backend verification missing: ${s}`);
for(const marker of ['ATLASCoreServices','DataFabric','EventFabric','Identity','Intelligence','AgentFabric','WorkGraph','Integrations','High-risk execution requires explicit approval'])if(!core.includes(marker))fail(`core invariant missing: ${marker}`);
for(const title of ['First Light','Horizon Rise','Pulse Core','Focus Flow','Vector Drive','Calm Room'])if(!music.includes(title))fail(`ATLAS Original missing: ${title}`);
for(const marker of ['ATLASVoiceCore','Text to Speech','Speech to Text','Voice Cloning','Dubbing & Localization','Conversational Voice Agent','Explicit voice-owner consent is required','health() and run(input)'])if(!voice.includes(marker))fail(`voice invariant missing: ${marker}`);
for(const marker of ['Voice Intelligence Studio','Text to Speech','Speech to Text','Voice Recorder','Full process matrix','Consent Registry'])if(!voiceStudio.includes(marker))fail(`Voice Studio surface marker missing: ${marker}`);
if(!/^name\s*=\s*["']atlas-enterprise-suite["']/m.test(wrangler)||!/^workers_dev\s*=\s*false\s*$/m.test(wrangler)||!/^directory\s*=\s*["']\.\/public["']\s*$/m.test(wrangler))fail('Wrangler production boundary invalid');
for(const marker of ["default-src 'self'","connect-src 'self'","img-src 'self' data:","object-src 'none'","frame-ancestors 'none'",'/atlas.config.json','Cache-Control: no-store, max-age=0','/sw.js'])if(!headers.includes(marker))fail(`security header marker missing: ${marker}`);
for(const marker of ["url.pathname.startsWith('/api/')","networkOnly(url)","fetch(request, { cache: 'no-store' })","sameOrigin(url)","'/update-core.js'","'/repertoire-ui.js'","'/surface-mode.js'","'/voice-core.js'","'/voice-studio.css'","'/voice-studio.js'"])if(!sw.includes(marker))fail(`service worker boundary missing: ${marker}`);
if(!sw.includes("const CACHE = 'atlas-core-services-v1.2.0-repertoire-app-voice-20260810'"))fail('service worker cache version mismatch');
const activeRedirects=redirects.split(/\r?\n/).map(x=>x.trim()).filter(x=>x&&!x.startsWith('#'));if(activeRedirects.length)fail('catch-all redirects forbidden');
for(const marker of ['ATLAS Command Center','Todo tu universo. Conectado. Inteligente. 4D.','Design Lock','Update Fabric','WEB + APP'])if(!app.includes(marker))fail(`approved dashboard marker missing: ${marker}`);
console.log(`ATLAS validation passed: v${cfg.version}, ${cfg.modules.length} production modules, ${repertoire.modules.length} repertoire surfaces, ${services.length} core services, Design Lock + Update Fabric + Voice Studio verified.`);
