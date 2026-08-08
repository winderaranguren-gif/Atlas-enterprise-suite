(()=>{
'use strict';
const KEY='atlas-fleet-intelligence-v1';
const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
const uid=()=>crypto.randomUUID?.()||`${Date.now()}-${Math.random()}`;
const now=()=>new Date().toISOString();
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const fmtTime=v=>v?new Date(v).toLocaleString():'—';
const rnd=(a,b)=>Math.random()*(b-a)+a;

function seed(){
  const t=Date.now();
  return{
    assets:[
      {id:uid(),name:'ATLAS Service Van 01',type:'vehicle',ownership:'owned',plate:'AT-01',project:'Orlando Central',tracker:'OBD-II / GPS',status:'moving',lat:28.5389,lng:-81.3774,speed:36,fuel:68,utilization:74,ignition:true,engineHours:1824,odometer:48320,nextServiceKm:50000,lastSeen:new Date(t-45000).toISOString(),offlineBuffer:true},
      {id:uid(),name:'Excavator EX-204',type:'heavy-equipment',ownership:'rental',plate:'EX-204',project:'Jobsite North',tracker:'Solar GPS + BLE',status:'idle',lat:28.5903,lng:-81.3292,speed:0,fuel:51,utilization:62,ignition:true,engineHours:3110,odometer:0,nextServiceKm:0,lastSeen:new Date(t-92000).toISOString(),offlineBuffer:true},
      {id:uid(),name:'Trailer TR-17',type:'trailer',ownership:'owned',plate:'TR-17',project:'ATLAS Yard',tracker:'Solar GPS',status:'parked',lat:28.4718,lng:-81.4512,speed:0,fuel:0,utilization:28,ignition:false,engineHours:0,odometer:0,nextServiceKm:0,lastSeen:new Date(t-420000).toISOString(),offlineBuffer:true},
      {id:uid(),name:'Generator G-88',type:'equipment',ownership:'owned',plate:'G-88',project:'Jobsite East',tracker:'GPS + BLE reader',status:'offline',lat:28.5632,lng:-81.3050,speed:0,fuel:43,utilization:49,ignition:false,engineHours:940,odometer:0,nextServiceKm:0,lastSeen:new Date(t-14400000).toISOString(),offlineBuffer:true}
    ],
    geofences:[
      {id:uid(),name:'ATLAS Yard',type:'yard',lat:28.4718,lng:-81.4512,radius:900,schedule:'00:00–23:59',action:'assign'},
      {id:uid(),name:'Jobsite North',type:'jobsite',lat:28.5903,lng:-81.3292,radius:1200,schedule:'06:00–20:00',action:'alert'}
    ],
    alerts:[
      {id:uid(),severity:'warning',title:'Activo sin señal',message:'Generator G-88 no reporta telemetría reciente.',createdAt:new Date(t-600000).toISOString()},
      {id:uid(),severity:'info',title:'Geocerca activa',message:'Trailer TR-17 permanece dentro de ATLAS Yard.',createdAt:new Date(t-1200000).toISOString()}
    ],
    routes:[]
  };
}
function load(){try{const x=JSON.parse(localStorage.getItem(KEY));if(x?.assets&&x?.geofences&&x?.alerts)return x}catch{}const s=seed();save(s);return s}
function save(next=state){localStorage.setItem(KEY,JSON.stringify(next))}
let state=load();

function toast(title,detail=''){
  const n=document.createElement('div');n.className='fleet-toast';n.innerHTML=`<strong>${esc(title)}</strong>${detail?`<span>${esc(detail)}</span>`:''}`;$('#fleet-toast-root').append(n);setTimeout(()=>n.remove(),3200);
}
function addAlert(severity,title,message){state.alerts.unshift({id:uid(),severity,title,message,createdAt:now()});state.alerts=state.alerts.slice(0,80)}
function statusText(s){return({moving:'Movimiento',idle:'Ralentí',parked:'Estacionado',offline:'Offline'})[s]||s}
function distanceM(aLat,aLng,bLat,bLng){const R=6371000,p=Math.PI/180,dLat=(bLat-aLat)*p,dLng=(bLng-aLng)*p;const q=Math.sin(dLat/2)**2+Math.cos(aLat*p)*Math.cos(bLat*p)*Math.sin(dLng/2)**2;return 2*R*Math.asin(Math.sqrt(q))}
function inside(asset,g){return distanceM(+asset.lat,+asset.lng,+g.lat,+g.lng)<=+g.radius}
function siteFor(asset){const g=state.geofences.find(z=>inside(asset,z));return g?.name||asset.project||'Fuera de sitio'}
function timeAgo(v){const s=Math.max(0,(Date.now()-new Date(v))/1000);if(s<60)return`${Math.round(s)}s`;if(s<3600)return`${Math.round(s/60)}m`;if(s<86400)return`${Math.round(s/3600)}h`;return`${Math.round(s/86400)}d`}

function kpis(){
  const a=state.assets,m=a.filter(x=>x.status==='moving').length,o=a.filter(x=>x.status==='offline').length,avg=a.length?a.reduce((n,x)=>n+(+x.utilization||0),0)/a.length:0,f=a.filter(x=>+x.fuel>0),fuel=f.length?f.reduce((n,x)=>n+(+x.fuel||0),0)/f.length:0;
  const due=a.filter(x=>x.odometer&&x.nextServiceKm&&x.nextServiceKm-x.odometer<=1500).length;
  $('#fleet-kpis').innerHTML=[['Activos',a.length,'Flota mixta'],['En movimiento',m,'Live'],['Offline',o,'Revisar señal'],['Utilización',`${avg.toFixed(0)}%`,'Promedio'],['Combustible',`${fuel.toFixed(0)}%`,'Promedio'],['Servicio próximo',due,'≤ 1,500 km']].map(x=>`<article class="fleet-kpi"><span>${x[0]}</span><strong>${x[1]}</strong><small>${x[2]}</small></article>`).join('');
}
function map(){
  const filter=$('#fleet-status-filter').value;
  const assets=state.assets.filter(a=>filter==='all'||a.status===filter);
  const lats=state.assets.map(x=>+x.lat),lngs=state.assets.map(x=>+x.lng);const minLat=Math.min(...lats)-.02,maxLat=Math.max(...lats)+.02,minLng=Math.min(...lngs)-.02,maxLng=Math.max(...lngs)+.02;
  const pos=a=>({x:clamp((+a.lng-minLng)/(maxLng-minLng)*86+7,6,94),y:clamp((maxLat-+a.lat)/(maxLat-minLat)*82+9,7,93)});
  const roads=Array.from({length:7},(_,i)=>`<i class="fleet-map-road" style="left:${-5+i*14}%;top:${14+i*11}%;width:130%;transform:rotate(${i%2?7:-8}deg)"></i>`).join('');
  const zones=state.geofences.map(g=>{const p=pos(g);return`<div title="${esc(g.name)}" style="position:absolute;left:${p.x}%;top:${p.y}%;width:90px;height:90px;transform:translate(-50%,-50%);border:1px dashed rgba(84,228,232,.26);border-radius:50%;pointer-events:none"><span style="position:absolute;left:50%;top:-18px;transform:translateX(-50%);font-size:10px;color:#6f98aa;white-space:nowrap">${esc(g.name)}</span></div>`}).join('');
  const pins=assets.map(a=>{const p=pos(a);return`<button class="fleet-marker ${a.status}" style="left:${p.x}%;top:${p.y}%" data-focus="${a.id}"><span class="fleet-marker-pin">${a.type.startsWith('vehicle')?'V':'A'}</span><span class="fleet-marker-label"><strong>${esc(a.name)}</strong><small>${esc(siteFor(a))} · ${Math.round(+a.speed||0)} mph</small></span></button>`}).join('');
  $('#fleet-map').innerHTML=roads+zones+pins;
  $$('[data-focus]').forEach(b=>b.onclick=()=>assetModal(b.dataset.focus));
}
function alerts(){
  $('#fleet-alerts').innerHTML=state.alerts.map(a=>`<article class="fleet-alert ${a.severity}"><strong>${esc(a.title)}</strong><p>${esc(a.message)}</p><time>${fmtTime(a.createdAt)}</time></article>`).join('')||'<div class="fleet-empty">Sin alertas activas.</div>';
}
function assets(){
  const q=$('#fleet-search').value.toLowerCase();
  const rows=state.assets.filter(a=>JSON.stringify(a).toLowerCase().includes(q));
  $('#fleet-assets-body').innerHTML=rows.map(a=>`<tr><td class="fleet-asset-name"><strong>${esc(a.name)}</strong><small>${esc(a.plate||'Sin placa')} · ${esc(a.ownership)}</small></td><td>${esc(a.type)}</td><td><span class="fleet-status ${a.status}">${statusText(a.status)}</span></td><td>${esc(siteFor(a))}</td><td>${Math.round(+a.speed||0)} mph</td><td>${+a.fuel?`${Math.round(a.fuel)}%`:'—'}</td><td>${Math.round(+a.utilization||0)}%</td><td>${esc(a.tracker)}</td><td>${timeAgo(a.lastSeen)}</td><td><div class="fleet-actions-row"><button class="button small ghost" data-edit-asset="${a.id}">Editar</button><button class="button small danger" data-delete-asset="${a.id}">×</button></div></td></tr>`).join('')||'<tr><td colspan="10" class="fleet-empty">No hay activos.</td></tr>';
  $$('[data-edit-asset]').forEach(b=>b.onclick=()=>assetModal(b.dataset.editAsset));
  $$('[data-delete-asset]').forEach(b=>b.onclick=()=>{if(!confirm('¿Eliminar este activo?'))return;state.assets=state.assets.filter(x=>x.id!==b.dataset.deleteAsset);save();render();toast('Activo eliminado')});
}
function geofences(){
  $('#fleet-geofence-list').innerHTML=state.geofences.map(g=>`<div class="fleet-card-row"><div><strong>${esc(g.name)}</strong><small>${esc(g.type)} · ${Math.round(g.radius)} m · ${esc(g.schedule)}</small></div><button class="button small danger" data-delete-geofence="${g.id}">Eliminar</button></div>`).join('')||'<div class="fleet-empty">No hay geocercas.</div>';
  $$('[data-delete-geofence]').forEach(b=>b.onclick=()=>{state.geofences=state.geofences.filter(x=>x.id!==b.dataset.deleteGeofence);save();render();toast('Geocerca eliminada')});
}
function maintenance(){
  $('#fleet-maintenance-cards').innerHTML=state.assets.map(a=>{let remain=null,pct=0;if(a.odometer&&a.nextServiceKm){remain=Math.max(0,a.nextServiceKm-a.odometer);pct=clamp(100-remain/5000*100,0,100)}const label=remain===null?'Servicio por horas / inspección':remain===0?'Servicio requerido':`${remain.toLocaleString()} km restantes`;return`<article class="fleet-panel fleet-maintenance-card"><p class="eyebrow">${esc(a.type)}</p><h3>${esc(a.name)}</h3><p>${label}. Motor: ${Math.round(+a.engineHours||0).toLocaleString()} h. Combustible: ${+a.fuel?Math.round(a.fuel)+'%':'N/A'}.</p><div class="meter"><span style="width:${pct}%"></span></div><button class="button small ghost" data-maintenance="${a.id}">Registrar inspección</button></article>`}).join('');
  $$('[data-maintenance]').forEach(b=>b.onclick=()=>{const a=state.assets.find(x=>x.id===b.dataset.maintenance);addAlert('info','Inspección registrada',`${a.name}: revisión preventiva registrada en ATLAS.`);save();render();toast('Inspección registrada')});
}
function routeSelect(){
  const sel=$('#fleet-route-asset');const prior=sel.value;sel.innerHTML=state.assets.map(a=>`<option value="${a.id}">${esc(a.name)}</option>`).join('');if(state.assets.some(a=>a.id===prior))sel.value=prior;routes();
}
function routes(){
  const id=$('#fleet-route-asset').value||state.assets[0]?.id;const a=state.assets.find(x=>x.id===id);if(!a){$('#fleet-route-timeline').innerHTML='<div class="fleet-empty">Sin historial.</div>';return}
  const own=state.routes.filter(r=>r.assetId===a.id).slice(0,40);const fallback=[{createdAt:a.lastSeen,title:'Última posición recibida',detail:`${a.lat.toFixed(4)}, ${a.lng.toFixed(4)} · ${siteFor(a)}`},{createdAt:new Date(Date.now()-3600000).toISOString(),title:'Estado operacional',detail:`${statusText(a.status)} · ignición ${a.ignition?'ON':'OFF'}`},{createdAt:new Date(Date.now()-7200000).toISOString(),title:'Utilización',detail:`${Math.round(a.utilization)}% · ${Math.round(a.engineHours)} h acumuladas`}];
  $('#fleet-route-timeline').innerHTML=(own.length?own:fallback).map(r=>`<div class="fleet-route-event"><time>${fmtTime(r.createdAt)}</time><i></i><div><strong>${esc(r.title)}</strong><small>${esc(r.detail)}</small></div></div>`).join('');
}
function tabs(){
  $$('.fleet-tab').forEach(b=>b.onclick=()=>{$$('.fleet-tab').forEach(x=>x.classList.remove('active'));$$('.fleet-tab-panel').forEach(x=>x.classList.remove('active'));b.classList.add('active');$(`#fleet-tab-${b.dataset.tab}`).classList.add('active')});
}
function render(){kpis();map();alerts();assets();geofences();maintenance();routeSelect()}

function assetModal(id){
  const a=id?state.assets.find(x=>x.id===id):null,m=document.createElement('div');m.className='fleet-modal-backdrop';m.innerHTML=`<form class="fleet-modal"><div class="fleet-modal-head"><div><p class="eyebrow">ASSET PROFILE</p><h2>${a?'Editar activo':'Nuevo activo'}</h2></div><button type="button" class="fleet-close">×</button></div><div class="fleet-modal-body"><div class="fleet-form-grid">
    <label>Nombre<input name="name" required value="${esc(a?.name||'')}" /></label><label>Tipo<select name="type">${['vehicle','heavy-equipment','equipment','trailer','tool'].map(x=>`<option ${a?.type===x?'selected':''}>${x}</option>`).join('')}</select></label>
    <label>Propiedad<select name="ownership">${['owned','rental','leased'].map(x=>`<option ${a?.ownership===x?'selected':''}>${x}</option>`).join('')}</select></label><label>Placa / ID<input name="plate" value="${esc(a?.plate||'')}" /></label>
    <label>Proyecto / sitio<input name="project" value="${esc(a?.project||'')}" /></label><label>Tracker<input name="tracker" value="${esc(a?.tracker||'GPS')}" /></label>
    <label>Estado<select name="status">${['moving','idle','parked','offline'].map(x=>`<option ${a?.status===x?'selected':''} value="${x}">${statusText(x)}</option>`).join('')}</select></label><label>Velocidad mph<input name="speed" type="number" min="0" value="${a?.speed??0}" /></label>
    <label>Latitud<input name="lat" type="number" step="0.000001" required value="${a?.lat??28.5383}" /></label><label>Longitud<input name="lng" type="number" step="0.000001" required value="${a?.lng??-81.3792}" /></label>
    <label>Combustible %<input name="fuel" type="number" min="0" max="100" value="${a?.fuel??0}" /></label><label>Utilización %<input name="utilization" type="number" min="0" max="100" value="${a?.utilization??0}" /></label>
    <label>Horas motor<input name="engineHours" type="number" min="0" step="0.1" value="${a?.engineHours??0}" /></label><label>Odómetro km<input name="odometer" type="number" min="0" value="${a?.odometer??0}" /></label>
    <label>Próximo servicio km<input name="nextServiceKm" type="number" min="0" value="${a?.nextServiceKm??0}" /></label><label>Ignición<select name="ignition"><option value="true" ${a?.ignition?'selected':''}>ON</option><option value="false" ${a&&!a.ignition?'selected':''}>OFF</option></select></label>
  </div></div><div class="fleet-modal-foot"><button type="button" class="button ghost fleet-cancel">Cancelar</button><button class="button primary">Guardar activo</button></div></form>`;
  $('#fleet-modal-root').append(m);const close=()=>m.remove();$('.fleet-close',m).onclick=close;$('.fleet-cancel',m).onclick=close;m.onclick=e=>{if(e.target===m)close()};$('form',m).onsubmit=e=>{e.preventDefault();const f=new FormData(e.currentTarget);const obj={...(a||{}),id:a?.id||uid(),name:String(f.get('name')).trim(),type:String(f.get('type')),ownership:String(f.get('ownership')),plate:String(f.get('plate')).trim(),project:String(f.get('project')).trim(),tracker:String(f.get('tracker')).trim(),status:String(f.get('status')),speed:+f.get('speed')||0,lat:+f.get('lat'),lng:+f.get('lng'),fuel:+f.get('fuel')||0,utilization:+f.get('utilization')||0,engineHours:+f.get('engineHours')||0,odometer:+f.get('odometer')||0,nextServiceKm:+f.get('nextServiceKm')||0,ignition:f.get('ignition')==='true',lastSeen:now(),offlineBuffer:true};if(a)state.assets[state.assets.findIndex(x=>x.id===a.id)]=obj;else state.assets.unshift(obj);state.routes.unshift({assetId:obj.id,createdAt:now(),title:a?'Perfil actualizado':'Activo registrado',detail:`${obj.lat.toFixed(4)}, ${obj.lng.toFixed(4)} · ${statusText(obj.status)}`});save();close();render();toast('Activo guardado',obj.name)};
}
function simulate(){
  for(const a of state.assets){const previous=state.geofences.filter(g=>inside(a,g)).map(g=>g.id);if(a.status!=='offline'){a.lat+=rnd(-.006,.006);a.lng+=rnd(-.006,.006);a.speed=a.status==='moving'?clamp(a.speed+rnd(-8,8),4,72):a.status==='idle'?0:0;a.fuel=clamp(a.fuel-rnd(0,.8),0,100);a.utilization=clamp(a.utilization+rnd(-2,2),0,100);a.engineHours+=a.ignition?.03:0;a.odometer+=a.status==='moving'?Math.max(1,a.speed*.03):0;a.lastSeen=now()}const current=state.geofences.filter(g=>inside(a,g)).map(g=>g.id);for(const g of state.geofences){if(!previous.includes(g.id)&&current.includes(g.id)){addAlert('info','Entrada a geocerca',`${a.name} entró en ${g.name}.`);state.routes.unshift({assetId:a.id,createdAt:now(),title:'Entrada a geocerca',detail:g.name})}if(previous.includes(g.id)&&!current.includes(g.id)){addAlert(g.action==='security'?'critical':'warning','Salida de geocerca',`${a.name} salió de ${g.name}.`);state.routes.unshift({assetId:a.id,createdAt:now(),title:'Salida de geocerca',detail:g.name})}}}
  save();render();toast('Telemetría actualizada','Se procesaron ubicación, combustible, utilización y geocercas.')
}
function exportJson(){const blob=new Blob([JSON.stringify({version:1,exportedAt:now(),state},null,2)],{type:'application/json'});download(blob,`atlas-fleet-${new Date().toISOString().slice(0,10)}.json`)}
function exportCsv(){const cols=['name','type','ownership','plate','project','status','lat','lng','speed','fuel','utilization','tracker','lastSeen'];const q=v=>`"${String(v??'').replace(/"/g,'""')}"`;const txt=[cols.join(','),...state.assets.map(a=>cols.map(c=>q(a[c])).join(','))].join('\n');download(new Blob(['\ufeff'+txt],{type:'text/csv'}),'atlas-fleet-assets.csv')}
function download(blob,name){const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)}

function bind(){
  $('#fleet-add-asset').onclick=()=>assetModal();$('#fleet-add-asset-2').onclick=()=>assetModal();$('#fleet-status-filter').onchange=map;$('#fleet-simulate').onclick=simulate;$('#fleet-search').oninput=assets;$('#fleet-export').onclick=exportJson;$('#fleet-export-csv').onclick=exportCsv;$('#fleet-clear-alerts').onclick=()=>{state.alerts=[];save();alerts();toast('Alertas limpiadas')};$('#fleet-route-asset').onchange=routes;
  $('#fleet-geofence-form').onsubmit=e=>{e.preventDefault();const f=new FormData(e.currentTarget),g={id:uid(),name:String(f.get('name')).trim(),type:String(f.get('type')),lat:+f.get('lat'),lng:+f.get('lng'),radius:+f.get('radius'),schedule:String(f.get('schedule')).trim(),action:String(f.get('action'))};state.geofences.unshift(g);addAlert('info','Geocerca creada',`${g.name}: radio ${g.radius} m.`);save();e.currentTarget.reset();e.currentTarget.elements.radius.value=500;e.currentTarget.elements.schedule.value='06:00–20:00';render();toast('Geocerca creada',g.name)};
  tabs();
}
bind();render();
})();
