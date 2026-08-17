import { requireTenantPermission } from './tenant.js';
import { appendAuditLedger } from './audit.js';
import { ensureGlobalPromoSchema } from './global-promo-schema.js';

export const GLOBAL_PROMO_ASSET_MAX_BYTES=8*1024*1024;
export const GLOBAL_PROMO_ASSET_CHUNK_BYTES=1000000;
const ALLOWED_EXTENSIONS=new Set(['.ai','.dst','.emb','.eps','.exp','.jef','.jpeg','.jpg','.pdf','.pes','.png','.ps','.svg','.tif','.tiff','.vp3','.webp']);
const CONTENT_TYPES=new Map([
 ['.jpeg','image/jpeg'],['.jpg','image/jpeg'],['.png','image/png'],['.webp','image/webp'],['.svg','image/svg+xml'],['.tif','image/tiff'],['.tiff','image/tiff'],['.pdf','application/pdf'],['.eps','application/postscript'],['.ps','application/postscript']
]);
let assetReady=false,assetPromise=null;
const json=(body,status=200)=>Response.json(body,{status,headers:{'cache-control':'no-store','x-content-type-options':'nosniff'}});
const text=(value,max=240)=>String(value??'').trim().replace(/\s+/g,' ').slice(0,max);

export const GLOBAL_PROMO_ASSET_SCHEMA_SQL=[
 `CREATE TABLE IF NOT EXISTS global_promo_artwork_assets(
   id TEXT PRIMARY KEY,
   organization_id TEXT NOT NULL,
   dba_id TEXT NOT NULL,
   job_id TEXT NOT NULL,
   file_name TEXT NOT NULL,
   content_type TEXT NOT NULL,
   byte_size INTEGER NOT NULL,
   sha256_hex TEXT NOT NULL,
   chunk_count INTEGER NOT NULL,
   storage_mode TEXT NOT NULL DEFAULT 'd1_chunked',
   created_by_user_id TEXT,
   created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
   FOREIGN KEY(job_id) REFERENCES global_promo_jobs(id) ON DELETE CASCADE,
   CHECK(byte_size>0),
   CHECK(chunk_count>0),
   CHECK(storage_mode='d1_chunked')
 )`,
 `CREATE INDEX IF NOT EXISTS idx_global_promo_assets_scope ON global_promo_artwork_assets(organization_id,dba_id,job_id,created_at DESC)`,
 `CREATE TABLE IF NOT EXISTS global_promo_artwork_asset_chunks(
   asset_id TEXT NOT NULL,
   chunk_index INTEGER NOT NULL,
   byte_size INTEGER NOT NULL,
   data_blob BLOB NOT NULL,
   created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
   PRIMARY KEY(asset_id,chunk_index),
   FOREIGN KEY(asset_id) REFERENCES global_promo_artwork_assets(id) ON DELETE CASCADE,
   CHECK(chunk_index>=0),
   CHECK(byte_size>0 AND byte_size<=1000000)
 )`,
 `CREATE INDEX IF NOT EXISTS idx_global_promo_asset_chunks ON global_promo_artwork_asset_chunks(asset_id,chunk_index)`
];

