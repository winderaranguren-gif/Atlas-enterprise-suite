const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8' } });
const uid = () => crypto.randomUUID();
const nowIso = () => new Date().toISOString();

async function sha256(value) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, '0')).join('');
}

async function body(request) {
  try { return await request.json(); } catch { return null; }
}

function scopeFrom(request, payload = {}) {
  const url = new URL(request.url);
  return {
    organizationId: payload.organization_id || request.headers.get('x-atlas-organization-id') || url.searchParams.get('organization_id'),
    dbaId: payload.dba_id || request.headers.get('x-atlas-dba-id') || url.searchParams.get('dba_id')
  };
}

async function audit(env, { organizationId = null, dbaId = null, userId = null, action, resourceType, resourceId = null, decision, detail = null }) {
  await env.ATLAS_DB.prepare(`INSERT INTO audit_events (organization_id,dba_id,user_id,action,resource_type,resource_id,decision,detail) VALUES (?,?,?,?,?,?,?,?)`)
    .bind(organizationId, dbaId, userId, action, resourceType, resourceId, decision, detail).run();
}

async function authenticate(request, env) {
  const auth = request.headers.get('authorization') || '';
  if (!auth.startsWith('Bearer ')) return null;
  const token = auth.slice(7).trim();
  if (!token) return null;
  const tokenHash = await sha256(token);
  return await env.ATLAS_DB.prepare(`SELECT s.user_id,u.email,u.display_name,u.preferred_locale FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.revoked_at IS NULL AND s.expires_at > ?`)
    .bind(tokenHash, nowIso()).first();
}

async function authorize(request, env, allowedRoles, resourceType, payload = {}) {
  const user = await authenticate(request, env);
  const scope = scopeFrom(request, payload);
  if (!user) {
    await audit(env, { ...scope, action: 'authorize', resourceType, decision: 'deny', detail: 'invalid_session' });
    return { error: json({ error: 'unauthorized' }, 401) };
  }
  if (!scope.organizationId || !scope.dbaId) {
    await audit(env, { ...scope, userId: user.user_id, action: 'authorize', resourceType, decision: 'deny', detail: 'missing_scope' });
    return { error: json({ error: 'organization_id and dba_id are required' }, 400) };
  }
  const membership = await env.ATLAS_DB.prepare(`SELECT role FROM memberships WHERE user_id=? AND organization_id=? AND dba_id=? AND status='active'`)
    .bind(user.user_id, scope.organizationId, scope.dbaId).first();
  if (!membership || !allowedRoles.includes(membership.role)) {
    await audit(env, { ...scope, userId: user.user_id, action: 'authorize', resourceType, decision: 'deny', detail: membership ? `role_${membership.role}_not_allowed` : 'membership_missing' });
    return { error: json({ error: 'forbidden' }, 403) };
  }
  await audit(env, { ...scope, userId: user.user_id, action: 'authorize', resourceType, decision: 'allow', detail: `role_${membership.role}` });
  return { user, scope, role: membership.role };
}

async function bootstrap(request, env) {
  if (!env.ATLAS_BOOTSTRAP_TOKEN) return json({ error: 'bootstrap_not_configured' }, 503);
  const supplied = request.headers.get('x-atlas-bootstrap-token');
  if (!supplied || supplied !== env.ATLAS_BOOTSTRAP_TOKEN) return json({ error: 'forbidden' }, 403);
  const existing = await env.ATLAS_DB.prepare(`SELECT COUNT(*) AS n FROM users`).first();
  if (Number(existing?.n || 0) > 0) return json({ error: 'bootstrap_already_completed' }, 409);
  const p = await body(request);
  if (!p?.email || !p?.display_name || !p?.organization_name || !p?.dba_name) return json({ error: 'email, display_name, organization_name and dba_name are required' }, 400);
  const userId = uid(), organizationId = uid(), dbaId = uid(), token = `${uid()}${uid()}`, tokenHash = await sha256(token);
  const expires = new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString();
  await env.ATLAS_DB.batch([
    env.ATLAS_DB.prepare(`INSERT INTO organizations(id,legal_name) VALUES (?,?)`).bind(organizationId,p.organization_name),
    env.ATLAS_DB.prepare(`INSERT INTO dbas(id,organization_id,name) VALUES (?,?,?)`).bind(dbaId,organizationId,p.dba_name),
    env.ATLAS_DB.prepare(`INSERT INTO users(id,email,display_name,preferred_locale) VALUES (?,?,?,'en')`).bind(userId,p.email.toLowerCase(),p.display_name),
    env.ATLAS_DB.prepare(`INSERT INTO memberships(user_id,organization_id,dba_id,role,status) VALUES (?,?,?,'owner','active')`).bind(userId,organizationId,dbaId),
    env.ATLAS_DB.prepare(`INSERT INTO sessions(token_hash,user_id,expires_at) VALUES (?,?,?)`).bind(tokenHash,userId,expires)
  ]);
  await audit(env, { organizationId, dbaId, userId, action: 'bootstrap', resourceType: 'identity', resourceId: userId, decision: 'allow' });
  return json({ token, user_id: userId, organization_id: organizationId, dba_id: dbaId, locale: 'en' }, 201);
}

