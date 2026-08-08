(()=>{
'use strict';

const KEY='atlas-calendar-v1';
const SYSTEM_EVENTS=[{
  id:'a7150000-2026-4808-9430-000000000001',
  title:'ATLAS OS Personal Intelligence — activaciones de producción',
  date:'2026-08-08',
  time:'14:30',
  category:'ATLAS',
  notes:'Evento centralizado por ATLAS Calendar para continuar backend, seguridad, IA, Apple, despliegue y pruebas E2E.',
  reminderMinutes:0,
  done:false,
  webNotified:false,
  cloudId:null,
  updatedAt:'2026-08-08T18:30:00.000Z'
}];

try{
  const parsed=JSON.parse(localStorage.getItem(KEY)||'[]');
  const events=Array.isArray(parsed)?parsed:[];
  let changed=false;
  for(const systemEvent of SYSTEM_EVENTS){
    if(events.some(event=>event?.id===systemEvent.id))continue;
    events.push({...systemEvent});
    changed=true;
  }
  if(changed)localStorage.setItem(KEY,JSON.stringify(events));
}catch{
  localStorage.setItem(KEY,JSON.stringify(SYSTEM_EVENTS));
}
})();
