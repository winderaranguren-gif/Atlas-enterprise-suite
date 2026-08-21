const JSON_HEADERS={
  'content-type':'application/json; charset=utf-8',
  'cache-control':'no-store',
  'access-control-allow-origin':'*'
};
const HTML_HEADERS={
  'content-type':'text/html; charset=utf-8',
  'cache-control':'no-store',
  'x-content-type-options':'nosniff',
  'referrer-policy':'same-origin'
};

const DEFAULT_MODULES=[
  'Dashboard','Accounting','Operations','HR & Payroll','Transportation','CRM & Sales',
  'Inventory','Projects','Reports & Analytics','Documents','Integrations','Settings'
];

const CAPABILITIES=[
  {id:'visual-spec',name:'Visual reference normalization',state:'ready',engine:'atlas-js'},
  {id:'classification',name:'ATLAS module classification',state:'ready',engine:'atlas-js'},
  {id:'information-architecture',name:'Route and navigation planning',state:'ready',engine:'atlas-js'},
  {id:'public-boundary',name:'Pre-sign-in access boundary',state:'ready',engine:'atlas-js'},
  {id:'responsive',name:'Desktop, tablet and mobile contract',state:'ready',engine:'atlas-js'},
  {id:'data-policy',name:'No-fabricated-data quality gate',state:'ready',engine:'atlas-js'},
  {id:'implementation-handoff',name:'Canonical repository handoff',state:'ready',engine:'browser-storage'},
  {id:'external-web-builder',name:'External website builder',state:'not-required',engine:'none'}
];

function json(data,status=200){return new Response(JSON.stringify(data,null,2),{status,headers:JSON_HEADERS});}
function clean(value,max=6000){return String(value||'').replace(/\s+/g,' ').trim().slice(0,max);}
function safeRoute(value){const route=clean(value,180)||'/';return route.startsWith('/')?route:'/'+route;}
function unique(values){return [...new Set(values.map(v=>clean(v,120)).filter(Boolean))];}
function list(value,fallback=[]){
  if(Array.isArray(value))return unique(value);
  const text=clean(value,5000);
  if(!text)return [...fallback];
  return unique(text.split(/[,\n·]+/));
}