async function users(request, env) {
  const p = request.method === 'POST' ? await body(request) : {};
  const auth = await authorize(request, env, ['owner','admin'], 'user_scope', p || {}); if (auth.error) return auth.error;
  if (request.method === 'GET') {
    const rows = await env.ATLAS_DB.prepare(`SELECT u.id,u.email,u.display_name,u.preferred_locale,m.role,m.status FROM memberships m JOIN users u ON u.id=m.user_id WHERE m.organization_id=? AND m.dba_id=? ORDER BY u.display_name`).bind(auth.scope.organizationId, auth.scope.dbaId).all();
    return json({ users: rows.results });
  }
  if (!p?.email || !p?.display_name || !['admin','editor','viewer','auditor'].includes(p?.role)) return json({ error: 'valid email, display_name and role are required' }, 400);
  let user = await env.ATLAS_DB.prepare(`SELECT id FROM users WHERE email=?`).bind(p.email.toLowerCase()).first();
  const userId = user?.id || uid();
  const statements = [];
  if (!user) statements.push(env.ATLAS_DB.prepare(`INSERT INTO users(id,email,display_name,preferred_locale) VALUES (?,?,?,?)`).bind(userId,p.email.toLowerCase(),p.display_name,p.locale === 'es' ? 'es' : 'en'));
  statements.push(env.ATLAS_DB.prepare(`INSERT INTO memberships(user_id,organization_id,dba_id,role,status) VALUES (?,?,?,?,'active') ON CONFLICT(user_id,organization_id,dba_id) DO UPDATE SET role=excluded.role,status='active'`).bind(userId,auth.scope.organizationId,auth.scope.dbaId,p.role));
  await env.ATLAS_DB.batch(statements);
  await audit(env,{...auth.scope,userId:auth.user.user_id,action:'membership_upsert',resourceType:'user',resourceId:userId,decision:'allow'});
  return json({ id:userId, role:p.role },201);
}

async function crm(request, env) {
  const p = request.method === 'POST' ? await body(request) : {};
  const roles = request.method === 'GET' ? ['owner','admin','editor','viewer','auditor'] : ['owner','admin','editor'];
  const auth = await authorize(request, env, roles, 'crm_scope', p || {}); if (auth.error) return auth.error;
  if (request.method === 'GET') {
    const rows = await env.ATLAS_DB.prepare(`SELECT id,name,email,phone,status,created_at FROM crm_contacts WHERE organization_id=? AND dba_id=? ORDER BY created_at DESC LIMIT 200`).bind(auth.scope.organizationId,auth.scope.dbaId).all();
    return json({ contacts: rows.results });
  }
  if (!p?.name) return json({ error:'name is required' },400);
  const id=uid();
  await env.ATLAS_DB.prepare(`INSERT INTO crm_contacts(id,organization_id,dba_id,name,email,phone,status,created_by) VALUES (?,?,?,?,?,?,?,?)`).bind(id,auth.scope.organizationId,auth.scope.dbaId,p.name,p.email||null,p.phone||null,p.status||'lead',auth.user.user_id).run();
  await audit(env,{...auth.scope,userId:auth.user.user_id,action:'create',resourceType:'crm_contact',resourceId:id,decision:'allow'});
  return json({id},201);
}

async function documents(request, env) {
  const p = request.method === 'POST' ? await body(request) : {};
  const roles = request.method === 'GET' ? ['owner','admin','editor','viewer','auditor'] : ['owner','admin','editor'];
  const auth = await authorize(request, env, roles, 'document_scope', p || {}); if (auth.error) return auth.error;
  if (request.method === 'GET') {
    const rows=await env.ATLAS_DB.prepare(`SELECT id,title,version,created_by,created_at,updated_at FROM documents WHERE organization_id=? AND dba_id=? ORDER BY updated_at DESC LIMIT 200`).bind(auth.scope.organizationId,auth.scope.dbaId).all();
    return json({documents:rows.results});
  }
  if(!p?.title || typeof p?.content !== 'string') return json({error:'title and content are required'},400);
  const id=uid();
  await env.ATLAS_DB.prepare(`INSERT INTO documents(id,organization_id,dba_id,title,content,created_by) VALUES (?,?,?,?,?,?)`).bind(id,auth.scope.organizationId,auth.scope.dbaId,p.title,p.content,auth.user.user_id).run();
  await audit(env,{...auth.scope,userId:auth.user.user_id,action:'create',resourceType:'document',resourceId:id,decision:'allow'});
  return json({id,version:1},201);
}