export function globalPromoArtworkAssetFileName(value){
 const raw=String(value??'').split(/[\\/]/).pop()?.trim()||'';
 const safe=raw.replace(/[\u0000-\u001f\u007f]/g,'').replace(/[^A-Za-z0-9._()\- +]/g,'_').replace(/\s+/g,' ').slice(0,180);
 return safe||null;
}
export function globalPromoArtworkAssetExtension(value){const name=String(value??'').toLowerCase(),i=name.lastIndexOf('.');return i>=0?name.slice(i):''}
export function globalPromoArtworkAssetAllowed(value){return ALLOWED_EXTENSIONS.has(globalPromoArtworkAssetExtension(value))}
export function globalPromoArtworkAssetChunks(bytes,chunkSize=GLOBAL_PROMO_ASSET_CHUNK_BYTES){
 const view=bytes instanceof Uint8Array?bytes:new Uint8Array(bytes);if(!Number.isSafeInteger(chunkSize)||chunkSize<1||chunkSize>1000000)throw new Error('invalid_chunk_size');
 const out=[];for(let offset=0;offset<view.byteLength;offset+=chunkSize)out.push(view.slice(offset,Math.min(view.byteLength,offset+chunkSize)));return out;
}
export function globalPromoArtworkAssetBlobBytes(value){if(value instanceof ArrayBuffer)return new Uint8Array(value);if(ArrayBuffer.isView(value))return new Uint8Array(value.buffer,value.byteOffset,value.byteLength);if(Array.isArray(value))return Uint8Array.from(value);throw new Error('invalid_asset_blob')}
export async function globalPromoArtworkAssetSha256(bytes){const view=bytes instanceof Uint8Array?bytes:new Uint8Array(bytes),digest=await crypto.subtle.digest('SHA-256',view);return [...new Uint8Array(digest)].map(x=>x.toString(16).padStart(2,'0')).join('')}

export async function ensureGlobalPromoAssetSchema(env){
 if(assetReady)return{ok:true,created:false};if(!env?.DB)return{ok:false,error:'identity_database_unavailable'};
 if(!assetPromise)assetPromise=(async()=>{const base=await ensureGlobalPromoSchema(env);if(!base.ok)return base;for(const sql of GLOBAL_PROMO_ASSET_SCHEMA_SQL)await env.DB.prepare(sql).run();assetReady=true;return{ok:true,created:true}})().catch(error=>{assetPromise=null;throw error});return assetPromise;
}
async function authorize(request,env,permission,action){const a=await requireTenantPermission(request,env,permission,action);if(!a.ok)return{response:json({ok:false,error:a.error},a.status)};try{const ready=await ensureGlobalPromoAssetSchema(env);if(!ready.ok)return{response:json({ok:false,error:ready.error},503)}}catch{return{response:json({ok:false,error:'global_promo_asset_schema_unavailable'},503)}}return{authz:a}}
async function audit(env,a,action,id,metadata){try{await appendAuditLedger(env,{organizationId:a.organizationId,dbaId:a.dbaId,actorUserId:a.session.user_id,category:'global_promo',action,resourceType:'global_promo_artwork_asset',resourceId:id,decision:'allow',severity:'info',correlationId:a.correlationId,metadata});return true}catch{return false}}
async function job(env,a,id){return env.DB.prepare(`SELECT id,status FROM global_promo_jobs WHERE id=? AND organization_id=? AND dba_id=?`).bind(id,a.organizationId,a.dbaId).first()}
function uploadAllowed(status){return status==='artwork'}
function contentType(fileName,provided){const ext=globalPromoArtworkAssetExtension(fileName);return CONTENT_TYPES.get(ext)||text(provided,120)||'application/octet-stream'}

