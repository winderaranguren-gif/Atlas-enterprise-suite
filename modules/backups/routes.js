import { json } from '../../platform/runtime/health.js';
import { requireSession, requireScope } from '../../platform/security/auth.js';
import { audit } from '../../platform/security/audit.js';

const MAX_DOCUMENT_VERSIONS=500;

function scopeFrom(request,url){
  return {
    organizationId:url.searchParams.get('organization_id')||request.headers.get('x-atlas-organization'),
    dbaId:url.searchParams.get('dba_id')||request.headers.get('x-atlas-dba')
  };
}

async function authorize(env,request,url,roles,action){
  const auth=await requireSession(env,request);
  if(!auth.ok) return {response:json({ok:false,error:auth.error},auth.status)};
  const {organizationId,dbaId}=scopeFrom(request,url);
  if(!organizationId||!dbaId) return {response:json({ok:false,error:'organization_and_dba_required'},400)};
  const scoped=await requireScope(env,auth.session.user_id,organizationId,dbaId,roles);
  if(!scoped.ok){
    await audit(env,{actorUserId:auth.session.user_id,organizationId,dbaId,action,resourceType:'backup_snapshot',decision:'deny',metadata:{error:scoped.error}});
    return {response:json({ok:false,error:scoped.error},scoped.status)};
  }
  return {auth:auth.session,organizationId,dbaId};
}

async function sha256Hex(buffer){
  const digest=await crypto.subtle.digest('SHA-256',buffer);
  return [...new Uint8Array(digest)].map(b=>b.toString(16).padStart(2,'0')).join('');
}

async function rows(env,sql,...bindings){
  const result=await env.DB.prepare(sql).bind(...bindings).all();
  return result.results||[];
}

async function createBackup(request,env,url){
  const ctx=await authorize(env,request,url,['owner','admin'],'backup.create');
  if(ctx.response) return ctx.response;
  if(!env.BACKUPS) return json({ok:false,error:'r2_binding_unavailable'},503);

  const org=await env.DB.prepare('SELECT id,name,created_at FROM organizations WHERE id=?').bind(ctx.organizationId).first();
  const dba=await env.DB.prepare('SELECT id,organization_id,name,created_at FROM dbas WHERE id=? AND organization_id=?').bind(ctx.dbaId,ctx.organizationId).first();
  if(!org||!dba) return json({ok:false,error:'scope_not_found'},404);

  const [crmContacts,documents,documentVersions,accounts,journals,journalLines]=await Promise.all([
    rows(env,'SELECT * FROM crm_contacts WHERE organization_id=? AND dba_id=? ORDER BY created_at',ctx.organizationId,ctx.dbaId),
    rows(env,'SELECT * FROM documents WHERE organization_id=? AND dba_id=? ORDER BY created_at',ctx.organizationId,ctx.dbaId),
    rows(env,'SELECT * FROM document_versions WHERE organization_id=? AND dba_id=? ORDER BY document_id,version',ctx.organizationId,ctx.dbaId),
    rows(env,'SELECT * FROM accounting_accounts WHERE organization_id=? AND dba_id=? ORDER BY code',ctx.organizationId,ctx.dbaId),
    rows(env,'SELECT * FROM journal_entries WHERE organization_id=? AND dba_id=? ORDER BY entry_date,created_at',ctx.organizationId,ctx.dbaId),
    rows(env,'SELECT * FROM journal_lines WHERE organization_id=? AND dba_id=? ORDER BY journal_entry_id,line_no',ctx.organizationId,ctx.dbaId)
  ]);

  if(documentVersions.length>MAX_DOCUMENT_VERSIONS) return json({ok:false,error:'backup_scope_too_large',maxDocumentVersions:MAX_DOCUMENT_VERSIONS,actualDocumentVersions:documentVersions.length},413);

  const backupId=crypto.randomUUID();
  const prefix=`${ctx.organizationId}/${ctx.dbaId}/backups/${backupId}`;
  const copiedKeys=[];
  const documentCopies=[];
  try{
    for(const version of documentVersions){
      const source=await env.BACKUPS.get(version.object_key);
      if(!source) throw new Error(`document_object_missing:${version.document_id}:${version.version}`);
      const bytes=await source.arrayBuffer();
      const actualSha=await sha256Hex(bytes);
      if(actualSha!==version.sha256) throw new Error(`document_hash_mismatch:${version.document_id}:${version.version}`);
      const backupKey=`${prefix}/documents/${version.document_id}/${version.version}`;
      await env.BACKUPS.put(backupKey,bytes,{httpMetadata:{contentType:version.content_type},customMetadata:{sourceKey:version.object_key,sha256:actualSha,backupId}});
      copiedKeys.push(backupKey);
      documentCopies.push({documentId:version.document_id,version:version.version,backupKey,sha256:actualSha,sizeBytes:bytes.byteLength,contentType:version.content_type});
    }

    const tables={crm_contacts:crmContacts,documents,document_versions:documentVersions,accounting_accounts:accounts,journal_entries:journals,journal_lines:journalLines};
    const manifest={schemaVersion:1,backupId,createdAt:new Date().toISOString(),deployedSha:env.ATLAS_DEPLOYED_SHA||null,scope:{organization:org,dba},tables,documentCopies};
    const manifestText=JSON.stringify(manifest);
    const manifestBytes=new TextEncoder().encode(manifestText);
    const manifestSha256=await sha256Hex(manifestBytes);
    const manifestKey=`${prefix}/manifest.json`;
    await env.BACKUPS.put(manifestKey,manifestBytes,{httpMetadata:{contentType:'application/json'},customMetadata:{backupId,manifestSha256}});
    copiedKeys.push(manifestKey);
    const rowCount=Object.values(tables).reduce((sum,list)=>sum+list.length,0);
    await env.DB.prepare(`INSERT INTO backup_snapshots(id,organization_id,dba_id,status,manifest_key,manifest_sha256,document_object_count,row_count,created_by_user_id) VALUES(?,?,?,'complete',?,?,?,?,?)`)
      .bind(backupId,ctx.organizationId,ctx.dbaId,manifestKey,manifestSha256,documentCopies.length,rowCount,ctx.auth.user_id).run();
    await audit(env,{actorUserId:ctx.auth.user_id,organizationId:ctx.organizationId,dbaId:ctx.dbaId,action:'backup.create',resourceType:'backup_snapshot',resourceId:backupId,decision:'allow',metadata:{manifestSha256,rowCount,documentObjectCount:documentCopies.length}});
    return json({ok:true,id:backupId,status:'complete',manifestSha256,rowCount,documentObjectCount:documentCopies.length},201);
  }catch(error){
    await Promise.allSettled(copiedKeys.map(key=>env.BACKUPS.delete(key)));
    await audit(env,{actorUserId:ctx.auth.user_id,organizationId:ctx.organizationId,dbaId:ctx.dbaId,action:'backup.create',resourceType:'backup_snapshot',resourceId:backupId,decision:'deny',metadata:{error:String(error?.message||error)}});
    return json({ok:false,error:'backup_create_failed',detail:String(error?.message||error)},500);
  }
}

