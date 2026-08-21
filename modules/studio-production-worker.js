const JSON_HEADERS={
  'content-type':'application/json; charset=utf-8',
  'cache-control':'no-store',
  'access-control-allow-origin':'*'
};
const HTML_HEADERS={
  'content-type':'text/html; charset=utf-8',
  'cache-control':'no-store',
  'x-content-type-options':'nosniff',
  'referrer-policy':'same-origin'
};

const CAPABILITIES=[
  {id:'ingest',name:'Media Ingest',class:'local',state:'ready'},
  {id:'smartcut',name:'Smart Cut',class:'local',state:'ready'},
  {id:'timeline',name:'Timeline & Trim',class:'local',state:'ready'},
  {id:'vertical',name:'Vertical Reframe',class:'local',state:'ready'},
  {id:'captions',name:'Captions',class:'local',state:'ready'},
  {id:'voice-cleanup',name:'Voice Cleanup',class:'local',state:'ready'},
  {id:'export',name:'Render & Export',class:'local',state:'ready'},
  {id:'transcribe',name:'AI Transcription',class:'model',env:'ATLAS_TRANSCRIBE_ENDPOINT'},
  {id:'avatar',name:'Digital Twin',class:'model',env:'ATLAS_AVATAR_ENDPOINT'},
  {id:'lipsync',name:'Lip Sync',class:'model',env:'ATLAS_LIPSYNC_ENDPOINT'},
  {id:'enhance',name:'AI Enhance / Upscale',class:'model',env:'ATLAS_ENHANCE_ENDPOINT'},
  {id:'video-edit',name:'Generative Video Restyle',class:'model',env:'ATLAS_VIDEO_EDIT_ENDPOINT'}
];

function runtimeConfig(env={}){
  const model=CAPABILITIES.filter(c=>c.class==='model').map(c=>({
    id:c.id,
    name:c.name,
    requiredEnv:c.env,
    configured:Boolean(env[c.env])
  }));
  return {
    mode:'local-first',
    localProcessing:true,
    mediaLeavesDeviceByDefault:false,
    authGatewayReady:Boolean(env.ATLAS_STUDIO_RUNTIME_TOKEN),
    model
  };
}

function json(body,status=200){
  return new Response(JSON.stringify(body,null,2),{status,headers:JSON_HEADERS});
}

