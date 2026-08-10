(()=>{
  const PREF='atlas.repertoire.preferences.v1';
  let catalog=null;
  let prefs=loadPrefs();

  function loadPrefs(){try{return JSON.parse(localStorage.getItem(PREF)||'{}')}catch{return {}}}
  function savePrefs(){localStorage.setItem(PREF,JSON.stringify(prefs));}
  const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
  const statusLabel=s=>({active:'ACTIVE',verified:'VERIFIED',ready:'READY',research:'R&D'}[s]||String(s||'').toUpperCase());

  async function load(){const r=await fetch('/atlas-repertoire.json',{cache:'no-store'});if(!r.ok)throw new Error('repertoire_load_failed');catalog=await r.json();return catalog;}

  function render(root){
    if(!catalog)return;
    const hidden=new Set(prefs.hidden||[]), favorite=new Set(prefs.favorite||[]);
    root.innerHTML=`
      <section class="repertoire-toolbar glass-panel">
        <div><p class="eyebrow">ATLAS PRODUCT UNIVERSE</p><h2>Repertoire</h2><p>Every operational, research and future-facing ATLAS surface in one living catalog.</p></div>
        <div class="repertoire-actions"><input id="atlasModuleSearch" class="atlas-input" placeholder="Search modules…" aria-label="Search ATLAS modules"><button class="action" id="atlasEditMode">Edit</button></div>
      </section>
      <div id="atlasFamilyTabs" class="family-tabs"></div>
      <section id="atlasRepertoireGrid" class="repertoire-grid"></section>
      <section id="atlasEditor" class="editor-drawer" hidden>
        <div class="editor-head"><div><p class="eyebrow">ATLAS DESIGN STUDIO</p><h3>Edit this interface</h3></div><button class="action" id="atlasCloseEditor">Close</button></div>
        <label>Interface density<select id="atlasDensity"><option value="comfortable">Comfortable</option><option value="compact">Compact</option></select></label>
        <label>Card depth<select id="atlasDepth"><option value="deep">Deep 4D</option><option value="flat">Reduced depth</option></select></label>
        <div class="editor-buttons"><button class="action" id="atlasExportPrefs">Export settings</button><button class="action" id="atlasResetPrefs">Restore defaults</button></div>
      </section>`;

    const tabs=root.querySelector('#atlasFamilyTabs');
    tabs.innerHTML=`<button class="family-tab active" data-family="all">All</button>`+catalog.families.map(f=>`<button class="family-tab" data-family="${esc(f.id)}">${esc(f.icon)} ${esc(f.name)}</button>`).join('');
    let activeFamily='all', query='';

    function cards(){
      const list=catalog.modules.filter(m=>!hidden.has(m.id)).filter(m=>activeFamily==='all'||m.family===activeFamily).filter(m=>(m.name+' '+m.subtitle).toLowerCase().includes(query));
      root.querySelector('#atlasRepertoireGrid').innerHTML=list.map(m=>{
        const fam=catalog.families.find(f=>f.id===m.family);
        const fav=favorite.has(m.id);
        return `<article class="repertoire-card glass-panel" data-module="${esc(m.id)}"><div class="module-orb">${esc(fam?.icon||'◈')}</div><div class="module-copy"><div class="module-meta"><span>${esc(fam?.name||m.family)}</span><span class="status-pill ${esc(m.status)}">${esc(statusLabel(m.status))}</span></div><h3>${esc(m.name)}</h3><p>${esc(m.subtitle)}</p></div><div class="module-actions"><button class="icon-action favorite ${fav?'on':''}" aria-label="Favorite ${esc(m.name)}" data-favorite="${esc(m.id)}">★</button><button class="icon-action hide-module" aria-label="Hide ${esc(m.name)}" data-hide="${esc(m.id)}">×</button></div></article>`;
      }).join('')||'<article class="empty-state glass-panel"><h3>No modules found</h3><p>Change the filter or restore hidden modules from Edit.</p></article>';
      bindCards();
    }
    function bindCards(){
      root.querySelectorAll('[data-favorite]').forEach(b=>b.onclick=()=>{const id=b.dataset.favorite;favorite.has(id)?favorite.delete(id):favorite.add(id);prefs.favorite=[...favorite];savePrefs();cards()});
      root.querySelectorAll('[data-hide]').forEach(b=>b.onclick=()=>{hidden.add(b.dataset.hide);prefs.hidden=[...hidden];savePrefs();cards()});
    }
    tabs.querySelectorAll('.family-tab').forEach(b=>b.onclick=()=>{tabs.querySelectorAll('.family-tab').forEach(x=>x.classList.remove('active'));b.classList.add('active');activeFamily=b.dataset.family;cards()});
    root.querySelector('#atlasModuleSearch').oninput=e=>{query=e.target.value.trim().toLowerCase();cards()};

    const editor=root.querySelector('#atlasEditor');
    root.querySelector('#atlasEditMode').onclick=()=>editor.hidden=false;
    root.querySelector('#atlasCloseEditor').onclick=()=>editor.hidden=true;
    root.querySelector('#atlasDensity').value=prefs.density||'comfortable';
    root.querySelector('#atlasDepth').value=prefs.depth||'deep';
    function applyPrefs(){document.documentElement.dataset.atlasDensity=prefs.density||'comfortable';document.documentElement.dataset.atlasDepth=prefs.depth||'deep'}
    root.querySelector('#atlasDensity').onchange=e=>{prefs.density=e.target.value;savePrefs();applyPrefs()};
    root.querySelector('#atlasDepth').onchange=e=>{prefs.depth=e.target.value;savePrefs();applyPrefs()};
    root.querySelector('#atlasResetPrefs').onclick=()=>{prefs={};savePrefs();location.reload()};
    root.querySelector('#atlasExportPrefs').onclick=()=>{const blob=new Blob([JSON.stringify(prefs,null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='atlas-interface-settings.json';a.click();URL.revokeObjectURL(a.href)};
    applyPrefs();cards();
  }

  window.ATLASRepertoire={load,render};
})();
