import atlasWorker from './atlas-router.js';
import {handleRideOS} from './modules/rideos-worker.js';
import {handleCreatorStudio} from './modules/creator-studio-worker.js';
import {handleCreatorDirector} from './modules/creator-director-worker.js';
import {handleCreatorRelease} from './modules/creator-release-worker.js';
import {handleCreatorWebDirector} from './modules/creator-web-director-worker.js';
import {handleUniversalCreator} from './modules/creator-universal-worker.js';
import {handleStudioAutopilot} from './modules/studio-autopilot-worker.js';
import {handleStudioMediaQC} from './modules/studio-media-qc-worker.js';
import {handleStudioLook} from './modules/studio-look-worker.js';
import {handleStudioSubject} from './modules/studio-subject-worker.js';
import {handleStudioSpeech} from './modules/studio-speech-worker.js';
import {handleStudioVoice} from './modules/studio-voice-worker.js';
import {handleStudioLipSync} from './modules/studio-lipsync-worker.js';
import {handleStudioResolution} from './modules/studio-resolution-worker.js';
import {handleStudioProduction} from './modules/studio-production-worker.js';
import {handleStudioNative} from './modules/studio-native-worker.js';
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
export {VideoRoom} from './atlas-router.js';
export {ConnectStore,CapabilityStateStore,WalletStore};

function isRideOSPath(path){
  return path==='/rideos'||path.startsWith('/rideos/')||
    path==='/ride'||path.startsWith('/ride/')||
    path==='/driver'||path.startsWith('/driver/')||
    path==='/marketplace'||path.startsWith('/marketplace/')||
    path==='/driver-finance'||path.startsWith('/driver-finance/')||
    path.startsWith('/api/rideos/')||path.startsWith('/api/mobility/');
}
function isStudioPath(path){return path==='/studio'||path.startsWith('/studio/')||path.startsWith('/api/studio/');}
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