async function accounting(request, env, path) {
  const p = request.method === 'POST' ? await body(request) : {};
  const roles = request.method === 'GET' ? ['owner','admin','editor','viewer','auditor'] : ['owner','admin','editor'];
  const auth = await authorize(request, env, roles, 'accounting_scope', p || {}); if(auth.error) return auth.error;
  if(path === '/api/accounting/accounts' && request.method === 'GET') {
    const rows=await env.ATLAS_DB.prepare(`SELECT id,code,name,type FROM accounts WHERE organization_id=? AND dba_id=? ORDER BY code`).bind(auth.scope.organizationId,auth.scope.dbaId).all();
    return json({accounts:rows.results});
  }
  if(path === '/api/accounting/accounts' && request.method === 'POST') {
    if(!p?.code || !p?.name || !['asset','liability','equity','revenue','expense'].includes(p?.type)) return json({error:'code, name and valid type are required'},400);
    const id=uid();
    await env.ATLAS_DB.prepare(`INSERT INTO accounts(id,organization_id,dba_id,code,name,type) VALUES (?,?,?,?,?,?)`).bind(id,auth.scope.organizationId,auth.scope.dbaId,p.code,p.name,p.type).run();
    await audit(env,{...auth.scope,userId:auth.user.user_id,action:'create',resourceType:'account',resourceId:id,decision:'allow'});
    return json({id},201);
  }
  if(path === '/api/accounting/journal' && request.method === 'POST') {
    if(!Array.isArray(p?.lines) || p.lines.length < 2) return json({error:'at least two journal lines are required'},400);
    const debit=p.lines.reduce((s,l)=>s+Number(l.debit_cents||0),0), credit=p.lines.reduce((s,l)=>s+Number(l.credit_cents||0),0);
    if(!Number.isSafeInteger(debit)||!Number.isSafeInteger(credit)||debit<=0||debit!==credit) return json({error:'journal must balance in integer cents'},400);
    const ids=[...new Set(p.lines.map(l=>l.account_id))];
    const placeholders=ids.map(()=>'?').join(',');
    const valid=await env.ATLAS_DB.prepare(`SELECT id FROM accounts WHERE organization_id=? AND dba_id=? AND id IN (${placeholders})`).bind(auth.scope.organizationId,auth.scope.dbaId,...ids).all();
    if(valid.results.length!==ids.length) return json({error:'all accounts must belong to the active organization/DBA'},400);
    const entryId=uid();
    const stmts=[env.ATLAS_DB.prepare(`INSERT INTO journal_entries(id,organization_id,dba_id,memo,posted_by) VALUES (?,?,?,?,?)`).bind(entryId,auth.scope.organizationId,auth.scope.dbaId,p.memo||null,auth.user.user_id)];
    for(const l of p.lines) stmts.push(env.ATLAS_DB.prepare(`INSERT INTO journal_lines(id,entry_id,account_id,debit_cents,credit_cents) VALUES (?,?,?,?,?)`).bind(uid(),entryId,l.account_id,Number(l.debit_cents||0),Number(l.credit_cents||0)));
    await env.ATLAS_DB.batch(stmts);
    await audit(env,{...auth.scope,userId:auth.user.user_id,action:'post',resourceType:'journal_entry',resourceId:entryId,decision:'allow'});
    return json({id:entryId,debit_cents:debit,credit_cents:credit},201);
  }
  return json({error:'not_found'},404);
}

