import { requireSession } from './auth.js';
import { requireTenantPermission } from './tenant.js';
import { appendAuditLedger } from './audit.js';

const COMPANY_PROFILES = Object.freeze({
  'global-promo': {
    key: 'global-promo',
    name: 'Global Promo LLC',
    industry: 'Promotional products, embroidery and production',
    ownerModule: 'Enterprise Operations',
    related: ['CRM','Finance','Inventory','Purchasing','HR','Documents'],
    workflows: {
      order: {
        label: 'Customer Order',
        stages: ['Request','Quote','Artwork','Customer Approval','Materials','Production','Quality Control','Delivery','Invoice','Payment'],
        approvalStages: ['Customer Approval','Quality Control']
      }
    }
  },
  'aw-finance': {
    key: 'aw-finance',
    name: 'AW Finance Advisory Solutions',
    industry: 'Financial advisory and business operations',
    ownerModule: 'Finance',
    related: ['CRM','Documents','Projects','Accounting','Tax','HR'],
    workflows: {
      engagement: {
        label: 'Client Engagement',
        stages: ['Lead','Discovery','Scope','Engagement','Documents','Analysis','Recommendations','Delivery','Billing','Follow-up'],
        approvalStages: ['Scope','Recommendations']
      }
    }
  },
  'advantage-health': {
    key: 'advantage-health',
    name: 'Advantage Health',
    industry: 'Health operations',
    ownerModule: 'Health',
    related: ['Documents','Scheduling','Billing','Messaging','Security'],
    workflows: {
      service: {
        label: 'Health Service Operations',
        stages: ['Intake','Eligibility','Scheduling','Service','Documentation','Follow-up','Billing','Closed'],
        approvalStages: ['Eligibility','Documentation']
      }
    }
  }
});

let schemaReady = false;
let schemaPromise = null;

const schemaStatements = [
  `CREATE TABLE IF NOT EXISTS company_work_items (
    id TEXT PRIMARY KEY,
    organization_id TEXT NOT NULL,
    dba_id TEXT NOT NULL,
    company_key TEXT NOT NULL,
    workflow_type TEXT NOT NULL,
    external_ref TEXT,
    title TEXT NOT NULL,
    party_name TEXT,
    amount_cents INTEGER,
    currency TEXT NOT NULL DEFAULT 'USD',
    stage TEXT NOT NULL,
    stage_index INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'open',
    priority TEXT NOT NULL DEFAULT 'normal',
    owner_user_id TEXT,
    due_date TEXT,
    metadata_json TEXT,
    created_by_user_id TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CHECK (status IN ('open','in_progress','blocked','completed','cancelled')),
    CHECK (priority IN ('low','normal','high','urgent')),
    CHECK (amount_cents IS NULL OR amount_cents >= 0)
  )`,
  `CREATE INDEX IF NOT EXISTS idx_company_work_items_scope
    ON company_work_items(organization_id,dba_id,company_key,workflow_type,status,stage_index,updated_at DESC)`,
  `CREATE TABLE IF NOT EXISTS company_work_item_events (
    id TEXT PRIMARY KEY,
    work_item_id TEXT NOT NULL,
    organization_id TEXT NOT NULL,
    dba_id TEXT NOT NULL,
    event_type TEXT NOT NULL,
    from_stage TEXT,
    to_stage TEXT,
    note TEXT,
    actor_user_id TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(work_item_id) REFERENCES company_work_items(id) ON DELETE CASCADE
  )`,
  `CREATE INDEX IF NOT EXISTS idx_company_work_item_events_item
    ON company_work_item_events(work_item_id,created_at DESC)`
];

const json=(body,status=200)=>Response.json(body,{status,headers:{
  'cache-control':'no-store',
  'x-content-type-options':'nosniff'
}});

const html=(body,status=200)=>new Response(body,{status,headers:{
  'content-type':'text/html; charset=utf-8',
  'cache-control':'no-store',
  'x-content-type-options':'nosniff',
  'referrer-policy':'strict-origin-when-cross-origin',
  'permissions-policy':'camera=(), microphone=(), geolocation=()',
  'content-security-policy':"default-src 'self'; img-src 'self' data:; style-src 'unsafe-inline'; script-src 'self'; connect-src 'self'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'"
}});

