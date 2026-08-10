const base=(process.env.ATLAS_E2E_BASE_URL||'').replace(/\/$/,'');
const bootstrap=process.env.ATLAS_BOOTSTRAP_TOKEN||'';
const ownerEmail=process.env.ATLAS_E2E_OWNER_EMAIL||'atlas-e2e-owner@example.invalid';
const org=process.env.ATLAS_E2E_ORG||'atlas-e2e';
const dba=process.env.ATLAS_E2E_DBA||'pilot';
const otherDba=process.env.ATLAS_E2E_OTHER_DBA||'forbidden-dba';

if(!base) throw new Error('ATLAS_E2E_BASE_URL is required');
if(!bootstrap) throw new Error('ATLAS_BOOTSTRAP_TOKEN is required');

const checks=[];
const mark=(name,ok,details='')=>{ checks.push({name,ok,details}); if(!ok) throw new Error(`${name}: ${details}`); };
async function call(path,{method='GET',token,scope=true,body,bootstrapToken}={}){
 const headers={'accept':'application/json'};
 if(body!==undefined) headers['content-type']='application/json';
 if(token) headers.authorization=`Bearer ${token}`;
 if(scope){ headers['x-atlas-organization']=org; headers['x-atlas-dba']=dba; }
 if(bootstrapToken) headers['x-atlas-bootstrap-token']=bootstrapToken;
 const response=await fetch(`${base}${path}`,{method,headers,body:body===undefined?undefined:JSON.stringify(body)});
 const text=await response.text();
 let data={}; try{ data=text?JSON.parse(text):{}; }catch{ data={raw:text}; }
 return {status:response.status,data};
}

const health=await call('/api/system/health',{scope:false});
mark('D1 health',health.status===200&&health.data.operational===true,JSON.stringify(health));

const unauth=await call('/api/crm/accounts');
mark('CRM rejects missing session',unauth.status===401,JSON.stringify(unauth));

const boot=await call('/api/admin/bootstrap',{method:'POST',scope:false,bootstrapToken:bootstrap,body:{email:ownerEmail,display_name:'ATLAS E2E Owner',organization_id:org,dba_id:dba}});
mark('Owner bootstrap',boot.status===201&&typeof boot.data.session_token==='string',JSON.stringify({...boot,data:{...boot.data,session_token:boot.data.session_token?'[redacted]':undefined}}));
const ownerToken=boot.data.session_token;

const repeatBoot=await call('/api/admin/bootstrap',{method:'POST',scope:false,bootstrapToken:bootstrap,body:{email:'second-owner@example.invalid',organization_id:org,dba_id:dba}});
mark('Bootstrap is one-time',repeatBoot.status===409,JSON.stringify(repeatBoot));

const cross=await fetch(`${base}/api/crm/accounts`,{headers:{authorization:`Bearer ${ownerToken}`,'x-atlas-organization':org,'x-atlas-dba':otherDba}});
mark('Cross-DBA access denied',cross.status===403,`status=${cross.status}`);

const createdUser=await call('/api/users',{method:'POST',token:ownerToken,body:{email:'atlas-e2e-viewer@example.invalid',display_name:'ATLAS E2E Viewer',role:'viewer'}});
mark('Scoped user creation',createdUser.status===201&&createdUser.data.user_id,JSON.stringify(createdUser));
const viewerId=createdUser.data.user_id;

const createdCrm=await call('/api/crm/accounts',{method:'POST',token:ownerToken,body:{name:'ATLAS E2E Account',status:'active'}});
mark('Authorized CRM create',createdCrm.status===201&&createdCrm.data.id,JSON.stringify(createdCrm));

const readCrm=await call('/api/crm/accounts',{token:ownerToken});
mark('Authorized CRM read',readCrm.status===200&&Array.isArray(readCrm.data.accounts)&&readCrm.data.accounts.some(x=>x.id===createdCrm.data.id),JSON.stringify(readCrm));

const audit=await call('/api/audit',{token:ownerToken});
mark('Audit trail contains CRM create',audit.status===200&&Array.isArray(audit.data.events)&&audit.data.events.some(x=>x.action==='create'&&x.resource_id===createdCrm.data.id),JSON.stringify(audit));

const suspend=await call(`/api/users/${viewerId}`,{method:'PATCH',token:ownerToken,body:{status:'suspended'}});
mark('Membership suspension',suspend.status===200&&suspend.data.status==='suspended',JSON.stringify(suspend));

const logout=await call('/api/auth/logout',{method:'POST',token:ownerToken,scope:false});
mark('Session logout',logout.status===200&&logout.data.ok===true,JSON.stringify(logout));

const afterLogout=await call('/api/crm/accounts',{token:ownerToken});
mark('Revoked session rejected',afterLogout.status===401,JSON.stringify(afterLogout));

console.log(JSON.stringify({ok:true,base,organization:org,dba,checks},null,2));
