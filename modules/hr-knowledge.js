import { requireTenantPermission } from './tenant.js';
import { appendAuditLedger } from './audit.js';

const KINDS = new Set(['article','policy','procedure','course','playbook','faq','reference']);
const ITEM_STATUSES = new Set(['draft','published','archived']);
const PERSON_TYPES = new Set(['employee','candidate','contractor','intern','volunteer']);
const PERSON_STATUSES = new Set(['active','onboarding','inactive','offboarded','rejected']);
const ASSIGNMENT_STATUSES = new Set(['assigned','in_progress','completed','waived']);
const ASSESSMENT_KINDS = new Set(['technical','english','compliance','onboarding','custom']);
const ASSESSMENT_STATUSES = new Set(['draft','active','archived']);

function json(body, status = 200) {
  return Response.json(body, { status, headers: { 'cache-control': 'no-store' } });
}

function enabled(env) {
  return String(env.ATLAS_ENABLE_HR_KNOWLEDGE || '').trim().toLowerCase() === 'true';
}

function text(value, max = 240) {
  return String(value ?? '').trim().replace(/\s+/g, ' ').slice(0, max);
}

function nullableText(value, max = 500) {
  const result = text(value, max);
  return result || null;
}

function slugify(value) {
  return text(value, 160).toLowerCase().normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

function email(value) {
  const result = text(value, 254).toLowerCase();
  if (!result) return null;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(result)) return null;
  return result;
}

function boundedLimit(url, fallback = 50, max = 100) {
  const parsed = Number(url.searchParams.get('limit') || fallback);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(1, Math.min(max, Math.trunc(parsed)));
}

async function bodyJson(request, maxBytes = 131072) {
  const raw = await request.text();
  if (raw.length > maxBytes) return { ok: false, status: 413, error: 'payload_too_large' };
  if (!raw.trim()) return { ok: true, body: {} };
  try {
    return { ok: true, body: JSON.parse(raw) };
  } catch {
    return { ok: false, status: 400, error: 'invalid_json' };
  }
}

async function authorize(request, env, permission, action) {
  const authz = await requireTenantPermission(request, env, permission, action);
  if (!authz.ok) return { response: json({ ok: false, error: authz.error }, authz.status) };
  return { authz };
}

async function auditMutation(env, authz, action, resourceType, resourceId, metadata = null) {
  try {
    await appendAuditLedger(env, {
      organizationId: authz.organizationId,
      dbaId: authz.dbaId,
      actorUserId: authz.session.user_id,
      category: 'hr_knowledge',
      action,
      resourceType,
      resourceId,
      decision: 'allow',
      severity: 'info',
      correlationId: authz.correlationId,
      metadata
    });
    return true;
  } catch {
    return false;
  }
}

async function overview(request, env) {
  const gate = await authorize(request, env, 'module.read', 'hr_knowledge.overview.read');
  if (gate.response) return gate.response;
  const { authz } = gate;
  const [people, items, assignments, skills, assessments] = await env.DB.batch([
    env.DB.prepare("SELECT COUNT(*) AS total, SUM(CASE WHEN status='active' THEN 1 ELSE 0 END) AS active FROM hr_people WHERE organization_id=? AND dba_id=?")
      .bind(authz.organizationId, authz.dbaId),
    env.DB.prepare("SELECT COUNT(*) AS total, SUM(CASE WHEN status='published' THEN 1 ELSE 0 END) AS published FROM hr_knowledge_items WHERE organization_id=? AND dba_id=?")
      .bind(authz.organizationId, authz.dbaId),
    env.DB.prepare("SELECT COUNT(*) AS open, SUM(CASE WHEN due_at IS NOT NULL AND due_at < CURRENT_TIMESTAMP AND status NOT IN ('completed','waived') THEN 1 ELSE 0 END) AS overdue FROM hr_knowledge_assignments WHERE organization_id=? AND dba_id=? AND status NOT IN ('completed','waived')")
      .bind(authz.organizationId, authz.dbaId),
    env.DB.prepare("SELECT COUNT(*) AS total FROM hr_skill_catalog WHERE organization_id=? AND dba_id=? AND status='active'")
      .bind(authz.organizationId, authz.dbaId),
    env.DB.prepare("SELECT COUNT(*) AS total FROM hr_assessment_templates WHERE organization_id=? AND dba_id=? AND status='active'")
      .bind(authz.organizationId, authz.dbaId)
  ]);
  return json({
    ok: true,
    overview: {
      people: { total: Number(people.results?.[0]?.total || 0), active: Number(people.results?.[0]?.active || 0) },
      knowledge: { total: Number(items.results?.[0]?.total || 0), published: Number(items.results?.[0]?.published || 0) },
      assignments: { open: Number(assignments.results?.[0]?.open || 0), overdue: Number(assignments.results?.[0]?.overdue || 0) },
      skills: { active: Number(skills.results?.[0]?.total || 0) },
      assessments: { active: Number(assessments.results?.[0]?.total || 0) }
    }
  });
}