function profileFor(key){ return COMPANY_PROFILES[key] || null; }
function firstWorkflow(profile){ return Object.keys(profile.workflows)[0]; }
function clean(value,max=180){ return String(value ?? '').trim().replace(/\s+/g,' ').slice(0,max); }
function parseMetadata(value){
  if(value==null)return null;
  if(typeof value==='object' && !Array.isArray(value))return value;
  return null;
}
function stageConfig(profile,workflowType){
  const workflow=profile?.workflows?.[workflowType];
  if(!workflow)return null;
  return workflow;
}
function rowToItem(row){
  let metadata=null;
  try{metadata=row.metadata_json?JSON.parse(row.metadata_json):null}catch{}
  return {
    id:row.id,companyKey:row.company_key,workflowType:row.workflow_type,externalRef:row.external_ref,
    title:row.title,partyName:row.party_name,amountCents:row.amount_cents,currency:row.currency,
    stage:row.stage,stageIndex:Number(row.stage_index||0),status:row.status,priority:row.priority,
    ownerUserId:row.owner_user_id,dueDate:row.due_date,metadata,createdAt:row.created_at,updatedAt:row.updated_at
  };
}

async function ensureCompanyOperationsSchema(env){
  if(schemaReady)return {ok:true,created:false};
  if(!env?.DB)return {ok:false,error:'identity_database_unavailable'};
  if(!schemaPromise){
    schemaPromise=(async()=>{
      for(const sql of schemaStatements)await env.DB.prepare(sql).run();
      schemaReady=true;
      return {ok:true,created:true};
    })().catch(error=>{schemaPromise=null;throw error});
  }
  return schemaPromise;
}

async function authorize(request,env,permission='module.read',action='company_operations.read'){
  const authz=await requireTenantPermission(request,env,permission,action);
  if(!authz.ok)return {response:json({ok:false,error:authz.error},authz.status)};
  try{
    const ready=await ensureCompanyOperationsSchema(env);
    if(!ready.ok)return {response:json({ok:false,error:ready.error},503)};
  }catch(error){
    console.error('company_operations_schema_failed',error?.message||error);
    return {response:json({ok:false,error:'company_operations_schema_unavailable'},503)};
  }
  return {authz};
}

async function audit(env,authz,action,metadata={}){
  try{
    await appendAuditLedger(env,{
      organizationId:authz.organizationId,dbaId:authz.dbaId,actorUserId:authz.session?.user_id||null,
      category:'operations',action,decision:'allow',severity:'info',correlationId:authz.correlationId,
      metadata
    });
  }catch{}
}

async function catalog(request,env){
  const auth=await requireSession(request,env);
  if(!auth.ok)return json({ok:false,error:auth.error},auth.status);
  return json({ok:true,companies:Object.values(COMPANY_PROFILES)});
}

async function listItems(request,env,url,companyKey){
  const gate=await authorize(request,env,'module.read','company_operations.list');
  if(gate.response)return gate.response;
  const {authz}=gate;
  const profile=profileFor(companyKey); if(!profile)return json({ok:false,error:'company_not_found'},404);
  const workflowType=clean(url.searchParams.get('workflow')||firstWorkflow(profile),60);
  if(!stageConfig(profile,workflowType))return json({ok:false,error:'workflow_not_found'},404);
  const status=clean(url.searchParams.get('status')||'',30);
  const stage=clean(url.searchParams.get('stage')||'',100);
  const q=clean(url.searchParams.get('q')||'',120);
  const clauses=['organization_id=?','dba_id=?','company_key=?','workflow_type=?'];
  const bindings=[authz.organizationId,authz.dbaId,companyKey,workflowType];
  if(status){clauses.push('status=?');bindings.push(status)}
  if(stage){clauses.push('stage=?');bindings.push(stage)}
  if(q){clauses.push('(title LIKE ? OR party_name LIKE ? OR external_ref LIKE ?)');const like=`%${q}%`;bindings.push(like,like,like)}
  const rows=await env.DB.prepare(`SELECT * FROM company_work_items WHERE ${clauses.join(' AND ')} ORDER BY updated_at DESC LIMIT 250`).bind(...bindings).all();
  const counts=await env.DB.prepare(`SELECT status,COUNT(*) AS count FROM company_work_items WHERE organization_id=? AND dba_id=? AND company_key=? AND workflow_type=? GROUP BY status`)
    .bind(authz.organizationId,authz.dbaId,companyKey,workflowType).all();
  return json({ok:true,profile,workflowType,items:(rows.results||[]).map(rowToItem),counts:counts.results||[]});
}

