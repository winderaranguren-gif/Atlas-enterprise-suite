import { json } from '../../platform/runtime/health.js';
import { requireSession, requireScope } from '../../platform/security/auth.js';
import { audit } from '../../platform/security/audit.js';

const SEVERITIES = new Set(['low','medium','high','critical']);
const CATEGORIES = new Set(['cyber','physical','safety','access','fraud','privacy','availability','other']);
const STATUSES = new Set(['open','acknowledged','contained','resolved']);

function getScope(request,url){
  return {
    organizationId:url.searchParams.get('organization_id')||request.headers.get('x-atlas-organization'),
    dbaId:url.searchParams.get('dba_id')||request.headers.get('x-atlas-dba')
  };
}

async function authorize(env,request,url,roles,action,resourceType='security_incident'){
  const auth=await requireSession(env,request);
  if(!auth.ok) return {response:json({ok:false,error:auth.error},auth.status)};
  const {organizationId,dbaId}=getScope(request,url);
  if(!organizationId||!dbaId) return {response:json({ok:false,error:'organization_and_dba_required'},400)};
  const scoped=await requireScope(env,auth.session.user_id,organizationId,dbaId,roles);
  if(!scoped.ok){
    await audit(env,{actorUserId:auth.session.user_id,organizationId,dbaId,action,resourceType,decision:'deny',metadata:{error:scoped.error}});
    return {response:json({ok:false,error:scoped.error},scoped.status)};
  }
  return {auth:auth.session,membership:scoped.membership,organizationId,dbaId};
}

function cleanText(value,max=500){
  if(value===null||value===undefined) return null;
  const text=String(value).trim();
  return text ? text.slice(0,max) : null;
}

async function listIncidents(request,env,url){
  const ctx=await authorize(env,request,url,['owner','admin','auditor','member','viewer'],'security.incident.list');
  if(ctx.response) return ctx.response;
  const status=url.searchParams.get('status');
  const severity=url.searchParams.get('severity');
  if(status && !STATUSES.has(status)) return json({ok:false,error:'invalid_status'},400);
  if(severity && !SEVERITIES.has(severity)) return json({ok:false,error:'invalid_severity'},400);

  const rows=await env.DB.prepare(`
    SELECT id,title,description,category,severity,status,source,location_label,assigned_user_id,
      created_by_user_id,resolved_by_user_id,resolved_at,created_at,updated_at
    FROM security_incidents
    WHERE organization_id=? AND dba_id=?
      AND (? IS NULL OR status=?)
      AND (? IS NULL OR severity=?)
    ORDER BY
      CASE severity WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END,
      created_at DESC
    LIMIT 200
  `).bind(ctx.organizationId,ctx.dbaId,status,status,severity,severity).all();

  await audit(env,{actorUserId:ctx.auth.user_id,organizationId:ctx.organizationId,dbaId:ctx.dbaId,action:'security.incident.list',resourceType:'security_incident',decision:'allow',metadata:{status:status||null,severity:severity||null}});
  return json({ok:true,incidents:rows.results||[]});
}