async function listPeople(request, env, url) {
  const gate = await authorize(request, env, 'module.read', 'hr.people.read');
  if (gate.response) return gate.response;
  const { authz } = gate;
  const limit = boundedLimit(url);
  const q = text(url.searchParams.get('q'), 120);
  const status = text(url.searchParams.get('status'), 32);
  const personType = text(url.searchParams.get('type'), 32);
  const clauses = ['organization_id=?', 'dba_id=?'];
  const binds = [authz.organizationId, authz.dbaId];
  if (q) {
    clauses.push('(display_name LIKE ? OR email LIKE ? OR employee_number LIKE ? OR job_title LIKE ?)');
    const like = `%${q}%`;
    binds.push(like, like, like, like);
  }
  if (status && PERSON_STATUSES.has(status)) { clauses.push('status=?'); binds.push(status); }
  if (personType && PERSON_TYPES.has(personType)) { clauses.push('person_type=?'); binds.push(personType); }
  binds.push(limit);
  const rows = await env.DB.prepare(`
    SELECT id,user_id,person_type,employee_number,first_name,last_name,display_name,email,department,job_title,status,hired_at,created_at,updated_at
    FROM hr_people WHERE ${clauses.join(' AND ')} ORDER BY display_name LIMIT ?
  `).bind(...binds).all();
  return json({ ok: true, people: rows.results || [] });
}

async function createPerson(request, env) {
  const gate = await authorize(request, env, 'module.write', 'hr.people.create');
  if (gate.response) return gate.response;
  const { authz } = gate;
  const parsed = await bodyJson(request);
  if (!parsed.ok) return json({ ok: false, error: parsed.error }, parsed.status);
  const body = parsed.body;
  const firstName = text(body.firstName, 100);
  const lastName = text(body.lastName, 100);
  const displayName = text(body.displayName || `${firstName} ${lastName}`, 220);
  const personType = text(body.personType || 'employee', 32);
  const status = text(body.status || 'active', 32);
  const normalizedEmail = body.email == null || text(body.email) === '' ? null : email(body.email);
  if (firstName.length < 1 || lastName.length < 1 || displayName.length < 2) return json({ ok: false, error: 'valid_person_name_required' }, 400);
  if (!PERSON_TYPES.has(personType) || !PERSON_STATUSES.has(status)) return json({ ok: false, error: 'invalid_person_type_or_status' }, 400);
  if (body.email && !normalizedEmail) return json({ ok: false, error: 'invalid_email' }, 400);
  const id = crypto.randomUUID();
  try {
    await env.DB.prepare(`
      INSERT INTO hr_people(
        id,organization_id,dba_id,user_id,person_type,employee_number,first_name,last_name,display_name,email,department,job_title,status,hired_at,created_by_user_id
      ) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    `).bind(
      id, authz.organizationId, authz.dbaId, nullableText(body.userId, 128), personType,
      nullableText(body.employeeNumber, 80), firstName, lastName, displayName, normalizedEmail,
      nullableText(body.department, 160), nullableText(body.jobTitle, 160), status,
      nullableText(body.hiredAt, 40), authz.session.user_id
    ).run();
  } catch {
    return json({ ok: false, error: 'person_create_conflict' }, 409);
  }
  const auditRecorded = await auditMutation(env, authz, 'hr.person.create', 'hr_person', id, { personType, status });
  return json({ ok: true, person: { id, displayName, personType, status }, auditRecorded }, 201);
}

