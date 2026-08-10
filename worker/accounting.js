const READ_ROLES=new Set(['owner','admin','editor','viewer','auditor']);
const WRITE_ROLES=new Set(['owner','admin','editor']);
const ACCOUNT_TYPES=new Set(['asset','liability','equity','revenue','expense']);
const NORMAL_BALANCE={asset:'debit',expense:'debit',liability:'credit',equity:'credit',revenue:'credit'};
const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json;charset=UTF-8','cache-control':'no-store'}});
const id=()=>crypto.randomUUID();

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
  return env.DB.prepare(`SELECT s.id AS session_id,s.user_id
    FROM atlas_sessions s JOIN atlas_users u ON u.id=s.user_id
    WHERE s.token_hash=? AND s.revoked_at IS NULL AND s.expires_at>? AND u.status='active'`)
    .bind(tokenHash,new Date().toISOString()).first();
}

async function authorize(request,env,mode){
  const actor=await authenticate(request,env);
  if(!actor) return {error:json({error:'Unauthorized'},401)};
  const org=request.headers.get('x-atlas-organization')||'';
  const dba=request.headers.get('x-atlas-dba')||'';
  if(!org||!dba) return {error:json({error:'Organization and DBA scope are required'},400)};
  const membership=await env.DB.prepare(`SELECT role FROM atlas_memberships
    WHERE user_id=? AND organization_id=? AND dba_id=? AND status='active'`)
    .bind(actor.user_id,org,dba).first();
  if(!membership) return {error:json({error:'Forbidden'},403)};
  const role=String(membership.role||'').toLowerCase();
  const allowed=mode==='read'?READ_ROLES.has(role):WRITE_ROLES.has(role);
  if(!allowed) return {error:json({error:'Forbidden for role'},403)};
  return {actor,org,dba,role};
}

async function audit(env,{org,dba,userId,action,resourceType,resourceId,payload={}}){
  await env.DB.prepare(`INSERT INTO atlas_audit_events(id,organization_id,dba_id,actor_user_id,action,resource_type,resource_id,payload,created_at)
    VALUES(?,?,?,?,?,?,?,?,?)`)
    .bind(id(),org,dba,userId,action,resourceType,resourceId,JSON.stringify(payload),new Date().toISOString()).run();
}

function cents(value){
  return Number.isSafeInteger(value)&&value>=0?value:null;
}

async function createAccount(request,env){
  const auth=await authorize(request,env,'write'); if(auth.error) return auth.error;
  const body=await request.json();
  const code=String(body.code||'').trim();
  const name=String(body.name||'').trim();
  const accountType=String(body.account_type||'').trim().toLowerCase();
  if(!code||!name) return json({error:'code and name are required'},400);
  if(!ACCOUNT_TYPES.has(accountType)) return json({error:'Invalid account_type'},400);
  const normalBalance=NORMAL_BALANCE[accountType];
  const now=new Date().toISOString();
  const accountId=id();
  try{
    await env.DB.prepare(`INSERT INTO accounting_accounts(id,organization_id,dba_id,code,name,account_type,normal_balance,status,created_by,created_at,updated_at)
      VALUES(?,?,?,?,?,?,?,'active',?,?,?)`)
      .bind(accountId,auth.org,auth.dba,code,name,accountType,normalBalance,auth.actor.user_id,now,now).run();
  }catch(error){
    if(String(error.message||'').toLowerCase().includes('unique')) return json({error:'Account code already exists in this organization/DBA'},409);
    throw error;
  }
  await audit(env,{org:auth.org,dba:auth.dba,userId:auth.actor.user_id,action:'create',resourceType:'accounting_account',resourceId:accountId,payload:{code,name,account_type:accountType,normal_balance:normalBalance}});
  return json({ok:true,id:accountId,code,name,account_type:accountType,normal_balance:normalBalance},201);
}

async function listAccounts(request,env){
  const auth=await authorize(request,env,'read'); if(auth.error) return auth.error;
  const r=await env.DB.prepare(`SELECT id,code,name,account_type,normal_balance,status,created_by,created_at,updated_at
    FROM accounting_accounts WHERE organization_id=? AND dba_id=? ORDER BY code`)
    .bind(auth.org,auth.dba).all();
  return json({accounts:r.results||[]});
}

