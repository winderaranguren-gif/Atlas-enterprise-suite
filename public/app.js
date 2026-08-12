const copy={
  en:{language:'Language',eyebrow:'Enterprise operating system',title:'Production Control Center',subtitle:'Live runtime information from the deployed ATLAS Worker. Nothing on this screen is marked operational unless the backend reports it.',checking:'Checking runtime…',reachable:'Worker reachable',unreachable:'Runtime unavailable',deployment:'Deployment',modules:'ATLAS modules',bound:'Bound',missing:'Missing',reachableDb:'Reachable',unreachableDb:'Unreachable',signIn:'Sign in',email:'Email',password:'Password',submit:'Sign in',signedIn:'Signed in',scope:'Organization / DBA',logout:'Log out',workspace:'Commercial pilot workspace',refresh:'Refresh live data',users:'Users & permissions',crm:'CRM contacts',documents:'Documents',accounts:'Accounts',journals:'Journal entries',backups:'Backups',audit:'Audit events',restricted:'Restricted',loading:'Loading…',noSession:'Sign in to load scoped production data.',loginFailed:'Sign-in failed'},
  es:{language:'Idioma',eyebrow:'Sistema operativo empresarial',title:'Centro de Control de Producción',subtitle:'Información en vivo del Worker ATLAS desplegado. Nada en esta pantalla se marca operativo salvo que el backend lo reporte.',checking:'Comprobando runtime…',reachable:'Worker disponible',unreachable:'Runtime no disponible',deployment:'Despliegue',modules:'Módulos ATLAS',bound:'Conectado',missing:'No conectado',reachableDb:'Disponible',unreachableDb:'No disponible',signIn:'Iniciar sesión',email:'Correo',password:'Contraseña',submit:'Entrar',signedIn:'Sesión iniciada',scope:'Organización / DBA',logout:'Cerrar sesión',workspace:'Espacio del piloto comercial',refresh:'Actualizar datos reales',users:'Usuarios y permisos',crm:'Contactos CRM',documents:'Documentos',accounts:'Cuentas',journals:'Asientos contables',backups:'Respaldos',audit:'Eventos de auditoría',restricted:'Restringido',loading:'Cargando…',noSession:'Inicia sesión para cargar datos de producción por alcance.',loginFailed:'Error de inicio de sesión'}
};

const state={token:sessionStorage.getItem('atlas.session')||'',session:null,scope:null,health:null};
const languageKey='atlas.language';
let lang=localStorage.getItem(languageKey)==='es'?'es':'en';
const $=id=>document.getElementById(id);

