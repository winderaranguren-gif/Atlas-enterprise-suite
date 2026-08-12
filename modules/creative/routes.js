import { json } from '../../platform/runtime/health.js';
import { requireSession, requireScope } from '../../platform/security/auth.js';
import { audit } from '../../platform/security/audit.js';

const READ_ROLES=['owner','admin','auditor','member','viewer'];
const WRITE_ROLES=['owner','admin','member'];
const MAX_PROMPT_CHARS=12000;
const IMAGE_SIZES=new Set(['1024x1024','1024x1536','1536x1024','auto']);
const IMAGE_QUALITIES=new Set(['low','medium','high','auto']);
const VIDEO_SIZES=new Set(['720x1280','1280x720','1024x1792','1792x1024']);
const VIDEO_SECONDS=new Set(['4','8','12']);

export const CREATIVE_CAPABILITIES=[
  {id:'image.generate',name:'Image generation',state:'implemented'},
  {id:'image.edit',name:'AI image editing / inpainting / outpainting',state:'planned'},
  {id:'image.upscale',name:'Image upscale',state:'planned'},
  {id:'video.generate',name:'Video generation',state:'implemented'},
  {id:'video.remix',name:'Video remix',state:'planned'},
  {id:'video.motion',name:'Motion control',state:'planned'},
  {id:'video.lipsync',name:'Lip sync',state:'planned'},
  {id:'video.vfx',name:'VFX / relight / background replacement',state:'planned'},
  {id:'character.library',name:'Reusable consistent characters',state:'foundation'},
  {id:'story.one_click',name:'One-click story / storyboard director',state:'planned'},
  {id:'audio.generate',name:'Voice, music and sound generation',state:'planned'},
  {id:'world.3d',name:'Persistent 3D worlds',state:'planned'},
  {id:'provider.registry',name:'Multi-model provider registry',state:'foundation'}
];

function clean(value,max=MAX_PROMPT_CHARS){
  if(value===undefined||value===null) return '';
  return String(value).trim().slice(0,max);
}

function scopeFrom(request,url){
  return {
    organizationId:url.searchParams.get('organization_id')||request.headers.get('x-atlas-organization'),
    dbaId:url.searchParams.get('dba_id')||request.headers.get('x-atlas-dba')
  };
}

async function authorize(env,request,url,roles,action,resourceType='creative_job'){
  const auth=await requireSession(env,request);
  if(!auth.ok) return {response:json({ok:false,error:auth.error},auth.status)};
  const {organizationId,dbaId}=scopeFrom(request,url);
  if(!organizationId||!dbaId) return {response:json({ok:false,error:'organization_and_dba_required'},400)};
  const scoped=await requireScope(env,auth.session.user_id,organizationId,dbaId,roles);
  if(!scoped.ok){
    await audit(env,{actorUserId:auth.session.user_id,organizationId,dbaId,action,resourceType,decision:'deny',metadata:{error:scoped.error}});
    return {response:json({ok:false,error:scoped.error},scoped.status)};
  }
  return {auth:auth.session,membership:scoped.membership,organizationId,dbaId};
}

function providerHeaders(env){
  return {
    authorization:`Bearer ${env.OPENAI_API_KEY}`,
    'content-type':'application/json'
  };
}

async function insertJob(env,ctx,{id,kind,operation,provider,model,prompt,status='queued',progress=0,providerJobId=null,settings={}}){
  await env.DB.prepare(`INSERT INTO creative_jobs(id,organization_id,dba_id,kind,operation,provider,model,prompt,status,progress,provider_job_id,settings_json,created_by_user_id) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)`)
    .bind(id,ctx.organizationId,ctx.dbaId,kind,operation,provider,model,prompt,status,progress,providerJobId,JSON.stringify(settings),ctx.auth.user_id).run();
}

async function updateJob(env,ctx,id,{status,progress=0,providerJobId=null,outputRef=null,error=null}){
  await env.DB.prepare(`UPDATE creative_jobs SET status=?,progress=?,provider_job_id=COALESCE(?,provider_job_id),output_ref=COALESCE(?,output_ref),error_json=?,updated_at=CURRENT_TIMESTAMP WHERE id=? AND organization_id=? AND dba_id=?`)
    .bind(status,Number(progress)||0,providerJobId,outputRef,error?JSON.stringify(error):null,id,ctx.organizationId,ctx.dbaId).run();
}

