import atlasWorker from './atlas-router.js';
import {handleRideOS} from './modules/rideos-worker.js';
import {handleCreatorStudio} from './modules/creator-studio-worker.js';
import {handleCreatorDirector} from './modules/creator-director-worker.js';
import {handleCreatorRelease} from './modules/creator-release-worker.js';
import {handleCreatorWebDirector} from './modules/creator-web-director-worker.js';
import {handleUniversalCreator} from './modules/creator-universal-worker.js';
import {handleCreatorVisualInspector} from './modules/creator-visual-inspector-worker.js';
import {handleCreatorFieldObservation} from './modules/creator-field-observation-worker.js';
import {handleCreatorMission} from './modules/creator-mission-worker.js';
import {handleStudioAutopilot} from './modules/studio-autopilot-worker.js';
import {handleStudioMediaQC} from './modules/studio-media-qc-worker.js';
import {handleStudioLook} from './modules/studio-look-worker.js';
import {handleStudioSubject} from './modules/studio-subject-worker.js';
import {handleStudioSpeech} from './modules/studio-speech-worker.js';
import {handleStudioVoice} from './modules/studio-voice-worker.js';
import {handleStudioLipSync} from './modules/studio-lipsync-worker.js';
import {handleStudioResolution} from './modules/studio-resolution-worker.js';
import {handleStudioModelLab} from './modules/studio-model-lab-worker.js';
import {handleStudioProduction} from './modules/studio-production-worker.js';
import {handleStudioNative} from './modules/studio-native-worker.js';
import {handleMusicStudio} from './modules/music-studio-worker.js';
import {handleProfessionalDashboard} from './modules/professional-dashboard-worker.js';
import {handleEnterpriseDashboard} from './modules/enterprise-dashboard-worker.js';
import {handleGlobalCountry} from './modules/global-country-worker.js';
import {handleVenezuela} from './modules/venezuela-worker.js';
import {ConnectStore,handleConnect} from './modules/connect-worker.js';
import {handleBrowser} from './modules/browser-worker.js';
import {handleWorkbench} from './modules/workbench-worker.js';
import {CapabilityStateStore,handleCapabilityState} from './modules/capability-state-worker.js';
import {WalletStore,handleWallet} from './modules/wallet-worker.js';
import {handleWalletIdentityGate} from './modules/wallet-identity-gate.js';
import {handlePublicDashboardHome} from './modules/public-dashboard-home.js';
import {handlePublicSite} from './modules/public-site-worker.js';
import {handleVisualMenu} from './modules/visual-menu-worker.js';
export {VideoRoom} from './atlas-router.js';
export {ConnectStore,CapabilityStateStore,WalletStore};

function isRideOSPath(path){return path==='/rideos'||path.startsWith('/rideos/')||path==='/ride'||path.startsWith('/ride/')||path==='/driver'||path.startsWith('/driver/')||path==='/marketplace'||path.startsWith('/marketplace/')||path==='/driver-finance'||path.startsWith('/driver-finance/')||path.startsWith('/api/rideos/')||path.startsWith('/api/mobility/');}
function isStudioPath(path){return path==='/studio'||path.startsWith('/studio/')||path.startsWith('/api/studio/');}
function isMusicPath(path){return path==='/music'||path==='/studio/music'||path==='/studio/audio'||path.startsWith('/api/studio/music/');}
function isBrowserPath(path){return path==='/browser'||path.startsWith('/browser/')||path.startsWith('/api/browser/');}
function isWorkbenchPath(path){return path==='/workbench'||path.startsWith('/workbench/')||path==='/forge'||path==='/developer'||path.startsWith('/api/workbench/');}
function isWalletPath(path){return path==='/wallet'||path.startsWith('/wallet/')||path.startsWith('/api/wallet/');}

function applicationResponse(response){
  if(!response)return response;
  const type=response.headers.get('content-type')||'';
  if(!type.includes('text/html'))return response;
  const headers=new Headers(response.headers);
  headers.set('x-robots-tag','noindex, nofollow, noarchive');
  headers.set('cache-control','no-store');
  headers.delete('content-length');
  return new Response(response.body,{status:response.status,statusText:response.statusText,headers});
}

