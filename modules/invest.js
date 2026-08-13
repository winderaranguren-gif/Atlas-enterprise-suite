const atlasModel = {
  symbol: 'ATLAS',
  name: 'ATLAS Future Allocation',
  type: 'educational_model_portfolio',
  status: 'simulation_only',
  allocation: [
    { label: 'Broad market', weight: 40 },
    { label: 'AI and computing', weight: 20 },
    { label: 'Cloud and cybersecurity', weight: 15 },
    { label: 'Health and biotechnology', weight: 10 },
    { label: 'Mobility, robotics and energy', weight: 10 },
    { label: 'Cash and Treasury exposure', weight: 5 }
  ],
  disclosure: 'Educational portfolio model only. ATLAS is not a publicly traded security and this module does not execute trades.'
};

const directory = [
  { symbol: 'VOO', type: 'market_reference' },
  { symbol: 'IVV', type: 'market_reference' },
  { symbol: 'GOOGL', type: 'market_reference' },
  { symbol: 'NVDA', type: 'market_reference' },
  { symbol: 'ATLAS', type: 'educational_model_portfolio', featured: true }
];

function page() {
  const cards = directory.map(x => `<article class="card ${x.featured ? 'featured' : ''}"><strong>${x.symbol}</strong><span>${x.featured ? 'ATLAS model' : 'Market reference'}</span></article>`).join('');
  const rows = atlasModel.allocation.map(x => `<div class="row"><div><span>${x.label}</span><b>${x.weight}%</b></div><i><em style="width:${x.weight}%"></em></i></div>`).join('');
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>ATLAS Invest</title><style>*{box-sizing:border-box}body{margin:0;background:#f7f8fa;color:#0b0f14;font-family:Inter,system-ui,-apple-system,sans-serif}.shell{max-width:1100px;margin:auto;padding:28px 20px 60px}a{color:inherit;text-decoration:none}.top{display:flex;justify-content:space-between;align-items:center}.back{padding:10px 14px;border:1px solid #ddd;border-radius:999px;background:#fff}.brand{font-weight:900;letter-spacing:.18em}.hero{margin:64px 0 28px}.eyebrow{font-size:.75rem;letter-spacing:.15em;text-transform:uppercase;color:#697582;font-weight:800}.hero h1{font-size:clamp(3.4rem,10vw,7.4rem);line-height:.88;letter-spacing:-.07em;margin:12px 0 20px}.hero p{max-width:720px;color:#5b6671;line-height:1.65;font-size:1.05rem}.cards{display:grid;grid-template-columns:repeat(5,1fr);gap:12px;margin:30px 0}.card{min-height:110px;border:1px solid #e2e5e8;background:#fff;border-radius:22px;padding:18px;display:flex;flex-direction:column;justify-content:space-between}.card strong{font-size:1.5rem}.card span{font-size:.76rem;color:#697582}.card.featured{background:#d9ff00;border-color:#d9ff00}.card.featured span{color:#1d2400}.grid{display:grid;grid-template-columns:1.25fr .75fr;gap:18px}.panel{background:#fff;border:1px solid #e2e5e8;border-radius:28px;padding:28px}.panel h2{font-size:2.2rem;letter-spacing:-.04em;margin:0 0 8px}.panel p{color:#66717c;line-height:1.6}.allocation{display:grid;gap:17px;margin-top:24px}.row div{display:flex;justify-content:space-between;gap:12px;font-size:.9rem;margin-bottom:7px}.row i{display:block;height:9px;border-radius:999px;background:#eef0f2;overflow:hidden}.row em{display:block;height:100%;background:#0b0f14;border-radius:999px}.symbol{font-size:4.6rem;font-weight:950;letter-spacing:-.06em}.status{display:inline-block;padding:7px 10px;border-radius:999px;background:#d9ff00;font-size:.72rem;font-weight:900;text-transform:uppercase;letter-spacing:.08em}.api{display:block;margin-top:20px;padding:14px 16px;background:#0b0f14;color:white;text-align:center;border-radius:15px;font-weight:800}.note{margin-top:18px;font-size:.8rem;line-height:1.55;color:#6e7984}@media(max-width:850px){.cards{grid-template-columns:1fr 1fr}.card.featured{grid-column:1/-1}.grid{grid-template-columns:1fr}}</style></head><body><div class="shell"><div class="top"><a class="back" href="/platform/finance">← Finance</a><div class="brand">ATLAS INVEST</div></div><section class="hero"><div class="eyebrow">Portfolio Lab</div><h1>ATLAS joins the lineup.</h1><p>A native ATLAS educational model portfolio now appears alongside VOO, IVV, GOOGL and NVDA as a diversified future-focused allocation.</p></section><section class="cards">${cards}</section><section class="grid"><article class="panel"><h2>ATLAS allocation</h2><p>Six strategic sleeves designed for diversification rather than dependence on one company.</p><div class="allocation">${rows}</div></article><aside class="panel"><span class="status">Simulation only</span><div class="symbol">ATLAS</div><p>Future Allocation · educational model portfolio.</p><a class="api" href="/api/invest/atlas">Open portfolio data</a><div class="note">${atlasModel.disclosure}</div></aside></section></div></body></html>`;
}

export async function investRoutes(request, env, url) {
  if (url.pathname === '/api/invest/atlas') return Response.json({ ok: true, module: 'atlas-invest', version: '0.1.0', portfolio: atlasModel }, { headers: { 'cache-control': 'no-store' } });
  if (url.pathname === '/api/invest/products') return Response.json({ ok: true, module: 'atlas-invest', products: directory, marketData: 'not_connected' }, { headers: { 'cache-control': 'no-store' } });
  if (url.pathname === '/platform/invest') return new Response(page(), { headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' } });
  return null;
}
