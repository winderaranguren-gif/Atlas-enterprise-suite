const state={token:sessionStorage.getItem('atlas.session')||'',session:null,scope:null,incidents:[]};
const $=id=>document.getElementById(id);

function scopedHeaders(extra={}){
  const headers={...extra};
  if(state.token) headers.authorization=`Bearer ${state.token}`;
  if(state.scope){
    headers['x-atlas-organization']=state.scope.organization_id;
    headers['x-atlas-dba']=state.scope.dba_id;
  }
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

function canCreate(){return ['owner','admin','member'].includes(state.scope?.role);}
function canResolve(){return ['owner','admin'].includes(state.scope?.role);}
function text(value){return value===null||value===undefined||value===''?'—':String(value);}
function formatDate(value){if(!value)return '—';const date=new Date(String(value).replace(' ','T')+'Z');return Number.isNaN(date.getTime())?String(value):date.toLocaleString();}

function renderScope(){
  const selector=$('scope');
  selector.replaceChildren(...(state.session?.scopes||[]).map((scope,index)=>{
    const option=document.createElement('option');
    option.value=String(index);
    option.textContent=`${scope.organization_name} · ${scope.dba_name} · ${scope.role}`;
    return option;
  }));
  state.scope=state.session?.scopes?.[0]||null;
  $('createIncident').disabled=!canCreate();
}

function renderPosture(posture){
  $('score').textContent=String(posture.operationalScore);
  $('active').textContent=String(posture.activeIncidents);
  $('critical').textContent=String(posture.activeBySeverity?.critical||0);
  $('total').textContent=String(posture.totalIncidents);
  $('methodology').textContent=posture.methodology||'';
  $('postureLevel').textContent=String(posture.level||'unknown').toUpperCase();
  $('postureDot').className=`dot ${posture.level||''}`;
}

function actionButton(label,action,incident,enabled=true){
  const button=document.createElement('button');
  button.type='button';
  button.className='secondary';
  button.textContent=label;
  button.disabled=!enabled;
  button.addEventListener('click',()=>act(incident,action));
  return button;
}

function renderIncidents(){
  const tbody=$('incidentRows');
  tbody.replaceChildren();
  if(!state.incidents.length){
    const tr=document.createElement('tr');const td=document.createElement('td');td.colSpan=7;td.className='muted';td.textContent='No incidents in this scope.';tr.append(td);tbody.append(tr);return;
  }
  for(const incident of state.incidents){
    const tr=document.createElement('tr');
    const sev=document.createElement('td');const sevTag=document.createElement('span');sevTag.className='tag';sevTag.textContent=String(incident.severity||'').toUpperCase();sev.append(sevTag);tr.append(sev);
    const summary=document.createElement('td');const strong=document.createElement('strong');strong.textContent=text(incident.title);summary.append(strong);if(incident.description){const detail=document.createElement('div');detail.className='muted';detail.textContent=incident.description;summary.append(detail);}tr.append(summary);
    for(const value of [incident.category,incident.status]){const td=document.createElement('td');td.textContent=text(value);tr.append(td);}
    const source=document.createElement('td');source.textContent=[incident.source,incident.location_label].filter(Boolean).join(' · ')||'—';tr.append(source);
    const created=document.createElement('td');created.textContent=formatDate(incident.created_at);tr.append(created);
    const actions=document.createElement('td');actions.className='actions';
    if(incident.status==='open') actions.append(actionButton('Acknowledge','acknowledge',incident,canCreate()));
    if(incident.status==='open'||incident.status==='acknowledged') actions.append(actionButton('Contain','contain',incident,canCreate()));
    if(incident.status!=='resolved') actions.append(actionButton('Resolve','resolve',incident,canResolve()));
    if(incident.status==='resolved') actions.append(actionButton('Reopen','reopen',incident,canResolve()));
    const history=document.createElement('button');history.type='button';history.className='secondary';history.textContent='History';history.style.marginLeft='6px';history.addEventListener('click',()=>loadHistory(incident));actions.append(history);
    tr.append(actions);tbody.append(tr);
  }
}

async function loadPosture(){
  try{const body=await api('/api/security/posture');renderPosture(body.posture);}catch(error){$('methodology').textContent=error.message;}
}

async function loadIncidents(){
  $('queueMessage').textContent='Loading…';
  const params=new URLSearchParams();
  if($('statusFilter').value) params.set('status',$('statusFilter').value);
  if($('severityFilter').value) params.set('severity',$('severityFilter').value);
  try{
    const body=await api(`/api/security/incidents${params.size?`?${params}`:''}`);
    state.incidents=body.incidents||[];
    renderIncidents();
    $('queueMessage').textContent=`${state.incidents.length} incident${state.incidents.length===1?'':'s'} loaded.`;
  }catch(error){state.incidents=[];renderIncidents();$('queueMessage').textContent=error.message;}
}

async function refresh(){if(!state.scope)return;await Promise.all([loadPosture(),loadIncidents()]);}

async function createIncident(event){
  event.preventDefault();
  if(!canCreate())return;
  const payload={title:$('title').value,category:$('category').value,severity:$('severity').value,source:$('source').value,locationLabel:$('location').value,description:$('description').value};
  $('formMessage').textContent='Creating incident…';
  try{
    await api('/api/security/incidents',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(payload)});
    $('incidentForm').reset();$('severity').value='medium';$('formMessage').textContent='Incident created.';$('formMessage').className='success';await refresh();
  }catch(error){$('formMessage').textContent=error.message;$('formMessage').className='error';}
}