const SMART_NAV_ITEMS=[
  ['dashboard','Dashboard','/dashboard','Core','◫'],
  ['menu','All modules','/menu','Core','◇'],
  ['studio','Studio home','/studio','Core','✦'],
  ['workbench','Workbench','/workbench','Core','⌘'],
  ['browser','Browser','/browser','Core','◉'],
  ['connect','Connect','/connect','Core','✉'],
  ['music','Music Studio','/studio/music','Create','♫'],
  ['production','Production','/studio/production','Create','◈'],
  ['create-anything','Create Anything','/studio/create-anything','Create','✧'],
  ['director','Creator Director','/studio/director','Create','◆'],
  ['autopilot','Studio Autopilot','/studio/autopilot','Create','◎'],
  ['release','Release Center','/studio/release','Create','⬢'],
  ['look','Look Engine','/studio/look','Media','◒'],
  ['subject','Subject Engine','/studio/subject','Media','⌖'],
  ['speech','Speech Engine','/studio/speech','Media','≋'],
  ['voice','Voice Engine','/studio/voice','Media','◖'],
  ['lipsync','Lip Sync','/studio/lipsync','Media','◡'],
  ['resolution','Resolution','/studio/resolution','Media','▣'],
  ['qc','Media QC','/studio/qc','Media','✓'],
  ['models','Neural Foundry','/studio/models','Media','⌬'],
  ['visual','Visual Inspector','/studio/creator/visual','Tools','◫'],
  ['field','Field Observation','/studio/field','Tools','⌖'],
  ['mission','Mission Control','/studio/mission','Tools','◇'],
  ['web','Web Director','/studio/creator/web','Tools','▦']
].map(([id,name,route,group,icon])=>({id,name,route,group,icon}));

