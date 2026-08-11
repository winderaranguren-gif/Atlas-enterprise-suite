const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json;charset=UTF-8','cache-control':'no-store'}});
const AUDIT_ROLES=new Set(['owner','admin','auditor']);

async function sha256(value){
  const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map(b=>b.toString(16).padStart(2,'0')).join('');
}

async function authenticate(request,env){
  const header=request.headers.get('authorization')||'';
  if(!header.startsWith('Bearer ')) return null;
  const raw=header.slice(7).trim();
  if(!raw) return null;
  const tokenHash=await sha256(raw);
  const now=new Date().toISOString();
  return await env.DB.prepare(`SELECT s.user_id,u.email
    FROM atlas_sessions s JOIN atlas_users u ON u.id=s.user_id
    WHERE s.token_hash=? AND s.revoked_at IS NULL AND s.expires_at>? AND u.status='active'`)
    .bind(tokenHash,now).first();
}

export async function handleSecurityEvents(request,env){
  const url=new URL(request.url);
  if(url.pathname!=='/api/security-events') return null;
  if(request.method!=='GET') return json({error:'Method not allowed'},405);
  if(!env.DB) return json({operational:false,error:'D1 binding DB is not configured'},503);

  const actor=await authenticate(request,env);
  const org=request.headers.get('x-atlas-organization')||'';
  const dba=request.headers.get('x-atlas-dba')||'';
  if(!actor) return json({error:'Unauthorized'},401);
  if(!org||!dba) return json({error:'Organization and DBA scope are required'},400);

  const membership=await env.DB.prepare(`SELECT role FROM atlas_memberships
    WHERE user_id=? AND organization_id=? AND dba_id=? AND status='active'`)
    .bind(actor.user_id,org,dba).first();
  if(!membership) return json({error:'Forbidden'},403);
  const role=String(membership.role||'').toLowerCase();
  if(!AUDIT_ROLES.has(role)) return json({error:'Forbidden for role'},403);

  const limitRaw=Number.parseInt(url.searchParams.get('limit')||'100',10);
  const limit=Number.isFinite(limitRaw)?Math.max(1,Math.min(200,limitRaw)):100;
  const resourceType=String(url.searchParams.get('resource_type')||'').trim();
  const decision=String(url.searchParams.get('decision')||'').trim().toLowerCase();
  const allowedDecision=new Set(['allow','deny']);
  if(decision&&!allowedDecision.has(decision)) return json({error:'decision must be allow or deny'},400);

  let sql=`SELECT id,user_id,organization_id,dba_id,action,resource_type,resource_id,decision,reason,created_at
    FROM atlas_security_events WHERE organization_id=? AND dba_id=?`;
  const bindings=[org,dba];
  if(resourceType){sql+=' AND resource_type=?';bindings.push(resourceType);}
  if(decision){sql+=' AND decision=?';bindings.push(decision);}
  sql+=' ORDER BY created_at DESC LIMIT ?';bindings.push(limit);
  const result=await env.DB.prepare(sql).bind(...bindings).all();
  return json({events:result.results||[],organization_id:org,dba_id:dba,limit,filters:{resource_type:resourceType||null,decision:decision||null}});
}