async function patchPerson(request, env, personId) {
  const gate = await authorize(request, env, 'module.write', 'hr.people.update');
  if (gate.response) return gate.response;
  const { authz } = gate;
  const existing = await env.DB.prepare('SELECT id FROM hr_people WHERE id=? AND organization_id=? AND dba_id=?')
    .bind(personId, authz.organizationId, authz.dbaId).first();
  if (!existing) return json({ ok: false, error: 'person_not_found' }, 404);
  const parsed = await bodyJson(request);
  if (!parsed.ok) return json({ ok: false, error: parsed.error }, parsed.status);
  const body = parsed.body;
  const sets = [];
  const binds = [];
  const add = (column, value) => { sets.push(`${column}=?`); binds.push(value); };
  if ('firstName' in body) { const v = text(body.firstName, 100); if (!v) return json({ok:false,error:'invalid_first_name'},400); add('first_name', v); }
  if ('lastName' in body) { const v = text(body.lastName, 100); if (!v) return json({ok:false,error:'invalid_last_name'},400); add('last_name', v); }
  if ('displayName' in body) { const v = text(body.displayName, 220); if (v.length < 2) return json({ok:false,error:'invalid_display_name'},400); add('display_name', v); }
  if ('email' in body) { const v = body.email == null || text(body.email) === '' ? null : email(body.email); if (body.email && !v) return json({ok:false,error:'invalid_email'},400); add('email', v); }
  if ('employeeNumber' in body) add('employee_number', nullableText(body.employeeNumber, 80));
  if ('department' in body) add('department', nullableText(body.department, 160));
  if ('jobTitle' in body) add('job_title', nullableText(body.jobTitle, 160));
  if ('hiredAt' in body) add('hired_at', nullableText(body.hiredAt, 40));
  if ('personType' in body) { const v = text(body.personType,32); if (!PERSON_TYPES.has(v)) return json({ok:false,error:'invalid_person_type'},400); add('person_type',v); }
  if ('status' in body) { const v = text(body.status,32); if (!PERSON_STATUSES.has(v)) return json({ok:false,error:'invalid_person_status'},400); add('status',v); }
  if (!sets.length) return json({ ok: false, error: 'no_supported_changes' }, 400);
  sets.push('updated_at=CURRENT_TIMESTAMP');
  binds.push(personId, authz.organizationId, authz.dbaId);
  try {
    await env.DB.prepare(`UPDATE hr_people SET ${sets.join(',')} WHERE id=? AND organization_id=? AND dba_id=?`).bind(...binds).run();
  } catch {
    return json({ ok: false, error: 'person_update_conflict' }, 409);
  }
  const auditRecorded = await auditMutation(env, authz, 'hr.person.update', 'hr_person', personId);
  return json({ ok: true, personId, auditRecorded });
}

async function listItems(request, env, url) {
  const gate = await authorize(request, env, 'module.read', 'hr_knowledge.items.read');
  if (gate.response) return gate.response;
  const { authz } = gate;
  const limit = boundedLimit(url);
  const q = text(url.searchParams.get('q'), 120);
  const status = text(url.searchParams.get('status'), 32);
  const kind = text(url.searchParams.get('kind'), 32);
  const clauses = ['organization_id=?', 'dba_id=?'];
  const binds = [authz.organizationId, authz.dbaId];
  if (q) { clauses.push('(title LIKE ? OR summary LIKE ? OR category LIKE ?)'); const like = `%${q}%`; binds.push(like, like, like); }
  if (status && ITEM_STATUSES.has(status)) { clauses.push('status=?'); binds.push(status); }
  if (kind && KINDS.has(kind)) { clauses.push('kind=?'); binds.push(kind); }
  binds.push(limit);
  const rows = await env.DB.prepare(`
    SELECT id,slug,title,kind,category,summary,status,version,owner_user_id,published_at,created_at,updated_at
    FROM hr_knowledge_items WHERE ${clauses.join(' AND ')} ORDER BY updated_at DESC LIMIT ?
  `).bind(...binds).all();
  return json({ ok: true, items: rows.results || [] });
}

