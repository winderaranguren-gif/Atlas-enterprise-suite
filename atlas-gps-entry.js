(()=>{
'use strict';

const MODULE={id:'gps4d',key:'gps4d',name:'ATLAS GPS 4D',label:'ATLAS GPS 4D',title:'ATLAS GPS 4D',description:'Navegación local-first, geolocalización opt-in y proveedores autorizados.',href:'atlas-gps-4d.html'};
const NAV_ID='atlas-gps4d-nav';
const GROUP_ID='atlas-gps4d-group';

function registerRuntime(){
  if(Array.isArray(window.ATLAS_MODULES)){
    if(!window.ATLAS_MODULES.some(item=>(item?.id||item?.key)===MODULE.id))window.ATLAS_MODULES.push(MODULE);
    return;
  }
  if(window.ATLAS_MODULES&&typeof window.ATLAS_MODULES==='object'){
    window.ATLAS_MODULES[MODULE.id]={...(window.ATLAS_MODULES[MODULE.id]||{}),...MODULE};
    return;
  }
  window.ATLAS_MODULES=[MODULE];
}

function render(){
  const nav=document.getElementById('main-nav');
  if(!nav)return;
  if(document.getElementById(NAV_ID))return;

  let group=document.getElementById(GROUP_ID);
  if(!group){
    group=document.createElement('div');
    group.id=GROUP_ID;
    group.className='nav-group';
    group.textContent='NAVIGATION';
    nav.append(group);
  }

  const link=document.createElement('a');
  link.id=NAV_ID;
  link.className='nav-item';
  link.href=MODULE.href;
  link.dataset.module='gps4d';
  link.setAttribute('aria-label','Abrir ATLAS GPS 4D');
  link.innerHTML='<span class="nav-icon">◎</span>ATLAS GPS 4D';
  nav.append(link);
}

function boot(){
  registerRuntime();
  render();
  const observer=new MutationObserver(()=>render());
  observer.observe(document.body,{subtree:true,childList:true});
  window.dispatchEvent(new CustomEvent('atlas:module-registered',{detail:MODULE}));
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
else boot();
})();
