import { json } from '../../platform/runtime/health.js';
import { requireSession, requireScope } from '../../platform/security/auth.js';
import { audit } from '../../platform/security/audit.js';

const READ_ROLES=['owner','admin','auditor','member','viewer'];
const WRITE_ROLES=['owner','admin','member'];
const MAX_INPUT_CHARS=20000;

function scopeFrom(request,url){
  return {
    organizationId:url.searchParams.get('organization_id')||request.headers.get('x-atlas-organization'),
    dbaId:url.searchParams.get('dba_id')||request.headers.get('x-atlas-dba')
  };
}

function clean(value,max=MAX_INPUT_CHARS){
  if(value===undefined||value===null) return '';
  return String(value).trim().slice(0,max);
}

async function authorize(env,request,url,roles,action){
  const auth=await requireSession(env,request);
  if(!auth.ok) return {response:json({ok:false,error:auth.error},auth.status)};
  const {organizationId,dbaId}=scopeFrom(request,url);
  if(!organizationId||!dbaId) return {response:json({ok:false,error:'organization_and_dba_required'},400)};
  const scoped=await requireScope(env,auth.session.user_id,organizationId,dbaId,roles);
  if(!scoped.ok){
    await audit(env,{actorUserId:auth.session.user_id,organizationId,dbaId,action,resourceType:'ai_conversation',decision:'deny',metadata:{error:scoped.error}});
    return {response:json({ok:false,error:scoped.error},scoped.status)};
  }
  return {auth:auth.session,membership:scoped.membership,organizationId,dbaId};
}

export function extractResponseText(payload){
  if(typeof payload?.output_text==='string' && payload.output_text.trim()) return payload.output_text.trim();
  const parts=[];
  for(const item of payload?.output||[]){
    for(const content of item?.content||[]){
      if(content?.type==='output_text' && typeof content.text==='string') parts.push(content.text);
    }
  }
  return parts.join('\n').trim();
}

async function callOpenAI(env,input){
  if(!env.OPENAI_API_KEY) return {ok:false,status:503,error:'ai_provider_not_configured'};
  const model=env.ATLAS_AI_MODEL||'gpt-5';
  let response;
  try{
    response=await fetch('https://api.openai.com/v1/responses',{
      method:'POST',
      headers:{
        'authorization':`Bearer ${env.OPENAI_API_KEY}`,
        'content-type':'application/json'
      },
      body:JSON.stringify({
        model,
        store:false,
        input:[{
          role:'developer',
          content:[{type:'input_text',text:'You are ATLAS Intelligence. Give concise, accurate business assistance. Never assume authority beyond the authenticated user scope supplied by ATLAS.'}]
        },{
          role:'user',
          content:[{type:'input_text',text:input}]
        }]
      })
    });
  }catch{
    return {ok:false,status:502,error:'ai_provider_unreachable'};
  }
  const payload=await response.json().catch(()=>null);
  if(!response.ok){
    return {ok:false,status:502,error:'ai_provider_error',providerStatus:response.status};
  }
  const text=extractResponseText(payload);
  if(!text) return {ok:false,status:502,error:'ai_empty_response'};
  return {ok:true,text,responseId:payload?.id||null,model};
}

function conversationId(url){
  const prefix='/api/intelligence/conversations/';
  if(!url.pathname.startsWith(prefix)) return null;
  const id=decodeURIComponent(url.pathname.slice(prefix.length));
  return id&&!id.includes('/')?id:null;
}