async function postJournal(request,env){
  const auth=await authorize(request,env,'write'); if(auth.error) return auth.error;
  const body=await request.json();
  const entryNumber=String(body.entry_number||'').trim();
  const entryDate=String(body.entry_date||'').trim();
  const memo=String(body.memo||'').trim();
  const currency=String(body.currency||'USD').trim().toUpperCase();
  const lines=Array.isArray(body.lines)?body.lines:[];
  if(!entryNumber||!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(entryDate)) return json({error:'entry_number and entry_date (YYYY-MM-DD) are required'},400);
  if(!/^[A-Z]{3}$/.test(currency)) return json({error:'currency must be a 3-letter ISO-style code'},400);
  if(lines.length<2) return json({error:'A journal entry requires at least two lines'},400);

  const normalized=[];
  let totalDebits=0;
  let totalCredits=0;
  for(const line of lines){
    const accountId=String(line.account_id||'').trim();
    const debit=cents(line.debit_cents??0);
    const credit=cents(line.credit_cents??0);
    if(!accountId||debit===null||credit===null) return json({error:'Each line requires a valid account_id and non-negative integer cents'},400);
    if(!((debit>0&&credit===0)||(credit>0&&debit===0))) return json({error:'Each line must contain exactly one positive debit or credit amount'},400);
    totalDebits+=debit;
    totalCredits+=credit;
    if(!Number.isSafeInteger(totalDebits)||!Number.isSafeInteger(totalCredits)) return json({error:'Journal totals exceed safe integer range'},400);
    normalized.push({accountId,debit,credit,description:String(line.description||'').trim()});
  }
  if(totalDebits<=0||totalDebits!==totalCredits) return json({error:'Journal entry must balance exactly in integer cents'},400);

  const uniqueAccountIds=[...new Set(normalized.map(line=>line.accountId))];
  for(const accountId of uniqueAccountIds){
    const account=await env.DB.prepare(`SELECT id FROM accounting_accounts
      WHERE id=? AND organization_id=? AND dba_id=? AND status='active'`)
      .bind(accountId,auth.org,auth.dba).first();
    if(!account) return json({error:`Active account not found in this organization/DBA: ${accountId}`},400);
  }

  const entryId=id();
  const now=new Date().toISOString();
  const statements=[env.DB.prepare(`INSERT INTO accounting_journal_entries(
    id,organization_id,dba_id,entry_number,entry_date,memo,currency,status,total_debit_cents,total_credit_cents,created_by,created_at,posted_at)
    VALUES(?,?,?,?,?,?,?,'posted',?,?,?,?,?)`)
    .bind(entryId,auth.org,auth.dba,entryNumber,entryDate,memo,currency,totalDebits,totalCredits,auth.actor.user_id,now,now)];
  for(const line of normalized){
    statements.push(env.DB.prepare(`INSERT INTO accounting_journal_lines(
      id,entry_id,organization_id,dba_id,account_id,description,debit_cents,credit_cents,created_at)
      VALUES(?,?,?,?,?,?,?,?,?)`)
      .bind(id(),entryId,auth.org,auth.dba,line.accountId,line.description,line.debit,line.credit,now));
  }
  try{
    await env.DB.batch(statements);
  }catch(error){
    if(String(error.message||'').toLowerCase().includes('unique')) return json({error:'entry_number already exists in this organization/DBA'},409);
    throw error;
  }
  await audit(env,{org:auth.org,dba:auth.dba,userId:auth.actor.user_id,action:'post',resourceType:'journal_entry',resourceId:entryId,payload:{entry_number:entryNumber,entry_date:entryDate,currency,total_debit_cents:totalDebits,total_credit_cents:totalCredits,line_count:normalized.length}});
  return json({ok:true,id:entryId,entry_number:entryNumber,status:'posted',currency,total_debit_cents:totalDebits,total_credit_cents:totalCredits},201);
}

async function listJournal(request,env){
  const auth=await authorize(request,env,'read'); if(auth.error) return auth.error;
  const r=await env.DB.prepare(`SELECT id,entry_number,entry_date,memo,currency,status,total_debit_cents,total_credit_cents,created_by,created_at,posted_at
    FROM accounting_journal_entries WHERE organization_id=? AND dba_id=? ORDER BY entry_date DESC,created_at DESC LIMIT 500`)
    .bind(auth.org,auth.dba).all();
  return json({entries:r.results||[]});
}