async function createItem(request,env,companyKey){
  const gate=await authorize(request,env,'module.write','company_operations.create');
  if(gate.response)return gate.response;
  const {authz}=gate;
  const profile=profileFor(companyKey); if(!profile)return json({ok:false,error:'company_not_found'},404);
  const body=await request.json().catch(()=>null);
  const workflowType=clean(body?.workflowType||firstWorkflow(profile),60);
  const workflow=stageConfig(profile,workflowType); if(!workflow)return json({ok:false,error:'workflow_not_found'},404);
  const title=clean(body?.title,180); if(title.length<2)return json({ok:false,error:'title_required'},400);
  const partyName=clean(body?.partyName,180)||null;
  const externalRef=clean(body?.externalRef,100)||null;
  const priority=clean(body?.priority||'normal',20);
  if(!['low','normal','high','urgent'].includes(priority))return json({ok:false,error:'invalid_priority'},400);
  const amountRaw=body?.amountCents;
  const amountCents=amountRaw==null||amountRaw===''?null:Number(amountRaw);
  if(amountCents!=null&&(!Number.isInteger(amountCents)||amountCents<0))return json({ok:false,error:'invalid_amount_cents'},400);
  const dueDate=clean(body?.dueDate,20)||null;
  const metadata=parseMetadata(body?.metadata);
  const id=crypto.randomUUID(),stage=workflow.stages[0];
  await env.DB.batch([
    env.DB.prepare(`INSERT INTO company_work_items
      (id,organization_id,dba_id,company_key,workflow_type,external_ref,title,party_name,amount_cents,currency,stage,stage_index,status,priority,owner_user_id,due_date,metadata_json,created_by_user_id)
      VALUES(?,?,?,?,?,?,?,?,?,'USD',?,0,'open',?,?,?,?,?)`)
      .bind(id,authz.organizationId,authz.dbaId,companyKey,workflowType,externalRef,title,partyName,amountCents,stage,priority,authz.session.user_id,dueDate,metadata?JSON.stringify(metadata):null,authz.session.user_id),
    env.DB.prepare(`INSERT INTO company_work_item_events(id,work_item_id,organization_id,dba_id,event_type,to_stage,note,actor_user_id)
      VALUES(?,?,?,?, 'created',?,?,?)`).bind(crypto.randomUUID(),id,authz.organizationId,authz.dbaId,stage,'Work item created',authz.session.user_id)
  ]);
  await audit(env,authz,'company_work_item.create',{companyKey,workflowType,workItemId:id,stage});
  return json({ok:true,item:{id,companyKey,workflowType,title,partyName,stage,stageIndex:0,status:'open',priority,dueDate,amountCents}},201);
}

