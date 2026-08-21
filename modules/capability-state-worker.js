const JSON_HEADERS={'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'};

export const CAPABILITY_STATE_CAPABILITIES=['lingua','language-coach','academy','tax-compliance','tax-pro','candidate-hub','forms','stream','subscriptions','personalization'];
const CAPABILITY_SET=new Set(CAPABILITY_STATE_CAPABILITIES);
const MAX_PAYLOAD_BYTES=65536;
const MAX_RECORDS=100;

const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:JSON_HEADERS});
const validId=value=>typeof value==='string'&&value.length>=8&&value.length<=128&&/^[A-Za-z0-9._:-]+$/.test(value);
const validKey=value=>typeof value==='string'&&value.length>=1&&value.length<=120&&/^[A-Za-z0-9][A-Za-z0-9._:-]*$/.test(value);
const validMode=value=>value==='scope'||value==='user';

function constantTimeEqual(a,b){
  const aa=new TextEncoder().encode(String(a||''));
  const bb=new TextEncoder().encode(String(b||''));
  if(aa.length!==bb.length)return false;
  let out=0;
  for(let i=0;i<aa.length;i++)out|=aa[i]^bb[i];
  return out===0;
}

function authorize(request,env){
  if(!env.ATLAS_CAPABILITY_STATE_TOKEN)return {ok:false,status:503,error:'capability_state_identity_gateway_not_configured'};
  const auth=request.headers.get('authorization')||'';
  const token=auth.startsWith('Bearer ')?auth.slice(7).trim():'';
  if(!token||!constantTimeEqual(token,env.ATLAS_CAPABILITY_STATE_TOKEN))return {ok:false,status:401,error:'capability_state_unauthorized'};
  const organizationId=request.headers.get('x-atlas-organization-id')||'';
  const dbaId=request.headers.get('x-atlas-dba-id')||'';
  const userId=request.headers.get('x-atlas-user-id')||'';
  if(!validId(organizationId)||!validId(dbaId))return {ok:false,status:400,error:'valid_scope_headers_required'};
  return {ok:true,organizationId,dbaId,userId:validId(userId)?userId:null};
}

async function parseBody(request){
  const text=await request.text();
  if(new TextEncoder().encode(text).byteLength>MAX_PAYLOAD_BYTES+4096)return {ok:false,status:413,error:'request_too_large'};
  try{return {ok:true,body:JSON.parse(text)}}catch{return {ok:false,status:400,error:'valid_json_required'}}
}

function routeCapability(path){
  if(!path.startsWith('/api/capability-state/'))return null;
  try{return decodeURIComponent(path.slice('/api/capability-state/'.length)).replace(/\/$/,'')}catch{return ''}
}

export class CapabilityStateStore{
  constructor(state){this.state=state;}
  async fetch(request){
    const url=new URL(request.url);
    const subject=url.searchParams.get('subject')||'';
    const key=url.searchParams.get('key');
    if(!subject)return json({ok:false,error:'subject_required'},400);
    const prefix=`${subject}:`;
    if(request.method==='GET'){
      if(key!==null){
        const row=await this.state.storage.get(prefix+key);
        return json({ok:true,record:row||null});
      }
      const rows=await this.state.storage.list({prefix,limit:MAX_RECORDS});
      const records=[];
      for(const [storageKey,row] of rows)records.push({key:storageKey.slice(prefix.length),createdAt:row.createdAt,updatedAt:row.updatedAt});
      records.sort((a,b)=>String(b.updatedAt).localeCompare(String(a.updatedAt)));
      return json({ok:true,records,limit:MAX_RECORDS});
    }
    if(request.method==='PUT'){
      if(!key)return json({ok:false,error:'key_required'},400);
      const body=await request.json();
      const existing=await this.state.storage.get(prefix+key);
      const now=new Date().toISOString();
      await this.state.storage.put(prefix+key,{payload:body.payload,createdAt:existing?.createdAt||now,updatedAt:now,updatedBy:body.updatedBy||null});
      return json({ok:true,saved:true,key});
    }
    if(request.method==='DELETE'){
      if(!key)return json({ok:false,error:'key_required'},400);
      const existed=Boolean(await this.state.storage.get(prefix+key));
      if(existed)await this.state.storage.delete(prefix+key);
      return json({ok:true,deleted:existed,key});
    }
    return json({ok:false,error:'method_not_allowed'},405);
  }
}

export async function handleCapabilityState(request,env){
  const url=new URL(request.url);
  const capability=routeCapability(url.pathname);
  if(capability===null)return null;
  if(!CAPABILITY_SET.has(capability))return json({ok:false,error:'capability_not_found'},404);
  if(!env.CAPABILITY_STATE_STORE)return json({ok:false,error:'capability_state_store_not_bound'},503);
  if(!['GET','PUT','DELETE'].includes(request.method))return json({ok:false,error:'method_not_allowed'},405);

  const authz=authorize(request,env);
  if(!authz.ok)return json({ok:false,error:authz.error},authz.status);
  const mode=url.searchParams.get('mode')||'user';
  if(!validMode(mode))return json({ok:false,error:'mode_must_be_user_or_scope'},400);
  if(mode==='user'&&!authz.userId)return json({ok:false,error:'valid_user_header_required_for_user_mode'},400);

  let key=url.searchParams.get('key');
  let putPayload=null;
  if(request.method==='PUT'){
    const parsed=await parseBody(request);
    if(!parsed.ok)return json({ok:false,error:parsed.error},parsed.status);
    key=String(parsed.body?.key||key||'');
    if(!validKey(key))return json({ok:false,error:'valid_record_key_required'},400);
    if(parsed.body?.payload===undefined)return json({ok:false,error:'payload_required'},400);
    let payloadJson;
    try{payloadJson=JSON.stringify(parsed.body.payload)}catch{return json({ok:false,error:'payload_must_be_json_serializable'},400)}
    if(new TextEncoder().encode(payloadJson).byteLength>MAX_PAYLOAD_BYTES)return json({ok:false,error:'payload_too_large',maxBytes:MAX_PAYLOAD_BYTES},413);
    putPayload={payload:parsed.body.payload,updatedBy:authz.userId};
  }else if(key!==null&&!validKey(key)){
    return json({ok:false,error:'valid_record_key_required'},400);
  }
  if(request.method==='DELETE'&&key===null)return json({ok:false,error:'valid_record_key_required'},400);

  const subject=mode==='scope'?'scope':`user:${authz.userId}`;
  const id=env.CAPABILITY_STATE_STORE.idFromName(`${authz.organizationId}:${authz.dbaId}:${capability}`);
  const stub=env.CAPABILITY_STATE_STORE.get(id);
  const target=new URL('https://capability-state.internal/state');
  target.searchParams.set('subject',subject);
  if(key!==null)target.searchParams.set('key',key);
  const init={method:request.method};
  if(putPayload){init.headers={'content-type':'application/json'};init.body=JSON.stringify(putPayload);}
  const response=await stub.fetch(new Request(target,init));
  const data=await response.json();
  return json({capability,mode,...data},response.status);
}