function buildWebRecipe(input={}){
  const route=safeRoute(input.route||'/');
  const purpose=clean(input.purpose,1000)||'Present ATLAS Enterprise Suite before sign-in and transition authorized users into the application.';
  const visualReference=clean(input.visualReference,4000)||'Approved ATLAS split composition: Orlando brand story on the left and a dark enterprise dashboard preview on the right.';
  const audience=clean(input.audience,400)||'Prospective customers, partners and users evaluating ATLAS before authentication.';
  const owner=clean(input.owner,160)||'Platform · Public Web';
  const authEntry=safeRoute(input.authEntry||'/identity');
  const publicBeforeSignIn=input.publicBeforeSignIn!==false;
  const previewModules=list(input.modules,DEFAULT_MODULES);
  const dataPolicy=clean(input.dataPolicy,300)||'authorized-only';
  const targetFile=clean(input.targetFile,240)||'modules/public-dashboard-home.js';
  const routingFile=clean(input.routingFile,240)||'rideos-router.js';
  const validationFile=clean(input.validationFile,240)||'scripts/validate-public-site.mjs';

  const components=[
    {id:'global-header',role:'navigation',public:true,actions:['Product','Solutions','Trust','Global','Contact','Sign in']},
    {id:'brand-story',role:'identity',public:true,content:['ATLAS Enterprise Suite','One platform. Every solution. Total control.','Built in Orlando']},
    {id:'dashboard-preview',role:'product-preview',public:true,interactive:'visual-only-before-auth'},
    {id:'module-rail',role:'module-discovery',public:true,items:previewModules,interactive:'inert-before-auth'},
    {id:'business-metrics',role:'data-preview',public:true,data:'empty-or-authorization-state'},
    {id:'sign-in-transition',role:'authorization',public:true,target:authEntry},
    {id:'platform-principles',role:'trust',public:true,items:['Secure','Scalable','Integrated','Intelligent','In Control']}
  ];

  const states=[
    'default','hover','focus-visible','selected-preview','locked-before-auth','loading','empty-data','error','success'
  ];

  const responsive=[
    {target:'desktop',minWidth:1120,layout:'split brand story + full dashboard preview'},
    {target:'tablet',minWidth:760,layout:'stacked story + dashboard with preserved hierarchy'},
    {target:'mobile',minWidth:0,layout:'single-column story + contained dashboard preview; no accidental module navigation'}
  ];

  const tests=[
    {id:'root-200',assert:`${route} returns 200 and complete HTML`},
    {id:'identity',assert:'ATLAS Enterprise Suite identity and approved tagline are visible'},
    {id:'modules-visible',assert:'Preview module names are visible before sign-in'},
    {id:'modules-inert',assert:'Application module routes are not public links before authorization'},
    {id:'auth-transition',assert:`Sign in transitions to ${authEntry}`},
    {id:'no-fake-metrics',assert:'Business values are empty, unavailable, or explicitly authorization-gated until a real source is connected'},
    {id:'responsive',assert:'Desktop, tablet and mobile layouts preserve reading order and navigation boundary'},
    {id:'security-headers',assert:'CSP, nosniff and frame protections remain present'}
  ];

  const gates=[
    {id:'visual-reference',label:'Visual reference captured',pass:Boolean(visualReference),detail:visualReference?'Reference intent is preserved as implementation input.':'Add a visual reference summary.'},
    {id:'owner',label:'Canonical owner defined',pass:Boolean(owner),detail:`Owner: ${owner}`},
    {id:'route',label:'Canonical route defined',pass:route==='/',detail:`Target route: ${route}`},
    {id:'public-boundary',label:'Public/auth boundary explicit',pass:publicBeforeSignIn&&Boolean(authEntry),detail:publicBeforeSignIn?`Preview is public; protected access begins at ${authEntry}.`:'Define the pre-sign-in boundary.'},
    {id:'module-preview',label:'Modules visible but not exposed',pass:previewModules.length>=8,detail:`${previewModules.length} preview modules included; implementation contract keeps them inert before auth.`},
    {id:'data-integrity',label:'No fabricated production metrics',pass:dataPolicy==='authorized-only',detail:dataPolicy==='authorized-only'?'Operational values require authorized sources.':'Use authorized-only data policy for production.'},
    {id:'responsive',label:'Responsive contract defined',pass:responsive.length===3,detail:'Desktop, tablet and mobile behavior are specified.'},
    {id:'tests',label:'End-to-end verification defined',pass:tests.length>=8,detail:`${tests.length} release checks generated.`},
    {id:'first-party',label:'First-party Creator workflow',pass:true,detail:'ATLAS generates the web implementation recipe without an external website builder.'}
  ];

  return {
    service:'atlas-creator-web-director',
    version:1,
    createdAt:new Date().toISOString(),
    externalProviders:[],
    classification:{screen:'Public Main Dashboard',owner,secondaryIntegrations:['Identity','Enterprise modules','Trust Center']},
    brief:{purpose,visualReference,audience},
    architecture:{route,publicBeforeSignIn,authEntry,moduleDepth:'Menu → module preview → sign-in → authorized workspace'},
    components,
    navigation:{public:['Product','Solutions','Trust','Global','Contact','Sign in'],previewModules},
    data:{policy:dataPolicy,metrics:'never fabricate',authenticatedSourcesOnly:true},
    permissions:{public:'read-only preview',protected:'RBAC and tenant authorization after sign-in'},
    states,
    responsive,
    implementation:{targetFile,routingFile,validationFile,reuse:['existing ATLAS public router','Identity route','shared security headers','canonical module routes']},
    tests,
    release:{sequence:['implement','syntax check','public-site validation','CI','merge','deploy','production verification'],productionTarget:'https://www.atlasenterprisesuite.com/'},
    quality:{passed:gates.filter(g=>g.pass).length,total:gates.length,gates}
  };
}