async function updateItem(request,env,companyKey,itemId){
  const gate=await authorize(request,env,'module.write','company_operations.update');
  if(gate.response)return gate.response;
  const {authz}=gate;
  const profile=profileFor(companyKey); if(!profile)return json({ok:false,error:'company_not_found'},404);
  const row=await env.DB.prepare(`SELECT * FROM company_work_items WHERE id=? AND organization_id=? AND dba_id=? AND company_key=?`)
    .bind(itemId,authz.organizationId,authz.dbaId,companyKey).first();
  if(!row)return json({ok:false,error:'work_item_not_found'},404);
  const workflow=stageConfig(profile,row.workflow_type); if(!workflow)return json({ok:false,error:'workflow_not_found'},409);
  const body=await request.json().catch(()=>null);
  const action=clean(body?.action||'update',30);
  let nextStage=row.stage,nextIndex=Number(row.stage_index||0),nextStatus=row.status,eventType='updated',note=clean(body?.note,500)||null;
  if(action==='advance'){
    if(nextIndex>=workflow.stages.length-1)return json({ok:false,error:'already_at_final_stage'},409);
    nextIndex+=1;nextStage=workflow.stages[nextIndex];nextStatus=nextIndex===workflow.stages.length-1?'completed':'in_progress';eventType='stage_advanced';
  }else if(action==='block'){
    nextStatus='blocked';eventType='blocked';
  }else if(action==='resume'){
    nextStatus='in_progress';eventType='resumed';
  }else if(action==='cancel'){
    nextStatus='cancelled';eventType='cancelled';
  }else if(action!=='update'){
    return json({ok:false,error:'unsupported_action'},400);
  }
  const priority=clean(body?.priority||row.priority,20);
  if(!['low','normal','high','urgent'].includes(priority))return json({ok:false,error:'invalid_priority'},400);
  const dueDate=body?.dueDate===undefined?row.due_date:(clean(body.dueDate,20)||null);
  const metadata=body?.metadata===undefined?row.metadata_json:(parseMetadata(body.metadata)?JSON.stringify(parseMetadata(body.metadata)):null);
  await env.DB.batch([
    env.DB.prepare(`UPDATE company_work_items SET stage=?,stage_index=?,status=?,priority=?,due_date=?,metadata_json=?,updated_at=CURRENT_TIMESTAMP WHERE id=?`)
      .bind(nextStage,nextIndex,nextStatus,priority,dueDate,metadata,itemId),
    env.DB.prepare(`INSERT INTO company_work_item_events(id,work_item_id,organization_id,dba_id,event_type,from_stage,to_stage,note,actor_user_id)
      VALUES(?,?,?,?,?,?,?,?,?)`).bind(crypto.randomUUID(),itemId,authz.organizationId,authz.dbaId,eventType,row.stage,nextStage,note,authz.session.user_id)
  ]);
  if(workflow.approvalStages.includes(nextStage)){
    const existing=await env.DB.prepare(`SELECT id FROM operations_approvals WHERE organization_id=? AND dba_id=? AND resource_type='company_work_item' AND resource_id=? AND status='pending' LIMIT 1`)
      .bind(authz.organizationId,authz.dbaId,itemId).first().catch(()=>null);
    if(!existing){
      await env.DB.prepare(`INSERT INTO operations_approvals(id,organization_id,dba_id,title,resource_type,resource_id,requested_by_user_id,status)
        VALUES(?,?,?,?,?,?,?,'pending')`).bind(crypto.randomUUID(),authz.organizationId,authz.dbaId,`${profile.name}: ${nextStage}`, 'company_work_item', itemId, authz.session.user_id).run().catch(()=>{});
    }
  }
  await audit(env,authz,'company_work_item.update',{companyKey,workItemId:itemId,action,fromStage:row.stage,toStage:nextStage,status:nextStatus});
  return json({ok:true,item:{...rowToItem(row),stage:nextStage,stageIndex:nextIndex,status:nextStatus,priority,dueDate}});
}

async function itemEvents(request,env,companyKey,itemId){
  const gate=await authorize(request,env,'module.read','company_operations.events');
  if(gate.response)return gate.response;
  const {authz}=gate;
  const profile=profileFor(companyKey); if(!profile)return json({ok:false,error:'company_not_found'},404);
  const item=await env.DB.prepare(`SELECT id FROM company_work_items WHERE id=? AND organization_id=? AND dba_id=? AND company_key=?`)
    .bind(itemId,authz.organizationId,authz.dbaId,companyKey).first();
  if(!item)return json({ok:false,error:'work_item_not_found'},404);
  const rows=await env.DB.prepare(`SELECT id,event_type,from_stage,to_stage,note,actor_user_id,created_at FROM company_work_item_events WHERE work_item_id=? AND organization_id=? AND dba_id=? ORDER BY created_at DESC LIMIT 100`)
    .bind(itemId,authz.organizationId,authz.dbaId).all();
  return json({ok:true,events:rows.results||[]});
}

