import { json } from '../../platform/runtime/health.js';
import { requireSession, requireScope } from '../../platform/security/auth.js';
import { audit } from '../../platform/security/audit.js';

function getScope(request,url){
  return {
    organizationId:url.searchParams.get('organization_id')||request.headers.get('x-atlas-organization'),
    dbaId:url.searchParams.get('dba_id')||request.headers.get('x-atlas-dba')
  };
}

async function authorize(env,request,url,action){
  const auth=await requireSession(env,request);
  if(!auth.ok) return {response:json({ok:false,error:auth.error},auth.status)};
  const {organizationId,dbaId}=getScope(request,url);
  if(!organizationId||!dbaId) return {response:json({ok:false,error:'organization_and_dba_required'},400)};
  const scoped=await requireScope(env,auth.session.user_id,organizationId,dbaId,['owner','admin','auditor','member','viewer']);
  if(!scoped.ok){
    await audit(env,{actorUserId:auth.session.user_id,organizationId,dbaId,action,resourceType:'analytics',decision:'deny',metadata:{error:scoped.error}});
    return {response:json({ok:false,error:scoped.error},scoped.status)};
  }
  return {auth:auth.session,organizationId,dbaId};
}

function period(url){
  const raw=Number(url.searchParams.get('days')||90);
  const days=Number.isFinite(raw)?Math.trunc(raw):90;
  return Math.min(Math.max(days,7),730);
}

async function overview(request,env,url){
  const ctx=await authorize(env,request,url,'analytics.overview.read');
  if(ctx.response) return ctx.response;
  const days=period(url);
  const cutoff=`-${days} days`;
  const [journals,accounts,activity]=await Promise.all([
    env.DB.prepare(`SELECT COUNT(*) AS total_journals, SUM(CASE WHEN status='posted' THEN 1 ELSE 0 END) AS posted_journals, SUM(CASE WHEN status='draft' THEN 1 ELSE 0 END) AS draft_journals FROM journal_entries WHERE organization_id=? AND dba_id=? AND entry_date>=date('now',?)`).bind(ctx.organizationId,ctx.dbaId,cutoff).first(),
    env.DB.prepare(`SELECT COUNT(*) AS active_accounts FROM accounting_accounts WHERE organization_id=? AND dba_id=? AND status='active'`).bind(ctx.organizationId,ctx.dbaId).first(),
    env.DB.prepare(`SELECT COALESCE(SUM(jl.debit_cents),0) AS debit_cents, COALESCE(SUM(jl.credit_cents),0) AS credit_cents FROM journal_lines jl JOIN journal_entries je ON je.id=jl.journal_entry_id WHERE jl.organization_id=? AND jl.dba_id=? AND je.status='posted' AND je.entry_date>=date('now',?)`).bind(ctx.organizationId,ctx.dbaId,cutoff).first()
  ]);
  const analytics={
    periodDays:days,
    totalJournals:Number(journals?.total_journals||0),
    postedJournals:Number(journals?.posted_journals||0),
    draftJournals:Number(journals?.draft_journals||0),
    activeAccounts:Number(accounts?.active_accounts||0),
    debitCents:Number(activity?.debit_cents||0),
    creditCents:Number(activity?.credit_cents||0),
    balanced:Number(activity?.debit_cents||0)===Number(activity?.credit_cents||0)
  };
  await audit(env,{actorUserId:ctx.auth.user_id,organizationId:ctx.organizationId,dbaId:ctx.dbaId,action:'analytics.overview.read',resourceType:'analytics',decision:'allow',metadata:{days}});
  return json({ok:true,analytics});
}

async function monthlyTrend(request,env,url){
  const ctx=await authorize(env,request,url,'analytics.trends.read');
  if(ctx.response) return ctx.response;
  const days=period(url);
  const rows=await env.DB.prepare(`
    SELECT strftime('%Y-%m',je.entry_date) AS period,
      COALESCE(SUM(jl.debit_cents),0) AS debit_cents,
      COALESCE(SUM(jl.credit_cents),0) AS credit_cents,
      COUNT(DISTINCT je.id) AS journal_count
    FROM journal_entries je JOIN journal_lines jl ON jl.journal_entry_id=je.id
    WHERE je.organization_id=? AND je.dba_id=? AND je.status='posted' AND je.entry_date>=date('now',?)
    GROUP BY strftime('%Y-%m',je.entry_date)
    ORDER BY period
  `).bind(ctx.organizationId,ctx.dbaId,`-${days} days`).all();
  return json({ok:true,periodDays:days,trend:(rows.results||[]).map(r=>({period:r.period,debitCents:Number(r.debit_cents||0),creditCents:Number(r.credit_cents||0),journalCount:Number(r.journal_count||0)}))});
}