function studioHtml(config){
  const cfg=JSON.stringify(config).replace(/</g,'\\u003c');
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>ATLAS Studio Production Engine</title>
<style>
:root{--bg:#020711;--panel:#081523;--line:#1d4667;--text:#eef7ff;--muted:#87a2b8;--accent:#49ccff;--ok:#53dda3;--warn:#ffd27a}
*{box-sizing:border-box}body{margin:0;background:radial-gradient(circle at 80% 0,#123a63 0,transparent 35%),var(--bg);color:var(--text);font:14px Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}.app{max-width:1440px;margin:auto;padding:18px}.top{display:flex;gap:10px;align-items:center;justify-content:space-between;padding:18px;border:1px solid var(--line);border-radius:16px;background:#071321}.top h1{margin:0;font-size:25px}.top p{margin:6px 0 0;color:var(--muted)}.pill{padding:6px 10px;border:1px solid #2a654f;border-radius:999px;background:#0a2b20;color:#aaf0ce;font-size:11px}.grid{display:grid;grid-template-columns:minmax(0,1.35fr) minmax(300px,.65fr);gap:12px;margin-top:12px}.card{border:1px solid var(--line);background:linear-gradient(145deg,#091a2b,#050e18);border-radius:14px;padding:14px}.card h2{margin:0 0 10px;font-size:15px}.stage{min-height:480px;display:grid;place-items:center;background:#000;border:1px solid #234c6a;border-radius:12px;overflow:hidden}.stage video{display:none}.stage canvas{max-width:100%;max-height:70vh;background:#000}.empty{color:#6f8da6;text-align:center}.toolbar{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}.btn,.field{border:1px solid #2a5e83;background:#0a2944;color:#fff;border-radius:8px;padding:9px 11px}.btn{cursor:pointer}.btn.primary{background:linear-gradient(135deg,#147ae0,#12a5d5)}.btn:disabled{opacity:.45;cursor:not-allowed}.field{width:100%;margin:5px 0;background:#06111d}.row{display:grid;grid-template-columns:1fr 1fr;gap:8px}.status{border:1px solid #294f6c;background:#071d2d;color:#a7bfd1;border-radius:9px;padding:9px;font-size:11px;line-height:1.45}.status.good{border-color:#2b694f;background:#08291e;color:#a7ebca}.status.warn{border-color:#6a592d;background:#2a220d;color:#ffe0a0}.meta{display:grid;grid-template-columns:repeat(4,1fr);gap:7px;margin-top:9px}.metric{border:1px solid #173d59;border-radius:9px;padding:9px;background:#071421}.metric span{display:block;color:#7894aa;font-size:9px}.metric b{display:block;margin-top:4px;font-size:11px}.runtimeGrid{display:grid;grid-template-columns:repeat(2,1fr);gap:8px}.runtime{border:1px solid #1d425e;border-radius:9px;padding:10px;background:#071421}.runtime .tag{display:inline-block;margin-top:7px;border:1px solid #6b5a2a;border-radius:999px;padding:3px 6px;font-size:8px;color:#ffd988}.runtime.ready .tag{border-color:#2f6b52;color:#9ce8c4}.log{height:130px;overflow:auto;background:#020811;border:1px solid #173650;border-radius:8px;padding:8px;font:10px ui-monospace,monospace;color:#9fc8e3}.download{display:none;margin-top:9px;padding:10px;border:1px solid #2c664f;border-radius:9px;background:#09271e}.download.on{display:block}.download a{color:#a3eccb}.progress{height:7px;border-radius:99px;background:#06101b;border:1px solid #19384e;overflow:hidden;margin:9px 0}.progress div{height:100%;width:0;background:linear-gradient(90deg,#277ff0,#58ddff)}.captionList{max-height:150px;overflow:auto}.cue{display:grid;grid-template-columns:60px 60px 1fr;gap:6px;padding:6px 0;border-bottom:1px solid #173650;font-size:10px}@media(max-width:900px){.grid{grid-template-columns:1fr}.stage{min-height:360px}.runtimeGrid{grid-template-columns:1fr}}@media(max-width:600px){.app{padding:10px}.top{display:block}.pill{display:inline-block;margin-top:10px}.row,.meta{grid-template-columns:1fr 1fr}}
</style>
</head>
<body>
<div class="app">
  <section class="top"><div><h1>ATLAS Studio Production Engine</h1><p>Local-first editing from ingest to export. Model runtimes stay gated until explicitly configured.</p></div><span class="pill">Local engine ready</span></section>

  <div class="grid">
    <section class="card">
      <h2>Media Workbench</h2>
      <div class="stage"><video id="video" playsinline preload="metadata"></video><canvas id="canvas" width="540" height="960"></canvas><div id="empty" class="empty">Choose a local video to begin.</div></div>
      <div class="toolbar"><label class="btn primary" for="fileInput">Choose video</label><input id="fileInput" type="file" accept="video/*" hidden><button class="btn" id="playBtn" disabled>Play</button><button class="btn" id="setInBtn" disabled>Set in</button><button class="btn" id="setOutBtn" disabled>Set out</button></div>
      <div class="meta"><div class="metric"><span>Duration</span><b id="mDuration">—</b></div><div class="metric"><span>Source</span><b id="mSource">—</b></div><div class="metric"><span>Trim</span><b id="mTrim">—</b></div><div class="metric"><span>File</span><b id="mFile">—</b></div></div>
    </section>

    <section class="card">
      <h2>Smart Cut</h2>
      <div class="status">Local frame analysis scores visual motion only. It does not pretend to understand speech or engagement.</div>
      <label>Target seconds</label><input class="field" id="cutLen" type="number" min="3" max="60" value="15">
      <button class="btn primary" id="analyzeBtn" disabled>Analyze strongest visual window</button>
      <div id="cutStatus" class="status" style="margin-top:9px">Load a video first.</div>
      <h2 style="margin-top:14px">Look & Reframe</h2>
      <label>Format</label><select class="field" id="aspect"><option value="9:16">9:16 Reel / Short</option><option value="16:9">16:9 Landscape</option><option value="1:1">1:1 Square</option></select>
      <label>Mode</label><select class="field" id="fitMode"><option value="blur">Fit + blurred background</option><option value="crop">Center crop</option><option value="contain">Contain on black</option></select>
      <label>Brightness</label><input class="field" id="brightness" type="range" min="70" max="140" value="100">
      <label>Contrast</label><input class="field" id="contrast" type="range" min="70" max="150" value="106">
      <label>Saturation</label><input class="field" id="saturation" type="range" min="50" max="160" value="106">
    </section>
  </div>

  <div class="grid">
    <section class="card">
      <h2>Captions</h2>
      <div class="row"><label class="btn" for="srtInput">Import SRT</label><input id="srtInput" type="file" accept=".srt,text/plain" hidden><button class="btn" id="addCueBtn" disabled>Add cue at playhead</button></div>
      <input class="field" id="cueText" placeholder="Manual caption text">
      <div class="row"><input class="field" id="cueDuration" type="number" min="0.5" max="20" step="0.5" value="3"><label><input id="burnCaptions" type="checkbox" checked> Burn captions into export</label></div>
      <div class="captionList" id="captionList"><div class="status">No captions loaded.</div></div>
    </section>
    <section class="card">
      <h2>Audio Cleanup</h2>
      <label><input id="cleanupAudio" type="checkbox" checked> Apply browser voice cleanup during render</label>
      <div class="status" style="margin-top:9px">Uses an 80 Hz high-pass filter and dynamics compression. This is real browser DSP, not a neural denoiser.</div>
    </section>
  </div>

  <section class="card" style="margin-top:12px"><h2>Model Runtimes</h2><div id="runtimeGrid" class="runtimeGrid"></div></section>

  <div class="grid">
    <section class="card"><h2>Render & Export</h2><div class="row"><select class="field" id="resolution"><option value="720">720p class</option><option value="1080">1080p class</option></select><select class="field" id="fps"><option>30</option><option>24</option></select></div><button class="btn primary" id="renderBtn" disabled>Render selected range</button><button class="btn" id="cancelBtn" disabled>Cancel</button><div class="progress"><div id="progress"></div></div><div class="download" id="downloadBox"><b>Render complete.</b><br><a id="downloadLink" href="about:blank">Download video</a></div></section>
    <section class="card"><h2>Production Log</h2><div class="log" id="log"></div></section>
  </div>
</div>
<script>
const CONFIG=${cfg};
const el=id=>document.getElementById(id);
const video=el('video');
const canvas=el('canvas');
const ctx=canvas.getContext('2d',{alpha:false});
const analysisCanvas=document.createElement('canvas');
analysisCanvas.width=120;analysisCanvas.height=68;
const actx=analysisCanvas.getContext('2d',{willReadFrequently:true});
let file=null,fileUrl=null,trimIn=0,trimOut=0,cues=[],rendering=false,cancelRender=false,lastBlobUrl=null,audioGraph=null;
function log(msg){const d=document.createElement('div');d.textContent=new Date().toLocaleTimeString()+'  '+msg;el('log').prepend(d)}
function clamp(v,a,b){return Math.max(a,Math.min(b,v))}
function fmt(s){if(!Number.isFinite(s))return '—';const m=Math.floor(s/60),ss=Math.floor(s%60);return m+':'+String(ss).padStart(2,'0')}
function dims(base=540){const parts=el('aspect').value.split(':').map(Number);const r=parts[0]/parts[1];return r<1?{w:base,h:Math.round(base/r)}:{w:Math.round(base*r),h:base}}
function filter(){return 'brightness('+el('brightness').value+'%) contrast('+el('contrast').value+'%) saturate('+el('saturation').value+'%)'}
function drawFitted(target,w,h){const c=target,sw=video.videoWidth||1,sh=video.videoHeight||1,src=sw/sh,dst=w/h,mode=el('fitMode').value;c.save();c.clearRect(0,0,w,h);if(mode==='blur'){c.filter=filter()+' blur(22px)';let bw,bh,bx,by;if(src>dst){bh=h;bw=h*src;bx=(w-bw)/2;by=0}else{bw=w;bh=w/src;bx=0;by=(h-bh)/2}c.drawImage(video,bx,by,bw,bh);c.fillStyle='rgba(0,0,0,.25)';c.fillRect(0,0,w,h);c.filter=filter();let fw,fh,fx,fy;if(src>dst){fw=w;fh=w/src;fx=0;fy=(h-fh)/2}else{fh=h;fw=h*src;fy=0;fx=(w-fw)/2}c.drawImage(video,fx,fy,fw,fh)}else if(mode==='crop'){c.filter=filter();let sx=0,sy=0,sww=sw,shh=sh;if(src>dst){sww=sh*dst;sx=(sw-sww)/2}else{shh=sw/dst;sy=(sh-shh)/2}c.drawImage(video,sx,sy,sww,shh,0,0,w,h)}else{c.fillStyle='#000';c.fillRect(0,0,w,h);c.filter=filter();let fw,fh,fx,fy;if(src>dst){fw=w;fh=w/src;fx=0;fy=(h-fh)/2}else{fh=h;fw=h*src;fy=0;fx=(w-fw)/2}c.drawImage(video,fx,fy,fw,fh)}c.restore()}
function activeCaption(t){return cues.find(x=>t>=x.start&&t<=x.end)}
function drawCaption(c,w,h,t){if(!el('burnCaptions').checked)return;const cue=activeCaption(t);if(!cue)return;c.save();const size=Math.max(22,Math.round(w*.045));c.font='700 '+size+'px system-ui';c.textAlign='center';c.fillStyle='rgba(0,0,0,.72)';c.fillRect(w*.08,h*.78,w*.84,size*2);c.fillStyle='#fff';c.fillText(cue.text,w/2,h*.78+size*1.3);c.restore()}
function renderFrame(target=canvas,t=video.currentTime){if(!file||!video.videoWidth)return;const c=target.getContext('2d',{alpha:false}),w=target.width,h=target.height;drawFitted(c,w,h);drawCaption(c,w,h,t)}
function resizePreview(){const d=dims(540);canvas.width=d.w;canvas.height=d.h;renderFrame()}
function updateMeta(){el('mDuration').textContent=fmt(video.duration);el('mSource').textContent=video.videoWidth&&video.videoHeight?video.videoWidth+'×'+video.videoHeight:'—';el('mTrim').textContent=fmt(trimIn)+' – '+fmt(trimOut);el('mFile').textContent=file?file.name:'—'}
function enableLoaded(on){['playBtn','setInBtn','setOutBtn','analyzeBtn','addCueBtn','renderBtn'].forEach(id=>el(id).disabled=!on)}
['aspect','fitMode','brightness','contrast','saturation'].forEach(id=>el(id).addEventListener('input',resizePreview));
el('fileInput').onchange=e=>{const f=e.target.files&&e.target.files[0];if(!f||!f.type.startsWith('video/'))return;file=f;if(fileUrl)URL.revokeObjectURL(fileUrl);fileUrl=URL.createObjectURL(file);video.src=fileUrl;video.load();el('empty').style.display='none';log('Loaded '+file.name)};
video.onloadedmetadata=()=>{trimIn=0;trimOut=video.duration||0;enableLoaded(true);resizePreview();updateMeta();el('cutStatus').className='status good';el('cutStatus').textContent='Ready for local frame analysis.';log('Metadata ready')};
video.ontimeupdate=()=>{if(!rendering)renderFrame();updateMeta()};video.onseeked=()=>{if(!rendering)renderFrame()};video.onplay=()=>el('playBtn').textContent='Pause';video.onpause=()=>el('playBtn').textContent='Play';
el('playBtn').onclick=()=>video.paused?video.play():video.pause();
el('setInBtn').onclick=()=>{trimIn=clamp(video.currentTime,0,Math.max(0,trimOut-.1));updateMeta();log('Trim in '+fmt(trimIn))};
el('setOutBtn').onclick=()=>{trimOut=clamp(video.currentTime,trimIn+.1,video.duration);updateMeta();log('Trim out '+fmt(trimOut))};
function waitSeek(t){return new Promise(resolve=>{let done=false;const finish=()=>{if(done)return;done=true;video.removeEventListener('seeked',finish);resolve()};video.addEventListener('seeked',finish,{once:true});video.currentTime=clamp(t,0,Math.max(0,video.duration-.02));setTimeout(finish,1200)})}
function frameVector(){actx.filter='none';actx.drawImage(video,0,0,analysisCanvas.width,analysisCanvas.height);const data=actx.getImageData(0,0,analysisCanvas.width,analysisCanvas.height).data;const out=[];for(let y=0;y<analysisCanvas.height;y+=4){for(let x=0;x<analysisCanvas.width;x+=4){const i=(y*analysisCanvas.width+x)*4;out.push(Math.round(data[i]*.299+data[i+1]*.587+data[i+2]*.114))}}return out}
function diff(a,b){let s=0;for(let i=0;i<a.length;i++)s+=Math.abs(a[i]-b[i]);return s/Math.max(1,a.length)}
el('analyzeBtn').onclick=async()=>{if(!file)return;video.pause();el('analyzeBtn').disabled=true;const target=clamp(Number(el('cutLen').value)||15,3,Math.min(60,video.duration));const step=Math.max(.75,Math.min(1.5,video.duration/40));const samples=[];let prev=null;el('cutStatus').className='status warn';el('cutStatus').textContent='Sampling frames locally…';for(let t=0;t<video.duration;t+=step){await waitSeek(t);const vec=frameVector();samples.push({t,motion:prev?diff(vec,prev):0});prev=vec}const span=Math.max(1,Math.round(target/step));let best=-1,bestI=0;for(let i=0;i<=samples.length-span;i++){let score=0;for(let j=i;j<i+span;j++)score+=samples[j].motion;if(score>best){best=score;bestI=i}}trimIn=samples[bestI]?.t||0;trimOut=Math.min(video.duration,trimIn+target);video.currentTime=trimIn;updateMeta();el('cutStatus').className='status good';el('cutStatus').textContent='Suggested '+fmt(trimIn)+' – '+fmt(trimOut)+' from visual motion.';el('analyzeBtn').disabled=false;log('Smart Cut complete')};
function parseTime(v){const m=v.trim().replace('.',',').match(/(\d+):(\d+):(\d+),(\d+)/);if(!m)return NaN;return Number(m[1])*3600+Number(m[2])*60+Number(m[3])+Number('0.'+m[4])}
function parseSrt(text){const blocks=text.replace(/\r/g,'').trim().split(/\n\s*\n/);const out=[];for(const block of blocks){const lines=block.split('\n');const index=lines.findIndex(x=>x.includes('-->'));if(index<0)continue;const times=lines[index].split('-->');const start=parseTime(times[0]),end=parseTime(times[1]),caption=lines.slice(index+1).join(' ').trim();if(Number.isFinite(start)&&Number.isFinite(end)&&caption)out.push({start,end,text:caption})}return out}
function renderCues(){if(!cues.length){el('captionList').innerHTML='<div class="status">No captions loaded.</div>';return}el('captionList').innerHTML=cues.map(c=>'<div class="cue"><span>'+fmt(c.start)+'</span><span>'+fmt(c.end)+'</span><span>'+String(c.text).replace(/[&<>]/g,s=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[s]))+'</span></div>').join('')}
el('srtInput').onchange=async e=>{const f=e.target.files&&e.target.files[0];if(!f)return;cues=[...cues,...parseSrt(await f.text())];renderCues();renderFrame();log('SRT imported')};
el('addCueBtn').onclick=()=>{const text=el('cueText').value.trim();if(!text)return;const start=video.currentTime||trimIn;const end=Math.min(video.duration,start+clamp(Number(el('cueDuration').value)||3,.5,20));cues.push({start,end,text});el('cueText').value='';renderCues();renderFrame();log('Caption added')};
function buildAudioGraph(){if(audioGraph)return audioGraph;const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return null;try{const ac=new AC();const source=ac.createMediaElementSource(video);const hp=ac.createBiquadFilter();const comp=ac.createDynamicsCompressor();const dest=ac.createMediaStreamDestination();hp.type='highpass';hp.frequency.value=80;comp.threshold.value=-24;comp.ratio.value=4;source.connect(hp);hp.connect(comp);comp.connect(dest);audioGraph={ac,dest};return audioGraph}catch(err){log('Audio cleanup unavailable: '+err.message);return null}}
function supportedMime(){const list=['video/mp4;codecs=h264,aac','video/mp4','video/webm;codecs=vp9,opus','video/webm;codecs=vp8,opus','video/webm'];for(const mime of list){try{if(window.MediaRecorder&&MediaRecorder.isTypeSupported(mime))return mime}catch(_){}}return ''}
el('renderBtn').onclick=async()=>{if(!file||rendering)return;if(!canvas.captureStream||!window.MediaRecorder){log('Render APIs unavailable in this browser');return}rendering=true;cancelRender=false;el('renderBtn').disabled=true;el('cancelBtn').disabled=false;el('downloadBox').classList.remove('on');const base=Number(el('resolution').value)||720;const d=dims(base);const renderCanvas=document.createElement('canvas');renderCanvas.width=d.w;renderCanvas.height=d.h;const stream=renderCanvas.captureStream(Number(el('fps').value)||30);if(el('cleanupAudio').checked){const graph=buildAudioGraph();if(graph){await graph.ac.resume();for(const track of graph.dest.stream.getAudioTracks())stream.addTrack(track)}}const mime=supportedMime();const chunks=[];let recorder;try{recorder=new MediaRecorder(stream,mime?{mimeType:mime,videoBitsPerSecond:base>=1080?8500000:4500000}:undefined)}catch(err){rendering=false;el('renderBtn').disabled=false;el('cancelBtn').disabled=true;log('Recorder init failed: '+err.message);return}recorder.ondataavailable=e=>{if(e.data&&e.data.size)chunks.push(e.data)};recorder.onstop=()=>{const type=recorder.mimeType||mime||'video/webm';const blob=new Blob(chunks,{type});if(lastBlobUrl)URL.revokeObjectURL(lastBlobUrl);lastBlobUrl=URL.createObjectURL(blob);const ext=type.includes('mp4')?'mp4':'webm';el('downloadLink').href=lastBlobUrl;el('downloadLink').download='atlas-studio-render-'+Date.now()+'.'+ext;el('downloadBox').classList.add('on');el('progress').style.width='100%';rendering=false;el('renderBtn').disabled=false;el('cancelBtn').disabled=true;log('Render complete')};await waitSeek(trimIn);recorder.start(250);await video.play();const duration=Math.max(.01,trimOut-trimIn);const loop=()=>{if(cancelRender||video.currentTime>=trimOut||video.ended){video.pause();if(recorder.state!=='inactive')recorder.stop();return}renderFrame(renderCanvas,video.currentTime);el('progress').style.width=(clamp((video.currentTime-trimIn)/duration,0,1)*100)+'%';requestAnimationFrame(loop)};requestAnimationFrame(loop)};
el('cancelBtn').onclick=()=>{if(rendering)cancelRender=true};
function renderRuntimes(){const models=CONFIG.model||[];el('runtimeGrid').innerHTML=models.map(x=>'<article class="runtime '+(x.configured?'ready':'')+'"><b>'+x.name+'</b><br><span class="tag">'+(x.configured?'CONFIGURED':'REQUIRES '+x.requiredEnv)+'</span></article>').join('')}
renderRuntimes();renderCues();resizePreview();log('ATLAS Studio Production initialized');
</script>
</body>
</html>`;
}

export function handleStudioProduction(request,env={}){
  const u=new URL(request.url);
  const raw=u.pathname;
  const p=raw.length>1&&raw.endsWith('/')?raw.slice(0,-1):raw;
  if(request.method==='OPTIONS')return new Response(null,{status:204,headers:JSON_HEADERS});
  if(p==='/api/studio/production/health'){
    const config=runtimeConfig(env);
    return json({ok:true,service:'atlas-studio-production',mode:config.mode,localProcessing:true,modelRuntimesConfigured:config.model.filter(x=>x.configured).length,modelRuntimesTotal:config.model.length,time:new Date().toISOString()});
  }
  if(p==='/api/studio/production/capabilities'){
    const config=runtimeConfig(env);
    return json({service:'atlas-studio-production',cleanRoom:true,privacy:{localFirst:true,mediaLeavesDeviceByDefault:false},capabilities:CAPABILITIES.map(c=>c.class==='model'?{...c,configured:Boolean(env[c.env])}:c),runtime:config});
  }
  if(p==='/api/studio/production/runtime-status')return json(runtimeConfig(env));
  if((p==='/studio/production'||p.startsWith('/studio/production/'))&&request.method==='GET')return new Response(studioHtml(runtimeConfig(env)),{headers:HTML_HEADERS});
  return null;
}