function smartNavMarkup(){
  const payload=JSON.stringify(SMART_NAV_ITEMS).replace(/</g,'\\u003c');
  return `<style id="atlasSmartNavStyle">
#atlasSmartNavOpen{font:inherit}.atlas-smart-trigger{cursor:pointer}
#atlasSmartNav{position:fixed;inset:0;z-index:10000;background:rgba(0,5,12,.58);backdrop-filter:blur(7px);display:none}
#atlasSmartNav.on{display:block}
#atlasSmartNavPanel{position:absolute;right:0;top:0;bottom:0;width:min(420px,94vw);background:#06111e;color:#eef7ff;border-left:1px solid #244b69;box-shadow:-30px 0 80px rgba(0,0,0,.45);display:flex;flex-direction:column}
.asn-head{padding:18px;border-bottom:1px solid #17364f;display:flex;gap:12px;align-items:center}.asn-head strong{font-size:17px}.asn-head small{display:block;color:#7f99ad;margin-top:2px}.asn-close{margin-left:auto;border:0;background:transparent;color:white;font-size:26px;cursor:pointer}
.asn-search{margin:12px 14px 4px;background:#040c15;border:1px solid #234c68;border-radius:12px;color:white;padding:11px 12px;outline:none}
.asn-scroll{overflow:auto;padding:8px 14px 22px}.asn-title{font-size:9px;color:#6e8ba1;letter-spacing:.14em;text-transform:uppercase;margin:15px 2px 6px}
.asn-list{display:grid;gap:5px}.asn-item{display:grid;grid-template-columns:38px 1fr auto;gap:9px;align-items:center;padding:10px;border:1px solid transparent;border-radius:12px;color:#dbeaf4;text-decoration:none;background:#081827}
.asn-item:hover,.asn-item.active{border-color:#2c6a91;background:#0b263a}.asn-ico{width:32px;height:32px;border-radius:9px;background:#0c2b42;display:grid;place-items:center;color:#74dcff}
.asn-item small{color:#738fa4}.asn-arrow{color:#58758b}.asn-group{border-top:1px solid #133147}.asn-group summary{list-style:none;cursor:pointer;padding:12px 4px;display:flex;align-items:center;color:#bdd0df}.asn-group summary::-webkit-details-marker{display:none}.asn-group summary span{margin-left:auto;color:#6f8da4}
.asn-empty{padding:18px;color:#829bad;text-align:center}.asn-recents{display:none}.asn-recents.has{display:block}
@media(max-width:760px){#atlasSmartNavPanel{top:auto;width:100%;height:min(78vh,720px);border-left:0;border-top:1px solid #244b69;border-radius:24px 24px 0 0}.asn-head{padding-top:14px}}
</style>
<div id="atlasSmartNav" data-atlas-smart-nav><div id="atlasSmartNavPanel" role="dialog" aria-modal="true" aria-label="ATLAS navigation">
<div class="asn-head"><div><strong>ATLAS</strong><small>Adaptive navigation</small></div><button class="asn-close" id="atlasSmartNavClose" aria-label="Close">×</button></div>
<input id="atlasSmartNavSearch" class="asn-search" placeholder="Search modules and tools">
<div class="asn-scroll"><div id="atlasSmartSuggested"></div><div id="atlasSmartRecent" class="asn-recents"></div><div id="atlasSmartGroups"></div><div id="atlasSmartEmpty" class="asn-empty" hidden>No matching destination.</div></div>
</div></div>
<script id="atlasSmartNavScript">(()=>{if(window.__atlasSmartNav)return;window.__atlasSmartNav=true;const items=${payload},overlay=document.getElementById('atlasSmartNav'),search=document.getElementById('atlasSmartNavSearch'),groups=document.getElementById('atlasSmartGroups'),suggested=document.getElementById('atlasSmartSuggested'),recentBox=document.getElementById('atlasSmartRecent'),empty=document.getElementById('atlasSmartEmpty');if(!overlay)return;
const safeParse=(x,f)=>{try{return JSON.parse(x)||f}catch{return f}},recents=()=>safeParse(localStorage.getItem('atlas.smartNav.recent'),'[]'),saveRecent=item=>{let r=recents().filter(x=>x.route!==item.route);r.unshift({id:item.id,name:item.name,route:item.route,icon:item.icon,group:item.group});localStorage.setItem('atlas.smartNav.recent',JSON.stringify(r.slice(0,5)))};
const row=(i,active=false)=>'<a class="asn-item '+(active?'active':'')+'" href="'+i.route+'" data-route="'+i.route+'"><span class="asn-ico">'+i.icon+'</span><span><b>'+i.name+'</b><small>'+i.group+'</small></span><span class="asn-arrow">›</span></a>';
const context=()=>{const p=location.pathname;if(p.startsWith('/studio/music')||p==='/music')return['music','production','voice'];if(p.startsWith('/studio'))return['studio','production','create-anything'];if(p.startsWith('/browser'))return['browser','workbench','studio'];if(p.startsWith('/connect'))return['connect','dashboard','studio'];return['dashboard','studio','menu']};
function render(term=''){term=term.trim().toLowerCase();const filtered=items.filter(i=>!term||(i.name+' '+i.group+' '+i.route).toLowerCase().includes(term));suggested.innerHTML=term?'':'<div class="asn-title">Suggested now</div><div class="asn-list">'+context().map(id=>items.find(i=>i.id===id)).filter(Boolean).map(i=>row(i,location.pathname===i.route)).join('')+'</div>';const r=recents().filter(i=>!term||(i.name+' '+i.route).toLowerCase().includes(term));recentBox.classList.toggle('has',!term&&r.length>0);recentBox.innerHTML=!term&&r.length?'<div class="asn-title">Recent</div><div class="asn-list">'+r.slice(0,3).map(i=>row(i)).join('')+'</div>':'';const by={};filtered.forEach(i=>(by[i.group]??=[]).push(i));groups.innerHTML=Object.entries(by).map(([g,list])=>'<details class="asn-group" '+((term||g==='Core')?'open':'')+'><summary>'+g+'<span>'+list.length+'</span></summary><div class="asn-list">'+list.map(i=>row(i,location.pathname===i.route)).join('')+'</div></details>').join('');empty.hidden=filtered.length>0;overlay.querySelectorAll('a[data-route]').forEach(a=>a.addEventListener('click',()=>{const i=items.find(x=>x.route===a.dataset.route)||{id:a.dataset.route,name:a.textContent.trim(),route:a.dataset.route,icon:'·',group:'Recent'};saveRecent(i)}))}
function open(){overlay.classList.add('on');render();setTimeout(()=>search.focus(),30)}function close(){overlay.classList.remove('on')}document.querySelectorAll('.atlas-smart-trigger,#atlasSmartNavOpen').forEach(b=>b.addEventListener('click',e=>{e.preventDefault();open()}));document.getElementById('atlasSmartNavClose')?.addEventListener('click',close);overlay.addEventListener('click',e=>{if(e.target===overlay)close()});search.addEventListener('input',e=>render(e.target.value));document.addEventListener('keydown',e=>{if(e.key==='Escape')close();if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='k'){e.preventDefault();open()}});render()})();</script>`;
}

