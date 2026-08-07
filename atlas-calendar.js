(()=>{
'use strict';

const KEY='atlas-calendar-v1';
const NATIVE_ID_MIN=100000000;
const NATIVE_ID_MAX=900000000;
const $=s=>document.querySelector(s);
const uid=()=>crypto.randomUUID?.()||`${Date.now()}-${Math.random()}`;
const pad=n=>String(n).padStart(2,'0');
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const seed={
  id:uid(),
  title:'Continuar con ATLAS y probar la conexión del servidor',
  date:'2026-08-08',
  time:'12:00',
  category:'ATLAS',
  notes:'Recordatorio solicitado para mañana a las 12:00 PM.',
  reminderMinutes:0,
  done:false,
  webNotified:false
};

let events=load();
let swRegistration=null;
let lastNativeSignature='';
let nativeListenerInstalled=false;

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
    webNotified:Boolean(e.webNotified??e.notified)
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

function handle(id,action){
  const i=events.findIndex(e=>e.id===id);
  if(i<0)return;
  if(action==='delete'){
    events.splice(i,1);
    save();render();syncNativeNotifications(true);
    return;
  }
  if(action==='done'){
    events[i].done=!events[i].done;
    save();render();syncNativeNotifications(true);
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
  nativeListenerInstalled=true;
  try{
    await plugin.addListener('localNotificationActionPerformed',action=>{
      const eventId=action?.notification?.extra?.eventId;
      if(eventId)location.href=`/atlas-calendar.html?event=${encodeURIComponent(eventId)}`;
      else location.href='/atlas-calendar.html';
    });
  }catch{}
}

async function syncNativeNotifications(force=false){
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
  const upcoming=events.filter(e=>!e.done&&reminderDate(e).getTime()>now+1000);
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
    setStatus(`Recordatorios del dispositivo activos. ${upcoming.length} evento${upcoming.length===1?'':'s'} programado${upcoming.length===1?'':'s'}; pueden aparecer aunque ATLAS esté cerrado.`,'ok');
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
      if(plugin.checkExactNotificationSetting){
        try{
          const exact=await plugin.checkExactNotificationSetting();
          if(exact?.exact_alarm==='denied'){
            setStatus('Notificaciones activadas. En Android, habilita “alarmas exactas” en Ajustes si quieres máxima puntualidad.');
          }
        }catch{}
      }
      await syncNativeNotifications(true);
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
      new Notification('ATLAS Calendar',{body});
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

$('#event-form').onsubmit=e=>{
  e.preventDefault();
  const id=$('#event-id').value;
  const prior=events.find(x=>x.id===id);
  const item={
    id:id||uid(),
    title:$('#event-title').value.trim(),
    date:$('#event-date').value,
    time:$('#event-time').value,
    category:$('#event-category').value,
    notes:$('#event-notes').value.trim(),
    reminderMinutes:Number($('#event-reminder').value)||0,
    done:prior?.done||false,
    webNotified:false
  };
  const i=events.findIndex(x=>x.id===id);
  if(i>=0)events.splice(i,1,item);else events.push(item);
  save();resetForm();render();syncNativeNotifications(true);
};

$('#cancel-edit').onclick=resetForm;
$('#clear-completed').onclick=()=>{events=events.filter(e=>!e.done);save();render();syncNativeNotifications(true);};
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
  await checkWebDue();
  setInterval(checkWebDue,30000);
}

init();
})();
