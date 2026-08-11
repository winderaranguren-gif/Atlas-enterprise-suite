const base=(process.env.ATLAS_E2E_BASE_URL||'').replace(/\/$/,'');
const bootstrap=process.env.ATLAS_BOOTSTRAP_TOKEN||'';
const expectedSha=String(process.env.ATLAS_E2E_EXPECTED_SHA||'').trim().toLowerCase();
const ownerEmail=process.env.ATLAS_E2E_OWNER_EMAIL||'atlas-e2e-owner@example.invalid';
const org=process.env.ATLAS_E2E_ORG||'atlas-e2e';
const dba=process.env.ATLAS_E2E_DBA||'pilot';
const otherDba=process.env.ATLAS_E2E_OTHER_DBA||'forbidden-dba';
if(!base) throw new Error('ATLAS_E2E_BASE_URL is required');
if(!bootstrap) throw new Error('ATLAS_BOOTSTRAP_TOKEN is required');
if(!/^[0-9a-f]{40}$/.test(expectedSha)) throw new Error('ATLAS_E2E_EXPECTED_SHA must be the exact deployed commit SHA');
const checks=[];
const mark=(name,ok,details='')=>{checks.push({name,ok,details});if(!ok)throw new Error(`${name}: ${details}`);};
async function call(path,{method='GET',token,scope=true,body,bootstrapToken,scopeDba=dba}={}){
  const headers={accept:'application/json'};
  if(body!==undefined)headers['content-type']='application/json';
  if(token)headers.authorization=`Bearer ${token}`;
  if(scope){headers['x-atlas-organization']=org;headers['x-atlas-dba']=scopeDba;}
  if(bootstrapToken)headers['x-atlas-bootstrap-token']=bootstrapToken;
  const response=await fetch(`${base}${path}`,{method,headers,body:body===undefined?undefined:JSON.stringify(body)});
  const text=await response.text();let data={};try{data=text?JSON.parse(text):{};}catch{data={raw:text};}
  return {status:response.status,data};
}
const fingerprint=await call('/api/system/release-fingerprint',{scope:false});
mark('Exact deployed SHA fingerprint',fingerprint.status===200&&fingerprint.data.shaConfigured===true&&String(fingerprint.data.deployedSha||'').toLowerCase()===expectedSha,JSON.stringify(fingerprint));
const readiness=await call('/api/system/readiness',{scope:false});
mark('Commercial pilot readiness',readiness.status===200&&readiness.data.operational===true&&String(readiness.data.deployedSha||'').toLowerCase()===expectedSha,JSON.stringify(readiness));
for(const [name,path] of [['Documents','/api/documents/health'],['Accounting','/api/accounting/health'],['Backups','/api/backups/health']]){
  const health=await call(path,{scope:false});mark(`${name} health`,health.status===200&&health.data.operational===true,JSON.stringify(health));
}
for(const [name,path] of [['CRM','/api/crm/accounts'],['Documents','/api/documents'],['Accounting','/api/accounting/accounts'],['Backups','/api/backups']]){
  const unauth=await call(path);mark(`${name} rejects missing session`,unauth.status===401,JSON.stringify(unauth));
}
const boot=await call('/api/admin/bootstrap',{method:'POST',scope:false,bootstrapToken:bootstrap,body:{email:ownerEmail,display_name:'ATLAS E2E Owner',organization_id:org,dba_id:dba}});
mark('Owner bootstrap',boot.status===201&&typeof boot.data.session_token==='string',JSON.stringify({...boot,data:{...boot.data,session_token:boot.data.session_token?'[redacted]':undefined}}));
const ownerToken=boot.data.session_token;
const repeatBoot=await call('/api/admin/bootstrap',{method:'POST',scope:false,bootstrapToken:bootstrap,body:{email:'second-owner@example.invalid',organization_id:org,dba_id:dba}});
mark('Bootstrap one-time',repeatBoot.status===409,JSON.stringify(repeatBoot));
for(const [name,path] of [['CRM','/api/crm/accounts'],['Documents','/api/documents'],['Accounting','/api/accounting/accounts'],['Backups','/api/backups']]){
  const cross=await call(path,{token:ownerToken,scopeDba:otherDba});mark(`${name} cross-DBA denied`,cross.status===403,JSON.stringify(cross));
}
const createdUser=await call('/api/users',{method:'POST',token:ownerToken,body:{email:'atlas-e2e-viewer@example.invalid',display_name:'ATLAS E2E Viewer',role:'viewer'}});
mark('Scoped user creation',createdUser.status===201&&createdUser.data.user_id,JSON.stringify(createdUser));
const createdCrm=await call('/api/crm/accounts',{method:'POST',token:ownerToken,body:{name:'ATLAS E2E Account',status:'active'}});
mark('CRM create',createdCrm.status===201&&createdCrm.data.id,JSON.stringify(createdCrm));
const readCrm=await call('/api/crm/accounts',{token:ownerToken});
mark('CRM read',readCrm.status===200&&Array.isArray(readCrm.data.accounts)&&readCrm.data.accounts.some(x=>x.id===createdCrm.data.id),JSON.stringify(readCrm));
const doc=await call('/api/documents',{method:'POST',token:ownerToken,body:{title:'ATLAS E2E Document',mime_type:'text/plain',content_text:'Version one'}});
mark('Document create + hash',doc.status===201&&doc.data.id&&doc.data.current_version===1&&typeof doc.data.current_hash==='string',JSON.stringify(doc));
const doc2=await call(`/api/documents/${doc.data.id}/versions`,{method:'POST',token:ownerToken,body:{content_text:'Version two'}});
mark('Document version append',doc2.status===201&&doc2.data.current_version===2&&doc2.data.current_hash!==doc.data.current_hash,JSON.stringify(doc2));
const archived=await call(`/api/documents/${doc.data.id}`,{method:'DELETE',token:ownerToken});
mark('Document soft archive',archived.status===200&&archived.data.status==='archived',JSON.stringify(archived));
const cash=await call('/api/accounting/accounts',{method:'POST',token:ownerToken,body:{code:'1000',name:'Cash',account_type:'asset'}});
const revenue=await call('/api/accounting/accounts',{method:'POST',token:ownerToken,body:{code:'4000',name:'Service Revenue',account_type:'revenue'}});
mark('Accounting accounts created',cash.status===201&&revenue.status===201,JSON.stringify({cash,revenue}));
const unbalanced=await call('/api/accounting/journal',{method:'POST',token:ownerToken,body:{entry_number:'E2E-UNBALANCED',entry_date:'2026-08-10',currency:'USD',lines:[{account_id:cash.data.id,debit_cents:10000,credit_cents:0},{account_id:revenue.data.id,debit_cents:0,credit_cents:9000}]}});
mark('Unbalanced journal rejected',unbalanced.status===400,JSON.stringify(unbalanced));
const posted=await call('/api/accounting/journal',{method:'POST',token:ownerToken,body:{entry_number:'E2E-0001',entry_date:'2026-08-10',currency:'USD',lines:[{account_id:cash.data.id,debit_cents:10000,credit_cents:0},{account_id:revenue.data.id,debit_cents:0,credit_cents:10000}]}});
mark('Balanced journal posted',posted.status===201&&posted.data.total_debit_cents===10000&&posted.data.total_credit_cents===10000,JSON.stringify(posted));
const trial=await call('/api/accounting/trial-balance',{token:ownerToken});
mark('Trial balance balanced',trial.status===200&&trial.data.balanced===true,JSON.stringify(trial));
const backup=await call('/api/backups',{method:'POST',token:ownerToken});
mark('R2 backup created',backup.status===201&&backup.data.id&&typeof backup.data.sha256==='string',JSON.stringify(backup));
const verify=await call(`/api/backups/${backup.data.id}/verify`,{method:'POST',token:ownerToken});
mark('Backup hash verified',verify.status===200&&verify.data.ok===true,JSON.stringify(verify));
const restoreTest=await call(`/api/backups/${backup.data.id}/restore-test`,{method:'POST',token:ownerToken});
mark('Non-destructive restore test',restoreTest.status===200&&restoreTest.data.ok===true&&restoreTest.data.actual_restore_performed===false,JSON.stringify(restoreTest));
const audit=await call('/api/audit',{token:ownerToken});
mark('Audit trail available',audit.status===200&&Array.isArray(audit.data.events)&&audit.data.events.length>0,JSON.stringify(audit));
const logout=await call('/api/auth/logout',{method:'POST',token:ownerToken,scope:false});
mark('Session logout',logout.status===200&&logout.data.ok===true,JSON.stringify(logout));
for(const [name,path] of [['CRM','/api/crm/accounts'],['Documents','/api/documents'],['Accounting','/api/accounting/accounts'],['Backups','/api/backups']]){
  const revoked=await call(path,{token:ownerToken});mark(`${name} rejects revoked session`,revoked.status===401,JSON.stringify(revoked));
}
console.log(JSON.stringify({ok:true,base,expectedSha,organization:org,dba,checks},null,2));