async function createItem(request, env) {
  const gate = await authorize(request, env, 'module.write', 'hr_knowledge.item.create');
  if (gate.response) return gate.response;
  const { authz } = gate;
  const parsed = await bodyJson(request);
  if (!parsed.ok) return json({ ok: false, error: parsed.error }, parsed.status);
  const body = parsed.body;
  const title = text(body.title, 220);
  const slug = slugify(body.slug || title);
  const kind = text(body.kind || 'article', 32);
  const status = text(body.status || 'draft', 32);
  if (title.length < 2 || !slug) return json({ ok: false, error: 'valid_title_required' }, 400);
  if (!KINDS.has(kind) || !ITEM_STATUSES.has(status)) return json({ ok: false, error: 'invalid_item_kind_or_status' }, 400);
  let contentJson = '{}';
  try { contentJson = JSON.stringify(body.content ?? {}); } catch { return json({ok:false,error:'invalid_content'},400); }
  if (contentJson.length > 100000) return json({ ok: false, error: 'content_too_large' }, 413);
  const id = crypto.randomUUID();
  const publishedAt = status === 'published' ? new Date().toISOString() : null;
  try {
    await env.DB.prepare(`
      INSERT INTO hr_knowledge_items(
        id,organization_id,dba_id,slug,title,kind,category,summary,content_json,status,version,owner_user_id,published_at,created_by_user_id
      ) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    `).bind(
      id, authz.organizationId, authz.dbaId, slug, title, kind, nullableText(body.category, 160),
      nullableText(body.summary, 1200), contentJson, status, 1,
      nullableText(body.ownerUserId, 128) || authz.session.user_id, publishedAt, authz.session.user_id
    ).run();
  } catch {
    return json({ ok: false, error: 'knowledge_item_create_conflict' }, 409);
  }
  const auditRecorded = await auditMutation(env, authz, 'hr_knowledge.item.create', 'hr_knowledge_item', id, { kind, status, version: 1 });
  return json({ ok: true, item: { id, slug, title, kind, status, version: 1 }, auditRecorded }, 201);
}

async function patchItem(request, env, itemId) {
  const gate = await authorize(request, env, 'module.write', 'hr_knowledge.item.update');
  if (gate.response) return gate.response;
  const { authz } = gate;
  const existing = await env.DB.prepare('SELECT id,status,version FROM hr_knowledge_items WHERE id=? AND organization_id=? AND dba_id=?')
    .bind(itemId, authz.organizationId, authz.dbaId).first();
  if (!existing) return json({ ok: false, error: 'knowledge_item_not_found' }, 404);
  const parsed = await bodyJson(request);
  if (!parsed.ok) return json({ ok: false, error: parsed.error }, parsed.status);
  const body = parsed.body;
  const sets = [];
  const binds = [];
  const add = (column, value) => { sets.push(`${column}=?`); binds.push(value); };
  if ('title' in body) { const v = text(body.title,220); if (v.length < 2) return json({ok:false,error:'invalid_title'},400); add('title',v); }
  if ('slug' in body) { const v = slugify(body.slug); if (!v) return json({ok:false,error:'invalid_slug'},400); add('slug',v); }
  if ('kind' in body) { const v = text(body.kind,32); if (!KINDS.has(v)) return json({ok:false,error:'invalid_kind'},400); add('kind',v); }
  if ('category' in body) add('category', nullableText(body.category,160));
  if ('summary' in body) add('summary', nullableText(body.summary,1200));
  if ('ownerUserId' in body) add('owner_user_id', nullableText(body.ownerUserId,128));
  if ('content' in body) {
    let encoded; try { encoded = JSON.stringify(body.content ?? {}); } catch { return json({ok:false,error:'invalid_content'},400); }
    if (encoded.length > 100000) return json({ok:false,error:'content_too_large'},413);
    add('content_json', encoded);
  }
  if ('status' in body) {
    const v = text(body.status,32);
    if (!ITEM_STATUSES.has(v)) return json({ok:false,error:'invalid_status'},400);
    add('status',v);
    if (v === 'published' && existing.status !== 'published') add('published_at', new Date().toISOString());
  }
  if (!sets.length) return json({ ok: false, error: 'no_supported_changes' }, 400);
  const nextVersion = Number(existing.version || 1) + 1;
  sets.push('version=?', 'updated_at=CURRENT_TIMESTAMP');
  binds.push(nextVersion, itemId, authz.organizationId, authz.dbaId);
  try {
    await env.DB.prepare(`UPDATE hr_knowledge_items SET ${sets.join(',')} WHERE id=? AND organization_id=? AND dba_id=?`).bind(...binds).run();
  } catch {
    return json({ ok: false, error: 'knowledge_item_update_conflict' }, 409);
  }
  const auditRecorded = await auditMutation(env, authz, 'hr_knowledge.item.update', 'hr_knowledge_item', itemId, { version: nextVersion });
  return json({ ok: true, itemId, version: nextVersion, auditRecorded });
}