export async function intelligenceRoutes(request,env,url){
  if(url.pathname==='/api/intelligence/conversations' && request.method==='GET'){
    const ctx=await authorize(env,request,url,READ_ROLES,'intelligence.conversation.list');
    if(ctx.response) return ctx.response;
    const rows=await env.DB.prepare(`SELECT id,title,provider,model,created_by_user_id,created_at,updated_at FROM ai_conversations WHERE organization_id=? AND dba_id=? ORDER BY updated_at DESC LIMIT 100`).bind(ctx.organizationId,ctx.dbaId).all();
    await audit(env,{actorUserId:ctx.auth.user_id,organizationId:ctx.organizationId,dbaId:ctx.dbaId,action:'intelligence.conversation.list',resourceType:'ai_conversation',decision:'allow'});
    return json({ok:true,conversations:rows.results||[]});
  }

  if(url.pathname==='/api/intelligence/respond' && request.method==='POST'){
    const ctx=await authorize(env,request,url,WRITE_ROLES,'intelligence.response.create');
    if(ctx.response) return ctx.response;
    const body=await request.json().catch(()=>null);
    if(!body) return json({ok:false,error:'invalid_json'},400);
    const input=clean(body.input);
    if(!input) return json({ok:false,error:'input_required'},400);
    const suppliedConversationId=clean(body.conversationId,100)||null;
    let conversationIdValue=suppliedConversationId;

    if(conversationIdValue){
      const existing=await env.DB.prepare(`SELECT id FROM ai_conversations WHERE id=? AND organization_id=? AND dba_id=?`).bind(conversationIdValue,ctx.organizationId,ctx.dbaId).first();
      if(!existing) return json({ok:false,error:'conversation_not_found'},404);
    }else{
      conversationIdValue=crypto.randomUUID();
      const title=clean(body.title,120)||input.slice(0,80)||'New conversation';
      await env.DB.prepare(`INSERT INTO ai_conversations(id,organization_id,dba_id,title,provider,created_by_user_id) VALUES(?,?,?,?,?,?)`).bind(conversationIdValue,ctx.organizationId,ctx.dbaId,title,'openai',ctx.auth.user_id).run();
    }

    const userMessageId=crypto.randomUUID();
    await env.DB.prepare(`INSERT INTO ai_messages(id,conversation_id,organization_id,dba_id,role,content,created_by_user_id) VALUES(?,?,?,?,?,?,?)`).bind(userMessageId,conversationIdValue,ctx.organizationId,ctx.dbaId,'user',input,ctx.auth.user_id).run();

    const result=await callOpenAI(env,input);
    if(!result.ok){
      await audit(env,{actorUserId:ctx.auth.user_id,organizationId:ctx.organizationId,dbaId:ctx.dbaId,action:'intelligence.response.create',resourceType:'ai_conversation',resourceId:conversationIdValue,decision:'deny',metadata:{error:result.error,providerStatus:result.providerStatus||null}});
      return json({ok:false,error:result.error},result.status);
    }

    const assistantMessageId=crypto.randomUUID();
    await env.DB.prepare(`INSERT INTO ai_messages(id,conversation_id,organization_id,dba_id,role,content,provider_response_id,created_by_user_id) VALUES(?,?,?,?,?,?,?,?)`).bind(assistantMessageId,conversationIdValue,ctx.organizationId,ctx.dbaId,'assistant',result.text,result.responseId,ctx.auth.user_id).run();
    await env.DB.prepare(`UPDATE ai_conversations SET model=?,updated_at=CURRENT_TIMESTAMP WHERE id=? AND organization_id=? AND dba_id=?`).bind(result.model,conversationIdValue,ctx.organizationId,ctx.dbaId).run();
    await audit(env,{actorUserId:ctx.auth.user_id,organizationId:ctx.organizationId,dbaId:ctx.dbaId,action:'intelligence.response.create',resourceType:'ai_conversation',resourceId:conversationIdValue,decision:'allow',metadata:{provider:'openai',model:result.model,providerResponseId:result.responseId}});
    return json({ok:true,conversationId:conversationIdValue,messageId:assistantMessageId,output:result.text,provider:'openai',model:result.model});
  }

  const id=conversationId(url);
  if(id && request.method==='GET'){
    const ctx=await authorize(env,request,url,READ_ROLES,'intelligence.conversation.read');
    if(ctx.response) return ctx.response;
    const conversation=await env.DB.prepare(`SELECT id,title,provider,model,created_by_user_id,created_at,updated_at FROM ai_conversations WHERE id=? AND organization_id=? AND dba_id=?`).bind(id,ctx.organizationId,ctx.dbaId).first();
    if(!conversation) return json({ok:false,error:'conversation_not_found'},404);
    const messages=await env.DB.prepare(`SELECT id,role,content,provider_response_id,created_by_user_id,created_at FROM ai_messages WHERE conversation_id=? AND organization_id=? AND dba_id=? ORDER BY created_at ASC`).bind(id,ctx.organizationId,ctx.dbaId).all();
    await audit(env,{actorUserId:ctx.auth.user_id,organizationId:ctx.organizationId,dbaId:ctx.dbaId,action:'intelligence.conversation.read',resourceType:'ai_conversation',resourceId:id,decision:'allow'});
    return json({ok:true,conversation,messages:messages.results||[]});
  }

  return null;
}
