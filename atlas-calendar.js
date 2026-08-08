(()=>{
'use strict';

const KEY='atlas-calendar-v1';
const NATIVE_ID_MIN=100000000;
const NATIVE_ID_MAX=900000000;
const NATIVE_NOTIFICATION_LIMIT=50;
const $=s=>document.querySelector(s);
const uuidFallback=()=>{
  const bytes=new Uint8Array(16);
  crypto.getRandomValues(bytes);
  bytes[6]=(bytes[6]&0x0f)|0x40;
  bytes[8]=(bytes[8]&0x3f)|0x80;
  const hex=[...bytes].map(b=>b.toString(16).padStart(2,'0'));
  return `${hex.slice(0,4).join('')}-${hex.slice(4,6).join('')}-${hex.slice(6,8).join('')}-${hex.slice(8,10).join('')}-${hex.slice(10).join('')}`;
};
const uid=()=>crypto.randomUUID?.()||uuidFallback();
const pad=n=>String(n).padStart(2,'0');
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const nowIso=()=>new Date().toISOString();
const config=window.ATLAS_CONFIG||{};
const supabaseSdk=window.supabase;
const seed={
  id:uid(),
  title:'ATLAS OS Personal Intelligence — activaciones de producción',
  date:'2026-08-08',
  time:'14:30',
  category:'ATLAS',
  notes:'Evento centralizado por ATLAS Calendar para continuar backend, seguridad, IA, Apple y pruebas E2E.',
  reminderMinutes:0,
  done:false,
  webNotified:false,
  cloudId:null,
  updatedAt:nowIso()
};

let events=load();
let swRegistration=null;
let lastNativeSignature='';
let nativeListenerInstalled=false;
let cloudClient=null;
let cloudUser=null;
let cloudSyncInFlight=null;

function normalize(e){
  return {
    id:e.id||uid(),
    title:e.title||'Evento ATLAS',
    date:e.date||'',
    time:e.time||'09:00',
    category:e.category||'ATLAS',
    notes:e.notes||'',
    reminderMinutes:Number.isFinite(Number(e.reminderMinutes))?Number(e.reminderMinutes):0,
    done:Boolean(e.done),
    webNotified:Boolean(e.webNotified??e.notified),
    cloudId:e.cloudId||null,
    updatedAt:e.updatedAt||nowIso()
  };
}

function load(){
  try{
    const parsed=JSON.parse(localStorage.getItem(KEY)||'[]');
    if(Array.isArray(parsed)&&parsed.length)return parsed.map(normalize);
  }catch{}
  localStorage.setItem(KEY,JSON.stringify([seed]));
  return [seed];
}

function save(){localStorage.setItem(KEY,JSON.stringify(events));}
function touch(e){e.updatedAt=nowIso();e.webNotified=false;return e;}
function eventDate(e){return new Date(`${e.date}T${e.time||'00:00'}:00`);}
function reminderDate(e){return new Date(eventDate(e).getTime()-(Number(e.reminderMinutes)||0)*60000);}
function fmt(e){return new Intl.DateTimeFormat('es-US',{dateStyle:'full',timeStyle:'short'}).format(eventDate(e));}
function reminderLabel(minutes){
  const m=Number(minutes)||0;
  if(m===0)return 'A la hora';
  if(m===60)return '1 hora antes';
  if(m<60)return `${m} min antes`;
  return `${m/60} h antes`;
}
function setStatus(text,kind='info'){
  const el=$('#notification-status');
  if(!el)return;
  el.textContent=text;
  el.dataset.kind=kind;
}
function setCloudStatus(text,kind='info'){
  const el=$('#cloud-status');
  if(!el)return;
  el.textContent=text;
  el.dataset.kind=kind;
}
function setDefaults(){
  const d=new Date();
  $('#event-date').value=`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
  $('#event-time').value=`${pad(d.getHours())}:${pad(d.getMinutes())}`;
  $('#event-reminder').value='0';
}

function render(){
  const now=new Date();
  $('#today-label').textContent=new Intl.DateTimeFormat('es-US',{dateStyle:'full'}).format(now);
  const rows=[...events].sort((a,b)=>eventDate(a)-eventDate(b));
  $('#agenda').innerHTML=rows.length?rows.map(e=>{
    const soon=!e.done&&eventDate(e)-now<=3600000&&eventDate(e)>=now;
    const highlighted=new URLSearchParams(location.search).get('event')===e.id;
    return `<div class="event ${soon?'due':''} ${e.done?'done':''} ${highlighted?'highlighted':''}" data-id="${esc(e.id)}"><div><h3>${esc(e.title)}</h3><time>${esc(fmt(e))}</time><p><strong>${esc(e.category)}</strong> · ${esc(reminderLabel(e.reminderMinutes))}${e.notes?` · ${esc(e.notes)}`:''}</p></div><div class="event-actions"><button class="button small ghost" data-action="done">${e.done?'Reabrir':'Completar'}</button><button class="button small ghost" data-action="edit">Editar</button><button class="button small danger" data-action="delete">Eliminar</button></div></div>`;
  }).join(''):'<div class="empty">No hay eventos programados.</div>';
  document.querySelectorAll('.event button').forEach(b=>b.onclick=()=>handle(b.closest('.event').dataset.id,b.dataset.action));
}

function resetForm(){
  $('#event-form').reset();
  $('#event-id').value='';
  $('#cancel-edit').classList.add('hidden');
  setDefaults();
}

async function handle(id,action){
  const i=events.findIndex(e=>e.id===id);
  if(i<0)return;
  if(action==='delete'){
    const removed=events[i];
    events.splice(i,1);
    save();render();
    await Promise.allSettled([syncNativeNotifications(true),deleteCloudEvent(removed)]);
    return;
  }
  if(action==='done'){
    events[i].done=!events[i].done;
    touch(events[i]);
    save();render();
    await Promise.allSettled([syncNativeNotifications(true),persistCloudEvent(events[i])]);
    return;
  }
  if(action==='edit'){
    const e=events[i];
    $('#event-id').value=e.id;
    $('#event-title').value=e.title;
    $('#event-date').value=e.date;
    $('#event-time').value=e.time;
    $('#event-category').value=e.category;
    $('#event-reminder').value=String(e.reminderMinutes||0);
    $('#event-notes').value=e.notes||'';
    $('#cancel-edit').classList.remove('hidden');
    scrollTo({top:0,behavior:'smooth'});
  }
}

function hashId(value){
  let h=2166136261;
  for(let i=0;i<value.length;i++){
    h^=value.charCodeAt(i);
    h=Math.imul(h,16777619);
  }
  const span=NATIVE_ID_MAX-NATIVE_ID_MIN;
  return NATIVE_ID_MIN+(h>>>0)%span;
}
function isAtlasNativeId(id){return Number(id)>=NATIVE_ID_MIN&&Number(id)<NATIVE_ID_MAX;}
function localNotificationsPlugin(){
  const cap=window.Capacitor;
  const plugin=cap?.Plugins?.LocalNotifications;
  if(!plugin)return null;
  if(typeof cap?.isNativePlatform==='function'&&!cap.isNativePlatform())return null;
  return plugin;
}
function nativeSignature(){
  return events.map(e=>[e.id,e.date,e.time,e.reminderMinutes,e.done].join('|')).sort().join('~');
}

async function installNativeActionListener(plugin){
  if(nativeListenerInstalled||!plugin?.addListener)return;
  try{
    await plugin.addListener('localNotificationActionPerformed',action=>{
      const eventId=action?.notification?.extra?.eventId;
      location.href=eventId?`/atlas-calendar.html?event=${encodeURIComponent(eventId)}`:'/atlas-calendar.html';
    });
    nativeListenerInstalled=true;
  }catch{
    nativeListenerInstalled=false;
  }
}

async function syncNativeNotifications(force=false,statusSuffix=''){
  const plugin=localNotificationsPlugin();
  if(!plugin)return false;
  const signature=nativeSignature();
  if(!force&&signature===lastNativeSignature)return true;
  let permissions;
  try{permissions=await plugin.checkPermissions();}catch{return false;}
  if(permissions?.display!=='granted'){
    setStatus('ATLAS Calendar está listo para recordatorios del dispositivo. Pulsa “Activar notificaciones” para conceder permiso.');
    return false;
  }
  const now=Date.now();
  const upcoming=events
    .filter(e=>!e.done&&reminderDate(e).getTime()>now+1000)
    .sort((a,b)=>reminderDate(a)-reminderDate(b))
    .slice(0,NATIVE_NOTIFICATION_LIMIT);
  try{
    const pending=await plugin.getPending();
    const ours=(pending?.notifications||[]).filter(n=>isAtlasNativeId(n.id));
    if(ours.length)await plugin.cancel({notifications:ours.map(n=>({id:n.id}))});
    if(upcoming.length){
      await plugin.schedule({notifications:upcoming.map(e=>({
        id:hashId(e.id),
        title:'ATLAS Calendar',
        body:e.title,
        schedule:{at:reminderDate(e),allowWhileIdle:true},
        sound:'default',
        extra:{atlasCalendar:true,eventId:e.id,eventDate:e.date,eventTime:e.time}
      }))});
    }
    lastNativeSignature=signature;
    await installNativeActionListener(plugin);
    const capped=events.filter(e=>!e.done&&reminderDate(e).getTime()>now+1000).length>upcoming.length;
    const limitNote=capped?` Se programaron los próximos ${NATIVE_NOTIFICATION_LIMIT}; ATLAS renovará la cola al abrir Calendar.`:'';
    setStatus(`Recordatorios del dispositivo activos. ${upcoming.length} evento${upcoming.length===1?'':'s'} programado${upcoming.length===1?'':'s'}.${limitNote}${statusSuffix}`,'ok');
    return true;
  }catch(err){
    setStatus(`No se pudieron programar los recordatorios del dispositivo: ${err?.message||'error desconocido'}.`,'error');
    return false;
  }
}

async function enableNotifications(){
  const plugin=localNotificationsPlugin();
  if(plugin){
    try{
      let permission=await plugin.checkPermissions();
      if(permission?.display!=='granted')permission=await plugin.requestPermissions();
      if(permission?.display!=='granted'){
        setStatus('No se concedió permiso para notificaciones del dispositivo.','error');
        return;
      }
      let suffix='';
      if(plugin.checkExactNotificationSetting){
        try{
          const exact=await plugin.checkExactNotificationSetting();
          if(exact?.exact_alarm==='denied')suffix=' En Android, habilita “alarmas exactas” en Ajustes para máxima puntualidad.';
        }catch{}
      }
      await syncNativeNotifications(true,suffix);
      return;
    }catch(err){
      setStatus(`No se pudo activar Local Notifications: ${err?.message||'error desconocido'}.`,'error');
      return;
    }
  }

  if(!('Notification'in window)){
    setStatus('Este navegador no admite notificaciones. La app móvil de ATLAS sí puede programarlas.','error');
    return;
  }
  const permission=await Notification.requestPermission();
  if(permission==='granted'){
    await registerServiceWorker();
    setStatus('Notificaciones web activadas. Para recordatorios con ATLAS completamente cerrado, instala la app móvil de ATLAS; el navegador local no garantiza ejecución en segundo plano.','ok');
  }else{
    setStatus('No se concedió permiso para notificaciones web.','error');
  }
}

async function registerServiceWorker(){
  if(!('serviceWorker'in navigator))return null;
  try{
    swRegistration=await navigator.serviceWorker.register('/service-worker.js');
    return swRegistration;
  }catch{return null;}
}

async function showWebNotification(e){
  if(!('Notification'in window)||Notification.permission!=='granted')return false;
  const body=`${e.title} · ${fmt(e)}`;
  try{
    const reg=swRegistration||await navigator.serviceWorker?.ready;
    if(reg?.showNotification){
      await reg.showNotification('ATLAS Calendar',{body,icon:'/public/icons/atlas-icon.svg',badge:'/public/icons/atlas-icon.svg',tag:`atlas-calendar-${e.id}`,data:{url:`/atlas-calendar.html?event=${encodeURIComponent(e.id)}`}});
    }else{
      new Notification('ATLAS Calendar',{body,tag:`atlas-calendar-${e.id}`});
    }
    return true;
  }catch{return false;}
}

async function checkWebDue(){
  if(localNotificationsPlugin())return;
  const now=Date.now();
  let changed=false;
  for(const e of events){
    if(e.done||e.webNotified)continue;
    const diff=reminderDate(e).getTime()-now;
    if(diff<=60000&&diff>=-60000){
      const shown=await showWebNotification(e);
      if(shown){e.webNotified=true;changed=true;}
    }
  }
  if(changed){save();render();}
}

function localTimezone(){return Intl.DateTimeFormat().resolvedOptions().timeZone||'America/New_York';}
function cloudPayload(e){
  return {
    owner_user_id:cloudUser.id,
    title:e.title,
    start_at:eventDate(e).toISOString(),
    timezone:localTimezone(),
    category:e.category,
    notes:e.notes||null,
    reminder_minutes:Number(e.reminderMinutes)||0,
    status:e.done?'completed':'scheduled',
    source:'atlas-calendar',
    external_ref:e.id
  };
}
function cloudRowToEvent(row){
  const d=new Date(row.start_at);
  return normalize({
    id:row.external_ref||row.id,
    title:row.title,
    date:`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`,
    time:`${pad(d.getHours())}:${pad(d.getMinutes())}`,
    category:row.category||'ATLAS',
    notes:row.notes||'',
    reminderMinutes:row.reminder_minutes||0,
    done:row.status==='completed',
    webNotified:false,
    cloudId:row.id,
    updatedAt:row.updated_at||row.created_at||nowIso()
  });
}

async function persistCloudEvent(e,{quiet=false}={}){
  if(!cloudClient||!cloudUser)return false;
  const payload=cloudPayload(e);
  try{
    let query;
    if(e.cloudId){
      query=cloudClient.from('calendar_events').update(payload).eq('id',e.cloudId).select('id,updated_at').single();
    }else{
      query=cloudClient.from('calendar_events').insert(payload).select('id,updated_at').single();
    }
    const {data,error}=await query;
    if(error)throw error;
    e.cloudId=data.id;
    e.updatedAt=data.updated_at||e.updatedAt;
    save();
    if(!quiet)setCloudStatus('ATLAS Calendar sincronizado con ATLAS Core. Los eventos están protegidos por autenticación y RLS.','ok');
    return true;
  }catch(error){
    if(!quiet)setCloudStatus(`Se conservó el evento localmente; la sincronización cloud falló: ${error?.message||'error desconocido'}.`,'error');
    return false;
  }
}

async function deleteCloudEvent(e){
  if(!cloudClient||!cloudUser)return false;
  try{
    let query=cloudClient.from('calendar_events').delete();
    query=e.cloudId?query.eq('id',e.cloudId):query.eq('external_ref',e.id).eq('owner_user_id',cloudUser.id);
    const {error}=await query;
    if(error)throw error;
    setCloudStatus('Evento eliminado de ATLAS Core y del dispositivo.','ok');
    return true;
  }catch(error){
    setCloudStatus(`El evento se eliminó localmente, pero falta confirmar la eliminación cloud: ${error?.message||'error desconocido'}.`,'error');
    return false;
  }
}

async function syncCloudEvents(){
  if(!cloudClient||!cloudUser)return false;
  if(cloudSyncInFlight)return cloudSyncInFlight;
  cloudSyncInFlight=(async()=>{
    setCloudStatus('Sincronizando ATLAS Calendar con ATLAS Core…');
    const {data:rows,error}=await cloudClient.from('calendar_events').select('id,owner_user_id,title,start_at,timezone,category,notes,reminder_minutes,status,source,external_ref,created_at,updated_at').order('start_at',{ascending:true});
    if(error)throw error;

    const cloudByLocalId=new Map((rows||[]).filter(r=>r.external_ref).map(r=>[r.external_ref,r]));
    const localById=new Map(events.map(e=>[e.id,e]));

    for(const e of events){
      const row=cloudByLocalId.get(e.id);
      if(!row){
        await persistCloudEvent(e,{quiet:true});
        continue;
      }
      e.cloudId=row.id;
      const localTime=Date.parse(e.updatedAt)||0;
      const cloudTime=Date.parse(row.updated_at)||0;
      if(localTime>cloudTime+1000){
        await persistCloudEvent(e,{quiet:true});
      }else{
        const remote=cloudRowToEvent(row);
        localById.set(remote.id,remote);
      }
    }

    for(const row of rows||[]){
      const remote=cloudRowToEvent(row);
      if(!localById.has(remote.id))localById.set(remote.id,remote);
    }

    events=[...localById.values()];
    save();render();
    await syncNativeNotifications(true);
    setCloudStatus(`ATLAS Core activo: ${events.length} evento${events.length===1?'':'s'} sincronizado${events.length===1?'':'s'}. El modo local queda disponible para uso offline.`,'ok');
    return true;
  })().catch(error=>{
    setCloudStatus(`ATLAS Calendar continúa en modo local; no se pudo completar la sincronización cloud: ${error?.message||'error desconocido'}.`,'error');
    return false;
  }).finally(()=>{cloudSyncInFlight=null;});
  return cloudSyncInFlight;
}

async function initCloud(){
  if(!supabaseSdk?.createClient||!config.supabaseUrl||!config.supabasePublishableKey){
    setCloudStatus('Modo local activo. ATLAS Core cloud no está disponible en este entorno.');
    return;
  }
  cloudClient=supabaseSdk.createClient(config.supabaseUrl,config.supabasePublishableKey,{
    auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}
  });
  const {data,error}=await cloudClient.auth.getSession();
  if(error){
    setCloudStatus(`Modo local activo. No se pudo leer la sesión de ATLAS Core: ${error.message}.`,'error');
    return;
  }
  cloudUser=data?.session?.user||null;
  if(cloudUser)await syncCloudEvents();
  else setCloudStatus('Modo local activo. Inicia sesión en ATLAS Core para sincronizar Calendar entre dispositivos.');

  cloudClient.auth.onAuthStateChange((_event,session)=>{
    window.setTimeout(async()=>{
      cloudUser=session?.user||null;
      if(cloudUser)await syncCloudEvents();
      else setCloudStatus('Sesión cloud cerrada. Los eventos siguen disponibles localmente.');
    },0);
  });
}

$('#event-form').onsubmit=async e=>{
  e.preventDefault();
  const id=$('#event-id').value;
  const prior=events.find(x=>x.id===id);
  const item=normalize({
    id:id||uid(),
    title:$('#event-title').value.trim(),
    date:$('#event-date').value,
    time:$('#event-time').value,
    category:$('#event-category').value,
    notes:$('#event-notes').value.trim(),
    reminderMinutes:Number($('#event-reminder').value)||0,
    done:prior?.done||false,
    webNotified:false,
    cloudId:prior?.cloudId||null,
    updatedAt:nowIso()
  });
  const i=events.findIndex(x=>x.id===id);
  if(i>=0)events.splice(i,1,item);else events.push(item);
  save();resetForm();render();
  await Promise.allSettled([syncNativeNotifications(true),persistCloudEvent(item)]);
};

$('#cancel-edit').onclick=resetForm;
$('#clear-completed').onclick=async()=>{
  const removed=events.filter(e=>e.done);
  events=events.filter(e=>!e.done);
  save();render();
  await Promise.allSettled([syncNativeNotifications(true),...removed.map(deleteCloudEvent)]);
};
$('#enable-notifications').onclick=enableNotifications;

async function init(){
  setDefaults();
  render();
  await registerServiceWorker();
  const plugin=localNotificationsPlugin();
  if(plugin){
    setStatus('ATLAS Calendar detectó la app móvil. Activa las notificaciones una vez y los próximos eventos se programarán en el dispositivo.');
    await syncNativeNotifications();
  }else if(!window.isSecureContext&&location.hostname!=='localhost'&&location.hostname!=='127.0.0.1'){
    setStatus('Estás usando ATLAS por HTTP en la red local. Los navegadores limitan las notificaciones en segundo plano; la app móvil nativa elimina esa limitación.');
  }
  await initCloud();
  await checkWebDue();
  setInterval(checkWebDue,30000);
}

init();
})();