const MAX_DOCUMENT_BYTES = 1024 * 1024;
const ACCOUNT_TYPES = new Set(['asset','liability','equity','revenue','expense']);

const json = (data,status=200) => new Response(JSON.stringify(data), {
  status,
  headers: {'content-type':'application/json;charset=UTF-8','cache-control':'no-store'}
});

const uid = () => crypto.randomUUID();
const now = () => new Date().toISOString();

async function sha256(value) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256',bytes);
  return [...new Uint8Array(digest)].map(b=>b.toString(16).padStart(2,'0')).join('');
}

async function bodyJson(request) {
  try { return {value:await request.json()}; }
  catch { return {error:json({error:'Request body must be valid JSON'},400)}; }
}

function scopeWhere(scope) {
  return [scope.organization_id,scope.dba_id];
}

function auditStatement(env,scope,actor,action,resourceType,resourceId,payload={}) {
  return env.DB.prepare(`INSERT INTO audit_log(
    id,organization_id,dba_id,actor_user_id,action,resource_type,resource_id,payload,created_at
  ) VALUES(?,?,?,?,?,?,?,?,?)`).bind(
    uid(),scope.organization_id,scope.dba_id,actor.user_id,action,resourceType,resourceId,JSON.stringify(payload),now()
  );
}

async function audit(env,scope,actor,action,resourceType,resourceId,payload={}) {
  await auditStatement(env,scope,actor,action,resourceType,resourceId,payload).run();
}

