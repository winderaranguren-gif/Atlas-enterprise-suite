const READ_ROLES=new Set(['owner','admin','editor','viewer','auditor']);
const WRITE_ROLES=new Set(['owner','admin','editor']);
const MAX_DOCUMENT_BYTES=1024*1024;
const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json;charset=UTF-8','cache-control':'no-store'}});
const id=()=>crypto.randomUUID();

async function sha256(value){
  const bytes=new TextEncoder().encode(value);
  const digest=await crypto.subtle.digest('SHA-256',bytes);
  return [...new Uint8Array(digest)].map(b=>b.toString(16).padStart(2,'0')).join('');
}

async function authenticate(request,env){
  const header=request.headers.get('authorization')||'';
  if(!header.startsWith('Bearer ')) return null;
  const raw=header.slice(7).trim();
  if(!raw) return null;
  const tokenHash=await sha256(raw);
  const now=new Date().toISOString();
  return env.DB.prepare(`SELECT s.id AS session_id,s.user_id
    FROM atlas_sessions s JOIN atlas_users u ON u.id=s.user_id
    WHERE s.token_hash=? AND s.revoked_at IS NULL AND s.expires_at>? AND u.status='active'`)
    .bind(tokenHash,now).first();
}

async function authorize(request,env,mode){
  const actor=await authenticate(request,env);
  if(!actor) return {error:json({error:'Unauthorized'},401)};
  const org=request.headers.get('x-atlas-organization')||'';
  const dba=request.headers.get('x-atlas-dba')||'';
  if(!org||!dba) return {error:json({error:'Organization and DBA scope are required'},400)};
  const membership=await env.DB.prepare(`SELECT role FROM atlas_memberships
    WHERE user_id=? AND organization_id=? AND dba_id=? AND status='active'`)
    .bind(actor.user_id,org,dba).first();
  if(!membership) return {error:json({error:'Forbidden'},403)};
  const role=String(membership.role||'').toLowerCase();
  const allowed=mode==='read'?READ_ROLES.has(role):WRITE_ROLES.has(role);
  if(!allowed) return {error:json({error:'Forbidden for role'},403)};
  return {actor,org,dba,role};
}

async function audit(env,{org,dba,userId,action,resourceId,payload={}}){
  await env.DB.prepare(`INSERT INTO atlas_audit_events(id,organization_id,dba_id,actor_user_id,action,resource_type,resource_id,payload,created_at)
    VALUES(?,?,?,?,?,'document',?,?,?)`)
    .bind(id(),org,dba,userId,action,resourceId,JSON.stringify(payload),new Date().toISOString()).run();
}

function normalizeContent(body){
  const content=String(body.content_text??'');
  const size=new TextEncoder().encode(content).byteLength;
  if(size>MAX_DOCUMENT_BYTES) return {error:`Document exceeds ${MAX_DOCUMENT_BYTES} byte limit`};
  return {content,size};
}

async function createDocument(request,env){
  const auth=await authorize(request,env,'write'); if(auth.error) return auth.error;
  const body=await request.json();
  const title=String(body.title||'').trim();
  if(!title) return json({error:'title is required'},400);
  const normalized=normalizeContent(body); if(normalized.error) return json({error:normalized.error},413);
  const hash=await sha256(normalized.content);
  const now=new Date().toISOString();
  const documentId=id();
  const versionId=id();
  const mimeType=String(body.mime_type||'text/plain').trim()||'text/plain';
  const metadata=JSON.stringify(body.metadata&&typeof body.metadata==='object'?body.metadata:{});
  await env.DB.batch([
    env.DB.prepare(`INSERT INTO atlas_documents(id,organization_id,dba_id,title,mime_type,status,current_version,current_hash,size_bytes,metadata,created_by,created_at,updated_at)
      VALUES(?,?,?,?,?,'active',1,?,?,?,?,?,?)`)
      .bind(documentId,auth.org,auth.dba,title,mimeType,hash,normalized.size,metadata,auth.actor.user_id,now,now),
    env.DB.prepare(`INSERT INTO atlas_document_versions(id,document_id,organization_id,dba_id,version,content_text,content_hash,size_bytes,created_by,created_at)
      VALUES(?,?,?,?,1,?,?,?,?,?)`)
      .bind(versionId,documentId,auth.org,auth.dba,normalized.content,hash,normalized.size,auth.actor.user_id,now)
  ]);
  await audit(env,{org:auth.org,dba:auth.dba,userId:auth.actor.user_id,action:'create',resourceId:documentId,payload:{title,mime_type:mimeType,version:1,content_hash:hash,size_bytes:normalized.size}});
  return json({ok:true,id:documentId,current_version:1,current_hash:hash,size_bytes:normalized.size},201);
}

async function listDocuments(request,env){
  const auth=await authorize(request,env,'read'); if(auth.error) return auth.error;
  const r=await env.DB.prepare(`SELECT id,title,mime_type,status,current_version,current_hash,size_bytes,metadata,created_by,created_at,updated_at
    FROM atlas_documents WHERE organization_id=? AND dba_id=? ORDER BY updated_at DESC`)
    .bind(auth.org,auth.dba).all();
  await audit(env,{org:auth.org,dba:auth.dba,userId:auth.actor.user_id,action:'read_collection',resourceId:'collection',payload:{count:(r.results||[]).length}});
  return json({documents:r.results||[]});
}

