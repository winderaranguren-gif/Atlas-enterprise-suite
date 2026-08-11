import { json } from '../../platform/runtime/health.js';
import { requireSession, requireScope } from '../../platform/security/auth.js';
import { audit } from '../../platform/security/audit.js';

const READ_ROLES=['owner','admin','auditor','member','viewer'];
const WRITE_ROLES=['owner','admin','member'];
const TYPES=['lead','prospect','customer','vendor','partner','other'];
const STATUSES=['active','inactive','archived'];

function scopeFrom(request,url){
  return {
    organizationId:url.searchParams.get('organization_id')||request.headers.get('x-atlas-organization'),
    dbaId:url.searchParams.get('dba_id')||request.headers.get('x-atlas-dba')
  };
}

function clean(value,max=500){
  if(value===undefined||value===null) return null;
  return String(value).trim().slice(0,max);
}

async function authorize(env,request,url,roles,action){
  const auth=await requireSession(env,request);
  if(!auth.ok) return {response:json({ok:false,error:auth.error},auth.status)};
  const {organizationId,dbaId}=scopeFrom(request,url);
  if(!organizationId||!dbaId) return {response:json({ok:false,error:'organization_and_dba_required'},400)};
  const scoped=await requireScope(env,auth.session.user_id,organizationId,dbaId,roles);
  if(!scoped.ok){
    await audit(env,{actorUserId:auth.session.user_id,organizationId,dbaId,action,resourceType:'crm_contact',decision:'deny',metadata:{error:scoped.error}});
    return {response:json({ok:false,error:scoped.error},scoped.status)};
  }
  return {auth:auth.session,membership:scoped.membership,organizationId,dbaId};
}

function contactId(url){
  const prefix='/api/crm/contacts/';
  if(!url.pathname.startsWith(prefix)) return null;
  const id=decodeURIComponent(url.pathname.slice(prefix.length));
  return id&&!id.includes('/')?id:null;
}