async function handleDocuments(request,env,url,actor,scope) {
  const segments = url.pathname.split('/').filter(Boolean);
  const documentId = segments[2] || '';

  if (!documentId && request.method === 'GET') {
    const includeArchived = url.searchParams.get('include_archived') === 'true';
    const sql = `SELECT id,title,mime_type,status,current_version,current_hash,size_bytes,metadata,created_by,created_at,updated_at
      FROM atlas_documents WHERE organization_id=? AND dba_id=? ${includeArchived?'':"AND status!='archived'"}
      ORDER BY updated_at DESC LIMIT 250`;
    const result = await env.DB.prepare(sql).bind(...scopeWhere(scope)).all();
    await audit(env,scope,actor,'read','documents','collection',{count:(result.results||[]).length});
    return json({documents:result.results||[]});
  }

  if (!documentId && request.method === 'POST') {
    const parsed = await bodyJson(request); if (parsed.error) return parsed.error;
    const body = parsed.value || {};
    const title = String(body.title||'').trim();
    const content = typeof body.content === 'string' ? body.content : '';
    const mimeType = String(body.mime_type||'text/plain').trim().toLowerCase();
    if (!title) return json({error:'title is required'},400);
    const sizeBytes = new TextEncoder().encode(content).byteLength;
    if (sizeBytes > MAX_DOCUMENT_BYTES) return json({error:'Document content exceeds 1 MiB pilot limit'},413);
    const contentHash = await sha256(content);
    const documentIdNew = uid();
    const versionId = uid();
    const timestamp = now();
    const metadata = body.metadata && typeof body.metadata === 'object' && !Array.isArray(body.metadata) ? body.metadata : {};
    await env.DB.batch([
      env.DB.prepare(`INSERT INTO atlas_documents(
        id,organization_id,dba_id,title,mime_type,status,current_version,current_hash,size_bytes,metadata,created_by,created_at,updated_at
      ) VALUES(?,?,?,?,?,'active',1,?,?,?,?,?,?)`).bind(
        documentIdNew,scope.organization_id,scope.dba_id,title,mimeType,contentHash,sizeBytes,JSON.stringify(metadata),actor.user_id,timestamp,timestamp
      ),
      env.DB.prepare(`INSERT INTO atlas_document_versions(
        id,document_id,organization_id,dba_id,version,content_text,content_hash,size_bytes,created_by,created_at
      ) VALUES(?,?,?,?,1,?,?,?,?,?)`).bind(
        versionId,documentIdNew,scope.organization_id,scope.dba_id,content,contentHash,sizeBytes,actor.user_id,timestamp
      ),
      auditStatement(env,scope,actor,'create','document',documentIdNew,{version:1,content_hash:contentHash,size_bytes:sizeBytes})
    ]);
    return json({ok:true,id:documentIdNew,version:1,content_hash:contentHash,size_bytes:sizeBytes},201);
  }

  if (documentId && request.method === 'GET') {
    const document = await env.DB.prepare(`SELECT * FROM atlas_documents
      WHERE id=? AND organization_id=? AND dba_id=?`).bind(documentId,...scopeWhere(scope)).first();
    if (!document) return json({error:'Document not found'},404);
    const version = await env.DB.prepare(`SELECT version,content_text,content_hash,size_bytes,created_by,created_at
      FROM atlas_document_versions WHERE document_id=? AND organization_id=? AND dba_id=?
      ORDER BY version DESC LIMIT 1`).bind(documentId,...scopeWhere(scope)).first();
    await audit(env,scope,actor,'read','document',documentId,{version:document.current_version});
    return json({document,version});
  }

  if (documentId && request.method === 'PUT') {
    const existing = await env.DB.prepare(`SELECT * FROM atlas_documents
      WHERE id=? AND organization_id=? AND dba_id=?`).bind(documentId,...scopeWhere(scope)).first();
    if (!existing) return json({error:'Document not found'},404);
    if (existing.status === 'archived') return json({error:'Archived document is read-only'},409);
    const parsed = await bodyJson(request); if (parsed.error) return parsed.error;
    const body = parsed.value || {};
    if (typeof body.content !== 'string') return json({error:'content is required for a new document version'},400);
    const content = body.content;
    const sizeBytes = new TextEncoder().encode(content).byteLength;
    if (sizeBytes > MAX_DOCUMENT_BYTES) return json({error:'Document content exceeds 1 MiB pilot limit'},413);
    const contentHash = await sha256(content);
    const nextVersion = Number(existing.current_version)+1;
    const timestamp = now();
    const title = String(body.title||existing.title).trim() || existing.title;
    const mimeType = String(body.mime_type||existing.mime_type).trim().toLowerCase();
    const metadata = body.metadata && typeof body.metadata === 'object' && !Array.isArray(body.metadata)
      ? JSON.stringify(body.metadata) : existing.metadata;
    await env.DB.batch([
      env.DB.prepare(`UPDATE atlas_documents SET title=?,mime_type=?,current_version=?,current_hash=?,size_bytes=?,metadata=?,updated_at=?
        WHERE id=? AND organization_id=? AND dba_id=?`).bind(
        title,mimeType,nextVersion,contentHash,sizeBytes,metadata,timestamp,documentId,...scopeWhere(scope)
      ),
      env.DB.prepare(`INSERT INTO atlas_document_versions(
        id,document_id,organization_id,dba_id,version,content_text,content_hash,size_bytes,created_by,created_at
      ) VALUES(?,?,?,?,?,?,?,?,?,?)`).bind(
        uid(),documentId,scope.organization_id,scope.dba_id,nextVersion,content,contentHash,sizeBytes,actor.user_id,timestamp
      ),
      auditStatement(env,scope,actor,'update','document',documentId,{version:nextVersion,content_hash:contentHash,size_bytes:sizeBytes})
    ]);
    return json({ok:true,id:documentId,version:nextVersion,content_hash:contentHash,size_bytes:sizeBytes});
  }

  if (documentId && request.method === 'DELETE') {
    const timestamp = now();
    const result = await env.DB.prepare(`UPDATE atlas_documents SET status='archived',updated_at=?
      WHERE id=? AND organization_id=? AND dba_id=? AND status!='archived'`).bind(timestamp,documentId,...scopeWhere(scope)).run();
    if (!(result.meta?.changes>0)) return json({error:'Document not found or already archived'},404);
    await audit(env,scope,actor,'archive','document',documentId);
    return json({ok:true,id:documentId,status:'archived'});
  }

  return json({error:'Method not allowed'},405);
}

function defaultNormalBalance(type) {
  return type === 'asset' || type === 'expense' ? 'debit' : 'credit';
}

function validCents(value) {
  return Number.isSafeInteger(value) && value >= 0;
}