async function getJournalEntry(request,env,entryId){
  const auth=await authorize(request,env,'read'); if(auth.error) return auth.error;
  const entry=await env.DB.prepare(`SELECT * FROM accounting_journal_entries WHERE id=? AND organization_id=? AND dba_id=?`)
    .bind(entryId,auth.org,auth.dba).first();
  if(!entry) return json({error:'Journal entry not found'},404);
  const lines=await env.DB.prepare(`SELECT l.id,l.account_id,a.code AS account_code,a.name AS account_name,l.description,l.debit_cents,l.credit_cents
    FROM accounting_journal_lines l JOIN accounting_accounts a ON a.id=l.account_id
    WHERE l.entry_id=? AND l.organization_id=? AND l.dba_id=? ORDER BY l.rowid`)
    .bind(entryId,auth.org,auth.dba).all();
  return json({entry,lines:lines.results||[]});
}

async function trialBalance(request,env){
  const auth=await authorize(request,env,'read'); if(auth.error) return auth.error;
  const r=await env.DB.prepare(`SELECT a.id,a.code,a.name,a.account_type,a.normal_balance,
      COALESCE(SUM(CASE WHEN e.status='posted' THEN l.debit_cents ELSE 0 END),0) AS debit_cents,
      COALESCE(SUM(CASE WHEN e.status='posted' THEN l.credit_cents ELSE 0 END),0) AS credit_cents
    FROM accounting_accounts a
    LEFT JOIN accounting_journal_lines l ON l.account_id=a.id AND l.organization_id=a.organization_id AND l.dba_id=a.dba_id
    LEFT JOIN accounting_journal_entries e ON e.id=l.entry_id AND e.organization_id=a.organization_id AND e.dba_id=a.dba_id
    WHERE a.organization_id=? AND a.dba_id=?
    GROUP BY a.id,a.code,a.name,a.account_type,a.normal_balance
    ORDER BY a.code`)
    .bind(auth.org,auth.dba).all();
  const accounts=(r.results||[]).map(row=>{
    const debit=Number(row.debit_cents||0);
    const credit=Number(row.credit_cents||0);
    return {...row,debit_cents:debit,credit_cents:credit,balance_cents:row.normal_balance==='debit'?debit-credit:credit-debit};
  });
  const totalDebits=accounts.reduce((sum,row)=>sum+row.debit_cents,0);
  const totalCredits=accounts.reduce((sum,row)=>sum+row.credit_cents,0);
  return json({currency_basis:'per-entry',total_debit_cents:totalDebits,total_credit_cents:totalCredits,balanced:totalDebits===totalCredits,accounts});
}

export async function handleAccounting(request,env){
  const url=new URL(request.url);
  if(url.pathname==='/api/accounting/health'&&request.method==='GET'){
    if(!env.DB) return json({operational:false,error:'D1 binding DB is not configured'},503);
    const r=await env.DB.prepare("SELECT name FROM sqlite_schema WHERE type='table' AND name IN ('accounting_accounts','accounting_journal_entries','accounting_journal_lines')").all();
    const names=new Set((r.results||[]).map(x=>x.name));
    const missing=['accounting_accounts','accounting_journal_entries','accounting_journal_lines'].filter(name=>!names.has(name));
    return json({operational:missing.length===0,service:'ATLAS Accounting',storage:'D1',money_model:'integer-cents',missingTables:missing});
  }
  if(url.pathname==='/api/accounting/accounts'&&request.method==='GET') return listAccounts(request,env);
  if(url.pathname==='/api/accounting/accounts'&&request.method==='POST') return createAccount(request,env);
  if(url.pathname==='/api/accounting/journal'&&request.method==='GET') return listJournal(request,env);
  if(url.pathname==='/api/accounting/journal'&&request.method==='POST') return postJournal(request,env);
  if(url.pathname==='/api/accounting/trial-balance'&&request.method==='GET') return trialBalance(request,env);
  const parts=url.pathname.split('/').filter(Boolean);
  if(parts[0]==='api'&&parts[1]==='accounting'&&parts[2]==='journal'&&parts[3]&&request.method==='GET') return getJournalEntry(request,env,parts[3]);
  return json({error:'Method not allowed'},405);
}
