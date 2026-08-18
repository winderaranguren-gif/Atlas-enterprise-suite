const H = {
  'content-type': 'text/html; charset=utf-8',
  'cache-control': 'no-store'
};

const modules = {
  finance: ['Dashboard','Bookkeeping','Reconcile','Close Center','General Ledger','Multi-Entity','AP','AR','Reporting','FP&A'],
  hr: ['People Dashboard','Employees','Payroll','Assessments','HR Knowledge'],
  projects: ['Projects','Tasks','Job Costing','Profitability','WIP'],
  inventory: ['Inventory','Products','Purchasing','Sales Orders','Receipts','Locations'],
  crm: ['CRM Dashboard','Leads','Customers','Activities','Proposals','Contracts'],
  health: ['Health Dashboard','Patient Experience','Virtual Care','Smart Rooms','Safety'],
  security: ['Security Dashboard','Zero Trust','Monitoring','Control','Resilience'],
  knowledge: ['Knowledge Atlas','Guides','FAQs','Policies','Training']
};

function esc(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[char]));
}

function shell(body) {
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>ATLAS Demo Center</title><style>body{margin:0;background:#030a12;color:#f2f7fc;font-family:Inter,Segoe UI,sans-serif}main{max-width:1180px;margin:auto;padding:28px}.hero{padding:24px;border:1px solid #1a527c;border-radius:18px;background:linear-gradient(135deg,#0a3154,#07101c)}.hero h1{margin:5px 0}.hero p{color:#a0b8cc}.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-top:15px}.card,.step{border:1px solid #183d5e;background:#091827;border-radius:12px;padding:16px}.card{text-decoration:none;color:#fff}.card span,.step span{display:block;color:#819db5;font-size:11px;margin-top:6px}.tag{font-size:9px;color:#5ad7ff;letter-spacing:.12em}.steps{display:grid;gap:10px;margin-top:15px}.step b{font-size:13px}.links{display:flex;gap:8px;flex-wrap:wrap;margin-top:14px}.btn{display:inline-block;padding:9px 12px;border-radius:8px;background:#0b3052;color:#eaf7ff;text-decoration:none;border:1px solid #245e8d;font-size:11px}@media(max-width:800px){.grid{grid-template-columns:1fr}main{padding:14px}}</style></head><body><main>${body}</main></body></html>`;
}

export function handleDemoCenter(request) {
  const url = new URL(request.url);
  const parts = url.pathname.split('/').filter(Boolean);
  if (parts[0] !== 'demos') return null;

  if (parts.length === 1) {
    const cards = Object.entries(modules).map(([key, flow]) => (
      `<a class="card" href="/demos/${key}"><div class="tag">ATLAS MODULE DEMO</div><b>${esc(key.toUpperCase())}</b><span>${flow.length} guided steps · demo-state only</span></a>`
    )).join('');
    const body = `<section class="hero"><div class="tag">ATLAS NATIVE DEMO SYSTEM</div><h1>Interactive Demo Center</h1><p>Each tour mirrors real ATLAS route families and uses clearly labelled demonstration state. No production metrics are fabricated.</p></section><section class="grid">${cards}</section><div class="links"><a class="btn" href="/dashboard">Dashboard</a><a class="btn" href="/finance/multi-entity">Enterprise Accounting</a></div>`;
    return new Response(shell(body), { headers: H });
  }

  const key = parts[1];
  const flow = modules[key];
  if (!flow) return new Response('Demo not found', { status: 404 });

  const steps = flow.map((step, index) => {
    const detail = index === 0
      ? 'Orient to module context'
      : index === flow.length - 1
        ? 'Complete the workflow and hand off to a related module'
        : 'Perform the next operational action and drill into its result';
    return `<div class="step"><div class="tag">STEP ${index + 1}</div><b>${esc(step)}</b><span>${detail}</span></div>`;
  }).join('');

  const destination = key === 'finance' ? 'finance' : key;
  const body = `<section class="hero"><div class="tag">GUIDED TOUR · DEMO DATA</div><h1>${esc(key.toUpperCase())} Demo</h1><p>Dashboard → action → drilldown → result → cross-module handoff. This is an ATLAS-native tour pattern, not a copy of any external demo interface.</p></section><section class="steps">${steps}</section><div class="links"><a class="btn" href="/demos">← All demos</a><a class="btn" href="/${destination}">Open real module</a></div>`;
  return new Response(shell(body), { headers: H });
}
