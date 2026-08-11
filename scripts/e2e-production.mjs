const required=['ATLAS_PRODUCTION_BASE_URL','ATLAS_E2E_BEARER_TOKEN','ATLAS_E2E_ORGANIZATION_ID','ATLAS_E2E_DBA_ID'];
for(const key of required){
  if(!process.env[key]) throw new Error(`Missing required E2E value: ${key}`);
}

const base=process.env.ATLAS_PRODUCTION_BASE_URL.replace(/\/$/,'');
const token=process.env.ATLAS_E2E_BEARER_TOKEN;
const organizationId=process.env.ATLAS_E2E_ORGANIZATION_ID;
const dbaId=process.env.ATLAS_E2E_DBA_ID;
const scopeHeaders={
  authorization:`Bearer ${token}`,
  'x-atlas-organization':organizationId,
  'x-atlas-dba':dbaId
};

async function expectJson(path,options={},expectedStatus=200){
  const response=await fetch(`${base}${path}`,options);
  const text=await response.text();
  let body;
  try{ body=JSON.parse(text); }catch{ throw new Error(`${path}: expected JSON, got ${response.status} ${text.slice(0,200)}`); }
  if(response.status!==expectedStatus) throw new Error(`${path}: expected ${expectedStatus}, got ${response.status}: ${text}`);
  if(body.ok===false) throw new Error(`${path}: API returned ok=false: ${text}`);
  return body;
}

const health=await expectJson('/api/health');
if(!health.bindings?.d1||!health.bindings?.r2||!health.bindings?.assets||!health.d1Reachable){
  throw new Error(`Health binding/readiness failure: ${JSON.stringify(health)}`);
}

await expectJson('/api/auth/me',{headers:{authorization:`Bearer ${token}`}});

const crmCreate=await expectJson('/api/crm/contacts',{method:'POST',headers:{...scopeHeaders,'content-type':'application/json'},body:JSON.stringify({name:'ATLAS E2E Contact',contactType:'prospect',email:'atlas-e2e@example.invalid'})},201);
await expectJson(`/api/crm/contacts/${crmCreate.id}`,{headers:scopeHeaders});
await expectJson(`/api/crm/contacts/${crmCreate.id}`,{method:'PATCH',headers:{...scopeHeaders,'content-type':'application/json'},body:JSON.stringify({status:'inactive',notes:'E2E verified'})});
await expectJson(`/api/crm/contacts/${crmCreate.id}`,{method:'DELETE',headers:scopeHeaders});

const v1='ATLAS E2E document v1';
const docCreate=await expectJson('/api/documents',{method:'POST',headers:{...scopeHeaders,'content-type':'text/plain','x-atlas-filename':'atlas-e2e.txt'},body:v1},201);
await expectJson(`/api/documents/${docCreate.id}`,{headers:scopeHeaders});
let response=await fetch(`${base}/api/documents/${docCreate.id}/content`,{headers:scopeHeaders});
if(!response.ok) throw new Error(`Document v1 download failed: ${response.status}`);
if(await response.text()!==v1) throw new Error('Document v1 content mismatch');

const v2='ATLAS E2E document v2';
await expectJson(`/api/documents/${docCreate.id}/versions`,{method:'POST',headers:{...scopeHeaders,'content-type':'text/plain'},body:v2},201);
response=await fetch(`${base}/api/documents/${docCreate.id}/content`,{headers:scopeHeaders});
if(!response.ok) throw new Error(`Document v2 download failed: ${response.status}`);
if(await response.text()!==v2) throw new Error('Document v2 content mismatch');
await expectJson(`/api/documents/${docCreate.id}`,{method:'DELETE',headers:scopeHeaders});

const audit=await expectJson('/api/audit-events',{headers:scopeHeaders});
const actions=new Set((audit.events||[]).map(x=>x.action));
for(const action of ['crm.contact.create','crm.contact.update','crm.contact.archive','document.create','document.version.create','document.archive']){
  if(!actions.has(action)) throw new Error(`Missing audit evidence for ${action}`);
}

console.log('ATLAS production E2E passed: health, auth, scoped CRM, D1/R2 documents, audit');