async function surfacePlatformLinks(response){
  const type=response.headers.get('content-type')||'';
  if(!type.includes('text/html'))return response;
  let html=await response.text();
  if(!html.includes('data-atlas-smart-nav')){
    const essentials=[];
    if(!html.includes('href="/menu"'))essentials.push('<a class="nav" href="/menu"><span class="ico">◇</span>ATLAS Menu</a>');
    if(!html.includes('href="/studio"'))essentials.push('<a class="nav" href="/studio"><span class="ico">✦</span>ATLAS Studio</a>');
    if(!html.includes('href="/workbench"'))essentials.push('<a class="nav" href="/workbench"><span class="ico">⌘</span>Workbench</a>');
    const more='<button id="atlasSmartNavOpen" class="nav atlas-smart-trigger" type="button"><span class="ico">•••</span>More</button>';
    if(html.includes('</aside>'))html=html.replace('</aside>',essentials.join('')+more+'</aside>');
    else html=html.replace('</body>','<button id="atlasSmartNavOpen" class="atlas-smart-trigger" style="position:fixed;right:14px;bottom:14px;z-index:9999;border:1px solid #3f83ae;background:#0a2942;color:white;border-radius:999px;padding:10px 14px;font:12px system-ui">ATLAS · Menu</button></body>');
    html=html.replace('</body>',smartNavMarkup()+'</body>');
  }
  const headers=new Headers(response.headers);
  headers.set('x-robots-tag','noindex, nofollow, noarchive');
  headers.set('cache-control','no-store');
  headers.delete('content-length');
  return new Response(html,{status:response.status,statusText:response.statusText,headers});
}

