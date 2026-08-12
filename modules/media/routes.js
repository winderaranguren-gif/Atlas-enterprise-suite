import { json } from '../../platform/runtime/health.js';
import { requireSession, requireScope } from '../../platform/security/auth.js';
import { audit } from '../../platform/security/audit.js';
import { SUPPORTED_MEDIA_KINDS, normalizeGenerationRequest, callMediaGenerator } from './service.js';

const READ_ROLES=['owner','admin','auditor','member','viewer'];
const WRITE_ROLES=['owner','admin','member'];

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
    await audit(env,{
      actorUserId:auth.session.user_id,
      organizationId,
      dbaId,
      action,
      resourceType:'media',
      decision:'deny',
      metadata:{error:scoped.error}
    });
    return {response:json({ok:false,error:scoped.error},scoped.status)};
  }
  return {auth:auth.session,organizationId,dbaId,membership:scoped.membership};
}

async function parseJson(request){
  try{
    return await request.json();
  }catch{
    return null;
  }
}

export async function mediaRoutes(request,env,url){
  if(url.pathname==='/api/media/capabilities' && request.method==='GET'){
    const ctx=await authorize(env,request,url,READ_ROLES,'media.capabilities');
    if(ctx.response) return ctx.response;
    return json({
      ok:true,
      kinds:SUPPORTED_MEDIA_KINDS,
      generatorConfigured:Boolean(env?.MEDIA_GENERATOR && typeof env.MEDIA_GENERATOR.fetch==='function')
    });
  }

  if(url.pathname==='/api/media/generate' && request.method==='POST'){
    const ctx=await authorize(env,request,url,WRITE_ROLES,'media.generate');
    if(ctx.response) return ctx.response;

    const body=await parseJson(request);
    if(!body) return json({ok:false,error:'invalid_json'},400);

    let generationRequest;
    try{
      generationRequest=normalizeGenerationRequest(body);
    }catch(error){
      return json({ok:false,error:error.code||'invalid_media_request'},error.status||400);
    }

    await audit(env,{
      actorUserId:ctx.auth.user_id,
      organizationId:ctx.organizationId,
      dbaId:ctx.dbaId,
      action:'media.generate',
      resourceType:'media',
      decision:'allow',
      metadata:{
        kind:generationRequest.kind,
        durationSeconds:generationRequest.duration_seconds,
        promptLength:generationRequest.prompt.length
      }
    });

    try{
      const result=await callMediaGenerator(env,generationRequest,{
        organizationId:ctx.organizationId,
        dbaId:ctx.dbaId,
        userId:ctx.auth.user_id
      });
      return json({ok:true,kind:generationRequest.kind,result},202);
    }catch(error){
      await audit(env,{
        actorUserId:ctx.auth.user_id,
        organizationId:ctx.organizationId,
        dbaId:ctx.dbaId,
        action:'media.generate.failed',
        resourceType:'media',
        decision:'deny',
        metadata:{kind:generationRequest.kind,error:error.code||'media_generation_failed'}
      });
      return json({
        ok:false,
        error:error.code||'media_generation_failed',
        detail:error.upstream||undefined
      },error.status||502);
    }
  }

  return null;
}
