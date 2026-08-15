import { requireTenantPermission } from './tenant.js';
import { ensureFinanceSchema } from './finance-schema.js';
import { ensureFinanceAdvancedSchema } from './finance-advanced-schema.js';

const json=(body,status=200)=>Response.json(body,{status,headers:{'cache-control':'no-store','x-content-type-options':'nosniff'}});
const isoDate=value=>{const v=String(value||'').trim();return /^\d{4}-\d{2}-\d{2}$/.test(v)?v:null};

async function authorize(request,env){
  const authz=await requireTenantPermission(request,env,'module.read','finance.statements.read');
  if(!authz.ok)return{response:json({ok:false,error:authz.error},authz.status)};
  try{const base=await ensureFinanceSchema(env),advanced=await ensureFinanceAdvancedSchema(env);if(!base.ok||!advanced.ok)return{response:json({ok:false,error:'finance_schema_unavailable'},503)}}catch{return{response:json({ok:false,error:'finance_schema_unavailable'},503)}}
  return{authz};
}

async function statements(request,env,url){
  const gate=await authorize(request,env);if(gate.response)return gate.response;const{authz}=gate;
  const from=isoDate(url.searchParams.get('from'))||`${new Date().getUTCFullYear()}-01-01`,to=isoDate(url.searchParams.get('to'))||new Date().toISOString().slice(0,10);if(from>to)return json({ok:false,error:'invalid_statement_period'},400);
  const rows=await env.DB.prepare(`SELECT a.id,a.code,a.name,a.account_type,a.normal_balance,
    COALESCE(SUM(CASE WHEN j.status='posted' AND j.entry_date BETWEEN ? AND ? THEN l.debit_cents ELSE 0 END),0) AS period_debit_cents,
    COALESCE(SUM(CASE WHEN j.status='posted' AND j.entry_date BETWEEN ? AND ? THEN l.credit_cents ELSE 0 END),0) AS period_credit_cents,
    COALESCE(SUM(CASE WHEN j.status='posted' AND j.entry_date<=? THEN l.debit_cents ELSE 0 END),0) AS cumulative_debit_cents,
    COALESCE(SUM(CASE WHEN j.status='posted' AND j.entry_date<=? THEN l.credit_cents ELSE 0 END),0) AS cumulative_credit_cents
    FROM finance_accounts a
    LEFT JOIN finance_journal_lines l ON l.account_id=a.id
    LEFT JOIN finance_journal_entries j ON j.id=l.entry_id AND j.organization_id=a.organization_id AND j.dba_id=a.dba_id
    WHERE a.organization_id=? AND a.dba_id=? AND a.status='active'
    GROUP BY a.id ORDER BY a.code`).bind(from,to,from,to,to,to,authz.organizationId,authz.dbaId).all();
  const accounts=(rows.results||[]).map(r=>{const pd=Number(r.period_debit_cents||0),pc=Number(r.period_credit_cents||0),cd=Number(r.cumulative_debit_cents||0),cc=Number(r.cumulative_credit_cents||0);return{...r,period_balance_cents:r.normal_balance==='debit'?pd-pc:pc-pd,cumulative_balance_cents:r.normal_balance==='debit'?cd-cc:cc-cd}});
  const sum=(type,key)=>accounts.filter(a=>a.account_type===type).reduce((s,a)=>s+Number(a[key]||0),0);
  const revenue=sum('revenue','period_balance_cents'),expenses=sum('expense','period_balance_cents'),netIncome=revenue-expenses;
  const cumulativeRevenue=sum('revenue','cumulative_balance_cents'),cumulativeExpenses=sum('expense','cumulative_balance_cents'),currentEarnings=cumulativeRevenue-cumulativeExpenses;
  const assets=sum('asset','cumulative_balance_cents'),liabilities=sum('liability','cumulative_balance_cents'),equity=sum('equity','cumulative_balance_cents');
  const [seedResult,movementResult]=await env.DB.batch([
    env.DB.prepare(`SELECT COALESCE(SUM(opening_balance_cents),0) AS opening_seed FROM finance_bank_accounts WHERE organization_id=? AND dba_id=?`).bind(authz.organizationId,authz.dbaId),
    env.DB.prepare(`SELECT COALESCE(SUM(CASE WHEN status='posted' AND transaction_date<? THEN amount_cents ELSE 0 END),0) AS prior_movement,COALESCE(SUM(CASE WHEN status='posted' AND transaction_date BETWEEN ? AND ? THEN amount_cents ELSE 0 END),0) AS period_movement,COALESCE(SUM(CASE WHEN status='posted' AND transaction_date BETWEEN ? AND ? AND journal_entry_id IS NULL THEN 1 ELSE 0 END),0) AS unlinked FROM finance_bank_transactions WHERE organization_id=? AND dba_id=?`).bind(from,from,to,from,to,authz.organizationId,authz.dbaId)
  ]);
  const seed=Number(seedResult.results?.[0]?.opening_seed||0),prior=Number(movementResult.results?.[0]?.prior_movement||0),movement=Number(movementResult.results?.[0]?.period_movement||0),unlinked=Number(movementResult.results?.[0]?.unlinked||0),beginningCash=seed+prior,endingCash=beginningCash+movement;
  return json({ok:true,period:{from,to},incomeStatement:{revenueCents:revenue,expenseCents:expenses,netIncomeCents:netIncome,accounts:accounts.filter(a=>['revenue','expense'].includes(a.account_type)).map(a=>({...a,balance_cents:a.period_balance_cents}))},balanceSheet:{assetsCents:assets,liabilitiesCents:liabilities,equityCents:equity,currentEarningsCents:currentEarnings,balanceDifferenceCents:assets-(liabilities+equity+currentEarnings),accounts:accounts.filter(a=>['asset','liability','equity'].includes(a.account_type)).map(a=>({...a,balance_cents:a.cumulative_balance_cents}))},cashMovement:{beginningCashCents:beginningCash,netMovementCents:movement,endingCashCents:endingCash,unlinkedTransactions:unlinked,basis:'posted_bank_activity'}});
}

export async function financeStatementsRoutes(request,env,url=new URL(request.url)){
  const path=url.pathname.length>1?url.pathname.replace(/\/+$/,''):url.pathname;
  if(path==='/api/finance/statements'&&request.method==='GET')return statements(request,env,url);
  return null;
}
