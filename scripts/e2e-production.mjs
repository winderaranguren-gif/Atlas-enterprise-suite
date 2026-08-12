const required=['ATLAS_PRODUCTION_BASE_URL','ATLAS_E2E_BEARER_TOKEN','ATLAS_E2E_ORGANIZATION_ID','ATLAS_E2E_DBA_ID','GITHUB_SHA'];
for(const key of required){
  if(!process.env[key]) throw new Error(`Missing required E2E value: ${key}`);
}

const base=process.env.ATLAS_PRODUCTION_BASE_URL.replace(/\/$/,'');
const token=process.env.ATLAS_E2E_BEARER_TOKEN;
const organizationId=process.env.ATLAS_E2E_ORGANIZATION_ID;
const dbaId=process.env.ATLAS_E2E_DBA_ID;
const expectedSha=process.env.GITHUB_SHA;
const scopeHeaders={
  authorization:`Bearer ${token}`,
  'x-atlas-organization':organizationId,
  'x-atlas-dba':dbaId
};
const jsonHeaders={...scopeHeaders,'content-type':'application/json'};

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

const meta=await expectJson('/api/meta');
if(meta.deployedSha!==expectedSha) throw new Error(`Deployed SHA mismatch: expected ${expectedSha}, got ${meta.deployedSha}`);
if(meta.defaultLanguage!=='en'||!Array.isArray(meta.supportedLanguages)||!meta.supportedLanguages.includes('es')){
  throw new Error(`Language contract failure: ${JSON.stringify({defaultLanguage:meta.defaultLanguage,supportedLanguages:meta.supportedLanguages})}`);
}

await expectJson('/api/auth/me',{headers:{authorization:`Bearer ${token}`}});
const memberships=await expectJson('/api/identity/memberships',{headers:scopeHeaders});
if(!Array.isArray(memberships.memberships)||!memberships.memberships.length) throw new Error('No active scoped memberships visible to E2E principal');
const dbas=await expectJson('/api/identity/dbas',{headers:scopeHeaders});
if(!Array.isArray(dbas.dbas)||!dbas.dbas.some(dba=>dba.id===dbaId)) throw new Error('E2E DBA is not visible inside organization scope');

const runId=`${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`;
const crmCreate=await expectJson('/api/crm/contacts',{method:'POST',headers:jsonHeaders,body:JSON.stringify({name:`ATLAS E2E Contact ${runId}`,contactType:'prospect',email:`atlas-e2e-${runId}@example.invalid`})},201);
await expectJson(`/api/crm/contacts/${crmCreate.id}`,{headers:scopeHeaders});
await expectJson(`/api/crm/contacts/${crmCreate.id}`,{method:'PATCH',headers:jsonHeaders,body:JSON.stringify({status:'inactive',notes:'E2E verified'})});
await expectJson(`/api/crm/contacts/${crmCreate.id}`,{method:'DELETE',headers:scopeHeaders});

const v1=`ATLAS E2E document v1 ${runId}`;
const docCreate=await expectJson('/api/documents',{method:'POST',headers:{...scopeHeaders,'content-type':'text/plain','x-atlas-filename':`atlas-e2e-${runId}.txt`},body:v1},201);
await expectJson(`/api/documents/${docCreate.id}`,{headers:scopeHeaders});
let response=await fetch(`${base}/api/documents/${docCreate.id}/content`,{headers:scopeHeaders});
if(!response.ok) throw new Error(`Document v1 download failed: ${response.status}`);
if(await response.text()!==v1) throw new Error('Document v1 content mismatch');

const v2=`ATLAS E2E document v2 ${runId}`;
await expectJson(`/api/documents/${docCreate.id}/versions`,{method:'POST',headers:{...scopeHeaders,'content-type':'text/plain'},body:v2},201);
response=await fetch(`${base}/api/documents/${docCreate.id}/content`,{headers:scopeHeaders});
if(!response.ok) throw new Error(`Document v2 download failed: ${response.status}`);
if(await response.text()!==v2) throw new Error('Document v2 content mismatch');
await expectJson(`/api/documents/${docCreate.id}`,{method:'DELETE',headers:scopeHeaders});

const accountSuffix=runId.replace(/[^a-z0-9]/gi,'').slice(-10).toUpperCase();
const debitAccount=await expectJson('/api/accounting/accounts',{method:'POST',headers:jsonHeaders,body:JSON.stringify({code:`E2ED${accountSuffix}`,name:`E2E Cash ${runId}`,accountType:'asset',normalBalance:'debit'})},201);
const creditAccount=await expectJson('/api/accounting/accounts',{method:'POST',headers:jsonHeaders,body:JSON.stringify({code:`E2EC${accountSuffix}`,name:`E2E Equity ${runId}`,accountType:'equity',normalBalance:'credit'})},201);
const journal=await expectJson('/api/accounting/journals',{method:'POST',headers:jsonHeaders,body:JSON.stringify({entryDate:new Date().toISOString().slice(0,10),memo:`ATLAS production E2E ${runId}`,reference:`E2E-${runId}`,currency:'USD',lines:[{accountId:debitAccount.id,description:'E2E debit',debitCents:100,creditCents:0},{accountId:creditAccount.id,description:'E2E credit',debitCents:0,creditCents:100}]})},201);
await expectJson(`/api/accounting/journals/${journal.id}`,{headers:scopeHeaders});
const posted=await expectJson(`/api/accounting/journals/${journal.id}/post`,{method:'POST',headers:scopeHeaders});
if(posted.status!=='posted') throw new Error(`Journal posting failed: ${JSON.stringify(posted)}`);
const postedJournal=await expectJson(`/api/accounting/journals/${journal.id}`,{headers:scopeHeaders});
if(postedJournal.journal?.status!=='posted') throw new Error('Posted journal did not persist as posted');

const backup=await expectJson('/api/backups',{method:'POST',headers:scopeHeaders},201);
if(!backup.id||backup.status!=='complete'||!backup.manifestSha256) throw new Error(`Backup creation contract failure: ${JSON.stringify(backup)}`);
const verifiedBackup=await expectJson(`/api/backups/${backup.id}/verify`,{method:'POST',headers:scopeHeaders});
if(verifiedBackup.status!=='verified'||verifiedBackup.manifestSha256!==backup.manifestSha256){
  throw new Error(`Backup verification contract failure: ${JSON.stringify(verifiedBackup)}`);
}
const backupList=await expectJson('/api/backups',{headers:scopeHeaders});
if(!Array.isArray(backupList.backups)||!backupList.backups.some(item=>item.id===backup.id&&item.status==='verified')){
  throw new Error('Verified backup not visible in scoped backup list');
}

const audit=await expectJson('/api/audit-events',{headers:scopeHeaders});
const actions=new Set((audit.events||[]).map(x=>x.action));
for(const action of [
  'membership.list','dba.list',
  'crm.contact.create','crm.contact.update','crm.contact.archive',
  'document.create','document.version.create','document.archive',
  'accounting.account.create','accounting.journal.create','accounting.journal.post',
  'backup.create','backup.verify'
]){
  if(!actions.has(action)) throw new Error(`Missing audit evidence for ${action}`);
}

console.log(JSON.stringify({
  ok:true,
  deployedSha:meta.deployedSha,
  organizationId,
  dbaId,
  verified:['cloudflare-bindings','exact-sha','english-first-language-contract','users-permissions','crm','documents-d1-r2','accounting-double-entry','backup-create-verify','auditability']
}));
