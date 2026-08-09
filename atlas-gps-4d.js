(()=>{
'use strict';

const $=id=>document.getElementById(id);
const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
const MAX_ROUTE_POINTS=5000;
const MAX_DESTINATION_CHARS=200;
const state={language:localStorage.getItem('atlas-gps-language')==='en'?'en':'es',position:null,watchId:null,stream:null,route:[],destination:'',provider:null};

const copy={
  es:{
    heroTitle:'Navegación funcional aun cuando el proveedor planetario no esté conectado.',
    heroCopy:'ATLAS mantiene un núcleo local para ubicación, vista de ruta y privacidad. Cuando existe un proveedor autorizado, puede elevar la vista previa a enrutamiento real sin cambiar la experiencia del usuario.',
    privacyBadge:'Sin historial de ubicación · cámara apagada por defecto',mapTitle:'Vista de navegación',controlTitle:'Control de ruta',destination:'Destino',placeholder:'Ej. Orlando International Airport',prepare:'Preparar ruta',location:'Usar mi ubicación',demo:'Ruta demo',cameraOn:'Activar cámara',cameraOff:'Apagar cámara',stop:'Detener',provider:'Proveedor',providerDetail:'Sin dependencia externa obligatoria. Los proveedores reales se registran mediante la API ATLAS GPS.',cameraTitle:'Vista de cámara',cameraDisabled:'Cámara desactivada',cameraCopy:'ATLAS no solicita acceso hasta que lo actives.',privacyTitle:'Privacidad y estado',privacyLocation:'Historial de ubicación',privacyCamera:'Carga de cámara',privacyStorage:'Persistencia de ruta',privacyProvider:'Proveedor externo',clear:'Borrar sesión local',footer:'La navegación local es una vista de apoyo; la conducción real siempre debe seguir señales, leyes y condiciones de la vía.',noLocation:'SIN UBICACIÓN',locationActive:'UBICACIÓN ACTIVA',cameraOffState:'APAGADA',cameraOnState:'ACTIVA',localReady:'Ruta local lista',localDetail:'Activa ubicación o usa una demostración para iniciar.',routeReady:'Vista previa preparada',routeNeedDestination:'Escribe un destino para preparar la ruta.',permissionDenied:'No se obtuvo permiso de ubicación.',cameraDenied:'No se obtuvo permiso de cámara.',providerRoute:'Ruta del proveedor',localPreview:'Vista previa local',speed:'VELOCIDAD',heading:'RUMBO',accuracy:'PRECISIÓN'
  },
  en:{
    heroTitle:'Navigation remains functional even when the planetary provider is not connected.',
    heroCopy:'ATLAS keeps a local core for location, route preview and privacy. When an authorized provider exists, the same interface can elevate to real routing without rebuilding the experience.',
    privacyBadge:'No location history · camera off by default',mapTitle:'Navigation view',controlTitle:'Route control',destination:'Destination',placeholder:'E.g. Orlando International Airport',prepare:'Prepare route',location:'Use my location',demo:'Demo route',cameraOn:'Enable camera',cameraOff:'Turn camera off',stop:'Stop',provider:'Provider',providerDetail:'No mandatory external dependency. Real providers register through the ATLAS GPS API.',cameraTitle:'Camera view',cameraDisabled:'Camera disabled',cameraCopy:'ATLAS does not request access until you enable it.',privacyTitle:'Privacy and status',privacyLocation:'Location history',privacyCamera:'Camera upload',privacyStorage:'Route persistence',privacyProvider:'External provider',clear:'Clear local session',footer:'Local navigation is an assistance view; real driving must always follow road signs, laws and current conditions.',noLocation:'NO LOCATION',locationActive:'LOCATION ACTIVE',cameraOffState:'OFF',cameraOnState:'ACTIVE',localReady:'Local route ready',localDetail:'Enable location or use a demo route to begin.',routeReady:'Route preview prepared',routeNeedDestination:'Enter a destination to prepare a route.',permissionDenied:'Location permission was not granted.',cameraDenied:'Camera permission was not granted.',providerRoute:'Provider route',localPreview:'Local preview',speed:'SPEED',heading:'HEADING',accuracy:'ACCURACY'
  }
};
const c=()=>copy[state.language];

function normalizeGeometry(geometry){
  if(!Array.isArray(geometry))return [];
  const normalized=[];
  for(const point of geometry.slice(0,MAX_ROUTE_POINTS)){
    if(!Array.isArray(point)||point.length<2)continue;
    const lon=Number(point[0]),lat=Number(point[1]);
    if(!Number.isFinite(lon)||!Number.isFinite(lat)||lon < -180||lon > 180||lat < -90||lat > 90)continue;
    normalized.push([lon,lat]);
  }
  return normalized;
}

function applyLanguage(){
  const t=c();
  document.documentElement.lang=state.language;
  $('language-btn').textContent=state.language==='es'?'EN':'ES';
  $('language-btn').setAttribute('aria-label',state.language==='es'?'Cambiar idioma a inglés':'Switch language to Spanish');
  $('hero-title').textContent=t.heroTitle;$('hero-copy').textContent=t.heroCopy;$('privacy-badge-copy').textContent=t.privacyBadge;
  $('map-title').textContent=t.mapTitle;$('control-title').textContent=t.controlTitle;$('destination-label').textContent=t.destination;$('destination-input').placeholder=t.placeholder;$('route-button').textContent=t.prepare;
  $('location-button').textContent=t.location;$('demo-button').textContent=t.demo;$('camera-button').textContent=state.stream?t.cameraOff:t.cameraOn;$('stop-button').textContent=t.stop;
  $('provider-label').textContent=t.provider;$('provider-detail').textContent=t.providerDetail;$('camera-title').textContent=t.cameraTitle;$('camera-placeholder-title').textContent=t.cameraDisabled;$('camera-placeholder-copy').textContent=t.cameraCopy;
  $('privacy-title').textContent=t.privacyTitle;$('privacy-location').textContent=t.privacyLocation;$('privacy-camera').textContent=t.privacyCamera;$('privacy-storage').textContent=t.privacyStorage;$('privacy-provider').textContent=t.privacyProvider;$('clear-session-button').textContent=t.clear;$('footer-copy').textContent=t.footer;
  $('speed-label').textContent=t.speed;$('heading-label').textContent=t.heading;$('accuracy-label').textContent=t.accuracy;
  $('location-status').textContent=state.position?t.locationActive:t.noLocation;$('camera-status').textContent=state.stream?t.cameraOnState:t.cameraOffState;
  if(!state.route.length){$('route-title').textContent=t.localReady;$('route-detail').textContent=t.localDetail;}
}

function resizeCanvas(){
  const canvas=$('gps-canvas');
  const rect=canvas.getBoundingClientRect();
  const ratio=Math.min(window.devicePixelRatio||1,2);
  const width=Math.max(640,Math.round(rect.width*ratio));
  const height=Math.max(360,Math.round(width*9/16));
  if(canvas.width!==width||canvas.height!==height){canvas.width=width;canvas.height=height;}
  draw();
}

function project(points,w,h){
  if(!points.length)return [];
  const lons=points.map(p=>p[0]),lats=points.map(p=>p[1]);
  let minX=Math.min(...lons),maxX=Math.max(...lons),minY=Math.min(...lats),maxY=Math.max(...lats);
  if(maxX-minX<.01){minX-=.01;maxX+=.01}if(maxY-minY<.01){minY-=.01;maxY+=.01}
  const pad=Math.min(w,h)*.14;
  return points.map(([lon,lat])=>[pad+(lon-minX)/(maxX-minX)*(w-pad*2),h-pad-(lat-minY)/(maxY-minY)*(h-pad*2)]);
}

function draw(){
  const canvas=$('gps-canvas'),ctx=canvas.getContext('2d'),w=canvas.width,h=canvas.height;
  const bg=ctx.createLinearGradient(0,0,w,h);bg.addColorStop(0,'#061725');bg.addColorStop(1,'#020b13');ctx.fillStyle=bg;ctx.fillRect(0,0,w,h);
  ctx.strokeStyle='rgba(72,164,199,.12)';ctx.lineWidth=1;
  for(let x=0;x<w;x+=Math.max(48,w/16)){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,h);ctx.stroke()}
  for(let y=0;y<h;y+=Math.max(48,h/9)){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(w,y);ctx.stroke()}
  const pts=project(state.route,w,h);
  if(pts.length>1){
    ctx.lineCap='round';ctx.lineJoin='round';ctx.strokeStyle='rgba(50,221,255,.22)';ctx.lineWidth=Math.max(12,w*.012);ctx.beginPath();pts.forEach((p,i)=>i?ctx.lineTo(...p):ctx.moveTo(...p));ctx.stroke();
    ctx.strokeStyle='#32ddff';ctx.lineWidth=Math.max(3,w*.0035);ctx.beginPath();pts.forEach((p,i)=>i?ctx.lineTo(...p):ctx.moveTo(...p));ctx.stroke();
    const start=pts[0],end=pts.at(-1);for(const [p,color] of [[start,'#6ef5c0'],[end,'#ffd166']]){ctx.fillStyle=color;ctx.beginPath();ctx.arc(p[0],p[1],Math.max(8,w*.008),0,Math.PI*2);ctx.fill()}
  }else{
    ctx.fillStyle='rgba(238,250,255,.72)';ctx.font=`${Math.max(20,w*.025)}px system-ui`;ctx.textAlign='center';ctx.fillText('ATLAS GPS 4D',w/2,h/2-10);ctx.fillStyle='rgba(136,169,188,.8)';ctx.font=`${Math.max(12,w*.012)}px system-ui`;ctx.fillText('LOCAL-FIRST SPATIAL CORE',w/2,h/2+22);
  }
}

function localRoute(origin=null){
  const base=origin||[-81.3792,28.5383];
  return [[base[0],base[1]],[base[0]+.018,base[1]+.007],[base[0]+.041,base[1]+.015],[base[0]+.064,base[1]+.008],[base[0]+.083,base[1]+.027]];
}

function updatePosition(position){
  const coords=position.coords;
  state.position=[coords.longitude,coords.latitude];
  $('location-status').textContent=c().locationActive;
  $('speed-value').textContent=Number.isFinite(coords.speed)?Math.round(coords.speed*2.23694):'0';
  $('heading-value').textContent=Number.isFinite(coords.heading)?Math.round(coords.heading):'—';
  $('accuracy-value').textContent=Number.isFinite(coords.accuracy)?Math.round(coords.accuracy):'—';
  if(!state.route.length){state.route=localRoute(state.position);draw();}
}

function enableLocation(){
  if(!navigator.geolocation){$('route-detail').textContent=c().permissionDenied;return}
  if(state.watchId!==null)return;
  const id=navigator.geolocation.watchPosition(updatePosition,error=>{if(error?.code===1&&state.watchId===id)state.watchId=null;$('route-detail').textContent=error?.message||c().permissionDenied;},{enableHighAccuracy:true,maximumAge:3000,timeout:10000});
  state.watchId=id;
}

function stopLocation(){if(state.watchId!==null&&navigator.geolocation){navigator.geolocation.clearWatch(state.watchId);state.watchId=null}state.position=null;$('location-status').textContent=c().noLocation;$('speed-value').textContent='0';$('heading-value').textContent='—';$('accuracy-value').textContent='—';}

async function toggleCamera(){
  if(state.stream){state.stream.getTracks().forEach(track=>track.stop());state.stream=null;$('road-camera').srcObject=null;$('camera-placeholder').hidden=false;$('camera-status').textContent=c().cameraOffState;$('camera-button').textContent=c().cameraOn;return}
  if(!navigator.mediaDevices?.getUserMedia){$('camera-placeholder-copy').textContent=c().cameraDenied;return}
  try{
    state.stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'}},audio:false});
    $('road-camera').srcObject=state.stream;$('camera-placeholder').hidden=true;$('camera-status').textContent=c().cameraOnState;$('camera-button').textContent=c().cameraOff;
  }catch(error){$('camera-placeholder-copy').textContent=error?.message||c().cameraDenied;}
}

async function prepareRoute(destination){
  state.destination=String(destination||'').trim().slice(0,MAX_DESTINATION_CHARS);
  if(!state.destination){$('route-title').textContent=c().routeNeedDestination;return}
  if(state.provider?.route){
    try{
      const result=await state.provider.route({origin:state.position,destination:state.destination,language:state.language});
      const geometry=normalizeGeometry(result?.geometry);
      if(geometry.length>1){state.route=geometry;$('route-title').textContent=c().providerRoute;$('route-detail').textContent=String(result?.summary||state.destination).slice(0,500);draw();return}
    }catch(error){$('route-detail').textContent=`${state.provider.name||'Provider'}: ${error?.message||error}`.slice(0,500);}
  }
  state.route=localRoute(state.position);$('route-title').textContent=c().localPreview;$('route-detail').textContent=state.destination;draw();
}

function demoRoute(){state.route=[[-81.469,28.431],[-81.432,28.448],[-81.405,28.472],[-81.386,28.51],[-81.379,28.538]];$('route-title').textContent=c().localPreview;$('route-detail').textContent='MCO → Orlando';draw();}

function registerProvider(provider){
  if(!provider||typeof provider!=='object'||typeof provider.route!=='function')throw new TypeError('ATLAS GPS provider requires a route() function.');
  state.provider=provider;$('provider-pill').textContent='PROVIDER READY';$('provider-name').textContent=String(provider.name||'ATLAS GPS Provider').slice(0,120);$('external-provider-state').textContent='READY';window.dispatchEvent(new CustomEvent('atlas:gps:provider-ready',{detail:{name:String(provider.name||'provider').slice(0,120)}}));return()=>{state.provider=null;$('provider-pill').textContent='LOCAL CORE';$('provider-name').textContent='ATLAS Local Core';$('external-provider-state').textContent='NONE';};
}

function clearSession(){stopLocation();if(state.stream){state.stream.getTracks().forEach(track=>track.stop());state.stream=null;$('road-camera').srcObject=null}$('camera-placeholder').hidden=false;state.route=[];state.destination='';$('destination-input').value='';$('camera-status').textContent=c().cameraOffState;$('camera-button').textContent=c().cameraOn;$('route-title').textContent=c().localReady;$('route-detail').textContent=c().localDetail;draw();}

$('route-form').addEventListener('submit',event=>{event.preventDefault();prepareRoute($('destination-input').value).catch(()=>{})});
$('location-button').addEventListener('click',enableLocation);$('demo-button').addEventListener('click',demoRoute);$('camera-button').addEventListener('click',()=>toggleCamera());$('stop-button').addEventListener('click',clearSession);$('clear-session-button').addEventListener('click',clearSession);$('language-btn').addEventListener('click',()=>{state.language=state.language==='es'?'en':'es';localStorage.setItem('atlas-gps-language',state.language);applyLanguage()});
window.addEventListener('resize',resizeCanvas);
window.addEventListener('pagehide',()=>{if(state.watchId!==null)stopLocation();if(state.stream)state.stream.getTracks().forEach(track=>track.stop())});

window.ATLASGPS4D={version:'1.0.1',policy:{locationHistory:false,rawCameraUpload:false,routePersistence:'session-only',maxRoutePoints:MAX_ROUTE_POINTS},registerProvider,getState:()=>({language:state.language,hasLocation:Boolean(state.position),cameraActive:Boolean(state.stream),routePoints:state.route.length,provider:state.provider?.name||null}),clearSession};

applyLanguage();requestAnimationFrame(resizeCanvas);window.dispatchEvent(new CustomEvent('atlas:gps:ready',{detail:{version:'1.0.1',localFirst:true}}));
})();