async function listSkills(request, env, url) {
  const gate = await authorize(request, env, 'module.read', 'hr_knowledge.skills.read');
  if (gate.response) return gate.response;
  const { authz } = gate;
  const limit = boundedLimit(url);
  const q = text(url.searchParams.get('q'),120);
  const binds = [authz.organizationId, authz.dbaId];
  let extra = '';
  if (q) { extra = ' AND (name LIKE ? OR code LIKE ? OR category LIKE ?)'; const like = `%${q}%`; binds.push(like,like,like); }
  binds.push(limit);
  const rows = await env.DB.prepare(`
    SELECT id,code,name,category,description,status,created_at,updated_at
    FROM hr_skill_catalog WHERE organization_id=? AND dba_id=?${extra}
    ORDER BY status='active' DESC,name LIMIT ?
  `).bind(...binds).all();
  return json({ ok: true, skills: rows.results || [] });
}

async function createSkill(request, env) {
  const gate = await authorize(request, env, 'module.write', 'hr_knowledge.skill.create');
  if (gate.response) return gate.response;
  const { authz } = gate;
  const parsed = await bodyJson(request);
  if (!parsed.ok) return json({ok:false,error:parsed.error},parsed.status);
  const body = parsed.body;
  const code = text(body.code || slugify(body.name), 80).toUpperCase();
  const name = text(body.name,180);
  if (!code || name.length < 2) return json({ok:false,error:'valid_skill_required'},400);
  const id = crypto.randomUUID();
  try {
    await env.DB.prepare(`INSERT INTO hr_skill_catalog(id,organization_id,dba_id,code,name,category,description,created_by_user_id) VALUES(?,?,?,?,?,?,?,?)`)
      .bind(id,authz.organizationId,authz.dbaId,code,name,nullableText(body.category,160),nullableText(body.description,1200),authz.session.user_id).run();
  } catch {
    return json({ok:false,error:'skill_create_conflict'},409);
  }
  const auditRecorded = await auditMutation(env,authz,'hr_knowledge.skill.create','hr_skill',id);
  return json({ok:true,skill:{id,code,name,status:'active'},auditRecorded},201);
}

async function assignSkill(request, env) {
  const gate = await authorize(request, env, 'module.write', 'hr_knowledge.person_skill.upsert');
  if (gate.response) return gate.response;
  const { authz } = gate;
  const parsed = await bodyJson(request);
  if (!parsed.ok) return json({ok:false,error:parsed.error},parsed.status);
  const body = parsed.body;
  const personId = text(body.personId,128);
  const skillId = text(body.skillId,128);
  const proficiency = Number(body.proficiency ?? 1);
  if (!personId || !skillId || !Number.isInteger(proficiency) || proficiency < 0 || proficiency > 5) return json({ok:false,error:'valid_person_skill_required'},400);
  const verified = body.verified === true ? 1 : 0;
  let evidenceJson = null;
  if ('evidence' in body) { try { evidenceJson = JSON.stringify(body.evidence); } catch { return json({ok:false,error:'invalid_evidence'},400); } }
  const existing = await env.DB.prepare('SELECT id FROM hr_person_skills WHERE organization_id=? AND dba_id=? AND person_id=? AND skill_id=?')
    .bind(authz.organizationId,authz.dbaId,personId,skillId).first();
  try {
    if (existing) {
      await env.DB.prepare(`UPDATE hr_person_skills SET proficiency=?,verified=?,verified_by_user_id=?,evidence_json=?,updated_at=CURRENT_TIMESTAMP WHERE id=? AND organization_id=? AND dba_id=?`)
        .bind(proficiency,verified,verified?authz.session.user_id:null,evidenceJson,existing.id,authz.organizationId,authz.dbaId).run();
    } else {
      await env.DB.prepare(`INSERT INTO hr_person_skills(id,organization_id,dba_id,person_id,skill_id,proficiency,verified,verified_by_user_id,evidence_json) VALUES(?,?,?,?,?,?,?,?,?)`)
        .bind(crypto.randomUUID(),authz.organizationId,authz.dbaId,personId,skillId,proficiency,verified,verified?authz.session.user_id:null,evidenceJson).run();
    }
  } catch {
    return json({ok:false,error:'person_skill_upsert_conflict'},409);
  }
  const auditRecorded = await auditMutation(env,authz,'hr_knowledge.person_skill.upsert','hr_person_skill',`${personId}:${skillId}`,{proficiency,verified:Boolean(verified)});
  return json({ok:true,personId,skillId,proficiency,verified:Boolean(verified),auditRecorded});
}

