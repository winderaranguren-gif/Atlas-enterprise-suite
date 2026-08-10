const state={config:null,view:'home',region:localStorage.getItem('atlas.region')||'north-america'};
const titles={
  home:['Command Center','Secure clean foundation with ATLAS-owned core services.'],
  repertoire:['ATLAS Repertoire','The complete living product universe, organized and editable from inside ATLAS.'],
  services:['Core Services','Data, events, identity boundaries, intelligence, agents and work execution in one shared core.'],
  modules:['Module Center','One global core. Capabilities load from a controlled module registry.'],
  music:['ATLAS Music','Provider-independent ATLAS Originals with optional server-side adapters.'],
  regions:['Regional Layer','Regional behavior changes by configuration, not disconnected application forks.'],
  support:['Technical Support','Diagnostics prioritize safe, reversible actions and exact blocker reporting.'],
  settings:['Settings','Local preferences and environment-safe controls.']
};
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
function card(title,body,tag='ATLAS',extra=''){return `<article class="card"><h3>${esc(title)}</h3><p>${esc(body)}</p><span class="tag">${esc(tag)}</span>${extra}</article>`}
function serviceLabel(service){return String(service?.status||'unknown').toUpperCase();}
function bindMusic(){document.querySelectorAll('[data-track]').forEach(btn=>btn.addEventListener('click',()=>{try{window.ATLASMusicCore.play(btn.dataset.track,{duration:18});btn.textContent='Playing';setTimeout(()=>{btn.textContent='Play original'},1800);}catch(error){btn.textContent=error.message;}}));document.querySelector('#stop-music')?.addEventListener('click',()=>window.ATLASMusicCore.stop());}
async function render(){
  const [title,sub]=titles[state.view];document.querySelector('#viewTitle').textContent=title;document.querySelector('#viewSubtitle').textContent=sub;const root=document.querySelector('#content');
  const services=state.config.services||{};
  if(state.view==='repertoire'){
    root.className='repertoire-surface';
    try{await window.ATLASRepertoire.load();window.ATLASRepertoire.render(root)}catch(error){root.innerHTML=card('Repertoire unavailable',error.message,'Needs attention')}
    return;
  }
  root.className='grid';
  if(state.view==='home'){
    const green=Object.values(services).filter(s=>['active','verified','ready'].includes(s.status)).length;
    root.innerHTML=[
      `<article class="card hero-card"><div class="metric">${state.config.modules.length}</div><h3>Registered production modules</h3><p>Current clean-core registry. Open Repertoire for the full ATLAS product universe.</p><button class="action" id="openRepertoire">Explore ATLAS</button></article>`,
      `<article class="card"><div class="metric">${green}</div><h3>Core services ready</h3><p>Active, backend-verified, or adapter-ready services in the secure clean foundation.</p></article>`,
      card('Update Fabric','Validated releases can now propagate to the web/PWA shell without replacing the permanent ATLAS installation.','AUTO UPDATE'),
      card('Data + Event Fabric','Backend-verified data boundary plus ATLAS-native event runtime.',`${serviceLabel(services.dataFabric)} / ${serviceLabel(services.eventFabric)}`),
      card('Identity boundary','Verified backend; authenticated account access attaches through a same-origin adapter.',serviceLabel(services.identity)),
      card('Intelligence + Agents','ATLAS-native rules, skills, policy gates and provider-independent orchestration.',`${serviceLabel(services.intelligence)} / ${serviceLabel(services.agentFabric)}`),
      card('Work Graph','Projects, work units, dependencies, evidence and execution planning.',serviceLabel(services.workGraph)),
      card('ATLAS Music','Six ATLAS Originals can play without a commercial catalog provider.',serviceLabel(services.music)),
      card('Architecture',state.config.architecture,'Global Core'),
      card('Current region',state.region,'Runtime context')
    ].join('');
    document.querySelector('#openRepertoire')?.addEventListener('click',()=>document.querySelector('[data-view="repertoire"]')?.click());
  }else if(state.view==='services'){
    const runtime=window.ATLASCoreServices?.inspect?.()||{};
    root.innerHTML=Object.entries(services).map(([key,value])=>card(key,`Mode: ${value.mode}. Runtime: ${JSON.stringify(runtime[key]||{})}`,serviceLabel(value))).join('');
  }else if(state.view==='modules'){
    root.innerHTML=state.config.modules.map((m,i)=>card(m,'Registered capability in the ATLAS v1.1 secure clean foundation.',`Module ${String(i+1).padStart(2,'0')}`)).join('');
  }else if(state.view==='music'){
    const tracks=window.ATLASMusicCore?.catalog?.()||[];
    root.innerHTML=tracks.map(track=>card(track.title,`${track.mood} · ${track.bpm} BPM · ATLAS-owned playback and video-sync rights.`,'ATLAS Original',`<button class="action" data-track="${esc(track.id)}">Play original</button>`)).join('')+`<article class="card"><h3>Playback control</h3><p>Generated locally with Web Audio. No commercial track is downloaded or mirrored.</p><span class="tag">Provider independent</span><button class="action" id="stop-music">Stop</button></article>`;
    bindMusic();
  }else if(state.view==='regions'){
    root.innerHTML=state.config.regions.map(r=>card(r,'Regional configuration layer; shared application core remains unchanged.',r===state.region?'Active':'Available')).join('');
  }else if(state.view==='support'){
    root.innerHTML=[card('Diagnostics','Check configuration, runtime state, module registry and deployment boundary before repair.','Safe-first'),card('Agent routing','Agent Fabric can plan work through technical support, deployment, security, knowledge, accounting, HR and IoT skills.','Policy-gated'),card('Escalation','Report the exact blocker when credentials, permissions or external infrastructure are required.','Transparent')].join('');
  }else{
    root.innerHTML=[card('Region preference',state.region,'Local setting'),card('Interface editing','ATLAS Design Studio preferences are available from Repertoire and persist locally.','Editable'),card('Data boundary','Only UI preferences and bounded session runtime state live in the browser. Production secrets are never embedded in the client.','Security'),card('Integration gateway','External services attach through same-origin adapters and remain disconnected until an authorized health check succeeds.',serviceLabel(services.integrations)),card('Contact',state.config.contact,'Operations')].join('');
  }
}
async function boot(){
  const res=await fetch('/atlas.config.json',{cache:'no-store'});if(!res.ok)throw new Error('ATLAS configuration could not be loaded');state.config=await res.json();
  window.ATLASCoreServices?.configure?.(state.config);
  const select=document.querySelector('#region');select.innerHTML=state.config.regions.map(r=>`<option value="${esc(r)}">${esc(r)}</option>`).join('');if(!state.config.regions.includes(state.region))state.region=state.config.defaultRegion;select.value=state.region;
  select.addEventListener('change',e=>{state.region=e.target.value;localStorage.setItem('atlas.region',state.region);window.dispatchEvent(new CustomEvent('atlas:region-changed',{detail:{region:state.region}}));render()});
  document.querySelectorAll('.nav').forEach(btn=>btn.addEventListener('click',()=>{document.querySelectorAll('.nav').forEach(x=>x.classList.remove('active'));btn.classList.add('active');state.view=btn.dataset.view;render()}));
  await render();if('serviceWorker'in navigator)navigator.serviceWorker.register('/sw.js').catch(()=>{});setInterval(()=>{const el=document.querySelector('#clock');if(el)el.textContent=new Date().toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'});},1000);
}
boot().catch(err=>{document.querySelector('#content').innerHTML=card('Startup error',err.message,'Needs attention')});
