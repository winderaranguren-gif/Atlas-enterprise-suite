import { auditMutation, authorize, bodyJson, boundedLimit, integer, json, nullableText, text } from './crm-shared.js';

function calculate(lines){let subtotal=0,discount=0,tax=0;const normalized=(Array.isArray(lines)?lines:[]).slice(0,100).map((line,position)=>{const quantity=Math.max(.0001,Number(line.quantity)||1),unit=integer(line.unitPriceCents,0),d=integer(line.discountCents,0),t=integer(line.taxCents,0),gross=Math.round(quantity*unit),total=Math.max(0,gross-d+t);subtotal+=gross;discount+=d;tax+=t;return{description:text(line.description,500),quantity,unit,discount:d,tax:t,total,position}});return{lines:normalized,subtotal,discount,tax,total:Math.max(0,subtotal-discount+tax)}}

export async function listQuotes(request,env,url){
  const gate=await authorize(request,env,'crm.read','crm.quotes.read'); if(gate.response)return gate.response; const {authz}=gate, limit=boundedLimit(url);
  const rows=await env.DB.prepare('SELECT id,account_id,contact_id,opportunity_id,quote_number,title,status,currency,subtotal_cents,discount_cents,tax_cents,total_cents,valid_until,terms,created_at,updated_at FROM crm_quotes WHERE organization_id=? AND dba_id=? ORDER BY updated_at DESC LIMIT ?').bind(authz.organizationId,authz.dbaId,limit).all();
  return json({ok:true,quotes:rows.results||[]});
}

export async function createQuote(request,env){
  const gate=await authorize(request,env,'crm.write','crm.quote.create'); if(gate.response)return gate.response; const {authz}=gate;
  const parsed=await bodyJson(request,524288); if(!parsed.ok)return json({ok:false,error:parsed.error},parsed.status); const b=parsed.body, title=text(b.title,220); if(title.length<2)return json({ok:false,error:'valid_quote_title_required'},400);
  const calc=calculate(b.lines); if(calc.lines.some(line=>!line.description))return json({ok:false,error:'valid_quote_line_description_required'},400);
  const id=crypto.randomUUID(), quoteNumber=text(b.quoteNumber||`Q-${Date.now().toString(36).toUpperCase()}`,80);
  await env.DB.prepare(`INSERT INTO crm_quotes(id,organization_id,dba_id,account_id,contact_id,opportunity_id,quote_number,title,status,currency,subtotal_cents,discount_cents,tax_cents,total_cents,valid_until,terms,created_by_user_id) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).bind(id,authz.organizationId,authz.dbaId,nullableText(b.accountId,128),nullableText(b.contactId,128),nullableText(b.opportunityId,128),quoteNumber,title,'draft',text(b.currency||'USD',3).toUpperCase(),calc.subtotal,calc.discount,calc.tax,calc.total,nullableText(b.validUntil,40),nullableText(b.terms,8000),authz.session.user_id).run();
  if(calc.lines.length)await env.DB.batch(calc.lines.map(line=>env.DB.prepare('INSERT INTO crm_quote_lines(id,organization_id,dba_id,quote_id,description,quantity,unit_price_cents,discount_cents,tax_cents,line_total_cents,position) VALUES(?,?,?,?,?,?,?,?,?,?,?)').bind(crypto.randomUUID(),authz.organizationId,authz.dbaId,id,line.description,line.quantity,line.unit,line.discount,line.tax,line.total,line.position)));
  const auditRecorded=await auditMutation(env,authz,'crm.quote.create','crm_quote',id,{quoteNumber,totalCents:calc.total}); return json({ok:true,quote:{id,quoteNumber,title,totalCents:calc.total},auditRecorded},201);
}