async function createAssignment(request, env) {
  const gate = await authorize(request, env, 'module.write', 'hr_knowledge.assignment.create');
  if (gate.response) return gate.response;
  const { authz } = gate;
  const parsed = await bodyJson(request);
  if (!parsed.ok) return json({ok:false,error:parsed.error},parsed.status);
  const body = parsed.body;
  const itemId = text(body.knowledgeItemId,128);
  const personId = text(body.personId,128);
  if (!itemId || !personId) return json({ok:false,error:'knowledge_item_and_person_required'},400);
  const id = crypto.randomUUID();
  try {
    await env.DB.prepare(`INSERT INTO hr_knowledge_assignments(id,organization_id,dba_id,knowledge_item_id,person_id,assigned_by_user_id,required,due_at) VALUES(?,?,?,?,?,?,?,?)`)
      .bind(id,authz.organizationId,authz.dbaId,itemId,personId,authz.session.user_id,body.required===false?0:1,nullableText(body.dueAt,40)).run();
  } catch {
    return json({ok:false,error:'assignment_create_conflict'},409);
  }
  const auditRecorded = await auditMutation(env,authz,'hr_knowledge.assignment.create','hr_knowledge_assignment',id,{knowledgeItemId:itemId,personId});
  return json({ok:true,assignment:{id,knowledgeItemId:itemId,personId,status:'assigned'},auditRecorded},201);
}

async function patchAssignment(request, env, assignmentId) {
  const gate = await authorize(request, env, 'module.write', 'hr_knowledge.assignment.update');
  if (gate.response) return gate.response;
  const { authz } = gate;
  const existing = await env.DB.prepare('SELECT id,status FROM hr_knowledge_assignments WHERE id=? AND organization_id=? AND dba_id=?')
    .bind(assignmentId,authz.organizationId,authz.dbaId).first();
  if (!existing) return json({ok:false,error:'assignment_not_found'},404);
  const parsed = await bodyJson(request);
  if (!parsed.ok) return json({ok:false,error:parsed.error},parsed.status);
  const body = parsed.body;
  const sets=[]; const binds=[];
  const add=(column,value)=>{sets.push(`${column}=?`);binds.push(value);};
  if ('status' in body) {
    const status=text(body.status,32); if(!ASSIGNMENT_STATUSES.has(status)) return json({ok:false,error:'invalid_assignment_status'},400); add('status',status);
    if(status==='in_progress' && existing.status==='assigned') add('started_at',new Date().toISOString());
    if(status==='completed') add('completed_at',new Date().toISOString());
  }
  if ('dueAt' in body) add('due_at',nullableText(body.dueAt,40));
  if ('score' in body) { const score=body.score==null?null:Number(body.score); if(score!=null && (!Number.isFinite(score)||score<0||score>100)) return json({ok:false,error:'invalid_score'},400); add('score',score); }
  if (!sets.length) return json({ok:false,error:'no_supported_changes'},400);
  sets.push('updated_at=CURRENT_TIMESTAMP'); binds.push(assignmentId,authz.organizationId,authz.dbaId);
  await env.DB.prepare(`UPDATE hr_knowledge_assignments SET ${sets.join(',')} WHERE id=? AND organization_id=? AND dba_id=?`).bind(...binds).run();
  const auditRecorded = await auditMutation(env,authz,'hr_knowledge.assignment.update','hr_knowledge_assignment',assignmentId);
  return json({ok:true,assignmentId,auditRecorded});
}

async function listAssessments(request, env, url) {
  const gate = await authorize(request, env, 'module.read', 'hr_knowledge.assessments.read');
  if (gate.response) return gate.response;
  const { authz } = gate;
  const limit = boundedLimit(url);
  const rows = await env.DB.prepare(`
    SELECT a.id,a.title,a.job_family,a.kind,a.status,a.passing_score,a.time_limit_minutes,a.version,a.created_at,a.updated_at,
           COUNT(q.id) AS question_count
    FROM hr_assessment_templates a
    LEFT JOIN hr_assessment_questions q ON q.assessment_id=a.id AND q.organization_id=a.organization_id AND q.dba_id=a.dba_id AND q.status='active'
    WHERE a.organization_id=? AND a.dba_id=?
    GROUP BY a.id ORDER BY a.updated_at DESC LIMIT ?
  `).bind(authz.organizationId,authz.dbaId,limit).all();
  return json({ok:true,assessments:rows.results||[]});
}