async function getDocument(request,env,documentId){
  const auth=await authorize(request,env,'read'); if(auth.error) return auth.error;
  const document=await env.DB.prepare(`SELECT * FROM atlas_documents WHERE id=? AND organization_id=? AND dba_id=?`)
    .bind(documentId,auth.org,auth.dba).first();
  if(!document) return json({error:'Document not found'},404);
  const versions=await env.DB.prepare(`SELECT id,version,content_hash,size_bytes,created_by,created_at
    FROM atlas_document_versions WHERE document_id=? AND organization_id=? AND dba_id=? ORDER BY version DESC`)
    .bind(documentId,auth.org,auth.dba).all();
  await audit(env,{org:auth.org,dba:auth.dba,userId:auth.actor.user_id,action:'read',resourceId:documentId,payload:{version_count:(versions.results||[]).length}});
  return json({document,versions:versions.results||[]});
}

async function getVersion(request,env,documentId,versionNumber){
  const auth=await authorize(request,env,'read'); if(auth.error) return auth.error;
  const version=await env.DB.prepare(`SELECT * FROM atlas_document_versions
    WHERE document_id=? AND version=? AND organization_id=? AND dba_id=?`)
    .bind(documentId,versionNumber,auth.org,auth.dba).first();
  if(!version) return json({error:'Document version not found'},404);
  await audit(env,{org:auth.org,dba:auth.dba,userId:auth.actor.user_id,action:'read_version',resourceId:documentId,payload:{version:versionNumber}});
  return json({version});
}

async function addVersion(request,env,documentId){
  const auth=await authorize(request,env,'write'); if(auth.error) return auth.error;
  const current=await env.DB.prepare(`SELECT current_version,status FROM atlas_documents WHERE id=? AND organization_id=? AND dba_id=?`)
    .bind(documentId,auth.org,auth.dba).first();
  if(!current) return json({error:'Document not found'},404);
  if(current.status!=='active') return json({error:'Archived documents cannot receive new versions'},409);
  const body=await request.json();
  const normalized=normalizeContent(body); if(normalized.error) return json({error:normalized.error},413);
  const nextVersion=Number(current.current_version)+1;
  const hash=await sha256(normalized.content);
  const now=new Date().toISOString();
  await env.DB.batch([
    env.DB.prepare(`INSERT INTO atlas_document_versions(id,document_id,organization_id,dba_id,version,content_text,content_hash,size_bytes,created_by,created_at)
      VALUES(?,?,?,?,?,?,?,?,?,?)`)
      .bind(id(),documentId,auth.org,auth.dba,nextVersion,normalized.content,hash,normalized.size,auth.actor.user_id,now),
    env.DB.prepare(`UPDATE atlas_documents SET current_version=?,current_hash=?,size_bytes=?,updated_at=?
      WHERE id=? AND organization_id=? AND dba_id=?`)
      .bind(nextVersion,hash,normalized.size,now,documentId,auth.org,auth.dba)
  ]);
  await audit(env,{org:auth.org,dba:auth.dba,userId:auth.actor.user_id,action:'create_version',resourceId:documentId,payload:{version:nextVersion,content_hash:hash,size_bytes:normalized.size}});
  return json({ok:true,id:documentId,current_version:nextVersion,current_hash:hash,size_bytes:normalized.size},201);
}

async function archiveDocument(request,env,documentId){
  const auth=await authorize(request,env,'write'); if(auth.error) return auth.error;
  const existing=await env.DB.prepare(`SELECT id,status FROM atlas_documents WHERE id=? AND organization_id=? AND dba_id=?`)
    .bind(documentId,auth.org,auth.dba).first();
  if(!existing) return json({error:'Document not found'},404);
  if(existing.status==='archived') return json({ok:true,id:documentId,status:'archived'});
  const now=new Date().toISOString();
  await env.DB.prepare(`UPDATE atlas_documents SET status='archived',updated_at=? WHERE id=? AND organization_id=? AND dba_id=?`)
    .bind(now,documentId,auth.org,auth.dba).run();
  await audit(env,{org:auth.org,dba:auth.dba,userId:auth.actor.user_id,action:'archive',resourceId:documentId});
  return json({ok:true,id:documentId,status:'archived'});
}

export async function handleDocuments(request,env){
  const url=new URL(request.url);
  if(url.pathname==='/api/documents/health'&&request.method==='GET'){
    if(!env.DB) return json({operational:false,error:'D1 binding DB is not configured'},503);
    const tables=await env.DB.prepare("SELECT name FROM sqlite_schema WHERE type='table' AND name IN ('atlas_documents','atlas_document_versions')").all();
    const names=new Set((tables.results||[]).map(r=>r.name));
    const missing=['atlas_documents','atlas_document_versions'].filter(name=>!names.has(name));
    return json({operational:missing.length===0,service:'ATLAS Documents',storage:'D1',missingTables:missing});
  }
  if(url.pathname==='/api/documents'&&request.method==='GET') return listDocuments(request,env);
  if(url.pathname==='/api/documents'&&request.method==='POST') return createDocument(request,env);
  const parts=url.pathname.split('/').filter(Boolean);
  if(parts[0]!=='api'||parts[1]!=='documents'||!parts[2]) return null;
  const documentId=parts[2];
  if(parts.length===3&&request.method==='GET') return getDocument(request,env,documentId);
  if(parts.length===3&&request.method==='DELETE') return archiveDocument(request,env,documentId);
  if(parts[3]==='versions'&&parts.length===4&&request.method==='POST') return addVersion(request,env,documentId);
  if(parts[3]==='versions'&&parts[4]&&request.method==='GET'){
    const versionNumber=Number(parts[4]);
    if(!Number.isSafeInteger(versionNumber)||versionNumber<1) return json({error:'Invalid version number'},400);
    return getVersion(request,env,documentId,versionNumber);
  }
  return json({error:'Method not allowed'},405);
}