async function accountMix(request,env,url){
  const ctx=await authorize(env,request,url,'analytics.account_mix.read');
  if(ctx.response) return ctx.response;
  const days=period(url);
  const rows=await env.DB.prepare(`
    SELECT a.account_type,
      COALESCE(SUM(CASE WHEN je.id IS NOT NULL THEN jl.debit_cents ELSE 0 END),0) AS debit_cents,
      COALESCE(SUM(CASE WHEN je.id IS NOT NULL THEN jl.credit_cents ELSE 0 END),0) AS credit_cents,
      SUM(CASE WHEN je.id IS NOT NULL THEN 1 ELSE 0 END) AS line_count
    FROM accounting_accounts a
    LEFT JOIN journal_lines jl ON jl.account_id=a.id AND jl.organization_id=a.organization_id AND jl.dba_id=a.dba_id
    LEFT JOIN journal_entries je ON je.id=jl.journal_entry_id AND je.status='posted' AND je.entry_date>=date('now',?)
    WHERE a.organization_id=? AND a.dba_id=? AND a.status='active'
    GROUP BY a.account_type ORDER BY a.account_type
  `).bind(`-${days} days`,ctx.organizationId,ctx.dbaId).all();
  return json({ok:true,periodDays:days,accountMix:(rows.results||[]).map(r=>({accountType:r.account_type,debitCents:Number(r.debit_cents||0),creditCents:Number(r.credit_cents||0),lineCount:Number(r.line_count||0)}))});
}

async function anomalies(request,env,url){
  const ctx=await authorize(env,request,url,'analytics.anomalies.read');
  if(ctx.response) return ctx.response;
  const days=period(url);
  const rows=await env.DB.prepare(`
    SELECT je.id,je.entry_date,je.reference,je.memo,COALESCE(SUM(jl.debit_cents),0) AS amount_cents
    FROM journal_entries je JOIN journal_lines jl ON jl.journal_entry_id=je.id
    WHERE je.organization_id=? AND je.dba_id=? AND je.status='posted' AND je.entry_date>=date('now',?)
    GROUP BY je.id ORDER BY amount_cents DESC LIMIT 500
  `).bind(ctx.organizationId,ctx.dbaId,`-${days} days`).all();
  const values=(rows.results||[]).map(r=>Number(r.amount_cents||0));
  const mean=values.length?values.reduce((sum,v)=>sum+v,0)/values.length:0;
  const variance=values.length?values.reduce((sum,v)=>sum+((v-mean)**2),0)/values.length:0;
  const stddev=Math.sqrt(variance);
  const threshold=mean+(2*stddev);
  const flagged=(rows.results||[]).filter(r=>Number(r.amount_cents||0)>threshold).slice(0,50);
  return json({ok:true,periodDays:days,method:'amount_gt_mean_plus_2stddev',sampleSize:values.length,thresholdCents:Math.round(threshold),anomalies:flagged.map(r=>({journalId:r.id,entryDate:r.entry_date,reference:r.reference,memo:r.memo,amountCents:Number(r.amount_cents||0),averageCents:Math.round(mean),stddevCents:Math.round(stddev)}))});
}

export async function analyticsRoutes(request,env,url){
  if(url.pathname==='/api/analytics/overview' && request.method==='GET') return overview(request,env,url);
  if(url.pathname==='/api/analytics/trends/monthly' && request.method==='GET') return monthlyTrend(request,env,url);
  if(url.pathname==='/api/analytics/account-mix' && request.method==='GET') return accountMix(request,env,url);
  if(url.pathname==='/api/analytics/anomalies' && request.method==='GET') return anomalies(request,env,url);
  return null;
}