async function createAssessment(request, env) {
  const gate = await authorize(request, env, 'module.write', 'hr_knowledge.assessment.create');
  if (gate.response) return gate.response;
  const { authz } = gate;
  const parsed = await bodyJson(request);
  if (!parsed.ok) return json({ok:false,error:parsed.error},parsed.status);
  const body = parsed.body;
  const title=text(body.title,220), kind=text(body.kind||'custom',32), status=text(body.status||'draft',32);
  const passingScore=Number(body.passingScore ?? 70);
  const timeLimit=body.timeLimitMinutes==null?null:Number(body.timeLimitMinutes);
  if(title.length<2 || !ASSESSMENT_KINDS.has(kind) || !ASSESSMENT_STATUSES.has(status)) return json({ok:false,error:'invalid_assessment'},400);
  if(!Number.isFinite(passingScore)||passingScore<0||passingScore>100) return json({ok:false,error:'invalid_passing_score'},400);
  if(timeLimit!=null && (!Number.isInteger(timeLimit)||timeLimit<1||timeLimit>1440)) return json({ok:false,error:'invalid_time_limit'},400);
  const id=crypto.randomUUID();
  await env.DB.prepare(`INSERT INTO hr_assessment_templates(id,organization_id,dba_id,title,job_family,kind,status,passing_score,time_limit_minutes,created_by_user_id) VALUES(?,?,?,?,?,?,?,?,?,?)`)
    .bind(id,authz.organizationId,authz.dbaId,title,nullableText(body.jobFamily,160),kind,status,passingScore,timeLimit,authz.session.user_id).run();
  const auditRecorded=await auditMutation(env,authz,'hr_knowledge.assessment.create','hr_assessment',id,{kind,status});
  return json({ok:true,assessment:{id,title,kind,status,passingScore,timeLimitMinutes:timeLimit},auditRecorded},201);
}

async function addQuestions(request, env, assessmentId) {
  const gate = await authorize(request, env, 'module.write', 'hr_knowledge.assessment.questions.create');
  if (gate.response) return gate.response;
  const { authz } = gate;
  const assessment = await env.DB.prepare('SELECT id FROM hr_assessment_templates WHERE id=? AND organization_id=? AND dba_id=?')
    .bind(assessmentId,authz.organizationId,authz.dbaId).first();
  if(!assessment) return json({ok:false,error:'assessment_not_found'},404);
  const parsed = await bodyJson(request,262144);
  if(!parsed.ok) return json({ok:false,error:parsed.error},parsed.status);
  const questions = Array.isArray(parsed.body.questions) ? parsed.body.questions : [];
  if(!questions.length || questions.length>100) return json({ok:false,error:'questions_array_required_max_100'},400);
  const allowedTypes = new Set(['boolean','yes_no','short_text','multiple_choice','scenario']);
  const statements=[];
  for(let i=0;i<questions.length;i++){
    const q=questions[i];
    const prompt=text(q.prompt,2000); const questionType=text(q.questionType,40); const points=Number(q.points ?? 1); const sortOrder=Number.isInteger(Number(q.sortOrder))?Number(q.sortOrder):i;
    if(prompt.length<2 || !allowedTypes.has(questionType) || !Number.isFinite(points) || points<=0 || sortOrder<0) return json({ok:false,error:`invalid_question_at_index_${i}`},400);
    let optionsJson=null, correctAnswerJson=null;
    try { if('options' in q) optionsJson=JSON.stringify(q.options); if('correctAnswer' in q) correctAnswerJson=JSON.stringify(q.correctAnswer); } catch { return json({ok:false,error:`invalid_question_json_at_index_${i}`},400); }
    statements.push(env.DB.prepare(`INSERT INTO hr_assessment_questions(id,organization_id,dba_id,assessment_id,prompt,question_type,options_json,correct_answer_json,points,sort_order) VALUES(?,?,?,?,?,?,?,?,?,?)`)
      .bind(crypto.randomUUID(),authz.organizationId,authz.dbaId,assessmentId,prompt,questionType,optionsJson,correctAnswerJson,points,sortOrder));
  }
  try { await env.DB.batch(statements); } catch { return json({ok:false,error:'assessment_questions_create_conflict'},409); }
  const auditRecorded=await auditMutation(env,authz,'hr_knowledge.assessment.questions.create','hr_assessment',assessmentId,{count:questions.length});
  return json({ok:true,assessmentId,created:questions.length,auditRecorded},201);
}