function t(key){return copy[lang][key]||key;}
function translate(){
  document.documentElement.lang=lang;
  document.querySelectorAll('[data-i18n]').forEach(el=>{el.textContent=t(el.dataset.i18n);});
}
function scopedHeaders(extra={}){
  const headers={...extra};
  if(state.token) headers.authorization=`Bearer ${state.token}`;
  if(state.scope){headers['x-atlas-organization']=state.scope.organization_id;headers['x-atlas-dba']=state.scope.dba_id;}
  return headers;
}
async function api(path,options={}){
  const response=await fetch(path,{cache:'no-store',...options,headers:scopedHeaders(options.headers||{})});
  const text=await response.text();
  let body={};
  try{body=text?JSON.parse(text):{};}catch{throw new Error(`HTTP ${response.status}: invalid JSON`);}
  if(!response.ok||body.ok===false){const error=new Error(body.error||`HTTP ${response.status}`);error.status=response.status;throw error;}
  return body;
}
function renderHealth(h){
  if(!h)return; state.health=h;
  $('d1').textContent=h.bindings?.d1?(h.d1Reachable?t('reachableDb'):t('unreachableDb')):t('missing');
  $('r2').textContent=h.bindings?.r2?t('bound'):t('missing');
  $('assets').textContent=h.bindings?.assets?t('bound'):t('missing');
  $('sha').textContent=h.deployedSha||'unknown';
  const el=$('runtimeStatus');el.className='status '+(h.d1Reachable?'ok':'bad');el.lastElementChild.textContent=t(h.d1Reachable?'reachable':'unreachable');
}
function setAuthView(){
  const signed=Boolean(state.session&&state.token);
  $('loginCard').classList.toggle('hidden',signed);
  $('sessionCard').classList.toggle('hidden',!signed);
  $('workspace').classList.toggle('hidden',!signed);
  if(!signed){$('workspaceMessage').textContent=t('noSession');return;}
  $('userIdentity').textContent=state.session.user.displayName?`${state.session.user.displayName} · ${state.session.user.email}`:state.session.user.email;
  const selector=$('scopeSelector'); selector.replaceChildren(...state.session.scopes.map((s,i)=>{
    const option=document.createElement('option');option.value=String(i);option.textContent=`${s.organization_name} · ${s.dba_name} · ${s.role}`;return option;
  }));
  const currentIndex=Math.max(0,state.session.scopes.findIndex(s=>state.scope&&s.organization_id===state.scope.organization_id&&s.dba_id===state.scope.dba_id));
  selector.value=String(currentIndex);state.scope=state.session.scopes[currentIndex];
}
function metric(id,value,detail=''){$(id).querySelector('strong').textContent=value;$(id).querySelector('.detail').textContent=detail;}
async function loadMetric(id,path,key){
  metric(id,t('loading'));
  try{const body=await api(path);const rows=body[key]||[];metric(id,String(rows.length),'live');}
  catch(error){metric(id,error.status===403?t('restricted'):'Error',error.message);}
}
async function refreshWorkspace(){
  if(!state.scope)return;
  $('workspaceMessage').textContent=`${state.scope.organization_name} / ${state.scope.dba_name} · ${state.scope.role}`;
  await Promise.all([
    loadMetric('metricUsers','/api/identity/memberships','memberships'),
    loadMetric('metricCrm','/api/crm/contacts','contacts'),
    loadMetric('metricDocuments','/api/documents','documents'),
    loadMetric('metricAccounts','/api/accounting/accounts','accounts'),
    loadMetric('metricJournals','/api/accounting/journals','journals'),
    loadMetric('metricBackups','/api/backups','backups'),
    loadMetric('metricAudit','/api/audit-events','events')
  ]);
}
async function hydrateSession(){
  if(!state.token){state.session=null;setAuthView();return;}
  try{state.session=await api('/api/auth/session');state.scope=state.session.scopes[0];setAuthView();await refreshWorkspace();}
  catch{sessionStorage.removeItem('atlas.session');state.token='';state.session=null;state.scope=null;setAuthView();}
}
async function login(event){
  event.preventDefault();$('loginError').textContent='';
  try{
    const body=await api('/api/auth/login',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({email:$('email').value,password:$('password').value})});
    state.token=body.session.token;sessionStorage.setItem('atlas.session',state.token);state.session=body;state.scope=body.scopes[0];$('password').value='';setAuthView();await refreshWorkspace();
  }catch(error){$('loginError').textContent=`${t('loginFailed')}: ${error.message}`;}
}
async function logout(){
  try{if(state.token)await api('/api/auth/logout',{method:'POST'});}catch{}
  sessionStorage.removeItem('atlas.session');state.token='';state.session=null;state.scope=null;setAuthView();
}
async function boot(){
  translate();
  try{
    const [healthRes,metaRes]=await Promise.all([fetch('/api/health',{cache:'no-store'}),fetch('/api/meta',{cache:'no-store'})]);
    if(!healthRes.ok||!metaRes.ok)throw new Error(`HTTP ${healthRes.status}/${metaRes.status}`);
    const health=await healthRes.json();const meta=await metaRes.json();renderHealth(health);
    $('modules').replaceChildren(...meta.modules.map(m=>{const el=document.createElement('div');el.className='module';el.innerHTML=`<strong>${m.name}</strong><span class="muted">${m.layer}${m.domain?' · '+m.domain:''}</span>`;return el;}));
  }catch(error){const status=$('runtimeStatus');status.className='status bad';status.lastElementChild.textContent=t('unreachable');$('runtimeError').textContent=String(error.message||error);$('runtimeError').classList.remove('hidden');}
  await hydrateSession();
}

$('language').value=lang;
$('language').addEventListener('change',()=>{lang=$('language').value==='es'?'es':'en';localStorage.setItem(languageKey,lang);translate();renderHealth(state.health);setAuthView();});
$('loginForm').addEventListener('submit',login);
$('logout').addEventListener('click',logout);
$('refreshWorkspace').addEventListener('click',refreshWorkspace);
$('scopeSelector').addEventListener('change',async()=>{state.scope=state.session.scopes[Number($('scopeSelector').value)||0];await refreshWorkspace();});
boot();