async function uploadAsset(request,env){
 const gate=await authorize(request,env,'module.write','global_promo.artwork.asset.upload');if(gate.response)return gate.response;const a=gate.authz;
 let form;try{form=await request.formData()}catch{return json({ok:false,error:'multipart_form_required'},400)}
 const jobId=text(form.get('jobId'),128),owner=await job(env,a,jobId);if(!owner)return json({ok:false,error:'global_promo_job_not_found'},404);if(!uploadAllowed(owner.status))return json({ok:false,error:'artwork_asset_requires_artwork_phase',jobStatus:owner.status},409);
 const file=form.get('file');if(!file||typeof file.arrayBuffer!=='function')return json({ok:false,error:'artwork_file_required'},400);
 const fileName=globalPromoArtworkAssetFileName(file.name);if(!fileName||!globalPromoArtworkAssetAllowed(fileName))return json({ok:false,error:'unsupported_artwork_file_type',allowedExtensions:[...ALLOWED_EXTENSIONS]},415);
 const declaredSize=Number(file.size||0);if(!Number.isFinite(declaredSize)||declaredSize<=0)return json({ok:false,error:'artwork_file_empty'},400);if(declaredSize>GLOBAL_PROMO_ASSET_MAX_BYTES)return json({ok:false,error:'artwork_file_too_large',maxBytes:GLOBAL_PROMO_ASSET_MAX_BYTES},413);
 let bytes;try{bytes=new Uint8Array(await file.arrayBuffer())}catch{return json({ok:false,error:'artwork_file_read_failed'},400)}if(bytes.byteLength!==declaredSize||bytes.byteLength>GLOBAL_PROMO_ASSET_MAX_BYTES)return json({ok:false,error:'artwork_file_size_mismatch'},400);
 const chunks=globalPromoArtworkAssetChunks(bytes),sha256=await globalPromoArtworkAssetSha256(bytes),id=crypto.randomUUID(),type=contentType(fileName,file.type),statements=[env.DB.prepare(`INSERT INTO global_promo_artwork_assets(id,organization_id,dba_id,job_id,file_name,content_type,byte_size,sha256_hex,chunk_count,created_by_user_id) VALUES(?,?,?,?,?,?,?,?,?,?)`).bind(id,a.organizationId,a.dbaId,jobId,fileName,type,bytes.byteLength,sha256,chunks.length,a.session.user_id)];
 chunks.forEach((chunk,index)=>statements.push(env.DB.prepare(`INSERT INTO global_promo_artwork_asset_chunks(asset_id,chunk_index,byte_size,data_blob) VALUES(?,?,?,?)`).bind(id,index,chunk.byteLength,chunk)));
 try{await env.DB.batch(statements)}catch{return json({ok:false,error:'artwork_asset_store_failed'},503)}
 const auditRecorded=await audit(env,a,'global_promo.artwork.asset.upload',id,{jobId,fileName,contentType:type,byteSize:bytes.byteLength,sha256Hex:sha256,chunkCount:chunks.length,storageMode:'d1_chunked'});
 return json({ok:true,asset:{id,jobId,fileName,contentType:type,byteSize:bytes.byteLength,sha256Hex:sha256,chunkCount:chunks.length,storageMode:'d1_chunked',fileReference:`asset:${id}`,downloadPath:`/api/global-promo/assets/${encodeURIComponent(id)}/content`},auditRecorded},201)
}
async function listAssets(request,env,url){
 const gate=await authorize(request,env,'module.read','global_promo.artwork.assets.read');if(gate.response)return gate.response;const a=gate.authz,jobId=text(url.searchParams.get('jobId'),128),clauses=['a.organization_id=?','a.dba_id=?'],binds=[a.organizationId,a.dbaId];if(jobId){clauses.push('a.job_id=?');binds.push(jobId)}
 const rows=await env.DB.prepare(`SELECT a.id,a.job_id,a.file_name,a.content_type,a.byte_size,a.sha256_hex,a.chunk_count,a.storage_mode,a.created_at,CASE WHEN EXISTS(SELECT 1 FROM global_promo_artwork_versions v WHERE v.organization_id=a.organization_id AND v.dba_id=a.dba_id AND v.job_id=a.job_id AND (v.file_reference=('asset:'||a.id) OR v.mockup_reference=('asset:'||a.id) OR v.approval_evidence_reference=('asset:'||a.id))) THEN 1 ELSE 0 END AS referenced FROM global_promo_artwork_assets a WHERE ${clauses.join(' AND ')} ORDER BY a.created_at DESC LIMIT 100`).bind(...binds).all();
 return json({ok:true,assets:(rows.results||[]).map(x=>({...x,fileReference:`asset:${x.id}`,downloadPath:`/api/global-promo/assets/${encodeURIComponent(x.id)}/content`,referenced:Boolean(x.referenced)})),limits:{maxBytes:GLOBAL_PROMO_ASSET_MAX_BYTES,chunkBytes:GLOBAL_PROMO_ASSET_CHUNK_BYTES}})
}
async function downloadAsset(request,env,id){
 const gate=await authorize(request,env,'module.read','global_promo.artwork.asset.download');if(gate.response)return gate.response;const a=gate.authz,meta=await env.DB.prepare(`SELECT id,job_id,file_name,content_type,byte_size,sha256_hex,chunk_count FROM global_promo_artwork_assets WHERE id=? AND organization_id=? AND dba_id=?`).bind(id,a.organizationId,a.dbaId).first();if(!meta)return json({ok:false,error:'artwork_asset_not_found'},404);
 const rows=await env.DB.prepare(`SELECT chunk_index,byte_size,data_blob FROM global_promo_artwork_asset_chunks WHERE asset_id=? ORDER BY chunk_index`).bind(id).all(),chunks=rows.results||[];if(chunks.length!==Number(meta.chunk_count||0))return json({ok:false,error:'artwork_asset_incomplete'},503);
 const total=Number(meta.byte_size||0),out=new Uint8Array(total);let offset=0;for(const row of chunks){let bytes;try{bytes=globalPromoArtworkAssetBlobBytes(row.data_blob)}catch{return json({ok:false,error:'artwork_asset_blob_invalid'},503)}if(bytes.byteLength!==Number(row.byte_size||0)||offset+bytes.byteLength>out.byteLength)return json({ok:false,error:'artwork_asset_size_invalid'},503);out.set(bytes,offset);offset+=bytes.byteLength}if(offset!==out.byteLength)return json({ok:false,error:'artwork_asset_incomplete'},503);
 return new Response(out,{status:200,headers:{'content-type':text(meta.content_type,120)||'application/octet-stream','content-length':String(out.byteLength),'content-disposition':`attachment; filename*=UTF-8''${encodeURIComponent(meta.file_name)}`,'cache-control':'private,no-store','x-content-type-options':'nosniff','cross-origin-resource-policy':'same-origin'}})
}
async function deleteAsset(request,env,id){
 const gate=await authorize(request,env,'module.write','global_promo.artwork.asset.delete');if(gate.response)return gate.response;const a=gate.authz,meta=await env.DB.prepare(`SELECT id,job_id,file_name FROM global_promo_artwork_assets WHERE id=? AND organization_id=? AND dba_id=?`).bind(id,a.organizationId,a.dbaId).first();if(!meta)return json({ok:false,error:'artwork_asset_not_found'},404);
 const ref=`asset:${id}`,used=await env.DB.prepare(`SELECT id FROM global_promo_artwork_versions WHERE organization_id=? AND dba_id=? AND job_id=? AND (file_reference=? OR mockup_reference=? OR approval_evidence_reference=?) LIMIT 1`).bind(a.organizationId,a.dbaId,meta.job_id,ref,ref,ref).first();if(used)return json({ok:false,error:'artwork_asset_in_use',artworkVersionId:used.id},409);
 await env.DB.prepare(`DELETE FROM global_promo_artwork_assets WHERE id=? AND organization_id=? AND dba_id=?`).bind(id,a.organizationId,a.dbaId).run();return json({ok:true,asset:{id,deleted:true},auditRecorded:await audit(env,a,'global_promo.artwork.asset.delete',id,{jobId:meta.job_id,fileName:meta.file_name})})
}

export async function globalPromoAssetRoutes(request,env,url=new URL(request.url)){
 const path=url.pathname.length>1?url.pathname.replace(/\/+$/,''):url.pathname;
 if(path==='/api/global-promo/assets'&&request.method==='POST')return uploadAsset(request,env);
 if(path==='/api/global-promo/assets'&&request.method==='GET')return listAssets(request,env,url);
 let match=path.match(/^\/api\/global-promo\/assets\/([^/]+)\/content$/);if(match&&request.method==='GET')return downloadAsset(request,env,decodeURIComponent(match[1]));
 match=path.match(/^\/api\/global-promo\/assets\/([^/]+)$/);if(match&&request.method==='DELETE')return deleteAsset(request,env,decodeURIComponent(match[1]));
 return null;
}