async function searchKnowledge(request, env, url) {
  const gate = await authorize(request, env, 'module.read', 'hr_knowledge.search');
  if (gate.response) return gate.response;
  const { authz } = gate;
  const q = text(url.searchParams.get('q'),120);
  if(q.length<2) return json({ok:false,error:'search_query_min_2'},400);
  const like=`%${q}%`;
  const [items,skills,people] = await env.DB.batch([
    env.DB.prepare(`SELECT id,title,kind,category,summary,status,version FROM hr_knowledge_items WHERE organization_id=? AND dba_id=? AND (title LIKE ? OR summary LIKE ? OR category LIKE ?) ORDER BY status='published' DESC,updated_at DESC LIMIT 25`)
      .bind(authz.organizationId,authz.dbaId,like,like,like),
    env.DB.prepare(`SELECT id,code,name,category,description,status FROM hr_skill_catalog WHERE organization_id=? AND dba_id=? AND (name LIKE ? OR code LIKE ? OR category LIKE ?) ORDER BY status='active' DESC,name LIMIT 25`)
      .bind(authz.organizationId,authz.dbaId,like,like,like),
    env.DB.prepare(`SELECT id,display_name,person_type,department,job_title,status FROM hr_people WHERE organization_id=? AND dba_id=? AND (display_name LIKE ? OR department LIKE ? OR job_title LIKE ?) ORDER BY display_name LIMIT 25`)
      .bind(authz.organizationId,authz.dbaId,like,like,like)
  ]);
  return json({ok:true,query:q,results:{items:items.results||[],skills:skills.results||[],people:people.results||[]}});
}

export async function hrKnowledgeRoutes(request, env, url = new URL(request.url)) {
  if (!url.pathname.startsWith('/api/hr/')) return null;
  if (url.pathname === '/api/hr/knowledge/status' && request.method === 'GET') {
    return json({
      ok: true,
      module: 'hr-knowledge',
      enabled: enabled(env),
      databaseConfigured: Boolean(env.DB),
      activation: enabled(env) && env.DB ? 'ready' : 'disabled_or_unconfigured'
    });
  }
  if (!enabled(env)) return json({ ok: false, error: 'hr_knowledge_disabled' }, 503);
  if (!env.DB) return json({ ok: false, error: 'identity_database_unavailable' }, 503);

  if (url.pathname === '/api/hr/knowledge/overview' && request.method === 'GET') return overview(request, env);
  if (url.pathname === '/api/hr/knowledge/search' && request.method === 'GET') return searchKnowledge(request, env, url);
  if (url.pathname === '/api/hr/people' && request.method === 'GET') return listPeople(request, env, url);
  if (url.pathname === '/api/hr/people' && request.method === 'POST') return createPerson(request, env);
  if (url.pathname === '/api/hr/knowledge/items' && request.method === 'GET') return listItems(request, env, url);
  if (url.pathname === '/api/hr/knowledge/items' && request.method === 'POST') return createItem(request, env);
  if (url.pathname === '/api/hr/knowledge/skills' && request.method === 'GET') return listSkills(request, env, url);
  if (url.pathname === '/api/hr/knowledge/skills' && request.method === 'POST') return createSkill(request, env);
  if (url.pathname === '/api/hr/knowledge/person-skills' && request.method === 'POST') return assignSkill(request, env);
  if (url.pathname === '/api/hr/knowledge/assignments' && request.method === 'POST') return createAssignment(request, env);
  if (url.pathname === '/api/hr/knowledge/assessments' && request.method === 'GET') return listAssessments(request, env, url);
  if (url.pathname === '/api/hr/knowledge/assessments' && request.method === 'POST') return createAssessment(request, env);

  const personMatch = url.pathname.match(/^\/api\/hr\/people\/([^/]+)$/);
  if (personMatch && request.method === 'PATCH') return patchPerson(request, env, decodeURIComponent(personMatch[1]));
  const itemMatch = url.pathname.match(/^\/api\/hr\/knowledge\/items\/([^/]+)$/);
  if (itemMatch && request.method === 'PATCH') return patchItem(request, env, decodeURIComponent(itemMatch[1]));
  const assignmentMatch = url.pathname.match(/^\/api\/hr\/knowledge\/assignments\/([^/]+)$/);
  if (assignmentMatch && request.method === 'PATCH') return patchAssignment(request, env, decodeURIComponent(assignmentMatch[1]));
  const questionsMatch = url.pathname.match(/^\/api\/hr\/knowledge\/assessments\/([^/]+)\/questions$/);
  if (questionsMatch && request.method === 'POST') return addQuestions(request, env, decodeURIComponent(questionsMatch[1]));
  return null;
}
