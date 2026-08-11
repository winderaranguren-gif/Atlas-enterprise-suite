import { json } from '../../platform/runtime/health.js';
import { requireSession, requireScope } from '../../platform/security/auth.js';
import { audit } from '../../platform/security/audit.js';

const READ_ROLES=['owner','admin','auditor','member','viewer'];
const WRITE_ROLES=['owner','admin','member'];
const MAX_BYTES=10*1024*1024;

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
    await audit(env,{actorUserId:auth.session.user_id,organizationId,dbaId,action,resourceType:'document',decision:'deny',metadata:{error:scoped.error}});
    return {response:json({ok:false,error:scoped.error},scoped.status)};
  }
  return {auth:auth.session,organizationId,dbaId,membership:scoped.membership};
}

function safeFilename(value){
  const name=String(value||'').trim().replace(/[\\/\0]/g,'_').slice(0,240);
  return name||null;
}

async function sha256Hex(buffer){
  const digest=await crypto.subtle.digest('SHA-256',buffer);
  return [...new Uint8Array(digest)].map(b=>b.toString(16).padStart(2,'0')).join('');
}

async function requestBytes(request){
  const declared=Number(request.headers.get('content-length')||0);
  if(declared>MAX_BYTES) return {error:json({ok:false,error:'document_too_large',maxBytes:MAX_BYTES},413)};
  const buffer=await request.arrayBuffer();
  if(buffer.byteLength>MAX_BYTES) return {error:json({ok:false,error:'document_too_large',maxBytes:MAX_BYTES},413)};
  if(buffer.byteLength===0) return {error:json({ok:false,error:'document_body_required'},400)};
  return {buffer};
}

function parsePath(url){
  const prefix='/api/documents/';
  if(!url.pathname.startsWith(prefix)) return null;
  const rest=url.pathname.slice(prefix.length).split('/').filter(Boolean).map(decodeURIComponent);
  if(!rest.length) return null;
  return {id:rest[0],suffix:rest.slice(1).join('/')};
}

async function currentVersion(env,id,organizationId,dbaId){
  return env.DB.prepare(`
    SELECT d.id,d.filename,d.content_type,d.status,d.current_version,
           v.object_key,v.sha256,v.size_bytes,v.created_at AS version_created_at
    FROM documents d
    JOIN document_versions v ON v.document_id=d.id AND v.version=d.current_version
    WHERE d.id=? AND d.organization_id=? AND d.dba_id=?
  `).bind(id,organizationId,dbaId).first();
}

