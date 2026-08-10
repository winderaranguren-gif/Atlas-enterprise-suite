(()=>{
  const STORAGE='atlas.review.requests';
  const OVERRIDES='atlas.review.overrides';
  let enabled=false,selected=null;
  const load=(k,d)=>{try{return JSON.parse(localStorage.getItem(k)||'')||d}catch{return d}};
  const save=(k,v)=>localStorage.setItem(k,JSON.stringify(v));
  function requests(){return load(STORAGE,[])}
  function overrides(){return load(OVERRIDES,{})}
  function pathFor(el){
    if(!el)return'';
    const parts=[];let n=el;
    while(n&&n!==document.body&&parts.length<5){
      let p=n.tagName?.toLowerCase?.()||'node';
      if(n.id){p+='#'+n.id;parts.unshift(p);break}
      if(n.classList?.length)p+='.'+[...n.classList].slice(0,2).join('.');
      parts.unshift(p);n=n.parentElement;
    }
    return parts.join(' > ')
  }
  function inject(){
    if(document.getElementById('atlasReviewStyle'))return;
    const s=document.createElement('style');s.id='atlasReviewStyle';s.textContent=`
      #atlasReviewFab{position:fixed;right:18px;bottom:72px;z-index:99999;border:0;border-radius:999px;padding:13px 16px;background:linear-gradient(135deg,#35c7fa,#316dff);color:#fff;font-weight:800;box-shadow:0 10px 30px #0008}
      #atlasReviewPanel{position:fixed;right:18px;bottom:128px;z-index:99998;width:min(360px,calc(100vw - 36px));background:#0b1526;color:#eef;border:1px solid #284363;border-radius:20px;padding:16px;box-shadow:0 18px 50px #000a;display:none}
      #atlasReviewPanel.open{display:block}#atlasReviewPanel input,#atlasReviewPanel textarea,#atlasReviewPanel select{width:100%;box-sizing:border-box;margin:6px 0 10px;padding:10px;border-radius:11px;border:1px solid #284363;background:#07101d;color:#fff}
      #atlasReviewPanel button{width:100%;padding:11px;border-radius:11px;border:0;margin-top:7px;font-weight:800;background:#15304e;color:#fff}#atlasReviewPanel .primary{background:linear-gradient(135deg,#35c7fa,#316dff)}
      .atlas-review-target{outline:2px dashed #52d7ff!important;outline-offset:3px!important;cursor:crosshair!important}.atlas-review-selected{outline:3px solid #53eba3!important;outline-offset:3px!important}
    `;document.head.appendChild(s);
    const fab=document.createElement('button');fab.id='atlasReviewFab';fab.textContent='✎ Revisar';fab.onclick=()=>toggle();document.body.appendChild(fab);
    const p=document.createElement('div');p.id='atlasReviewPanel';p.innerHTML=`<strong>ATLAS Review Mode</strong><div id="atlasReviewTarget" style="font-size:12px;color:#8fa5bc;margin:7px 0">Selecciona un elemento</div><select id="atlasReviewType"><option>Diseño</option><option>Texto</option><option>Función</option><option>Datos</option><option>Permisos</option><option>Error</option></select><textarea id="atlasReviewRequest" rows="4" placeholder="Dime exactamente qué quieres cambiar..."></textarea><input id="atlasReviewLiveText" placeholder="Cambio de texto inmediato (opcional)"><button class="primary" id="atlasReviewSave">Guardar solicitud</button><button id="atlasReviewApplyText">Aplicar texto ahora</button><button id="atlasReviewCopy">Copiar solicitudes</button><button id="atlasReviewClose">Cerrar</button>`;document.body.appendChild(p);
    p.querySelector('#atlasReviewSave').onclick=storeRequest;p.querySelector('#atlasReviewApplyText').onclick=applyText;p.querySelector('#atlasReviewCopy').onclick=copyRequests;p.querySelector('#atlasReviewClose').onclick=()=>toggle(false);
    document.addEventListener('click',capture,true);applyOverrides();
  }
  function toggle(force){enabled=force??!enabled;document.getElementById('atlasReviewPanel')?.classList.toggle('open',enabled);document.getElementById('atlasReviewFab').textContent=enabled?'✓ Revisando':'✎ Revisar';document.querySelectorAll('.atlas-review-target').forEach(x=>x.classList.remove('atlas-review-target'));if(enabled)document.querySelectorAll('#mainView button,#mainView .card,#mainView .family-card,#mainView .glass-card,#mainView .panel,.nav').forEach(x=>x.classList.add('atlas-review-target'))}
  function capture(e){if(!enabled)return;const panel=document.getElementById('atlasReviewPanel');if(panel?.contains(e.target)||e.target.id==='atlasReviewFab')return;const el=e.target.closest('button,.card,.family-card,.glass-card,.panel,.nav,h1,h2,h3,p,span');if(!el)return;e.preventDefault();e.stopPropagation();document.querySelectorAll('.atlas-review-selected').forEach(x=>x.classList.remove('atlas-review-selected'));selected=el;selected.classList.add('atlas-review-selected');document.getElementById('atlasReviewTarget').textContent=(el.textContent||el.getAttribute('aria-label')||el.tagName).trim().slice(0,140);document.getElementById('atlasReviewLiveText').value=(el.children.length===0?el.textContent.trim():'')}
  function storeRequest(){if(!selected)return alert('Selecciona primero el elemento que quieres modificar.');const arr=requests();arr.unshift({id:crypto.randomUUID?.()||String(Date.now()),createdAt:new Date().toISOString(),type:document.getElementById('atlasReviewType').value,request:document.getElementById('atlasReviewRequest').value.trim(),targetText:(selected.textContent||'').trim().slice(0,300),selector:pathFor(selected),view:window.location.pathname});save(STORAGE,arr);document.getElementById('atlasReviewRequest').value='';alert('Solicitud guardada en ATLAS Review Mode.')}
  function applyText(){if(!selected)return alert('Selecciona un elemento.');const value=document.getElementById('atlasReviewLiveText').value; if(!value)return;const key=pathFor(selected);selected.textContent=value;const map=overrides();map[key]=value;save(OVERRIDES,map)}
  function applyOverrides(){const map=overrides();for(const [selector,text] of Object.entries(map)){try{document.querySelectorAll(selector).forEach(el=>{if(el.children.length===0)el.textContent=text})}catch{}}}
  async function copyRequests(){const txt=JSON.stringify(requests(),null,2);try{await navigator.clipboard.writeText(txt);alert('Solicitudes copiadas. Pégamelas en el chat y puedo ir aplicándolas en main.') }catch{prompt('Copia estas solicitudes:',txt)}}
  window.ATLASReviewMode={toggle,requests,applyOverrides};addEventListener('load',inject);
})();