export default {
  async fetch(request,env,ctx){
    const url=new URL(request.url);
    const visualMenu=await handleVisualMenu(request,env,ctx);if(visualMenu)return applicationResponse(visualMenu);
    const publicDashboard=handlePublicDashboardHome(request,env,ctx);if(publicDashboard)return publicDashboard;
    const publicSite=handlePublicSite(request,env,ctx);if(publicSite)return publicSite;
    if(url.pathname.startsWith('/api/capability-state/')){const capabilityState=await handleCapabilityState(request,env,ctx);if(capabilityState)return capabilityState;}
    if(isMusicPath(url.pathname)){const music=handleMusicStudio(request,env,ctx);if(music)return applicationResponse(music);}
    if(isWalletPath(url.pathname)){const gate=await handleWalletIdentityGate(request,env,ctx);if(gate)return gate;const wallet=await handleWallet(request,env,ctx);if(wallet)return applicationResponse(wallet);}
    if(isWorkbenchPath(url.pathname)){const workbench=handleWorkbench(request,env,ctx);if(workbench)return surfacePlatformLinks(applicationResponse(workbench));}
    if(isBrowserPath(url.pathname)){const browser=handleBrowser(request,env,ctx);if(browser)return surfacePlatformLinks(applicationResponse(browser));}
    const venezuela=handleVenezuela(request,env,ctx);if(venezuela)return surfacePlatformLinks(applicationResponse(venezuela));
    if(url.pathname==='/global'||url.pathname.startsWith('/global/')||url.pathname.startsWith('/api/global/')){const globalResponse=handleGlobalCountry(request,env,ctx);if(globalResponse)return surfacePlatformLinks(applicationResponse(globalResponse));}
    if(url.pathname==='/connect'||url.pathname.startsWith('/connect/')||url.pathname.startsWith('/api/connect/')){const connect=await handleConnect(request,env,ctx);if(connect)return surfacePlatformLinks(applicationResponse(connect));}
    const professionalDashboard=handleProfessionalDashboard(request,env,ctx);if(professionalDashboard)return surfacePlatformLinks(applicationResponse(professionalDashboard));
    const enterpriseDashboard=handleEnterpriseDashboard(request,env,ctx);if(enterpriseDashboard)return surfacePlatformLinks(applicationResponse(enterpriseDashboard));
    if(isStudioPath(url.pathname)){
      const field=await handleCreatorFieldObservation(request,env,ctx);if(field)return surfacePlatformLinks(applicationResponse(field));
      const mission=await handleCreatorMission(request,env,ctx);if(mission)return surfacePlatformLinks(applicationResponse(mission));
      const visual=handleCreatorVisualInspector(request,env,ctx);if(visual)return surfacePlatformLinks(applicationResponse(visual));
      const universal=await handleUniversalCreator(request,env,ctx);if(universal)return surfacePlatformLinks(applicationResponse(universal));
      const release=await handleCreatorRelease(request,env,ctx);if(release)return surfacePlatformLinks(applicationResponse(release));
      const director=await handleCreatorDirector(request,env,ctx);if(director)return surfacePlatformLinks(applicationResponse(director));
      const webDirector=await handleCreatorWebDirector(request,env,ctx);if(webDirector)return surfacePlatformLinks(applicationResponse(webDirector));
      const autopilot=handleStudioAutopilot(request,env,ctx);if(autopilot)return surfacePlatformLinks(applicationResponse(autopilot));
      const look=handleStudioLook(request,env,ctx);if(look)return surfacePlatformLinks(applicationResponse(look));
      const subject=handleStudioSubject(request,env,ctx);if(subject)return surfacePlatformLinks(applicationResponse(subject));
      const speech=handleStudioSpeech(request,env,ctx);if(speech)return surfacePlatformLinks(applicationResponse(speech));
      const voice=handleStudioVoice(request,env,ctx);if(voice)return surfacePlatformLinks(applicationResponse(voice));
      const lipsync=handleStudioLipSync(request,env,ctx);if(lipsync)return surfacePlatformLinks(applicationResponse(lipsync));
      const resolution=handleStudioResolution(request,env,ctx);if(resolution)return surfacePlatformLinks(applicationResponse(resolution));
      const modelLab=handleStudioModelLab(request,env,ctx);if(modelLab)return surfacePlatformLinks(applicationResponse(modelLab));
      const qc=handleStudioMediaQC(request,env,ctx);if(qc)return surfacePlatformLinks(applicationResponse(qc));
      const native=handleStudioNative(request,env,ctx);if(native)return surfacePlatformLinks(applicationResponse(native));
      const production=handleStudioProduction(request,env,ctx);if(production)return surfacePlatformLinks(applicationResponse(production));
      const response=handleCreatorStudio(request,env,ctx);if(response)return surfacePlatformLinks(applicationResponse(response));
    }
    if(isRideOSPath(url.pathname)){const response=await handleRideOS(request,env,ctx);if(response)return surfacePlatformLinks(applicationResponse(response));}
    return surfacePlatformLinks(await atlasWorker.fetch(request,env,ctx));
  },
  async scheduled(controller,env,ctx){if(typeof atlasWorker.scheduled==='function')return atlasWorker.scheduled(controller,env,ctx);ctx?.waitUntil?.(Promise.resolve());}
};