async function act(incident,action){
  let note='';
  if(action==='resolve'||action==='reopen') note=window.prompt(`Optional note for ${action}:`,'')||'';
  $('queueMessage').textContent=`Applying ${action}…`;
  try{
    await api(`/api/security/incidents/${encodeURIComponent(incident.id)}/actions`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({action,note})});
    await refresh();
  }catch(error){$('queueMessage').textContent=error.message;}
}

async function loadHistory(incident){
  $('historyCard').classList.remove('hidden');
  $('historyIncident').textContent=`${incident.title} · ${incident.id}`;
  $('history').textContent='Loading…';
  try{
    const body=await api(`/api/security/incidents/${encodeURIComponent(incident.id)}/events`);
    $('history').replaceChildren(...(body.events||[]).map(event=>{
      const item=document.createElement('div');item.className='history-item';
      const top=document.createElement('div');const strong=document.createElement('strong');strong.textContent=event.event_type;const time=document.createElement('span');time.className='muted';time.style.marginLeft='8px';time.textContent=formatDate(event.created_at);top.append(strong,time);
      const transition=document.createElement('div');transition.className='mono';transition.textContent=`${text(event.from_status)} → ${text(event.to_status)} · actor ${text(event.actor_user_id)}`;
      item.append(top,transition);
      if(event.note){const note=document.createElement('div');note.className='muted';note.textContent=event.note;item.append(note);}
      return item;
    }));
  }catch(error){$('history').textContent=error.message;}
  $('historyCard').scrollIntoView({behavior:'smooth',block:'start'});
}

async function hydrate(){
  if(!state.token){$('identity').textContent='No ATLAS session';$('sessionMessage').textContent='Sign in from the Enterprise Suite first.';return;}
  try{
    state.session=await api('/api/auth/session');
    if(!(state.session.scopes||[]).length) throw new Error('No Organization / DBA scopes available.');
    $('identity').textContent=state.session.user?.displayName||state.session.user?.email||'ATLAS user';
    $('sessionMessage').textContent=state.session.user?.email||'';
    renderScope();$('app').classList.remove('hidden');await refresh();
  }catch(error){$('identity').textContent='Session unavailable';$('sessionMessage').textContent=error.message;}
}

$('incidentForm').addEventListener('submit',createIncident);
$('reload').addEventListener('click',refresh);
$('statusFilter').addEventListener('change',loadIncidents);
$('severityFilter').addEventListener('change',loadIncidents);
$('closeHistory').addEventListener('click',()=>$('historyCard').classList.add('hidden'));
$('scope').addEventListener('change',async event=>{
  state.scope=state.session.scopes[Number(event.target.value)]||state.session.scopes[0];
  $('createIncident').disabled=!canCreate();
  $('historyCard').classList.add('hidden');
  await refresh();
});

hydrate();
