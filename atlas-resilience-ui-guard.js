(()=>{
'use strict';

let bound=false;
let retries=0;
const MAX_BIND_RETRIES=40;

function supportPanel(){return document.getElementById('atlas-support-panel');}
function controls(panel){return panel?[...panel.querySelectorAll('[data-ats-resolve],[data-ats-diagnose]')]:[];}
function setBusy(panel,busy){for(const control of controls(panel))control.disabled=Boolean(busy);}

async function runThroughResilience(event,button){
  const support=window.ATLASTechnicalSupport;
  if(!support?.__atlasResilienceWrapped||typeof support.diagnose!=='function')return;
  const panel=button.closest?.('#atlas-support-panel')||supportPanel();
  if(!panel)return;
  const summary=panel.querySelector('[data-ats-summary]')?.value?.trim()||'';
  const company=panel.querySelector('[data-ats-company]')?.value?.trim()||'ATLAS Client';
  if(!summary){
    panel.querySelector('[data-ats-summary]')?.focus();
    return;
  }
  event.preventDefault();
  event.stopImmediatePropagation();
  setBusy(panel,true);
  try{
    await support.diagnose(summary,company);
  }finally{
    setBusy(panel,false);
  }
}

function bind(){
  if(bound)return true;
  const support=window.ATLASTechnicalSupport;
  if(!support?.__atlasResilienceWrapped||typeof support.diagnose!=='function'){
    if(retries++<MAX_BIND_RETRIES)setTimeout(bind,50);
    return false;
  }
  document.addEventListener('click',(event)=>{
    const button=event.target?.closest?.('[data-ats-resolve],[data-ats-diagnose]');
    if(!button)return;
    void runThroughResilience(event,button);
  },true);
  bound=true;
  support.__atlasResilienceUiGuard=true;
  window.dispatchEvent(new CustomEvent('atlas:resilience:ui-guard-ready',{detail:{integration:'technical-support'}}));
  return true;
}

window.addEventListener('atlas:support:ready',()=>setTimeout(bind,0));
window.addEventListener('atlas:resilience:integration-installed',(event)=>{
  if(event.detail?.integration==='technical-support')setTimeout(bind,0);
});
setTimeout(bind,0);
})();