async function generateImage(env,{prompt,size,quality,background}){
  if(!env.OPENAI_API_KEY) return {ok:false,status:503,error:'creative_provider_not_configured'};
  const model=env.ATLAS_IMAGE_MODEL||'gpt-image-1';
  let response;
  try{
    response=await fetch('https://api.openai.com/v1/images/generations',{
      method:'POST',
      headers:providerHeaders(env),
      body:JSON.stringify({model,prompt,n:1,size,quality,background})
    });
  }catch{
    return {ok:false,status:502,error:'creative_provider_unreachable'};
  }
  const payload=await response.json().catch(()=>null);
  if(!response.ok){
    return {ok:false,status:502,error:'creative_provider_error',providerStatus:response.status,providerMessage:payload?.error?.message||null};
  }
  const item=payload?.data?.[0];
  if(!item?.b64_json && !item?.url) return {ok:false,status:502,error:'creative_empty_image'};
  return {ok:true,model,imageBase64:item?.b64_json||null,imageUrl:item?.url||null,revisedPrompt:item?.revised_prompt||null,usage:payload?.usage||null};
}

async function createVideo(env,{prompt,size,seconds}){
  if(!env.OPENAI_API_KEY) return {ok:false,status:503,error:'creative_provider_not_configured'};
  const model=env.ATLAS_VIDEO_MODEL||'sora-2';
  const form=new FormData();
  form.set('model',model);
  form.set('prompt',prompt);
  form.set('seconds',seconds);
  form.set('size',size);
  let response;
  try{
    response=await fetch('https://api.openai.com/v1/videos',{
      method:'POST',
      headers:{authorization:`Bearer ${env.OPENAI_API_KEY}`},
      body:form
    });
  }catch{
    return {ok:false,status:502,error:'creative_provider_unreachable'};
  }
  const payload=await response.json().catch(()=>null);
  if(!response.ok){
    return {ok:false,status:502,error:'creative_provider_error',providerStatus:response.status,providerMessage:payload?.error?.message||null};
  }
  if(!payload?.id) return {ok:false,status:502,error:'creative_empty_video_job'};
  return {ok:true,model,video:payload};
}

async function retrieveVideo(env,providerJobId){
  if(!env.OPENAI_API_KEY) return {ok:false,status:503,error:'creative_provider_not_configured'};
  let response;
  try{
    response=await fetch(`https://api.openai.com/v1/videos/${encodeURIComponent(providerJobId)}`,{
      headers:{authorization:`Bearer ${env.OPENAI_API_KEY}`}
    });
  }catch{
    return {ok:false,status:502,error:'creative_provider_unreachable'};
  }
  const payload=await response.json().catch(()=>null);
  if(!response.ok) return {ok:false,status:502,error:'creative_provider_error',providerStatus:response.status};
  return {ok:true,video:payload};
}

function creativeJobId(url){
  const prefix='/api/creative/jobs/';
  if(!url.pathname.startsWith(prefix)) return null;
  const id=decodeURIComponent(url.pathname.slice(prefix.length));
  return id&&!id.includes('/')?id:null;
}

function videoJobId(url){
  const prefix='/api/creative/videos/';
  if(!url.pathname.startsWith(prefix)) return null;
  const suffix=url.pathname.slice(prefix.length);
  if(!suffix||suffix.includes('/')) return null;
  return decodeURIComponent(suffix);
}