async function listBackups(request,env,url){
  const ctx=await authorize(env,request,url,['owner','admin','auditor'],'backup.list');
  if(ctx.response) return ctx.response;
  const result=await env.DB.prepare(`SELECT id,status,manifest_sha256,document_object_count,row_count,verified_at,created_at FROM backup_snapshots WHERE organization_id=? AND dba_id=? ORDER BY created_at DESC LIMIT 100`)
    .bind(ctx.organizationId,ctx.dbaId).all();
  return json({ok:true,backups:result.results||[]});
}

async function verifyBackup(request,env,url,id){
  const ctx=await authorize(env,request,url,['owner','admin','auditor'],'backup.verify');
  if(ctx.response) return ctx.response;
  if(!env.BACKUPS) return json({ok:false,error:'r2_binding_unavailable'},503);
  const backup=await env.DB.prepare(`SELECT * FROM backup_snapshots WHERE id=? AND organization_id=? AND dba_id=?`).bind(id,ctx.organizationId,ctx.dbaId).first();
  if(!backup) return json({ok:false,error:'backup_not_found'},404);
  const manifestObject=await env.BACKUPS.get(backup.manifest_key);
  if(!manifestObject) return json({ok:false,error:'backup_manifest_missing'},503);
  const manifestBytes=await manifestObject.arrayBuffer();
  const actualManifestSha=await sha256Hex(manifestBytes);
  if(actualManifestSha!==backup.manifest_sha256) return json({ok:false,error:'backup_manifest_hash_mismatch',expected:backup.manifest_sha256,actual:actualManifestSha},409);
  let manifest;
  try{ manifest=JSON.parse(new TextDecoder().decode(manifestBytes)); }
  catch{ return json({ok:false,error:'backup_manifest_invalid_json'},409); }
  if(manifest.backupId!==id||manifest.scope?.organization?.id!==ctx.organizationId||manifest.scope?.dba?.id!==ctx.dbaId) return json({ok:false,error:'backup_manifest_scope_mismatch'},409);
  for(const copy of manifest.documentCopies||[]){
    const object=await env.BACKUPS.get(copy.backupKey);
    if(!object) return json({ok:false,error:'backup_document_missing',backupKey:copy.backupKey},409);
    const bytes=await object.arrayBuffer();
    const actualSha=await sha256Hex(bytes);
    if(actualSha!==copy.sha256) return json({ok:false,error:'backup_document_hash_mismatch',backupKey:copy.backupKey,expected:copy.sha256,actual:actualSha},409);
  }
  await env.DB.prepare(`UPDATE backup_snapshots SET status='verified',verified_at=CURRENT_TIMESTAMP WHERE id=? AND organization_id=? AND dba_id=?`).bind(id,ctx.organizationId,ctx.dbaId).run();
  await audit(env,{actorUserId:ctx.auth.user_id,organizationId:ctx.organizationId,dbaId:ctx.dbaId,action:'backup.verify',resourceType:'backup_snapshot',resourceId:id,decision:'allow',metadata:{manifestSha256:actualManifestSha,documentObjectCount:(manifest.documentCopies||[]).length}});
  return json({ok:true,id,status:'verified',manifestSha256:actualManifestSha,documentObjectCount:(manifest.documentCopies||[]).length});
}

export async function backupRoutes(request,env,url){
  if(url.pathname==='/api/backups' && request.method==='POST') return createBackup(request,env,url);
  if(url.pathname==='/api/backups' && request.method==='GET') return listBackups(request,env,url);
  const verify=url.pathname.match(/^\/api\/backups\/([^/]+)\/verify$/);
  if(verify && request.method==='POST') return verifyBackup(request,env,url,decodeURIComponent(verify[1]));
  return null;
}
