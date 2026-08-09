(()=>{
'use strict';

const ID='atlas-cars-lab-launch';

function isCarsActive(){
  return Boolean(document.querySelector('[data-page="cars"].active'));
}

function ensureStyle(){
  if(document.getElementById(`${ID}-style`))return;
  const style=document.createElement('style');
  style.id=`${ID}-style`;
  style.textContent=`
    #${ID}{position:fixed;right:22px;bottom:84px;z-index:70;display:inline-flex;align-items:center;gap:9px;padding:11px 15px;border:1px solid rgba(49,229,255,.36);border-radius:999px;background:linear-gradient(145deg,rgba(7,31,49,.96),rgba(3,17,29,.94));box-shadow:0 12px 34px rgba(0,0,0,.24);color:#dffaff;text-decoration:none;font:700 12px/1.1 Inter,system-ui,sans-serif;letter-spacing:.04em;backdrop-filter:blur(16px)}
    #${ID}:hover,#${ID}:focus-visible{border-color:#31e5ff;box-shadow:0 0 0 3px rgba(49,229,255,.12),0 14px 38px rgba(0,0,0,.28);outline:none}
    #${ID} span:first-child{display:grid;place-items:center;width:24px;height:24px;border-radius:50%;background:rgba(49,229,255,.12);color:#31e5ff;font-size:14px}
    html.light #${ID}{background:rgba(246,252,255,.97);color:#0b3041;border-color:#4a9cb5}
    @media(max-width:680px){#${ID}{right:12px;bottom:76px;padding:10px 12px}}
  `;
  document.head.append(style);
}

function render(){
  const existing=document.getElementById(ID);
  if(!isCarsActive()){
    existing?.remove();
    return;
  }
  if(existing)return;
  ensureStyle();
  const link=document.createElement('a');
  link.id=ID;
  link.href='atlas-cars.html';
  link.setAttribute('aria-label','Abrir ATLAS Cars Architecture Lab');
  link.innerHTML='<span aria-hidden="true">◈</span><span>Architecture Lab</span>';
  document.body.append(link);
}

function boot(){
  render();
  const observer=new MutationObserver(()=>render());
  observer.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['class']});
  window.addEventListener('popstate',render);
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
else boot();
})();