export async function creativeRoutes(request,env,url){
  if(url.pathname==='/api/creative/capabilities' && request.method==='GET'){
    const ctx=await authorize(env,request,url,READ_ROLES,'creative.capabilities.read');
    if(ctx.response) return ctx.response;
    return json({ok:true,capabilities:CREATIVE_CAPABILITIES,providers:{openai:{configured:Boolean(env.OPENAI_API_KEY),imageModel:env.ATLAS_IMAGE_MODEL||'gpt-image-1',videoModel:env.ATLAS_VIDEO_MODEL||'sora-2'}}});
  }

  if(url.pathname==='/api/creative/jobs' && request.method==='GET'){
    const ctx=await authorize(env,request,url,READ_ROLES,'creative.job.list');
    if(ctx.response) return ctx.response;
    const rows=await env.DB.prepare(`SELECT id,kind,operation,provider,model,prompt,status,progress,provider_job_id,output_ref,settings_json,error_json,created_by_user_id,created_at,updated_at FROM creative_jobs WHERE organization_id=? AND dba_id=? ORDER BY updated_at DESC LIMIT 100`)
      .bind(ctx.organizationId,ctx.dbaId).all();
    await audit(env,{actorUserId:ctx.auth.user_id,organizationId:ctx.organizationId,dbaId:ctx.dbaId,action:'creative.job.list',resourceType:'creative_job',decision:'allow'});
    return json({ok:true,jobs:rows.results||[]});
  }

  if(url.pathname==='/api/creative/images/generate' && request.method==='POST'){
    const ctx=await authorize(env,request,url,WRITE_ROLES,'creative.image.generate');
    if(ctx.response) return ctx.response;
    const body=await request.json().catch(()=>null);
    if(!body) return json({ok:false,error:'invalid_json'},400);
    const prompt=clean(body.prompt);
    if(!prompt) return json({ok:false,error:'prompt_required'},400);
    const size=IMAGE_SIZES.has(body.size)?body.size:'1024x1024';
    const quality=IMAGE_QUALITIES.has(body.quality)?body.quality:'auto';
    const background=['transparent','opaque','auto'].includes(body.background)?body.background:'auto';
    const jobId=crypto.randomUUID();
    const model=env.ATLAS_IMAGE_MODEL||'gpt-image-1';
    await insertJob(env,ctx,{id:jobId,kind:'image',operation:'generate',provider:'openai',model,prompt,status:'running',settings:{size,quality,background}});
    const result=await generateImage(env,{prompt,size,quality,background});
    if(!result.ok){
      await updateJob(env,ctx,jobId,{status:'failed',error:{code:result.error,providerStatus:result.providerStatus||null}});
      await audit(env,{actorUserId:ctx.auth.user_id,organizationId:ctx.organizationId,dbaId:ctx.dbaId,action:'creative.image.generate',resourceType:'creative_job',resourceId:jobId,decision:'deny',metadata:{error:result.error}});
      return json({ok:false,error:result.error,jobId},result.status);
    }
    await updateJob(env,ctx,jobId,{status:'completed',progress:100,outputRef:result.imageUrl||'inline:base64'});
    await audit(env,{actorUserId:ctx.auth.user_id,organizationId:ctx.organizationId,dbaId:ctx.dbaId,action:'creative.image.generate',resourceType:'creative_job',resourceId:jobId,decision:'allow',metadata:{provider:'openai',model:result.model}});
    return json({ok:true,jobId,provider:'openai',model:result.model,imageBase64:result.imageBase64,imageUrl:result.imageUrl,revisedPrompt:result.revisedPrompt,usage:result.usage});
  }

  if(url.pathname==='/api/creative/videos/generate' && request.method==='POST'){
    const ctx=await authorize(env,request,url,WRITE_ROLES,'creative.video.generate');
    if(ctx.response) return ctx.response;
    const body=await request.json().catch(()=>null);
    if(!body) return json({ok:false,error:'invalid_json'},400);
    const prompt=clean(body.prompt);
    if(!prompt) return json({ok:false,error:'prompt_required'},400);
    const size=VIDEO_SIZES.has(body.size)?body.size:'720x1280';
    const seconds=VIDEO_SECONDS.has(String(body.seconds))?String(body.seconds):'4';
    const jobId=crypto.randomUUID();
    const model=env.ATLAS_VIDEO_MODEL||'sora-2';
    await insertJob(env,ctx,{id:jobId,kind:'video',operation:'generate',provider:'openai',model,prompt,status:'submitting',settings:{size,seconds}});
    const result=await createVideo(env,{prompt,size,seconds});
    if(!result.ok){
      await updateJob(env,ctx,jobId,{status:'failed',error:{code:result.error,providerStatus:result.providerStatus||null}});
      await audit(env,{actorUserId:ctx.auth.user_id,organizationId:ctx.organizationId,dbaId:ctx.dbaId,action:'creative.video.generate',resourceType:'creative_job',resourceId:jobId,decision:'deny',metadata:{error:result.error}});
      return json({ok:false,error:result.error,jobId},result.status);
    }
    const providerJobId=result.video.id;
    await updateJob(env,ctx,jobId,{status:result.video.status||'queued',progress:result.video.progress||0,providerJobId});
    await audit(env,{actorUserId:ctx.auth.user_id,organizationId:ctx.organizationId,dbaId:ctx.dbaId,action:'creative.video.generate',resourceType:'creative_job',resourceId:jobId,decision:'allow',metadata:{provider:'openai',model:result.model,providerJobId}});
    return json({ok:true,jobId,provider:'openai',model:result.model,video:result.video});
  }

  if(url.pathname==='/api/creative/characters' && request.method==='GET'){
    const ctx=await authorize(env,request,url,READ_ROLES,'creative.character.list','creative_character');
    if(ctx.response) return ctx.response;
    const rows=await env.DB.prepare(`SELECT id,name,description,reference_asset_ref,profile_json,created_by_user_id,created_at,updated_at FROM creative_characters WHERE organization_id=? AND dba_id=? ORDER BY updated_at DESC LIMIT 100`)
      .bind(ctx.organizationId,ctx.dbaId).all();
    return json({ok:true,characters:rows.results||[]});
  }

  if(url.pathname==='/api/creative/characters' && request.method==='POST'){
    const ctx=await authorize(env,request,url,WRITE_ROLES,'creative.character.create','creative_character');
    if(ctx.response) return ctx.response;
    const body=await request.json().catch(()=>null);
    if(!body) return json({ok:false,error:'invalid_json'},400);
    const name=clean(body.name,120);
    if(!name) return json({ok:false,error:'name_required'},400);
    const id=crypto.randomUUID();
    const description=clean(body.description,4000);
    const referenceAssetRef=clean(body.referenceAssetRef,2000)||null;
    const profile=body.profile&&typeof body.profile==='object'?body.profile:{};
    await env.DB.prepare(`INSERT INTO creative_characters(id,organization_id,dba_id,name,description,reference_asset_ref,profile_json,created_by_user_id) VALUES(?,?,?,?,?,?,?,?)`)
      .bind(id,ctx.organizationId,ctx.dbaId,name,description,referenceAssetRef,JSON.stringify(profile),ctx.auth.user_id).run();
    await audit(env,{actorUserId:ctx.auth.user_id,organizationId:ctx.organizationId,dbaId:ctx.dbaId,action:'creative.character.create',resourceType:'creative_character',resourceId:id,decision:'allow'});
    return json({ok:true,character:{id,name,description,referenceAssetRef,profile}},201);
  }

  const id=creativeJobId(url);
  if(id && request.method==='GET'){
    const ctx=await authorize(env,request,url,READ_ROLES,'creative.job.read');
    if(ctx.response) return ctx.response;
    const job=await env.DB.prepare(`SELECT id,kind,operation,provider,model,prompt,status,progress,provider_job_id,output_ref,settings_json,error_json,created_by_user_id,created_at,updated_at FROM creative_jobs WHERE id=? AND organization_id=? AND dba_id=?`)
      .bind(id,ctx.organizationId,ctx.dbaId).first();
    if(!job) return json({ok:false,error:'creative_job_not_found'},404);
    return json({ok:true,job});
  }

  const videoId=videoJobId(url);
  if(videoId && request.method==='GET'){
    const ctx=await authorize(env,request,url,READ_ROLES,'creative.video.read');
    if(ctx.response) return ctx.response;
    const job=await env.DB.prepare(`SELECT id,provider_job_id,status FROM creative_jobs WHERE id=? AND organization_id=? AND dba_id=? AND kind='video' AND provider='openai'`)
      .bind(videoId,ctx.organizationId,ctx.dbaId).first();
    if(!job) return json({ok:false,error:'creative_video_not_found'},404);
    if(!job.provider_job_id) return json({ok:false,error:'provider_job_not_ready'},409);
    const result=await retrieveVideo(env,job.provider_job_id);
    if(!result.ok) return json({ok:false,error:result.error},result.status);
    await updateJob(env,ctx,videoId,{status:result.video.status||job.status,progress:result.video.progress||0});
    return json({ok:true,jobId:videoId,provider:'openai',video:result.video,contentPath:result.video.status==='completed'?`/api/creative/videos/${encodeURIComponent(videoId)}/content`:null});
  }

  const contentMatch=url.pathname.match(/^\/api\/creative\/videos\/([^/]+)\/content$/);
  if(contentMatch && request.method==='GET'){
    const ctx=await authorize(env,request,url,READ_ROLES,'creative.video.content');
    if(ctx.response) return ctx.response;
    const jobId=decodeURIComponent(contentMatch[1]);
    const job=await env.DB.prepare(`SELECT provider_job_id,status FROM creative_jobs WHERE id=? AND organization_id=? AND dba_id=? AND kind='video' AND provider='openai'`)
      .bind(jobId,ctx.organizationId,ctx.dbaId).first();
    if(!job) return json({ok:false,error:'creative_video_not_found'},404);
    if(job.status!=='completed') return json({ok:false,error:'creative_video_not_completed'},409);
    const upstream=await fetch(`https://api.openai.com/v1/videos/${encodeURIComponent(job.provider_job_id)}/content`,{headers:{authorization:`Bearer ${env.OPENAI_API_KEY}`}});
    if(!upstream.ok) return json({ok:false,error:'creative_provider_error'},502);
    const headers=new Headers();
    headers.set('content-type',upstream.headers.get('content-type')||'video/mp4');
    headers.set('content-disposition',`inline; filename="atlas-${jobId}.mp4"`);
    return new Response(upstream.body,{status:200,headers});
  }

  return null;
}