export async function documentRoutes(request,env,url){
  if(url.pathname==='/api/documents' && request.method==='GET'){
    const ctx=await authorize(env,request,url,READ_ROLES,'document.list');
    if(ctx.response) return ctx.response;
    const limit=Math.min(Math.max(Number(url.searchParams.get('limit')||50),1),200);
    const rows=await env.DB.prepare(`
      SELECT d.id,d.filename,d.content_type,d.status,d.current_version,d.created_by_user_id,d.created_at,d.updated_at,
             v.sha256,v.size_bytes
      FROM documents d
      JOIN document_versions v ON v.document_id=d.id AND v.version=d.current_version
      WHERE d.organization_id=? AND d.dba_id=? AND d.status='active'
      ORDER BY d.updated_at DESC LIMIT ?
    `).bind(ctx.organizationId,ctx.dbaId,limit).all();
    await audit(env,{actorUserId:ctx.auth.user_id,organizationId:ctx.organizationId,dbaId:ctx.dbaId,action:'document.list',resourceType:'document',decision:'allow',metadata:{limit}});
    return json({ok:true,documents:rows.results||[]});
  }

  if(url.pathname==='/api/documents' && request.method==='POST'){
    const ctx=await authorize(env,request,url,WRITE_ROLES,'document.create');
    if(ctx.response) return ctx.response;
    if(!env.BACKUPS) return json({ok:false,error:'r2_binding_unavailable'},503);
    const filename=safeFilename(request.headers.get('x-atlas-filename'));
    if(!filename) return json({ok:false,error:'x_atlas_filename_required'},400);
    const contentType=(request.headers.get('content-type')||'application/octet-stream').slice(0,200);
    const bytes=await requestBytes(request);
    if(bytes.error) return bytes.error;
    const id=crypto.randomUUID();
    const versionId=crypto.randomUUID();
    const version=1;
    const objectKey=`${ctx.organizationId}/${ctx.dbaId}/documents/${id}/${version}`;
    const sha256=await sha256Hex(bytes.buffer);

    await env.BACKUPS.put(objectKey,bytes.buffer,{httpMetadata:{contentType},customMetadata:{documentId:id,version:String(version),sha256}});
    try{
      await env.DB.batch([
        env.DB.prepare(`INSERT INTO documents(id,organization_id,dba_id,filename,content_type,current_version,created_by_user_id) VALUES(?,?,?,?,?,?,?)`).bind(id,ctx.organizationId,ctx.dbaId,filename,contentType,version,ctx.auth.user_id),
        env.DB.prepare(`INSERT INTO document_versions(id,document_id,organization_id,dba_id,version,object_key,sha256,size_bytes,content_type,created_by_user_id) VALUES(?,?,?,?,?,?,?,?,?,?)`).bind(versionId,id,ctx.organizationId,ctx.dbaId,version,objectKey,sha256,bytes.buffer.byteLength,contentType,ctx.auth.user_id)
      ]);
    }catch(error){
      await env.BACKUPS.delete(objectKey).catch(()=>{});
      return json({ok:false,error:'document_metadata_write_failed',detail:String(error?.message||error)},500);
    }
    await audit(env,{actorUserId:ctx.auth.user_id,organizationId:ctx.organizationId,dbaId:ctx.dbaId,action:'document.create',resourceType:'document',resourceId:id,decision:'allow',metadata:{filename,version,sizeBytes:bytes.buffer.byteLength,sha256}});
    return json({ok:true,id,version,sha256,sizeBytes:bytes.buffer.byteLength},201);
  }

  const path=parsePath(url);
  if(path?.id && !path.suffix && request.method==='GET'){
    const ctx=await authorize(env,request,url,READ_ROLES,'document.read');
    if(ctx.response) return ctx.response;
    const row=await currentVersion(env,path.id,ctx.organizationId,ctx.dbaId);
    if(!row) return json({ok:false,error:'document_not_found'},404);
    await audit(env,{actorUserId:ctx.auth.user_id,organizationId:ctx.organizationId,dbaId:ctx.dbaId,action:'document.read',resourceType:'document',resourceId:path.id,decision:'allow'});
    return json({ok:true,document:row});
  }

  if(path?.id && path.suffix==='content' && request.method==='GET'){
    const ctx=await authorize(env,request,url,READ_ROLES,'document.download');
    if(ctx.response) return ctx.response;
    if(!env.BACKUPS) return json({ok:false,error:'r2_binding_unavailable'},503);
    const row=await currentVersion(env,path.id,ctx.organizationId,ctx.dbaId);
    if(!row||row.status!=='active') return json({ok:false,error:'document_not_found'},404);
    const object=await env.BACKUPS.get(row.object_key);
    if(!object) return json({ok:false,error:'document_object_missing'},503);
    await audit(env,{actorUserId:ctx.auth.user_id,organizationId:ctx.organizationId,dbaId:ctx.dbaId,action:'document.download',resourceType:'document',resourceId:path.id,decision:'allow',metadata:{version:row.current_version,sha256:row.sha256}});
    const headers=new Headers();
    object.writeHttpMetadata(headers);
    headers.set('etag',object.httpEtag);
    headers.set('x-atlas-document-sha256',row.sha256);
    headers.set('content-disposition',`attachment; filename="${row.filename.replace(/"/g,'')}"`);
    return new Response(object.body,{headers});
  }

  if(path?.id && path.suffix==='versions' && request.method==='POST'){
    const ctx=await authorize(env,request,url,WRITE_ROLES,'document.version.create');
    if(ctx.response) return ctx.response;
    if(!env.BACKUPS) return json({ok:false,error:'r2_binding_unavailable'},503);
    const current=await currentVersion(env,path.id,ctx.organizationId,ctx.dbaId);
    if(!current||current.status!=='active') return json({ok:false,error:'document_not_found'},404);
    const bytes=await requestBytes(request);
    if(bytes.error) return bytes.error;
    const version=Number(current.current_version)+1;
    const versionId=crypto.randomUUID();
    const contentType=(request.headers.get('content-type')||current.content_type||'application/octet-stream').slice(0,200);
    const filename=safeFilename(request.headers.get('x-atlas-filename'))||current.filename;
    const objectKey=`${ctx.organizationId}/${ctx.dbaId}/documents/${path.id}/${version}`;
    const sha256=await sha256Hex(bytes.buffer);
    await env.BACKUPS.put(objectKey,bytes.buffer,{httpMetadata:{contentType},customMetadata:{documentId:path.id,version:String(version),sha256}});
    try{
      await env.DB.batch([
        env.DB.prepare(`INSERT INTO document_versions(id,document_id,organization_id,dba_id,version,object_key,sha256,size_bytes,content_type,created_by_user_id) VALUES(?,?,?,?,?,?,?,?,?,?)`).bind(versionId,path.id,ctx.organizationId,ctx.dbaId,version,objectKey,sha256,bytes.buffer.byteLength,contentType,ctx.auth.user_id),
        env.DB.prepare(`UPDATE documents SET filename=?,content_type=?,current_version=?,updated_at=CURRENT_TIMESTAMP WHERE id=? AND organization_id=? AND dba_id=?`).bind(filename,contentType,version,path.id,ctx.organizationId,ctx.dbaId)
      ]);
    }catch(error){
      await env.BACKUPS.delete(objectKey).catch(()=>{});
      return json({ok:false,error:'document_version_metadata_write_failed',detail:String(error?.message||error)},500);
    }
    await audit(env,{actorUserId:ctx.auth.user_id,organizationId:ctx.organizationId,dbaId:ctx.dbaId,action:'document.version.create',resourceType:'document',resourceId:path.id,decision:'allow',metadata:{version,sizeBytes:bytes.buffer.byteLength,sha256}});
    return json({ok:true,id:path.id,version,sha256,sizeBytes:bytes.buffer.byteLength},201);
  }

  if(path?.id && !path.suffix && request.method==='DELETE'){
    const ctx=await authorize(env,request,url,WRITE_ROLES,'document.archive');
    if(ctx.response) return ctx.response;
    const result=await env.DB.prepare(`UPDATE documents SET status='archived',updated_at=CURRENT_TIMESTAMP WHERE id=? AND organization_id=? AND dba_id=? AND status='active'`).bind(path.id,ctx.organizationId,ctx.dbaId).run();
    if(!result.meta?.changes) return json({ok:false,error:'document_not_found'},404);
    await audit(env,{actorUserId:ctx.auth.user_id,organizationId:ctx.organizationId,dbaId:ctx.dbaId,action:'document.archive',resourceType:'document',resourceId:path.id,decision:'allow'});
    return json({ok:true,id:path.id,status:'archived'});
  }

  return null;
}
