(()=>{
'use strict';
const addStyle=(href,attrs={})=>{if(document.querySelector(`link[href*="${href.split('?')[0]}"]`))return;const l=document.createElement('link');l.rel='stylesheet';l.href=href;Object.assign(l.dataset,attrs);document.head.append(l)};
const load=(src)=>new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=src;s.async=false;s.onload=resolve;s.onerror=()=>reject(new Error(`Failed to load ${src}`));document.body.append(s)});

addStyle('atlas-suite.css?v=4');
addStyle('atlas-production-core.css?v=1');
addStyle('atlas-technical-support.css?v=1');
addStyle('atlas-dragdrop.css?v=1');
addStyle('atlas-accessibility.css?v=4',{atlasWu:'0300'});

navigator.serviceWorker?.addEventListener('message',(event)=>{
  const detail=event.data;
  if(detail?.type!=='atlas:alert')return;
  if(window.ATLASAccessibility?.visualAlert)window.ATLASAccessibility.visualAlert(detail);
  else window.dispatchEvent(new CustomEvent('atlas:alert',{detail}));
});

(async()=>{
  try{
    await load('atlas-data-fabric.js?v=1');
    await load('atlas-intelligence-core.js?v=1');
    await load('atlas-production-core.js?v=1');
    await load('atlas-resilience.js?v=1');
    await load('atlas-technical-support.js?v=1');
    await load('atlas-support-runbooks.js?v=1');
    await load('atlas-accessibility.js?v=4');
    await load('atlas-dragdrop.js?v=1');
    await load('atlas-cars-entry.js?v=1');
    await load('atlas-gps-entry.js?v=1');
  }catch(error){
    console.error('ATLAS production boot failed:',error);
    window.dispatchEvent(new CustomEvent('atlas:boot-error',{detail:{message:error.message}}));
  }
})();
})();
