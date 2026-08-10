const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json;charset=UTF-8','cache-control':'no-store'}});
const id=()=>crypto.randomUUID();
const READ_ROLES=new Set(['owner','admin','auditor']);
const WRITE_ROLES=new Set(['owner','admin']);
const TABLES=[
 'crm_accounts','crm_contacts','crm_leads','crm_opportunities','crm_tasks','crm_activity',
 'atlas_documents','atlas_document_versions',
 'accounting_accounts','accounting_journal_entries','accounting_journal_lines',
 'atlas_audit_events'
];

async function sha256(value){
 const bytes=typeof value==='string'?new TextEncoder().encode(value):value;
 const digest=await crypto.subtle.digest('SHA-256',bytes);
 return [...new Uint8Array(digest)].map(b=>b.toString(16).padStart(2,'0')).join('');
}
async function authenticate(request,env){
 const header=request.headers.get('authorization')||'';
 if(!header.startsWith('Bearer ')) return null;
 const token=header.slice(7).trim(); if(!token) return null;
 const tokenHash=await sha256(token); const now=new Date().toISOString();
 return env.DB.prepare(`SELECT s.id AS session_id,s.user_id FROM atlas_sessions s JOIN atlas_users u ON u.id=s.user_id
 WHERE s.token_hash=? AND s.revoked_at IS NULL AND s.expires_at>? AND u.status='active'`).bind(tokenHash,now).first();
}
async function authorize(request,env,mode){
 const actor=await authenticate(request,env);
 const org=request.headers.get('x-atlas-organization')||'';
 const dba=request.headers.get('x-atlas-dba')||'';
 if(!actor) return {error:json({error:'Unauthorized'},401)};
 if(!org||!dba) return {error:json({error:'Organization and DBA scope are required'},400)};
 const m=await env.DB.prepare(`SELECT role FROM atlas_memberships WHERE user_id=? AND organization_id=? AND dba_id=? AND status='active'`)
  .bind(actor.user_id,org,dba).first();
 if(!m) return {error:json({error:'Forbidden'},403)};
 const allowed=mode==='write'?WRITE_ROLES.has(m.role):READ_ROLES.has(m.role);
 if(!allowed) return {error:json({error:'Forbidden for role'},403)};
 return {actor,org,dba,role:m.role};
}
async function audit(env,{org,dba,userId,action,resourceId,payload={}}){
 await env.DB.prepare(`INSERT INTO atlas_audit_events(id,organization_id,dba_id,actor_user_id,action,resource_type,resource_id,payload,created_at)
 VALUES(?,?,?,?,?,'backup',?,?,?)`).bind(id(),org,dba,userId,action,resourceId,JSON.stringify(payload),new Date().toISOString()).run();
}
async function tableRows(env,table,org,dba){
 try{
  const r=await env.DB.prepare(`SELECT * FROM ${table} WHERE organization_id=? AND dba_id=? ORDER BY rowid`).bind(org,dba).all();
  return r.results||[];
 }catch(error){
  if(String(error.message||'').includes('no such table')) return [];
  throw error;
 }
}
async function loadManifestAndBody(env,auth,backupId){
 const m=await env.DB.prepare(`SELECT * FROM atlas_backup_manifests WHERE id=? AND organization_id=? AND dba_id=?`).bind(backupId,auth.org,auth.dba).first();
 if(!m) return {error:json({error:'Backup not found'},404)};
 const object=await env.BACKUPS.get(m.object_key);
 if(!object) return {error:json({ok:false,error:'Backup object missing'},409)};
 const body=await object.text();
 return {manifest:m,body};
}
async function createBackup(request,env){
 const auth=await authorize(request,env,'write'); if(auth.error) return auth.error;
 if(!env.BACKUPS) return json({operational:false,error:'R2 binding BACKUPS is not configured'},503);
 const backupId=id(); const createdAt=new Date().toISOString();
 const data={}; let recordCount=0;
 for(const table of TABLES){ const rows=await tableRows(env,table,auth.org,auth.dba); data[table]=rows; recordCount+=rows.length; }
 const envelope={format:'ATLAS_SCOPED_BACKUP',schema_version:'1',backup_id:backupId,organization_id:auth.org,dba_id:auth.dba,created_at:createdAt,tables:data};
 const body=JSON.stringify(envelope); const digest=await sha256(body); const key=`org/${encodeURIComponent(auth.org)}/dba/${encodeURIComponent(auth.dba)}/${createdAt.replace(/[:.]/g,'-')}-${backupId}.json`;
 await env.BACKUPS.put(key,body,{httpMetadata:{contentType:'application/json'},customMetadata:{sha256:digest,organization_id:auth.org,dba_id:auth.dba,schema_version:'1'}});
 await env.DB.prepare(`INSERT INTO atlas_backup_manifests(id,organization_id,dba_id,object_key,sha256,byte_length,record_count,schema_version,status,created_by,created_at)
 VALUES(?,?,?,?,?,?,?,'1','complete',?,?)`).bind(backupId,auth.org,auth.dba,key,digest,new TextEncoder().encode(body).byteLength,recordCount,auth.actor.user_id,createdAt).run();
 await audit(env,{org:auth.org,dba:auth.dba,userId:auth.actor.user_id,action:'backup_create',resourceId:backupId,payload:{sha256:digest,record_count:recordCount}});
 return json({ok:true,id:backupId,sha256:digest,record_count:recordCount,created_at:createdAt},201);
}
async function verifyBackup(request,env,backupId){
 const auth=await authorize(request,env,'read'); if(auth.error) return auth.error;
 if(!env.BACKUPS) return json({operational:false,error:'R2 binding BACKUPS is not configured'},503);
 const loaded=await loadManifestAndBody(env,auth,backupId); if(loaded.error) return loaded.error;
 const {manifest:m,body}=loaded; const digest=await sha256(body); const valid=digest===m.sha256;
 const now=new Date().toISOString();
 await env.DB.prepare(`UPDATE atlas_backup_manifests SET status=?,verified_at=? WHERE id=?`).bind(valid?'verified':'failed',now,m.id).run();
 await audit(env,{org:auth.org,dba:auth.dba,userId:auth.actor.user_id,action:'backup_verify',resourceId:m.id,payload:{valid,sha256:digest}});
 return json({ok:valid,id:m.id,expected_sha256:m.sha256,actual_sha256:digest,byte_length:new TextEncoder().encode(body).byteLength},valid?200:409);
}
async function restoreTest(request,env,backupId){
 const auth=await authorize(request,env,'write'); if(auth.error) return auth.error;
 if(!env.BACKUPS) return json({operational:false,error:'R2 binding BACKUPS is not configured'},503);
 const loaded=await loadManifestAndBody(env,auth,backupId); if(loaded.error) return loaded.error;
 const {manifest:m,body}=loaded; const digest=await sha256(body);
 if(digest!==m.sha256) return json({ok:false,error:'Backup integrity verification failed'},409);
 let envelope; try{ envelope=JSON.parse(body); }catch{ return json({ok:false,error:'Backup payload is not valid JSON'},409); }
 const validHeader=envelope?.format==='ATLAS_SCOPED_BACKUP'&&envelope?.schema_version==='1'&&envelope?.organization_id===auth.org&&envelope?.dba_id===auth.dba;
 const validTables=envelope?.tables&&TABLES.every(table=>Array.isArray(envelope.tables[table]));
 const restoredRecordCount=validTables?TABLES.reduce((sum,table)=>sum+envelope.tables[table].length,0):-1;
 const valid=validHeader&&validTables&&restoredRecordCount===m.record_count;
 const now=new Date().toISOString();
 if(valid) await env.DB.prepare(`UPDATE atlas_backup_manifests SET status='restore-tested',restore_tested_at=? WHERE id=?`).bind(now,m.id).run();
 await audit(env,{org:auth.org,dba:auth.dba,userId:auth.actor.user_id,action:'backup_restore_test',resourceId:m.id,payload:{valid,record_count:restoredRecordCount,non_destructive:true}});
 return json({ok:valid,id:m.id,non_destructive:true,record_count:restoredRecordCount,actual_restore_performed:false},valid?200:409);
}
async function listBackups(request,env){
 const auth=await authorize(request,env,'read'); if(auth.error) return auth.error;
 const r=await env.DB.prepare(`SELECT id,sha256,byte_length,record_count,schema_version,status,created_at,verified_at,restore_tested_at
 FROM atlas_backup_manifests WHERE organization_id=? AND dba_id=? ORDER BY created_at DESC LIMIT 100`).bind(auth.org,auth.dba).all();
 return json({backups:r.results||[]});
}
export async function handleBackups(request,env){
 const url=new URL(request.url);
 if(url.pathname==='/api/backups/health'&&request.method==='GET'){
  return json({operational:Boolean(env.DB&&env.BACKUPS),storage:'R2',metadata:'D1',service:'ATLAS Backups',restore_operational:false},env.DB&&env.BACKUPS?200:503);
 }
 if(url.pathname==='/api/backups'&&request.method==='GET') return listBackups(request,env);
 if(url.pathname==='/api/backups'&&request.method==='POST') return createBackup(request,env);
 let match=url.pathname.match(/^\/api\/backups\/([^/]+)\/verify$/);
 if(match&&request.method==='POST') return verifyBackup(request,env,match[1]);
 match=url.pathname.match(/^\/api\/backups\/([^/]+)\/restore-test$/);
 if(match&&request.method==='POST') return restoreTest(request,env,match[1]);
 return null;
}