async function createIncident(request,env,url){
  const ctx=await authorize(env,request,url,['owner','admin','member'],'security.incident.create');
  if(ctx.response) return ctx.response;
  const body=await request.json().catch(()=>null);
  const title=cleanText(body?.title,160);
  const description=cleanText(body?.description,4000);
  const category=String(body?.category||'other').toLowerCase();
  const severity=String(body?.severity||'medium').toLowerCase();
  if(!title || title.length<3) return json({ok:false,error:'title_required'},400);
  if(!CATEGORIES.has(category)) return json({ok:false,error:'invalid_category'},400);
  if(!SEVERITIES.has(severity)) return json({ok:false,error:'invalid_severity'},400);

  const id=crypto.randomUUID();
  const eventId=crypto.randomUUID();
  const source=cleanText(body?.source,120);
  const locationLabel=cleanText(body?.locationLabel,180);
  const assignedUserId=cleanText(body?.assignedUserId,120);

  try{
    await env.DB.batch([
      env.DB.prepare(`
        INSERT INTO security_incidents(
          id,organization_id,dba_id,title,description,category,severity,status,source,location_label,
          assigned_user_id,created_by_user_id
        ) VALUES(?,?,?,?,?,?,?,'open',?,?,?,?)
      `).bind(id,ctx.organizationId,ctx.dbaId,title,description,category,severity,source,locationLabel,assignedUserId,ctx.auth.user_id),
      env.DB.prepare(`
        INSERT INTO security_incident_events(
          id,incident_id,organization_id,dba_id,event_type,from_status,to_status,note,actor_user_id
        ) VALUES(?,?,?,?,? ,NULL,'open',?,?)
      `).bind(eventId,id,ctx.organizationId,ctx.dbaId,'created',cleanText(body?.note,1000),ctx.auth.user_id)
    ]);
  }catch(error){
    return json({ok:false,error:'incident_create_failed',detail:String(error?.message||error)},409);
  }

  await audit(env,{actorUserId:ctx.auth.user_id,organizationId:ctx.organizationId,dbaId:ctx.dbaId,action:'security.incident.create',resourceType:'security_incident',resourceId:id,decision:'allow',metadata:{category,severity}});
  return json({ok:true,id,status:'open'},201);
}

function nextStatus(current,action){
  if(action==='acknowledge' && current==='open') return 'acknowledged';
  if(action==='contain' && (current==='open'||current==='acknowledged')) return 'contained';
  if(action==='resolve' && current!=='resolved') return 'resolved';
  if(action==='reopen' && current==='resolved') return 'open';
  return null;
}

async function actOnIncident(request,env,url,id){
  const body=await request.json().catch(()=>null);
  const action=String(body?.action||'').toLowerCase();
  const allowedActions=new Set(['acknowledge','contain','resolve','reopen']);
  if(!allowedActions.has(action)) return json({ok:false,error:'invalid_action'},400);
  const roles=(action==='resolve'||action==='reopen')?['owner','admin']:['owner','admin','member'];
  const ctx=await authorize(env,request,url,roles,`security.incident.${action}`);
  if(ctx.response) return ctx.response;

  const incident=await env.DB.prepare(`
    SELECT id,status,severity FROM security_incidents
    WHERE id=? AND organization_id=? AND dba_id=?
  `).bind(id,ctx.organizationId,ctx.dbaId).first();
  if(!incident) return json({ok:false,error:'incident_not_found'},404);

  const target=nextStatus(incident.status,action);
  if(!target) return json({ok:false,error:'invalid_status_transition',from:incident.status,action},409);

  const eventId=crypto.randomUUID();
  const note=cleanText(body?.note,2000);
  try{
    const update=target==='resolved'
      ? env.DB.prepare(`UPDATE security_incidents SET status=?,resolved_by_user_id=?,resolved_at=CURRENT_TIMESTAMP,updated_at=CURRENT_TIMESTAMP WHERE id=? AND organization_id=? AND dba_id=? AND status=?`)
          .bind(target,ctx.auth.user_id,id,ctx.organizationId,ctx.dbaId,incident.status)
      : env.DB.prepare(`UPDATE security_incidents SET status=?,resolved_by_user_id=NULL,resolved_at=NULL,updated_at=CURRENT_TIMESTAMP WHERE id=? AND organization_id=? AND dba_id=? AND status=?`)
          .bind(target,id,ctx.organizationId,ctx.dbaId,incident.status);
    const result=await update.run();
    if(!result.meta?.changes) return json({ok:false,error:'incident_update_conflict'},409);
    await env.DB.prepare(`
      INSERT INTO security_incident_events(
        id,incident_id,organization_id,dba_id,event_type,from_status,to_status,note,actor_user_id
      ) VALUES(?,?,?,?,?,?,?,?,?)
    `).bind(eventId,id,ctx.organizationId,ctx.dbaId,action,incident.status,target,note,ctx.auth.user_id).run();
  }catch(error){
    return json({ok:false,error:'incident_action_failed',detail:String(error?.message||error)},409);
  }

  await audit(env,{actorUserId:ctx.auth.user_id,organizationId:ctx.organizationId,dbaId:ctx.dbaId,action:`security.incident.${action}`,resourceType:'security_incident',resourceId:id,decision:'allow',metadata:{from:incident.status,to:target,severity:incident.severity}});
  return json({ok:true,id,status:target});
}