function page(){
  const modules=DEFAULT_MODULES.join(', ');
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><title>ATLAS Creator · Web Director</title><style>
  :root{--bg:#020712;--panel:#071625;--line:#1f4969;--text:#f4f9ff;--muted:#91a8bc;--cyan:#55d9ff;--green:#51dca0;--amber:#ffd16d}*{box-sizing:border-box}body{margin:0;background:radial-gradient(circle at 85% -10%,#154978 0,transparent 34%),var(--bg);color:var(--text);font:14px Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}.app{max-width:1380px;margin:auto;padding:18px}.hero,.card{border:1px solid var(--line);background:linear-gradient(145deg,#0a1f34,#05101b);border-radius:16px}.hero{padding:22px}.hero h1{margin:4px 0 7px;font-size:32px}.hero p{max-width:900px;color:var(--muted);line-height:1.55;margin:0}.pill{display:inline-block;border:1px solid #2d6b52;background:#08271e;color:#a9efcb;border-radius:999px;padding:6px 9px;font-size:10px}.grid{display:grid;grid-template-columns:minmax(330px,.78fr) minmax(0,1.22fr);gap:12px;margin-top:12px}.card{padding:14px}.card h2{font-size:14px;margin:0 0 10px}.field,.btn{width:100%;border:1px solid #2b638b;background:#071b2d;color:#fff;border-radius:9px;padding:10px}.field{margin:5px 0 9px}.btn{cursor:pointer;font-weight:700}.btn.primary{background:linear-gradient(135deg,#147de3,#15a9d5);border-color:#44c8f1}.btn.alt{background:#0b2943}.row{display:grid;grid-template-columns:1fr 1fr;gap:8px}.status{border:1px solid #1d425e;background:#071421;border-radius:10px;padding:10px;color:#9eb6c9;font-size:11px;line-height:1.45}.metrics{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:10px}.metric{border:1px solid #1c425e;background:#071421;border-radius:10px;padding:10px}.metric span{display:block;color:#7894a9;font-size:9px}.metric b{font-size:16px}.gate{display:flex;justify-content:space-between;gap:10px;padding:8px;border-bottom:1px solid #173650}.pass{color:var(--green)}.warn{color:var(--amber)}pre{white-space:pre-wrap;word-break:break-word;color:#a8c5d9;font-size:10px;max-height:390px;overflow:auto}@media(max-width:880px){.grid{grid-template-columns:1fr}.row,.metrics{grid-template-columns:1fr 1fr}}@media(max-width:520px){.app{padding:10px}.row,.metrics{grid-template-columns:1fr}}
  </style></head><body><main class="app"><section class="hero"><span class="pill">ATLAS CREATOR · FIRST-PARTY WEB DIRECTION</span><h1>Web Director</h1><p>Turn an approved visual reference into an ATLAS implementation contract: module ownership, canonical route, navigation, components, data policy, permissions, responsive behavior, tests and production handoff. The public preview never exposes protected module routes or invents business metrics.</p></section><div class="grid"><section class="card"><h2>Visual product brief</h2><label>Purpose</label><textarea class="field" id="purpose" rows="3">Present ATLAS Enterprise Suite before sign-in and transition authorized users into the application.</textarea><label>Visual reference</label><textarea class="field" id="visualReference" rows="5">Approved ATLAS split composition: Orlando brand story on the left and a dark enterprise dashboard preview on the right. Show the menus and module capabilities before sign-in, but require authentication before entering any module.</textarea><div class="row"><label>Route<input class="field" id="route" value="/"></label><label>Sign-in route<input class="field" id="authEntry" value="/identity"></label></div><label>Module owner</label><input class="field" id="owner" value="Platform · Public Web"><label>Preview modules</label><textarea class="field" id="modules" rows="4">${modules}</textarea><button class="btn primary" id="build">Build web implementation plan</button></section><section class="card"><h2>Creator output</h2><div class="metrics"><div class="metric"><span>SCREEN</span><b id="mScreen">—</b></div><div class="metric"><span>COMPONENTS</span><b id="mComponents">0</b></div><div class="metric"><span>QUALITY</span><b id="mQuality">—</b></div></div><div id="summary" class="status">Build a plan to generate the ATLAS web contract.</div><h2 style="margin-top:14px">Quality gates</h2><div id="gates"><div class="status">No checks yet.</div></div><div class="row" style="margin-top:12px"><button class="btn alt" id="save" disabled>Download recipe</button><button class="btn primary" id="open" disabled>Save & open Workbench</button></div><details style="margin-top:10px" open><summary>Implementation recipe</summary><pre id="raw">{}</pre></details></section></div></main><script>
  const e=id=>document.getElementById(id);let recipe=null;const esc=s=>String(s||'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  async function build(){e('build').disabled=true;e('build').textContent='Directing…';try{const payload={purpose:e('purpose').value,visualReference:e('visualReference').value,route:e('route').value,authEntry:e('authEntry').value,owner:e('owner').value,modules:e('modules').value,publicBeforeSignIn:true,dataPolicy:'authorized-only'};const r=await fetch('/api/studio/creator/web/recipe',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(payload)});recipe=await r.json();if(!r.ok)throw new Error(recipe.error||'Creator request failed');render()}catch(err){e('summary').textContent=err.message}finally{e('build').disabled=false;e('build').textContent='Build web implementation plan'}}
  function render(){e('mScreen').textContent=recipe.classification.screen;e('mComponents').textContent=recipe.components.length;e('mQuality').textContent=recipe.quality.passed+'/'+recipe.quality.total;e('summary').textContent=recipe.architecture.route+' · public preview → '+recipe.architecture.authEntry+' · '+recipe.navigation.previewModules.length+' modules visible before sign-in';e('gates').innerHTML=recipe.quality.gates.map(g=>'<div class="gate"><div><b>'+esc(g.label)+'</b><br><small>'+esc(g.detail)+'</small></div><b class="'+(g.pass?'pass':'warn')+'">'+(g.pass?'PASS':'CHECK')+'</b></div>').join('');e('raw').textContent=JSON.stringify(recipe,null,2);e('save').disabled=false;e('open').disabled=false}
  e('build').onclick=build;e('save').onclick=()=>{if(!recipe)return;const b=new Blob([JSON.stringify(recipe,null,2)],{type:'application/json'}),u=URL.createObjectURL(b),a=document.createElement('a');a.href=u;a.download='atlas-creator-web-recipe.json';a.click();setTimeout(()=>URL.revokeObjectURL(u),1000)};e('open').onclick=()=>{if(!recipe)return;localStorage.setItem('atlas.creator.web.recipe',JSON.stringify(recipe));location.href='/workbench'};
  </script></body></html>`;
}

export async function handleCreatorWebDirector(request){
  const url=new URL(request.url);
  if(url.pathname==='/api/studio/creator/web/capabilities'&&request.method==='GET')return json({service:'atlas-creator-web-director',version:1,externalProviders:[],capabilities:CAPABILITIES});
  if(url.pathname==='/api/studio/creator/web/recipe'&&request.method==='POST'){
    let body={};
    try{body=await request.json();}catch{return json({ok:false,error:'Request body must be valid JSON.'},400);}
    return json(buildWebRecipe(body));
  }
  if((url.pathname==='/studio/creator/web'||url.pathname==='/studio/web-director')&&request.method==='GET')return new Response(page(),{headers:HTML_HEADERS});
  return null;
}