async function handleAccounting(request,env,url,actor,scope) {
  const segments = url.pathname.split('/').filter(Boolean);
  const resource = segments[2] || '';
  const resourceId = segments[3] || '';

  if (resource === 'accounts' && !resourceId && request.method === 'GET') {
    const result = await env.DB.prepare(`SELECT id,code,name,account_type,normal_balance,status,created_by,created_at,updated_at
      FROM accounting_accounts WHERE organization_id=? AND dba_id=? ORDER BY code`).bind(...scopeWhere(scope)).all();
    await audit(env,scope,actor,'read','accounting_accounts','collection',{count:(result.results||[]).length});
    return json({accounts:result.results||[]});
  }

  if (resource === 'accounts' && !resourceId && request.method === 'POST') {
    const parsed = await bodyJson(request); if (parsed.error) return parsed.error;
    const body = parsed.value || {};
    const code = String(body.code||'').trim();
    const name = String(body.name||'').trim();
    const accountType = String(body.account_type||'').trim().toLowerCase();
    if (!code || !name || !ACCOUNT_TYPES.has(accountType)) return json({error:'code, name and valid account_type are required'},400);
    const normalBalance = String(body.normal_balance||defaultNormalBalance(accountType)).toLowerCase();
    if (!['debit','credit'].includes(normalBalance)) return json({error:'normal_balance must be debit or credit'},400);
    const accountId = uid(); const timestamp = now();
    try {
      await env.DB.batch([
        env.DB.prepare(`INSERT INTO accounting_accounts(
          id,organization_id,dba_id,code,name,account_type,normal_balance,status,created_by,created_at,updated_at
        ) VALUES(?,?,?,?,?,?,?,'active',?,?,?)`).bind(
          accountId,scope.organization_id,scope.dba_id,code,name,accountType,normalBalance,actor.user_id,timestamp,timestamp
        ),
        auditStatement(env,scope,actor,'create','accounting_account',accountId,{code,account_type:accountType,normal_balance:normalBalance})
      ]);
    } catch (error) {
      if (/unique/i.test(String(error.message))) return json({error:'Account code already exists in this Organization/DBA'},409);
      throw error;
    }
    return json({ok:true,id:accountId,code,name,account_type:accountType,normal_balance:normalBalance},201);
  }

  if (resource === 'journal' && !resourceId && request.method === 'GET') {
    const result = await env.DB.prepare(`SELECT id,entry_number,entry_date,memo,currency,status,total_debit_cents,total_credit_cents,created_by,created_at,posted_at
      FROM accounting_journal_entries WHERE organization_id=? AND dba_id=?
      ORDER BY entry_date DESC,created_at DESC LIMIT 250`).bind(...scopeWhere(scope)).all();
    await audit(env,scope,actor,'read','accounting_journal','collection',{count:(result.results||[]).length});
    return json({journal_entries:result.results||[]});
  }

  if (resource === 'journal' && resourceId && request.method === 'GET') {
    const entry = await env.DB.prepare(`SELECT * FROM accounting_journal_entries
      WHERE id=? AND organization_id=? AND dba_id=?`).bind(resourceId,...scopeWhere(scope)).first();
    if (!entry) return json({error:'Journal entry not found'},404);
    const lines = await env.DB.prepare(`SELECT l.id,l.account_id,a.code AS account_code,a.name AS account_name,l.description,l.debit_cents,l.credit_cents,l.created_at
      FROM accounting_journal_lines l JOIN accounting_accounts a ON a.id=l.account_id
      WHERE l.entry_id=? AND l.organization_id=? AND l.dba_id=? ORDER BY l.created_at,l.id`).bind(resourceId,...scopeWhere(scope)).all();
    await audit(env,scope,actor,'read','journal_entry',resourceId,{lines:(lines.results||[]).length});
    return json({entry,lines:lines.results||[]});
  }

  if (resource === 'journal' && !resourceId && request.method === 'POST') {
    const parsed = await bodyJson(request); if (parsed.error) return parsed.error;
    const body = parsed.value || {};
    const entryDate = String(body.entry_date||'').trim();
    const currency = String(body.currency||'USD').trim().toUpperCase();
    const memo = String(body.memo||'').trim();
    const lines = Array.isArray(body.lines) ? body.lines : [];
    if (!/^\d{4}-\d{2}-\d{2}$/.test(entryDate)) return json({error:'entry_date must use YYYY-MM-DD'},400);
    if (!/^[A-Z]{3}$/.test(currency)) return json({error:'currency must be a 3-letter ISO code'},400);
    if (lines.length < 2 || lines.length > 100) return json({error:'journal entry requires 2 to 100 lines'},400);

    let totalDebit = 0; let totalCredit = 0;
    const normalized = [];
    for (const [index,line] of lines.entries()) {
      const accountId = String(line?.account_id||'').trim();
      const debitCents = Number(line?.debit_cents||0);
      const creditCents = Number(line?.credit_cents||0);
      if (!accountId || !validCents(debitCents) || !validCents(creditCents) || !((debitCents>0) !== (creditCents>0))) {
        return json({error:`Invalid journal line at index ${index}; use one positive integer debit_cents or credit_cents`},400);
      }
      const account = await env.DB.prepare(`SELECT id FROM accounting_accounts
        WHERE id=? AND organization_id=? AND dba_id=? AND status='active'`).bind(accountId,...scopeWhere(scope)).first();
      if (!account) return json({error:`Account not found or inactive at line ${index}`},400);
      totalDebit += debitCents; totalCredit += creditCents;
      if (!Number.isSafeInteger(totalDebit) || !Number.isSafeInteger(totalCredit)) return json({error:'Journal totals exceed safe integer range'},400);
      normalized.push({accountId,debitCents,creditCents,description:String(line.description||'').trim()});
    }
    if (totalDebit <= 0 || totalDebit !== totalCredit) return json({error:'Journal entry must balance exactly in integer cents'},400);

    const entryId = uid(); const timestamp = now();
    const entryNumber = `JE-${entryDate.replaceAll('-','')}-${entryId.slice(0,8).toUpperCase()}`;
    const statements = [env.DB.prepare(`INSERT INTO accounting_journal_entries(
      id,organization_id,dba_id,entry_number,entry_date,memo,currency,status,total_debit_cents,total_credit_cents,created_by,created_at,posted_at
    ) VALUES(?,?,?,?,?,?,?,'posted',?,?,?,?,?)`).bind(
      entryId,scope.organization_id,scope.dba_id,entryNumber,entryDate,memo,currency,totalDebit,totalCredit,actor.user_id,timestamp,timestamp
    )];
    for (const line of normalized) {
      statements.push(env.DB.prepare(`INSERT INTO accounting_journal_lines(
        id,entry_id,organization_id,dba_id,account_id,description,debit_cents,credit_cents,created_at
      ) VALUES(?,?,?,?,?,?,?,?,?)`).bind(
        uid(),entryId,scope.organization_id,scope.dba_id,line.accountId,line.description,line.debitCents,line.creditCents,timestamp
      ));
    }
    statements.push(auditStatement(env,scope,actor,'post','journal_entry',entryId,{entry_number:entryNumber,currency,total_debit_cents:totalDebit,total_credit_cents:totalCredit,lines:normalized.length}));
    await env.DB.batch(statements);
    return json({ok:true,id:entryId,entry_number:entryNumber,status:'posted',currency,total_debit_cents:totalDebit,total_credit_cents:totalCredit},201);
  }

  if (resource === 'trial-balance' && request.method === 'GET') {
    const result = await env.DB.prepare(`SELECT a.id,a.code,a.name,a.account_type,a.normal_balance,
      COALESCE(SUM(CASE WHEN e.status='posted' THEN l.debit_cents ELSE 0 END),0) AS debit_cents,
      COALESCE(SUM(CASE WHEN e.status='posted' THEN l.credit_cents ELSE 0 END),0) AS credit_cents
      FROM accounting_accounts a
      LEFT JOIN accounting_journal_lines l ON l.account_id=a.id AND l.organization_id=a.organization_id AND l.dba_id=a.dba_id
      LEFT JOIN accounting_journal_entries e ON e.id=l.entry_id AND e.organization_id=a.organization_id AND e.dba_id=a.dba_id
      WHERE a.organization_id=? AND a.dba_id=? AND a.status='active'
      GROUP BY a.id,a.code,a.name,a.account_type,a.normal_balance ORDER BY a.code`).bind(...scopeWhere(scope)).all();
    const accounts = result.results||[];
    const totalDebits = accounts.reduce((sum,row)=>sum+Number(row.debit_cents||0),0);
    const totalCredits = accounts.reduce((sum,row)=>sum+Number(row.credit_cents||0),0);
    await audit(env,scope,actor,'read','trial_balance','current',{accounts:accounts.length,total_debit_cents:totalDebits,total_credit_cents:totalCredits});
    return json({balanced:totalDebits===totalCredits,total_debit_cents:totalDebits,total_credit_cents:totalCredits,accounts});
  }

  return json({error:'Unknown accounting resource'},404);
}

export async function handleCommercialModule(request,env,{actor,scope}) {
  const url = new URL(request.url);
  if (url.pathname === '/api/documents' || url.pathname.startsWith('/api/documents/')) {
    return handleDocuments(request,env,url,actor,scope);
  }
  if (url.pathname === '/api/accounting' || url.pathname.startsWith('/api/accounting/')) {
    return handleAccounting(request,env,url,actor,scope);
  }
  return null;
}