async function backups(request, env) {
  const p = request.method === 'POST' ? await body(request) : {};
  const roles = request.method === 'GET' ? ['owner','admin','auditor'] : ['owner','admin'];
  const auth=await authorize(request,env,roles,'backup_scope',p||{}); if(auth.error) return auth.error;
  if(request.method==='GET') {
    const rows=await env.ATLAS_DB.prepare(`SELECT id,object_key,sha256,created_by,created_at FROM backup_manifests WHERE organization_id=? AND dba_id=? ORDER BY created_at DESC LIMIT 100`).bind(auth.scope.organizationId,auth.scope.dbaId).all();
    return json({backups:rows.results});
  }
  const tables={};
  const scopedQueries={
    memberships:`SELECT * FROM memberships WHERE organization_id=? AND dba_id=?`,
    users:`SELECT u.* FROM users u JOIN memberships m ON m.user_id=u.id WHERE m.organization_id=? AND m.dba_id=?`,
    crm_contacts:`SELECT * FROM crm_contacts WHERE organization_id=? AND dba_id=?`,
    documents:`SELECT * FROM documents WHERE organization_id=? AND dba_id=?`,
    accounts:`SELECT * FROM accounts WHERE organization_id=? AND dba_id=?`,
    journal_entries:`SELECT * FROM journal_entries WHERE organization_id=? AND dba_id=?`,
    journal_lines:`SELECT jl.* FROM journal_lines jl JOIN journal_entries je ON je.id=jl.entry_id WHERE je.organization_id=? AND je.dba_id=?`,
    audit_events:`SELECT * FROM audit_events WHERE organization_id=? AND dba_id=?`
  };
  for(const [name,sql] of Object.entries(scopedQueries)) {
    tables[name]=(await env.ATLAS_DB.prepare(sql).bind(auth.scope.organizationId,auth.scope.dbaId).all()).results;
  }
  const serialized=JSON.stringify({schema_version:2,organization_id:auth.scope.organizationId,dba_id:auth.scope.dbaId,created_at:nowIso(),tables});
  const digest=await sha256(serialized), id=uid(), key=`${auth.scope.organizationId}/${auth.scope.dbaId}/${id}.json`;
  await env.ATLAS_BACKUPS.put(key,serialized,{httpMetadata:{contentType:'application/json'},customMetadata:{sha256:digest,schema_version:'2'}});
  await env.ATLAS_DB.prepare(`INSERT INTO backup_manifests(id,organization_id,dba_id,object_key,sha256,created_by) VALUES (?,?,?,?,?,?)`).bind(id,auth.scope.organizationId,auth.scope.dbaId,key,digest,auth.user.user_id).run();
  await audit(env,{...auth.scope,userId:auth.user.user_id,action:'create',resourceType:'backup',resourceId:id,decision:'allow'});
  return json({id,object_key:key,sha256:digest,schema_version:2},201);
}

async function auditApi(request, env) {
  const auth=await authorize(request,env,['owner','admin','auditor'],'audit_scope'); if(auth.error) return auth.error;
  const rows=await env.ATLAS_DB.prepare(`SELECT id,user_id,action,resource_type,resource_id,decision,detail,created_at FROM audit_events WHERE organization_id=? AND dba_id=? ORDER BY id DESC LIMIT 200`).bind(auth.scope.organizationId,auth.scope.dbaId).all();
  return json({events:rows.results});
}

async function locale(request, env) {
  const user=await authenticate(request,env); if(!user) return json({error:'unauthorized'},401);
  const p=await body(request); if(!['en','es'].includes(p?.locale)) return json({error:'locale must be en or es'},400);
  await env.ATLAS_DB.prepare(`UPDATE users SET preferred_locale=? WHERE id=?`).bind(p.locale,user.user_id).run();
  return json({locale:p.locale});
}

export default {
  async fetch(request, env) {
    const url=new URL(request.url), path=url.pathname;
    try {
      if(path==='/health') return json({ok:true,service:'atlas-enterprise-suite'});
      if(path==='/ready') {
        const bindings={d1:Boolean(env.ATLAS_DB),r2:Boolean(env.ATLAS_BACKUPS),bootstrap_secret:Boolean(env.ATLAS_BOOTSTRAP_TOKEN)};
        if(!bindings.d1||!bindings.r2) return json({ready:false,bindings},503);
        try { await env.ATLAS_DB.prepare('SELECT 1 AS ok').first(); } catch(e) { return json({ready:false,bindings,error:'d1_unreachable'},503); }
        return json({ready:true,bindings,locale_default:env.ATLAS_DEFAULT_LOCALE||'en'});
      }
      if(path==='/api/bootstrap' && request.method==='POST') return bootstrap(request,env);
      if(path==='/api/users' && ['GET','POST'].includes(request.method)) return users(request,env);
      if(path==='/api/crm' && ['GET','POST'].includes(request.method)) return crm(request,env);
      if(path==='/api/documents' && ['GET','POST'].includes(request.method)) return documents(request,env);
      if(path.startsWith('/api/accounting/') && ['GET','POST'].includes(request.method)) return accounting(request,env,path);
      if(path==='/api/backups' && ['GET','POST'].includes(request.method)) return backups(request,env);
      if(path==='/api/audit' && request.method==='GET') return auditApi(request,env);
      if(path==='/api/me/locale' && request.method==='PATCH') return locale(request,env);
      return json({error:'not_found'},404);
    } catch (error) {
      console.error(error);
      return json({error:'internal_error'},500);
    }
  }
};