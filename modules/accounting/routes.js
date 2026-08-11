import { json } from '../../platform/runtime/health.js';
import { requireSession, requireScope } from '../../platform/security/auth.js';
import { audit } from '../../platform/security/audit.js';

function getScope(request,url){
  return {
    organizationId:url.searchParams.get('organization_id')||request.headers.get('x-atlas-organization'),
    dbaId:url.searchParams.get('dba_id')||request.headers.get('x-atlas-dba')
  };
}

async function authorize(env,request,url,roles,action,resourceType='accounting'){
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

function validDate(value){ return /^\d{4}-\d{2}-\d{2}$/.test(String(value||'')); }
function validCurrency(value){ return /^[A-Z]{3}$/.test(String(value||'')); }
function integerCents(value){ return Number.isSafeInteger(value) && value>=0; }

async function listAccounts(request,env,url){
  const ctx=await authorize(env,request,url,['owner','admin','auditor','member','viewer'],'accounting.account.list','accounting_account');
  if(ctx.response) return ctx.response;
  const rows=await env.DB.prepare(`SELECT id,code,name,account_type,normal_balance,status,created_at,updated_at FROM accounting_accounts WHERE organization_id=? AND dba_id=? ORDER BY code`)
    .bind(ctx.organizationId,ctx.dbaId).all();
  await audit(env,{actorUserId:ctx.auth.user_id,organizationId:ctx.organizationId,dbaId:ctx.dbaId,action:'accounting.account.list',resourceType:'accounting_account',decision:'allow'});
  return json({ok:true,accounts:rows.results||[]});
}

async function createAccount(request,env,url){
  const ctx=await authorize(env,request,url,['owner','admin'],'accounting.account.create','accounting_account');
  if(ctx.response) return ctx.response;
  const body=await request.json().catch(()=>null);
  const types=['asset','liability','equity','revenue','expense'];
  const normals=['debit','credit'];
  if(!body?.code||!body?.name||!types.includes(body.accountType)||!normals.includes(body.normalBalance)) return json({ok:false,error:'code_name_accountType_normalBalance_required'},400);
  const id=crypto.randomUUID();
  try{
    await env.DB.prepare(`INSERT INTO accounting_accounts(id,organization_id,dba_id,code,name,account_type,normal_balance) VALUES(?,?,?,?,?,?,?)`)
      .bind(id,ctx.organizationId,ctx.dbaId,String(body.code).trim(),String(body.name).trim(),body.accountType,body.normalBalance).run();
  }catch(error){
    return json({ok:false,error:'account_create_failed',detail:String(error?.message||error)},409);
  }
  await audit(env,{actorUserId:ctx.auth.user_id,organizationId:ctx.organizationId,dbaId:ctx.dbaId,action:'accounting.account.create',resourceType:'accounting_account',resourceId:id,decision:'allow',metadata:{code:body.code}});
  return json({ok:true,id},201);
}

async function listJournals(request,env,url){
  const ctx=await authorize(env,request,url,['owner','admin','auditor','member','viewer'],'accounting.journal.list','journal_entry');
  if(ctx.response) return ctx.response;
  const rows=await env.DB.prepare(`
    SELECT je.id,je.entry_date,je.memo,je.reference,je.currency,je.status,je.created_by_user_id,je.posted_by_user_id,je.posted_at,je.created_at,
      COALESCE(SUM(jl.debit_cents),0) AS debit_cents,COALESCE(SUM(jl.credit_cents),0) AS credit_cents
    FROM journal_entries je LEFT JOIN journal_lines jl ON jl.journal_entry_id=je.id
    WHERE je.organization_id=? AND je.dba_id=?
    GROUP BY je.id ORDER BY je.entry_date DESC,je.created_at DESC LIMIT 200
  `).bind(ctx.organizationId,ctx.dbaId).all();
  return json({ok:true,journals:rows.results||[]});
}

async function getJournal(request,env,url,id){
  const ctx=await authorize(env,request,url,['owner','admin','auditor','member','viewer'],'accounting.journal.read','journal_entry');
  if(ctx.response) return ctx.response;
  const journal=await env.DB.prepare(`SELECT id,entry_date,memo,reference,currency,status,created_by_user_id,posted_by_user_id,posted_at,created_at FROM journal_entries WHERE id=? AND organization_id=? AND dba_id=?`)
    .bind(id,ctx.organizationId,ctx.dbaId).first();
  if(!journal) return json({ok:false,error:'journal_not_found'},404);
  const lines=await env.DB.prepare(`SELECT jl.id,jl.line_no,jl.account_id,a.code AS account_code,a.name AS account_name,jl.description,jl.debit_cents,jl.credit_cents FROM journal_lines jl JOIN accounting_accounts a ON a.id=jl.account_id WHERE jl.journal_entry_id=? AND jl.organization_id=? AND jl.dba_id=? ORDER BY jl.line_no`)
    .bind(id,ctx.organizationId,ctx.dbaId).all();
  return json({ok:true,journal:{...journal,lines:lines.results||[]}});
}

async function createJournal(request,env,url){
  const ctx=await authorize(env,request,url,['owner','admin','member'],'accounting.journal.create','journal_entry');
  if(ctx.response) return ctx.response;
  const body=await request.json().catch(()=>null);
  if(!body||!validDate(body.entryDate)||!Array.isArray(body.lines)||body.lines.length<2) return json({ok:false,error:'entryDate_and_at_least_two_lines_required'},400);
  const currency=String(body.currency||'USD').toUpperCase();
  if(!validCurrency(currency)) return json({ok:false,error:'invalid_currency'},400);

  let debitTotal=0; let creditTotal=0;
  const accountIds=[];
  for(const line of body.lines){
    if(!line?.accountId||!integerCents(line.debitCents)||!integerCents(line.creditCents)) return json({ok:false,error:'invalid_journal_line'},400);
    if((line.debitCents>0)===(line.creditCents>0)) return json({ok:false,error:'each_line_must_have_exactly_one_side'},400);
    debitTotal+=line.debitCents; creditTotal+=line.creditCents; accountIds.push(line.accountId);
  }
  if(debitTotal<=0||debitTotal!==creditTotal) return json({ok:false,error:'journal_not_balanced',debitCents:debitTotal,creditCents:creditTotal},422);

  const placeholders=accountIds.map(()=>'?').join(',');
  const accountRows=await env.DB.prepare(`SELECT id FROM accounting_accounts WHERE organization_id=? AND dba_id=? AND status='active' AND id IN (${placeholders})`)
    .bind(ctx.organizationId,ctx.dbaId,...accountIds).all();
  const validIds=new Set((accountRows.results||[]).map(r=>r.id));
  if(accountIds.some(id=>!validIds.has(id))) return json({ok:false,error:'account_not_found_in_scope_or_inactive'},422);

  const journalId=crypto.randomUUID();
  const statements=[env.DB.prepare(`INSERT INTO journal_entries(id,organization_id,dba_id,entry_date,memo,reference,currency,status,created_by_user_id) VALUES(?,?,?,?,?,?,?,'draft',?)`)
    .bind(journalId,ctx.organizationId,ctx.dbaId,body.entryDate,body.memo||null,body.reference||null,currency,ctx.auth.user_id)];
  body.lines.forEach((line,index)=>{
    statements.push(env.DB.prepare(`INSERT INTO journal_lines(id,journal_entry_id,organization_id,dba_id,account_id,description,debit_cents,credit_cents,line_no) VALUES(?,?,?,?,?,?,?,?,?)`)
      .bind(crypto.randomUUID(),journalId,ctx.organizationId,ctx.dbaId,line.accountId,line.description||null,line.debitCents,line.creditCents,index+1));
  });
  try{ await env.DB.batch(statements); }
  catch(error){ return json({ok:false,error:'journal_create_failed',detail:String(error?.message||error)},409); }

  await audit(env,{actorUserId:ctx.auth.user_id,organizationId:ctx.organizationId,dbaId:ctx.dbaId,action:'accounting.journal.create',resourceType:'journal_entry',resourceId:journalId,decision:'allow',metadata:{debitCents:debitTotal,creditCents:creditTotal,currency}});
  return json({ok:true,id:journalId,status:'draft',debitCents:debitTotal,creditCents:creditTotal},201);
}

async function postJournal(request,env,url,id){
  const ctx=await authorize(env,request,url,['owner','admin'],'accounting.journal.post','journal_entry');
  if(ctx.response) return ctx.response;
  const journal=await env.DB.prepare(`SELECT id,status FROM journal_entries WHERE id=? AND organization_id=? AND dba_id=?`).bind(id,ctx.organizationId,ctx.dbaId).first();
  if(!journal) return json({ok:false,error:'journal_not_found'},404);
  if(journal.status!=='draft') return json({ok:false,error:'journal_not_draft'},409);
  const totals=await env.DB.prepare(`SELECT COUNT(*) AS line_count,COALESCE(SUM(debit_cents),0) AS debit_cents,COALESCE(SUM(credit_cents),0) AS credit_cents FROM journal_lines WHERE journal_entry_id=? AND organization_id=? AND dba_id=?`)
    .bind(id,ctx.organizationId,ctx.dbaId).first();
  if(Number(totals?.line_count||0)<2||Number(totals?.debit_cents||0)<=0||Number(totals?.debit_cents)!==Number(totals?.credit_cents)) return json({ok:false,error:'journal_not_balanced'},422);
  try{
    const result=await env.DB.prepare(`UPDATE journal_entries SET status='posted',posted_by_user_id=?,posted_at=CURRENT_TIMESTAMP,updated_at=CURRENT_TIMESTAMP WHERE id=? AND organization_id=? AND dba_id=? AND status='draft'`)
      .bind(ctx.auth.user_id,id,ctx.organizationId,ctx.dbaId).run();
    if(!result.meta?.changes) return json({ok:false,error:'journal_post_conflict'},409);
  }catch(error){ return json({ok:false,error:'journal_post_failed',detail:String(error?.message||error)},409); }
  await audit(env,{actorUserId:ctx.auth.user_id,organizationId:ctx.organizationId,dbaId:ctx.dbaId,action:'accounting.journal.post',resourceType:'journal_entry',resourceId:id,decision:'allow',metadata:{debitCents:Number(totals.debit_cents),creditCents:Number(totals.credit_cents)}});
  return json({ok:true,id,status:'posted'});
}

export async function accountingRoutes(request,env,url){
  if(url.pathname==='/api/accounting/accounts' && request.method==='GET') return listAccounts(request,env,url);
  if(url.pathname==='/api/accounting/accounts' && request.method==='POST') return createAccount(request,env,url);
  if(url.pathname==='/api/accounting/journals' && request.method==='GET') return listJournals(request,env,url);
  if(url.pathname==='/api/accounting/journals' && request.method==='POST') return createJournal(request,env,url);
  const match=url.pathname.match(/^\/api\/accounting\/journals\/([^/]+)$/);
  if(match && request.method==='GET') return getJournal(request,env,url,decodeURIComponent(match[1]));
  const postMatch=url.pathname.match(/^\/api\/accounting\/journals\/([^/]+)\/post$/);
  if(postMatch && request.method==='POST') return postJournal(request,env,url,decodeURIComponent(postMatch[1]));
  return null;
}