async function listIncidentEvents(request,env,url,id){
  const ctx=await authorize(env,request,url,['owner','admin','auditor','member','viewer'],'security.incident.events.list','security_incident_event');
  if(ctx.response) return ctx.response;
  const exists=await env.DB.prepare(`SELECT id FROM security_incidents WHERE id=? AND organization_id=? AND dba_id=?`)
    .bind(id,ctx.organizationId,ctx.dbaId).first();
  if(!exists) return json({ok:false,error:'incident_not_found'},404);
  const rows=await env.DB.prepare(`
    SELECT id,event_type,from_status,to_status,note,actor_user_id,created_at
    FROM security_incident_events
    WHERE incident_id=? AND organization_id=? AND dba_id=?
    ORDER BY created_at ASC,id ASC
  `).bind(id,ctx.organizationId,ctx.dbaId).all();
  return json({ok:true,events:rows.results||[]});
}

async function posture(request,env,url){
  const ctx=await authorize(env,request,url,['owner','admin','auditor','member','viewer'],'security.posture.read','security_posture');
  if(ctx.response) return ctx.response;
  const row=await env.DB.prepare(`
    SELECT
      COUNT(*) AS total_incidents,
      SUM(CASE WHEN status!='resolved' THEN 1 ELSE 0 END) AS active_incidents,
      SUM(CASE WHEN status!='resolved' AND severity='critical' THEN 1 ELSE 0 END) AS critical_active,
      SUM(CASE WHEN status!='resolved' AND severity='high' THEN 1 ELSE 0 END) AS high_active,
      SUM(CASE WHEN status!='resolved' AND severity='medium' THEN 1 ELSE 0 END) AS medium_active,
      SUM(CASE WHEN status!='resolved' AND severity='low' THEN 1 ELSE 0 END) AS low_active
    FROM security_incidents
    WHERE organization_id=? AND dba_id=?
  `).bind(ctx.organizationId,ctx.dbaId).first();

  const critical=Number(row?.critical_active||0);
  const high=Number(row?.high_active||0);
  const medium=Number(row?.medium_active||0);
  const low=Number(row?.low_active||0);
  const operationalScore=Math.max(0,100-(critical*25)-(high*10)-(medium*4)-low);
  const level=critical>0?'critical':high>0?'elevated':medium>0?'guarded':'normal';
  return json({
    ok:true,
    posture:{
      level,
      operationalScore,
      methodology:'ATLAS internal operational signal; not a compliance certification',
      totalIncidents:Number(row?.total_incidents||0),
      activeIncidents:Number(row?.active_incidents||0),
      activeBySeverity:{critical,high,medium,low}
    }
  });
}

export async function securityEmergencyRoutes(request,env,url){
  if(url.pathname==='/api/security/posture' && request.method==='GET') return posture(request,env,url);
  if(url.pathname==='/api/security/incidents' && request.method==='GET') return listIncidents(request,env,url);
  if(url.pathname==='/api/security/incidents' && request.method==='POST') return createIncident(request,env,url);

  const eventsMatch=url.pathname.match(/^\/api\/security\/incidents\/([^/]+)\/events$/);
  if(eventsMatch && request.method==='GET') return listIncidentEvents(request,env,url,decodeURIComponent(eventsMatch[1]));

  const actionMatch=url.pathname.match(/^\/api\/security\/incidents\/([^/]+)\/actions$/);
  if(actionMatch && request.method==='POST') return actOnIncident(request,env,url,decodeURIComponent(actionMatch[1]));

  return null;
}