export async function crmRoutes(request,env,url){
  if(url.pathname==='/api/crm/contacts' && request.method==='GET'){
    const ctx=await authorize(env,request,url,READ_ROLES,'crm.contact.list');
    if(ctx.response) return ctx.response;
    const status=url.searchParams.get('status');
    if(status && !STATUSES.includes(status)) return json({ok:false,error:'invalid_status'},400);
    const limit=Math.min(Math.max(Number(url.searchParams.get('limit')||50),1),200);
    const rows=status
      ? await env.DB.prepare(`SELECT id,contact_type,name,company,email,phone,status,notes,created_by_user_id,created_at,updated_at FROM crm_contacts WHERE organization_id=? AND dba_id=? AND status=? ORDER BY updated_at DESC LIMIT ?`).bind(ctx.organizationId,ctx.dbaId,status,limit).all()
      : await env.DB.prepare(`SELECT id,contact_type,name,company,email,phone,status,notes,created_by_user_id,created_at,updated_at FROM crm_contacts WHERE organization_id=? AND dba_id=? AND status<>'archived' ORDER BY updated_at DESC LIMIT ?`).bind(ctx.organizationId,ctx.dbaId,limit).all();
    await audit(env,{actorUserId:ctx.auth.user_id,organizationId:ctx.organizationId,dbaId:ctx.dbaId,action:'crm.contact.list',resourceType:'crm_contact',decision:'allow',metadata:{status:status||'non_archived',limit}});
    return json({ok:true,contacts:rows.results||[]});
  }

  if(url.pathname==='/api/crm/contacts' && request.method==='POST'){
    const ctx=await authorize(env,request,url,WRITE_ROLES,'crm.contact.create');
    if(ctx.response) return ctx.response;
    const body=await request.json().catch(()=>null);
    const name=clean(body?.name,200);
    const contactType=clean(body?.contactType,30)||'customer';
    if(!name) return json({ok:false,error:'name_required'},400);
    if(!TYPES.includes(contactType)) return json({ok:false,error:'invalid_contact_type'},400);
    const id=crypto.randomUUID();
    await env.DB.prepare(`INSERT INTO crm_contacts(id,organization_id,dba_id,contact_type,name,company,email,phone,status,notes,created_by_user_id) VALUES(?,?,?,?,?,?,?,?,?,?,?)`)
      .bind(id,ctx.organizationId,ctx.dbaId,contactType,name,clean(body.company,200),clean(body.email,320)?.toLowerCase()||null,clean(body.phone,80), 'active', clean(body.notes,4000),ctx.auth.user_id).run();
    await audit(env,{actorUserId:ctx.auth.user_id,organizationId:ctx.organizationId,dbaId:ctx.dbaId,action:'crm.contact.create',resourceType:'crm_contact',resourceId:id,decision:'allow',metadata:{contactType}});
    return json({ok:true,id},201);
  }

  const id=contactId(url);
  if(id && request.method==='GET'){
    const ctx=await authorize(env,request,url,READ_ROLES,'crm.contact.read');
    if(ctx.response) return ctx.response;
    const row=await env.DB.prepare(`SELECT id,contact_type,name,company,email,phone,status,notes,created_by_user_id,created_at,updated_at FROM crm_contacts WHERE id=? AND organization_id=? AND dba_id=?`).bind(id,ctx.organizationId,ctx.dbaId).first();
    if(!row) return json({ok:false,error:'contact_not_found'},404);
    await audit(env,{actorUserId:ctx.auth.user_id,organizationId:ctx.organizationId,dbaId:ctx.dbaId,action:'crm.contact.read',resourceType:'crm_contact',resourceId:id,decision:'allow'});
    return json({ok:true,contact:row});
  }

  if(id && request.method==='PATCH'){
    const ctx=await authorize(env,request,url,WRITE_ROLES,'crm.contact.update');
    if(ctx.response) return ctx.response;
    const body=await request.json().catch(()=>null);
    if(!body) return json({ok:false,error:'invalid_json'},400);
    const fields=[]; const values=[];
    const mapping=[['name','name',200],['company','company',200],['email','email',320],['phone','phone',80],['notes','notes',4000]];
    for(const [key,column,max] of mapping){
      if(body[key]!==undefined){
        const value=clean(body[key],max);
        if(key==='name' && !value) return json({ok:false,error:'name_required'},400);
        fields.push(`${column}=?`); values.push(key==='email'&&value?value.toLowerCase():value);
      }
    }
    if(body.contactType!==undefined){
      const type=clean(body.contactType,30);
      if(!TYPES.includes(type)) return json({ok:false,error:'invalid_contact_type'},400);
      fields.push('contact_type=?'); values.push(type);
    }
    if(body.status!==undefined){
      const status=clean(body.status,30);
      if(!STATUSES.includes(status)) return json({ok:false,error:'invalid_status'},400);
      fields.push('status=?'); values.push(status);
    }
    if(!fields.length) return json({ok:false,error:'no_supported_changes'},400);
    fields.push('updated_at=CURRENT_TIMESTAMP');
    values.push(id,ctx.organizationId,ctx.dbaId);
    const result=await env.DB.prepare(`UPDATE crm_contacts SET ${fields.join(',')} WHERE id=? AND organization_id=? AND dba_id=?`).bind(...values).run();
    if(!result.meta?.changes) return json({ok:false,error:'contact_not_found'},404);
    await audit(env,{actorUserId:ctx.auth.user_id,organizationId:ctx.organizationId,dbaId:ctx.dbaId,action:'crm.contact.update',resourceType:'crm_contact',resourceId:id,decision:'allow',metadata:{fields:Object.keys(body)}});
    return json({ok:true,id});
  }

  if(id && request.method==='DELETE'){
    const ctx=await authorize(env,request,url,WRITE_ROLES,'crm.contact.archive');
    if(ctx.response) return ctx.response;
    const result=await env.DB.prepare(`UPDATE crm_contacts SET status='archived',updated_at=CURRENT_TIMESTAMP WHERE id=? AND organization_id=? AND dba_id=? AND status<>'archived'`).bind(id,ctx.organizationId,ctx.dbaId).run();
    if(!result.meta?.changes) return json({ok:false,error:'contact_not_found'},404);
    await audit(env,{actorUserId:ctx.auth.user_id,organizationId:ctx.organizationId,dbaId:ctx.dbaId,action:'crm.contact.archive',resourceType:'crm_contact',resourceId:id,decision:'allow'});
    return json({ok:true,id,status:'archived'});
  }

  return null;
}
