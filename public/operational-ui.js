(()=>{
  const API='/api';
  const state={token:localStorage.getItem('atlas.operational.token')||'',health:null};
  const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
  async function request(path,options={}){
    const headers={...(options.headers||{}),'content-type':'application/json'};
    if(state.token) headers.authorization=`Bearer ${state.token}`;
    const res=await fetch(`${API}${path}`,{...options,headers,cache:'no-store'});
    let body; try{body=await res.json()}catch{body=await res.text()}
    if(!res.ok) throw new Error(typeof body==='string'?body:(body.error||JSON.stringify(body)));
    return body;
  }
  async function health(){
    try{state.health=await request('/health');return state.health}
    catch(error){state.health={production_gate:'blocked',error:error.message,modules:{}};return state.health}
  }
  function moduleStatus(key){
    const m=state.health?.modules?.[key];
    if(!m)return {label:'NO OPERATIVO',cls:'blocked'};
    return m.healthy?{label:'OPERATIVO',cls:'healthy'}:{label:'BLOQUEADO',cls:'blocked'};
  }
  async function login(email,password){
    const out=await request('/login',{method:'POST',body:JSON.stringify({email,password})});
    state.token=out.token;localStorage.setItem('atlas.operational.token',state.token);return out;
  }
  function logout(){state.token='';localStorage.removeItem('atlas.operational.token')}
  async function pages(){return request('/pages')}
  async function createPage(input){return request('/pages',{method:'POST',body:JSON.stringify(input)})}
  async function publishPage(id){return request(`/pages/${encodeURIComponent(id)}/publish`,{method:'POST',body:'{}'})}
  async function backups(){return request('/backups')}
  async function createBackup(){return request('/backups',{method:'POST',body:'{}'})}
  function blockedPanel(name,requirement){return `<section class="panel operational-panel"><div class="panel-head"><h2>${esc(name)}</h2><span class="blocked">NO OPERATIVO</span></div><p>Este módulo no ejecutará acciones simuladas.</p><p><strong>Falta:</strong> ${esc(requirement)}</p></section>`}
  async function pagesView(){
    await health(); const s=moduleStatus('pages_database');
    if(s.label!=='OPERATIVO')return blockedPanel('ATLAS Pages','Cloudflare D1 + Worker API provisionados y health check verde.');
    if(!state.token)return authPanel('ATLAS Pages');
    try{const data=await pages();return `<section class="panel operational-panel"><div class="panel-head"><h2>ATLAS Pages</h2><span class="healthy">OPERATIVO</span></div><div class="operational-form"><input id="opPageTitle" placeholder="Título"><input id="opPageSlug" placeholder="slug"><textarea id="opPageBody" placeholder="Contenido"></textarea><button class="action" id="opCreatePage">Crear página real</button></div><div class="activity-list">${(data.pages||[]).map(p=>`<div class="row-line"><span>${esc(p.title)} · /p/${esc(p.slug)}</span><button class="panel-link op-publish" data-id="${esc(p.id)}">${p.published?'Publicada':'Publicar'}</button></div>`).join('')||'<p>No hay páginas todavía.</p>'}</div></section>`}catch(e){return blockedPanel('ATLAS Pages',e.message)}
  }
  async function backupsView(){
    await health(); const s=moduleStatus('backups_r2');
    if(s.label!=='OPERATIVO')return blockedPanel('ATLAS Backups','Cloudflare R2 + D1 bindings provisionados y health check verde.');
    if(!state.token)return authPanel('ATLAS Backups');
    try{const data=await backups();return `<section class="panel operational-panel"><div class="panel-head"><h2>ATLAS Backups</h2><span class="healthy">OPERATIVO</span></div><button class="action" id="opBackup">Crear backup real</button><div class="activity-list">${(data.backups||[]).map(b=>`<div class="row-line"><span>${esc(b.r2_key)}</span><code>${esc(b.sha256).slice(0,16)}…</code></div>`).join('')||'<p>No hay backups todavía.</p>'}</div></section>`}catch(e){return blockedPanel('ATLAS Backups',e.message)}
  }
  function authPanel(target){return `<section class="panel operational-panel"><div class="panel-head"><h2>${esc(target)}</h2><span class="blocked">LOGIN REQUERIDO</span></div><div class="operational-form"><input id="opEmail" type="email" value="atlashealthfrontiers@gmail.com" placeholder="Correo"><input id="opPassword" type="password" placeholder="Contraseña"><button class="action" id="opLogin">Iniciar sesión real</button><p id="opAuthMessage"></p></div></section>`}
  async function statusView(){await health();return `<section class="panel operational-panel"><div class="panel-head"><h2>Operational Core</h2><span class="${state.health?.production_gate==='infrastructure_connected'?'healthy':'blocked'}">${esc(state.health?.production_gate||'blocked').toUpperCase()}</span></div><pre>${esc(JSON.stringify(state.health,null,2))}</pre></section>`}
  async function bind(container,rerender){
    container.querySelector('#opLogin')?.addEventListener('click',async()=>{const msg=container.querySelector('#opAuthMessage');try{await login(container.querySelector('#opEmail').value,container.querySelector('#opPassword').value);await rerender()}catch(e){if(msg)msg.textContent=e.message}});
    container.querySelector('#opCreatePage')?.addEventListener('click',async()=>{try{await createPage({title:container.querySelector('#opPageTitle').value,slug:container.querySelector('#opPageSlug').value,body:container.querySelector('#opPageBody').value});await rerender()}catch(e){alert(e.message)}});
    container.querySelectorAll('.op-publish').forEach(b=>b.addEventListener('click',async()=>{try{const r=await publishPage(b.dataset.id);if(r.url)window.open(r.url,'_blank');await rerender()}catch(e){alert(e.message)}}));
    container.querySelector('#opBackup')?.addEventListener('click',async()=>{try{const r=await createBackup();alert(`Backup real creado\n${r.backup?.key||''}\nSHA-256: ${r.backup?.sha256||''}`);await rerender()}catch(e){alert(e.message)}})
  }
  window.ATLASOperationalUI={health,pagesView,backupsView,statusView,bind,moduleStatus,logout};
})();