async function surfacePlatformLinks(response){
  const type=response.headers.get('content-type')||'';
  if(!type.includes('text/html'))return response;
  let html=await response.text();
  const links=[];
  if(!html.includes('href="/wallet"'))links.push('<a class="nav" href="/wallet"><span class="ico">▱</span>ATLAS Wallet</a>');
  if(!html.includes('href="/workbench"'))links.push('<a class="nav" href="/workbench"><span class="ico">⌘</span>ATLAS Workbench</a>');
  if(!html.includes('href="/browser"'))links.push('<a class="nav" href="/browser"><span class="ico">◉</span>ATLAS Browser</a>');
  if(!html.includes('href="/studio"'))links.push('<a class="nav" href="/studio"><span class="ico">✦</span>ATLAS Studio</a>');
  if(!html.includes('href="/studio/create-anything"'))links.push('<a class="nav" href="/studio/create-anything"><span class="ico">✧</span>Universal Creator</a>');
  if(!html.includes('href="/studio/director"'))links.push('<a class="nav" href="/studio/director"><span class="ico">◆</span>Creator Director</a>');
  if(!html.includes('href="/studio/autopilot"'))links.push('<a class="nav" href="/studio/autopilot"><span class="ico">◎</span>Studio Autopilot</a>');
  if(!html.includes('href="/studio/look"'))links.push('<a class="nav" href="/studio/look"><span class="ico">◒</span>Look Engine</a>');
  if(!html.includes('href="/studio/subject"'))links.push('<a class="nav" href="/studio/subject"><span class="ico">⌖</span>Subject Engine</a>');
  if(!html.includes('href="/studio/speech"'))links.push('<a class="nav" href="/studio/speech"><span class="ico">≋</span>Speech Engine</a>');
  if(!html.includes('href="/studio/voice"'))links.push('<a class="nav" href="/studio/voice"><span class="ico">◖</span>Voice Engine</a>');
  if(!html.includes('href="/studio/lipsync"'))links.push('<a class="nav" href="/studio/lipsync"><span class="ico">◡</span>Lip Sync</a>');
  if(!html.includes('href="/studio/resolution"'))links.push('<a class="nav" href="/studio/resolution"><span class="ico">▣</span>Resolution</a>');
  if(!html.includes('href="/studio/qc"'))links.push('<a class="nav" href="/studio/qc"><span class="ico">✓</span>Media QC</a>');
  if(!html.includes('href="/studio/creator/web"'))links.push('<a class="nav" href="/studio/creator/web"><span class="ico">▦</span>Creator Web Director</a>');
  if(!html.includes('href="/studio/production"'))links.push('<a class="nav" href="/studio/production"><span class="ico">◈</span>Studio Production</a>');
  if(!html.includes('href="/studio/release"'))links.push('<a class="nav" href="/studio/release"><span class="ico">⬢</span>Creator Release</a>');
  if(links.length){
    const injected=links.join('');
    if(html.includes('</aside>'))html=html.replace('</aside>',injected+'</aside>');
    else if(html.includes('</body>'))html=html.replace('</body>','<div style="position:fixed;right:14px;bottom:14px;z-index:999;display:flex;gap:7px;flex-wrap:wrap"><a href="/wallet" style="padding:9px 12px;border-radius:10px;background:#0d365c;color:white;text-decoration:none;border:1px solid #2d78a8;font:12px system-ui">ATLAS Wallet</a><a href="/workbench" style="padding:9px 12px;border-radius:10px;background:#0d365c;color:white;text-decoration:none;border:1px solid #2d78a8;font:12px system-ui">ATLAS Workbench</a><a href="/browser" style="padding:9px 12px;border-radius:10px;background:#0d365c;color:white;text-decoration:none;border:1px solid #2d78a8;font:12px system-ui">ATLAS Browser</a><a href="/studio" style="padding:9px 12px;border-radius:10px;background:#0d365c;color:white;text-decoration:none;border:1px solid #2d78a8;font:12px system-ui">ATLAS Studio</a><a href="/studio/create-anything" style="padding:9px 12px;border-radius:10px;background:#143f64;color:#d6f4ff;text-decoration:none;border:1px solid #50c9ee;font:12px system-ui">Universal Creator</a><a href="/studio/director" style="padding:9px 12px;border-radius:10px;background:#0d365c;color:white;text-decoration:none;border:1px solid #2d78a8;font:12px system-ui">Creator Director</a><a href="/studio/autopilot" style="padding:9px 12px;border-radius:10px;background:#133c5d;color:white;text-decoration:none;border:1px solid #44b7e5;font:12px system-ui">Autopilot</a><a href="/studio/look" style="padding:9px 12px;border-radius:10px;background:#33254b;color:#eadcff;text-decoration:none;border:1px solid #7955ad;font:12px system-ui">Look</a><a href="/studio/subject" style="padding:9px 12px;border-radius:10px;background:#1a3a4a;color:#d7f3ff;text-decoration:none;border:1px solid #4d8aa5;font:12px system-ui">Subject</a><a href="/studio/speech" style="padding:9px 12px;border-radius:10px;background:#243747;color:#dcf2ff;text-decoration:none;border:1px solid #55798f;font:12px system-ui">Speech</a><a href="/studio/voice" style="padding:9px 12px;border-radius:10px;background:#173b43;color:#d7fff3;text-decoration:none;border:1px solid #4a8e80;font:12px system-ui">Voice</a><a href="/studio/lipsync" style="padding:9px 12px;border-radius:10px;background:#3c2949;color:#f2e0ff;text-decoration:none;border:1px solid #795b98;font:12px system-ui">Lip Sync</a><a href="/studio/resolution" style="padding:9px 12px;border-radius:10px;background:#26374b;color:#e3f1ff;text-decoration:none;border:1px solid #58789e;font:12px system-ui">Resolution</a><a href="/studio/qc" style="padding:9px 12px;border-radius:10px;background:#123b31;color:#b8f0d4;text-decoration:none;border:1px solid #3f8a6c;font:12px system-ui">Media QC</a><a href="/studio/creator/web" style="padding:9px 12px;border-radius:10px;background:#0d365c;color:white;text-decoration:none;border:1px solid #2d78a8;font:12px system-ui">Web Director</a><a href="/studio/production" style="padding:9px 12px;border-radius:10px;background:#0d365c;color:white;text-decoration:none;border:1px solid #2d78a8;font:12px system-ui">Production</a><a href="/studio/release" style="padding:9px 12px;border-radius:10px;background:#382b12;color:#ffe1a2;text-decoration:none;border:1px solid #826429;font:12px system-ui">Creator Release</a></div></body>');
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
    const publicDashboard=handlePublicDashboardHome(request,env,ctx);
    if(publicDashboard)return publicDashboard;
    const publicSite=handlePublicSite(request,env,ctx);
    if(publicSite)return publicSite;
    if(url.pathname.startsWith('/api/capability-state/')){
      const capabilityState=await handleCapabilityState(request,env,ctx);
      if(capabilityState)return capabilityState;
    }
    if(isWalletPath(url.pathname)){
      const gate=await handleWalletIdentityGate(request,env,ctx);
      if(gate)return gate;
      const wallet=await handleWallet(request,env,ctx);
      if(wallet)return applicationResponse(wallet);
    }
    if(isWorkbenchPath(url.pathname)){
      const workbench=handleWorkbench(request,env,ctx);
      if(workbench)return applicationResponse(workbench);
    }
    if(isBrowserPath(url.pathname)){
      const browser=handleBrowser(request,env,ctx);
      if(browser)return applicationResponse(browser);
    }
    const venezuela=handleVenezuela(request,env,ctx);if(venezuela)return applicationResponse(venezuela);
    if(url.pathname==='/global'||url.pathname.startsWith('/global/')||url.pathname.startsWith('/api/global/')){
      const globalResponse=handleGlobalCountry(request,env,ctx);if(globalResponse)return applicationResponse(globalResponse);
    }
    if(url.pathname==='/connect'||url.pathname.startsWith('/connect/')||url.pathname.startsWith('/api/connect/')){
      const connect=await handleConnect(request,env,ctx);if(connect)return applicationResponse(connect);
    }
    const professionalDashboard=handleProfessionalDashboard(request,env,ctx);if(professionalDashboard)return applicationResponse(professionalDashboard);
    const enterpriseDashboard=handleEnterpriseDashboard(request,env,ctx);if(enterpriseDashboard)return applicationResponse(enterpriseDashboard);
    if(isStudioPath(url.pathname)){
      const universal=await handleUniversalCreator(request,env,ctx);if(universal)return applicationResponse(universal);
      const release=await handleCreatorRelease(request,env,ctx);if(release)return applicationResponse(release);
      const director=await handleCreatorDirector(request,env,ctx);if(director)return applicationResponse(director);
      const webDirector=await handleCreatorWebDirector(request,env,ctx);if(webDirector)return applicationResponse(webDirector);
      const autopilot=handleStudioAutopilot(request,env,ctx);if(autopilot)return applicationResponse(autopilot);
      const look=handleStudioLook(request,env,ctx);if(look)return applicationResponse(look);
      const subject=handleStudioSubject(request,env,ctx);if(subject)return applicationResponse(subject);
      const speech=handleStudioSpeech(request,env,ctx);if(speech)return applicationResponse(speech);
      const voice=handleStudioVoice(request,env,ctx);if(voice)return applicationResponse(voice);
      const lipsync=handleStudioLipSync(request,env,ctx);if(lipsync)return applicationResponse(lipsync);
      const resolution=handleStudioResolution(request,env,ctx);if(resolution)return applicationResponse(resolution);
      const qc=handleStudioMediaQC(request,env,ctx);if(qc)return applicationResponse(qc);
      const native=handleStudioNative(request,env,ctx);if(native)return applicationResponse(native);
      const production=handleStudioProduction(request,env,ctx);if(production)return applicationResponse(production);
      const response=handleCreatorStudio(request,env,ctx);if(response)return surfacePlatformLinks(response);
    }
    if(isRideOSPath(url.pathname)){
      const response=await handleRideOS(request,env,ctx);if(response)return applicationResponse(response);
    }
    return surfacePlatformLinks(await atlasWorker.fetch(request,env,ctx));
  },
  async scheduled(controller,env,ctx){
    if(typeof atlasWorker.scheduled==='function')return atlasWorker.scheduled(controller,env,ctx);
    ctx?.waitUntil?.(Promise.resolve());
  }
};