function companyOpsPage(companyKey){
  const profile=profileFor(companyKey);
  const wf=profile.workflows[firstWorkflow(profile)];
  const related=profile.related.map(x=>`<span class="tag">${x}</span>`).join('');
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${profile.name} · ATLAS</title><style>
:root{color-scheme:dark;--bg:#05111d;--panel:#0a1b2b;--panel2:#0e2437;--text:#edf8ff;--muted:#8ba7bb;--line:#1d3f59;--accent:#4edcff;--good:#65e3a4;--warn:#ffd166;--danger:#ff7c83}
*{box-sizing:border-box}body{margin:0;background:linear-gradient(150deg,#04101b,#071827 55%,#04111c);color:var(--text);font-family:Inter,system-ui,sans-serif}
a{color:inherit}.shell{display:grid;grid-template-columns:260px 1fr;min-height:100vh}.side{border-right:1px solid var(--line);padding:22px;position:sticky;top:0;height:100vh;background:#061421}
.brand{font-weight:900;letter-spacing:.15em}.muted{color:var(--muted)}.side a{display:block;text-decoration:none;padding:11px 12px;border-radius:10px;margin:4px 0}.side a:hover{background:#10273a}
.main{padding:28px}.hero{display:flex;justify-content:space-between;gap:20px;align-items:flex-start;margin-bottom:22px}.eyebrow{color:var(--accent);font-size:.72rem;letter-spacing:.15em;text-transform:uppercase}
h1{margin:.35rem 0 .45rem;font-size:clamp(1.8rem,3vw,2.8rem)}.tags{display:flex;gap:7px;flex-wrap:wrap}.tag{border:1px solid var(--line);background:#0c2031;border-radius:999px;padding:6px 9px;color:#b9d7e8;font-size:.75rem}
.grid{display:grid;grid-template-columns:minmax(0,1.4fr) minmax(320px,.6fr);gap:18px}.card{background:rgba(10,27,43,.9);border:1px solid var(--line);border-radius:18px;padding:18px}
.toolbar{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:14px}.toolbar input,.toolbar select,.form input,.form select,.form textarea{background:#071827;border:1px solid var(--line);color:var(--text);padding:10px 12px;border-radius:10px}
.toolbar input{min-width:220px;flex:1}.btn{border:0;border-radius:10px;padding:10px 13px;font-weight:800;cursor:pointer}.primary{background:linear-gradient(135deg,#76ebff,#268cff);color:#02101b}.ghost{background:#10283b;color:#d8effb;border:1px solid #214b68}.danger{background:#3a1720;color:#ffb7bd}
.item{border:1px solid var(--line);border-radius:14px;padding:14px;margin:10px 0;background:#081a29}.item-head{display:flex;justify-content:space-between;gap:12px}.stagebar{display:flex;gap:4px;margin:12px 0 8px;overflow:auto}.stage{height:7px;min-width:28px;flex:1;border-radius:99px;background:#16354b}.stage.done{background:#3dcaf0}.meta{display:flex;gap:12px;flex-wrap:wrap;font-size:.82rem;color:var(--muted)}.actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}
.empty{text-align:center;color:var(--muted);padding:36px 10px}.status{font-size:.75rem;border-radius:999px;padding:5px 8px;border:1px solid var(--line)}.form{display:grid;gap:10px}.form label{display:grid;gap:5px;font-size:.8rem;color:var(--muted)}
.flow{display:flex;gap:7px;overflow:auto;padding-bottom:5px}.flow span{white-space:nowrap;padding:7px 9px;border-radius:9px;background:#0b2133;border:1px solid var(--line);font-size:.75rem}
.notice{padding:10px 12px;border:1px solid #28526d;background:#092338;border-radius:12px;color:#b9d7e8;font-size:.86rem}.error{border-color:#703240;background:#2c1218;color:#ffc3c7}
@media(max-width:980px){.shell{grid-template-columns:1fr}.side{position:relative;height:auto;border-right:0;border-bottom:1px solid var(--line)}.grid{grid-template-columns:1fr}.main{padding:18px}}
</style></head><body><div class="shell"><aside class="side"><div class="brand">ATLAS</div><p class="muted">Company Operations</p>
<a href="/dashboard">← Dashboard</a><a href="/platform/finance">Finance</a><a href="/platform/crm">CRM</a><a href="/platform/operations">Operations</a><a href="/platform/documents">Documents</a>
</aside><main class="main"><section class="hero"><div><div class="eyebrow">${profile.ownerModule}</div><h1>${profile.name}</h1><p class="muted">${profile.industry}</p><div class="tags">${related}</div></div><div id="scope" class="notice">Cargando tenant…</div></section>
<section class="card" style="margin-bottom:18px"><strong>Flujo operativo real</strong><div class="flow" style="margin-top:12px">${wf.stages.map(x=>`<span>${x}</span>`).join('')}</div></section>
<div class="grid"><section class="card"><div class="toolbar"><input id="search" placeholder="Buscar trabajo real…"><select id="statusFilter"><option value="">Todos los estados</option><option>open</option><option>in_progress</option><option>blocked</option><option>completed</option><option>cancelled</option></select><button class="btn ghost" id="refresh">Actualizar</button></div><div id="items" class="empty">Cargando…</div></section>
<aside class="card"><h3 style="margin-top:0">Crear trabajo</h3><form id="createForm" class="form"><label>Título<input name="title" required maxlength="180"></label><label>Cliente / contraparte<input name="partyName" maxlength="180"></label><label>Referencia<input name="externalRef" maxlength="100"></label><label>Monto estimado USD<input name="amount" type="number" min="0" step="0.01"></label><label>Prioridad<select name="priority"><option>normal</option><option>high</option><option>urgent</option><option>low</option></select></label><label>Fecha objetivo<input name="dueDate" type="date"></label><button class="btn primary">Crear registro</button></form><div id="formMsg" style="margin-top:10px"></div></aside></div>
</main></div><script src="/assets/atlas-company-operations.js" defer></script></body></html>`;
}

function companyOpsClient(){
return `(()=>{const companyKey=location.pathname.split('/').filter(Boolean).pop();let scope=null,profile=null,items=[];const $=id=>document.getElementById(id);const esc=s=>String(s??'').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c]));async function context(){const r=await fetch('/api/core/context',{credentials:'include'});const j=await r.json();if(!r.ok||!j.scopes?.length)throw new Error(j.error||'No active ATLAS tenant');scope=j.scopes[0];$('scope').textContent=scope.organization.name+' · '+scope.dba.name+' · '+scope.role}function headers(write=false){const h={'x-atlas-organization':scope.organization.id,'x-atlas-dba':scope.dba.id};if(write)h['content-type']='application/json';return h}async function load(){if(!scope)return;const p=new URLSearchParams();const q=$('search').value.trim(),st=$('statusFilter').value;if(q)p.set('q',q);if(st)p.set('status',st);const r=await fetch('/api/company-ops/'+companyKey+'/items?'+p,{headers:headers(),credentials:'include'});const j=await r.json();if(!r.ok)throw new Error(j.error||'Unable to load');profile=j.profile;items=j.items||[];render()}function render(){const el=$('items');if(!items.length){el.className='empty';el.textContent='No hay registros reales todavía. Crea el primero para este tenant.';return}el.className='';const stages=profile.workflows[Object.keys(profile.workflows)[0]].stages;el.innerHTML=items.map(x=>'<article class="item"><div class="item-head"><div><strong>'+esc(x.title)+'</strong><div class="muted">'+esc(x.partyName||x.externalRef||'Sin contraparte')+'</div></div><span class="status">'+esc(x.status)+'</span></div><div class="stagebar">'+stages.map((s,i)=>'<span class="stage '+(i<=x.stageIndex?'done':'')+'" title="'+esc(s)+'"></span>').join('')+'</div><div class="meta"><span>Etapa: '+esc(x.stage)+'</span><span>Prioridad: '+esc(x.priority)+'</span>'+(x.amountCents!=null?'<span>$'+(x.amountCents/100).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})+'</span>':'')+(x.dueDate?'<span>Objetivo: '+esc(x.dueDate)+'</span>':'')+'</div><div class="actions">'+(x.status!=='completed'&&x.status!=='cancelled'?'<button class="btn primary" data-action="advance" data-id="'+x.id+'">Avanzar etapa</button>':'')+(x.status==='blocked'?'<button class="btn ghost" data-action="resume" data-id="'+x.id+'">Reanudar</button>':'<button class="btn ghost" data-action="block" data-id="'+x.id+'">Bloquear</button>')+(x.status!=='cancelled'&&x.status!=='completed'?'<button class="btn danger" data-action="cancel" data-id="'+x.id+'">Cancelar</button>':'')+'</div></article>').join('')}async function mutate(id,action){const r=await fetch('/api/company-ops/'+companyKey+'/items/'+id,{method:'PATCH',headers:headers(true),credentials:'include',body:JSON.stringify({action})});const j=await r.json();if(!r.ok)throw new Error(j.error||'Action failed');await load()}$('items').addEventListener('click',e=>{const b=e.target.closest('button[data-action]');if(!b)return;mutate(b.dataset.id,b.dataset.action).catch(showError)});$('refresh').addEventListener('click',()=>load().catch(showError));$('statusFilter').addEventListener('change',()=>load().catch(showError));let timer;$('search').addEventListener('input',()=>{clearTimeout(timer);timer=setTimeout(()=>load().catch(showError),250)});$('createForm').addEventListener('submit',async e=>{e.preventDefault();const fd=new FormData(e.currentTarget);const amount=fd.get('amount');const payload={title:fd.get('title'),partyName:fd.get('partyName'),externalRef:fd.get('externalRef'),priority:fd.get('priority'),dueDate:fd.get('dueDate'),amountCents:amount?Math.round(Number(amount)*100):null};try{const r=await fetch('/api/company-ops/'+companyKey+'/items',{method:'POST',headers:headers(true),credentials:'include',body:JSON.stringify(payload)});const j=await r.json();if(!r.ok)throw new Error(j.error||'Create failed');e.currentTarget.reset();$('formMsg').className='notice';$('formMsg').textContent='Registro creado.';await load()}catch(err){showError(err,$('formMsg'))}});function showError(err,target=$('items')){target.className='notice error';target.textContent='Error: '+(err?.message||err)}(async()=>{try{await context();await load()}catch(err){showError(err)}})();})();`;
}

export async function companyOperationsRoutes(request,env,url=new URL(request.url)){
  if(url.pathname==='/assets/atlas-company-operations.js'&&request.method==='GET'){
    return new Response(companyOpsClient(),{headers:{'content-type':'text/javascript; charset=utf-8','cache-control':'public,max-age=900','x-content-type-options':'nosniff'}});
  }
  if(url.pathname==='/api/company-ops/catalog'&&request.method==='GET')return catalog(request,env);
  const pageMatch=url.pathname.match(/^\/platform\/company-ops\/([^/]+)$/);
  if(pageMatch&&request.method==='GET'){
    const companyKey=decodeURIComponent(pageMatch[1]),profile=profileFor(companyKey);
    if(!profile)return html('<h1>Company module not found</h1>',404);
    const auth=await requireSession(request,env);
    if(!auth.ok)return html('<h1>Authentication required</h1><p>Sign in to ATLAS to open this internal company module.</p>',401);
    return html(companyOpsPage(companyKey));
  }
  const itemsMatch=url.pathname.match(/^\/api\/company-ops\/([^/]+)\/items$/);
  if(itemsMatch&&request.method==='GET')return listItems(request,env,url,decodeURIComponent(itemsMatch[1]));
  if(itemsMatch&&request.method==='POST')return createItem(request,env,decodeURIComponent(itemsMatch[1]));
  const itemMatch=url.pathname.match(/^\/api\/company-ops\/([^/]+)\/items\/([^/]+)$/);
  if(itemMatch&&request.method==='PATCH')return updateItem(request,env,decodeURIComponent(itemMatch[1]),decodeURIComponent(itemMatch[2]));
  const eventsMatch=url.pathname.match(/^\/api\/company-ops\/([^/]+)\/items\/([^/]+)\/events$/);
  if(eventsMatch&&request.method==='GET')return itemEvents(request,env,decodeURIComponent(eventsMatch[1]),decodeURIComponent(eventsMatch[2]));
  return null;
}

export { COMPANY_PROFILES, ensureCompanyOperationsSchema };
