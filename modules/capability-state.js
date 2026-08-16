import { requirePermission } from './rbac.js';

const CAPABILITIES=new Set(['lingua','language-coach','academy','tax-compliance','tax-pro','candidate-hub','forms','stream','subscriptions','personalization']);
const MAX_PAYLOAD_BYTES=65536;
const MAX_RECORDS=100;

const json=(body,status=200)=>Response.json(body,{status,headers:{'cache-control':'no-store','x-content-type-options':'nosniff'}});
const validId=value=>typeof value==='string'&&value.length>=8&&value.length<=128&&/^[A-Za-z0-9._:-]+$/.test(value);
const validKey=value=>typeof value==='string'&&value.length>=1&&value.length<=120&&/^[A-Za-z0-9][A-Za-z0-9._:-]*$/.test(value);
const modeOf=value=>value==='scope'?'scope':value==='user'?'user':null;

async function parseJsonBody(request){
  const text=await request.text();
  if(new TextEncoder().encode(text).byteLength>MAX_PAYLOAD_BYTES+4096)return {ok:false,error:'request_too_large',status:413};
  try{return {ok:true,body:JSON.parse(text)}}catch{return {ok:false,error:'valid_json_required',status:400}}
}

async function authorize(request,env,organizationId,dbaId,permission){
  if(!validId(organizationId)||!validId(dbaId))return {ok:false,status:400,error:'valid_scope_required'};
  const authz=await requirePermission(request,env,organizationId,dbaId,permission);
  return authz.ok?authz:{ok:false,status:authz.status||403,error:authz.error||'scope_forbidden'};
}

function subjectKey(mode,userId){return mode==='scope'?'scope':`user:${userId}`}
function normalizeRecord(row,includePayload=false){
  const record={key:row.record_key,updatedAt:row.updated_at,createdAt:row.created_at};
  if(includePayload){try{record.payload=JSON.parse(row.payload_json)}catch{record.payload=null}}
  return record;
}

async function readState(request,env,url,capability){
  const organizationId=url.searchParams.get('organizationId')||'';
  const dbaId=url.searchParams.get('dbaId')||'';
  const mode=modeOf(url.searchParams.get('mode')||'user');
  const key=url.searchParams.get('key');
  if(!mode)return json({ok:false,error:'mode_must_be_user_or_scope'},400);
  if(key!==null&&!validKey(key))return json({ok:false,error:'valid_record_key_required'},400);
  const authz=await authorize(request,env,organizationId,dbaId,'module.read');
  if(!authz.ok)return json({ok:false,error:authz.error},authz.status);
  const subject=subjectKey(mode,authz.session.user_id);

  if(key!==null){
    const row=await env.DB.prepare(`SELECT record_key,payload_json,created_at,updated_at FROM capability_state
      WHERE organization_id=? AND dba_id=? AND capability_slug=? AND subject_key=? AND record_key=?`)
      .bind(organizationId,dbaId,capability,subject,key).first();
    return json({ok:true,capability,mode,key,record:row?normalizeRecord(row,true):null});
  }

  const rows=await env.DB.prepare(`SELECT record_key,created_at,updated_at FROM capability_state
    WHERE organization_id=? AND dba_id=? AND capability_slug=? AND subject_key=? ORDER BY updated_at DESC LIMIT ?`)
    .bind(organizationId,dbaId,capability,subject,MAX_RECORDS).all();
  return json({ok:true,capability,mode,records:(rows.results||[]).map(row=>normalizeRecord(row,false)),limit:MAX_RECORDS});
}

async function writeState(request,env,capability){
  const parsed=await parseJsonBody(request);
  if(!parsed.ok)return json({ok:false,error:parsed.error},parsed.status);
  const body=parsed.body||{};
  const organizationId=String(body.organizationId||'');
  const dbaId=String(body.dbaId||'');
  const mode=modeOf(body.mode||'user');
  const key=String(body.key||'');
  if(!mode)return json({ok:false,error:'mode_must_be_user_or_scope'},400);
  if(!validKey(key))return json({ok:false,error:'valid_record_key_required'},400);
  if(body.payload===undefined)return json({ok:false,error:'payload_required'},400);
  let payloadJson;
  try{payloadJson=JSON.stringify(body.payload)}catch{return json({ok:false,error:'payload_must_be_json_serializable'},400)}
  if(new TextEncoder().encode(payloadJson).byteLength>MAX_PAYLOAD_BYTES)return json({ok:false,error:'payload_too_large',maxBytes:MAX_PAYLOAD_BYTES},413);

  const authz=await authorize(request,env,organizationId,dbaId,'module.write');
  if(!authz.ok)return json({ok:false,error:authz.error},authz.status);
  const subject=subjectKey(mode,authz.session.user_id);
  const id=crypto.randomUUID();
  await env.DB.prepare(`INSERT INTO capability_state(
      id,organization_id,dba_id,capability_slug,subject_key,record_key,payload_json,created_by_user_id,updated_by_user_id
    ) VALUES(?,?,?,?,?,?,?,?,?)
    ON CONFLICT(organization_id,dba_id,capability_slug,subject_key,record_key) DO UPDATE SET
      payload_json=excluded.payload_json,updated_by_user_id=excluded.updated_by_user_id,updated_at=CURRENT_TIMESTAMP`)
    .bind(id,organizationId,dbaId,capability,subject,key,payloadJson,authz.session.user_id,authz.session.user_id).run();
  return json({ok:true,capability,mode,key,saved:true},200);
}

async function deleteState(request,env,url,capability){
  const organizationId=url.searchParams.get('organizationId')||'';
  const dbaId=url.searchParams.get('dbaId')||'';
  const mode=modeOf(url.searchParams.get('mode')||'user');
  const key=url.searchParams.get('key')||'';
  if(!mode)return json({ok:false,error:'mode_must_be_user_or_scope'},400);
  if(!validKey(key))return json({ok:false,error:'valid_record_key_required'},400);
  const authz=await authorize(request,env,organizationId,dbaId,'module.write');
  if(!authz.ok)return json({ok:false,error:authz.error},authz.status);
  const subject=subjectKey(mode,authz.session.user_id);
  const result=await env.DB.prepare(`DELETE FROM capability_state
    WHERE organization_id=? AND dba_id=? AND capability_slug=? AND subject_key=? AND record_key=?`)
    .bind(organizationId,dbaId,capability,subject,key).run();
  return json({ok:true,capability,mode,key,deleted:Number(result.meta?.changes||0)>0});
}

export async function capabilityStateRoutes(request,env,url){
  if(!url.pathname.startsWith('/api/capability-state/'))return null;
  let capability='';
  try{capability=decodeURIComponent(url.pathname.slice('/api/capability-state/'.length)).replace(/\/$/,'')}catch{return json({ok:false,error:'invalid_capability_path'},400)}
  if(!CAPABILITIES.has(capability))return json({ok:false,error:'capability_not_found'},404);
  if(request.method==='GET')return readState(request,env,url,capability);
  if(request.method==='PUT')return writeState(request,env,capability);
  if(request.method==='DELETE')return deleteState(request,env,url,capability);
  return json({ok:false,error:'method_not_allowed'},405);
}
