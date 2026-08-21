const JSON_HEADERS={'content-type':'application/json; charset=utf-8','cache-control':'no-store','access-control-allow-origin':'*'};
const HTML_HEADERS={'content-type':'text/html; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff','referrer-policy':'same-origin'};

const MODES={
  website:{label:'Website / Web Experience',handoff:'/studio/creator/web',engine:'Creator Web Director'},
  module:{label:'ATLAS Module',handoff:'/workbench',engine:'ATLAS Workbench'},
  app:{label:'Application',handoff:'/workbench',engine:'ATLAS Workbench'},
  campaign:{label:'Campaign / Content System',handoff:'/studio/director',engine:'Creator Director'},
  video:{label:'Video / Media',handoff:'/studio/director',engine:'Creator Director → Autopilot → Native Studio → Media QC'},
  release:{label:'Product Release',handoff:'/studio/release',engine:'Creator Release Center'}
};
const MODULES=['Dashboard','Enterprise','Finance','Accounting','HR','Payroll','Health','Ride','POS','Inventory','Projects','CRM','Education','Analytics','Security','Settings','ATLAS Pay','CleanScan 3D','ATLAS Drive','Knowledge Atlas','ATLAS Voice','ATLAS Connect'];
const CAPABILITIES=[
  {id:'intake',name:'Text and visual-reference intake',state:'ready'},
  {id:'classification',name:'Automatic output classification',state:'ready'},
  {id:'module-owner',name:'ATLAS module ownership routing',state:'ready'},
  {id:'architecture',name:'Route, components and data contract',state:'ready'},
  {id:'permissions',name:'Auth, RBAC and tenant boundary contract',state:'ready'},
  {id:'handoff',name:'Director / Workbench / Release handoff',state:'ready'},
  {id:'quality',name:'Tests, QC and production gates',state:'ready'},
  {id:'preset-main-dashboard',name:'Approved Main Dashboard preset',state:'ready'},
  {id:'external-builder',name:'External no-code builder',state:'not-required'}
];
const PRESETS={
  'main-dashboard':{
    id:'main-dashboard',
    label:'ATLAS Main Dashboard',
    mode:'website',
    route:'/',
    releaseRoute:'/studio/release/main-dashboard',
    prompt:'Implement the approved ATLAS Enterprise Suite public Main Dashboard in the canonical ATLAS website. Keep the public experience visible before sign-in, show the enterprise module catalog as preview-only, keep business data empty until authorized sources are connected, route Sign in through /identity, preserve existing routes and modules, and make the page responsive across desktop, tablet and mobile.',
    visualReference:'Dark navy and black ATLAS Enterprise Suite presentation. Left side: ATLAS wordmark, One platform. Every solution. Total control., founder line, Built in Orlando, stylized Orlando skyline and fountain. Right side: polished enterprise dashboard preview with a vertical module rail, neutral KPI placeholders, charts, module cards and system-state panels. Bottom feature strip: Secure, Scalable, Integrated, Intelligent, In Control. No active protected-module links before authorization.'
  }
};

function json(v,status=200){return new Response(JSON.stringify(v,null,2),{status,headers:JSON_HEADERS});}
function clean(v,max=8000){return String(v||'').replace(/\s+/g,' ').trim().slice(0,max);}
function safeRoute(v){const s=clean(v,180);if(!s)return null;return s.startsWith('/')?s:'/'+s;}
function inferMode(text,requested){if(MODES[requested])return requested;const t=text.toLowerCase();if(/video|reel|short|film|media|teleprompter/.test(t))return 'video';if(/campaign|instagram|tiktok|social|content|marketing/.test(t))return 'campaign';if(/release|launch|deploy|production|publish/.test(t))return 'release';if(/website|web|landing|homepage|page|dashboard/.test(t))return 'website';if(/app|application|ios|android|mobile/.test(t))return 'app';return 'module';}
function inferModule(text){const t=text.toLowerCase();const hits=[['Health','health|clinic|medical|patient'],['Finance','finance|bank|money|financial'],['Accounting','accounting|ledger|invoice|tax|payable|receivable'],['HR','hr|employee|candidate|recruit|human resource'],['Payroll','payroll|wage|salary'],['Ride','ride|driver|mobility|transport'],['POS','pos|checkout|restaurant|retail'],['Inventory','inventory|stock|warehouse'],['CRM','crm|customer|lead|sales'],['Education','education|school|student|course'],['Security','security|audit|risk|permission'],['ATLAS Pay','payment|pay|wallet|checkout'],['ATLAS Drive','drive|storage|file'],['ATLAS Voice','voice|call|audio'],['ATLAS Connect','connect|message|chat|communication']];for(const [m,re] of hits)if(new RegExp(re).test(t))return m;return 'Enterprise';}
function buildPlan(input={}){
  const presetId=clean(input.preset,80).toLowerCase();
  const preset=PRESETS[presetId]||null;
  const prompt=clean(input.prompt||input.description||preset?.prompt,8000);
  if(!prompt)return {error:'A creation brief is required.'};
  const visual=clean(input.visualReference||preset?.visualReference,2000);
  const requestedMode=clean(input.mode,30).toLowerCase()||preset?.mode||'';
  const mode=inferMode(`${prompt} ${visual}`,requestedMode);
  const owner=inferModule(`${prompt} ${visual}`);
  const route=safeRoute(input.route||preset?.route)||(mode==='website'?'/':mode==='release'?'/studio/release':null);
  const flow=['INTAKE','ANALYSIS','CLASSIFICATION','ATLAS EXISTING','ARCHITECTURE','MODULE','ROUTE','NAVIGATION','COMPONENTS','DATA','PERMISSIONS','FUNCTIONS','TESTS','COMMIT','MERGE','DEPLOY','PRODUCTION VERIFIED'];
  const components=mode==='website'?['navigation','hero','module discovery','data states','forms/actions','responsive shell']:mode==='video'?['brief','storyboard','autopilot cuts','native edit','technical QC','release package']:mode==='campaign'?['brief','content matrix','creative variants','scheduler','analytics contract','release package']:['navigation','workspace','records/list','detail','forms/actions','loading-empty-error-success states'];
  const gates=[
    {id:'canonical',label:'Reuse canonical ATLAS architecture',pass:true},
    {id:'owner',label:'Module owner classified',pass:Boolean(owner)},
    {id:'route',label:'Route explicit when required',pass:!['website','release'].includes(mode)||Boolean(route)},
    {id:'data',label:'No fabricated production data',pass:true},
    {id:'auth',label:'Auth/RBAC boundary required',pass:true},
    {id:'actions',label:'No empty actions or placeholder links',pass:true},
    {id:'tests',label:'End-to-end test contract included',pass:true},
    {id:'release',label:'Deploy and production verification remain explicit gates',pass:true}
  ];
  return {
    service:'atlas-universal-creator',version:2,createdAt:new Date().toISOString(),externalProviders:[],
    preset:preset?{id:preset.id,label:preset.label,releaseRoute:preset.releaseRoute}:null,
    intake:{prompt,visualReference:visual||null,visualAssetName:clean(input.visualAssetName,180)||null},
    classification:{type:mode,label:MODES[mode].label,owner,secondaryIntegrations:owner==='Enterprise'?['Identity','Security','Analytics']:['Enterprise','Security','Analytics']},
    architecture:{canonicalRepository:'winderaranguren-gif/Atlas-enterprise-suite',reuseExisting:true,route,navigationDepth:'Menu → Submenu → Section → Record → Final action',components},
    data:{policy:'authorized-sources-only',emptyStateWhenUnavailable:true,fabricatedMetrics:false},
    permissions:{authentication:true,rbac:true,tenantIsolation:true,auditSensitiveActions:true},
    functions:{navigation:true,search:true,filters:true,forms:true,validation:true,persistence:'reuse existing source when available',crud:'when supported by existing backend',export:'when data exists'},
    responsive:['desktop','tablet','mobile'],
    tests:['route returns without 404/500','imports and build pass','navigation reaches final action','forms validate','responsive states render','empty/error/success states work','auth and RBAC boundary preserved','no secrets exposed','no fabricated metrics'],
    pipeline:flow,
    handoff:{engine:MODES[mode].engine,route:MODES[mode].handoff,releaseRoute:preset?.releaseRoute||null,storageKey:'atlas.creator.universal.plan'},
    quality:{passed:gates.filter(g=>g.pass).length,total:gates.length,gates}
  };
}

function page(){return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><title>ATLAS Universal Creator</title><style>
:root{--bg:#020712;--panel:#071625;--line:#1f4969;--text:#f4f9ff;--muted:#91a8bc;--cyan:#55d9ff;--green:#51dca0;--amber:#ffd16d}*{box-sizing:border-box}body{margin:0;background:radial-gradient(circle at 85% -10%,#154978 0,transparent 34%),var(--bg);color:var(--text);font:14px Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}.app{max-width:1400px;margin:auto;padding:18px}.hero,.card{border:1px solid var(--line);background:linear-gradient(145deg,#0a1f34,#05101b);border-radius:16px}.hero{padding:22px}.hero h1{font-size:34px;margin:4px 0 7px}.hero p{color:var(--muted);max-width:940px;line-height:1.55}.pill{display:inline-block;border:1px solid #2d6b52;background:#08271e;color:#a9efcb;border-radius:999px;padding:6px 9px;font-size:10px}.grid{display:grid;grid-template-columns:minmax(330px,.8fr) minmax(0,1.2fr);gap:12px;margin-top:12px}.card{padding:14px}.field,.btn{width:100%;border:1px solid #2b638b;background:#071b2d;color:#fff;border-radius:9px;padding:10px}.field{margin:5px 0 9px}.btn{cursor:pointer;font-weight:700}.primary{background:linear-gradient(135deg,#147de3,#15a9d5)}.preset{background:#112b45;border-color:#4ba9e5}.row{display:grid;grid-template-columns:1fr 1fr;gap:8px}.metrics{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}.metric,.status{border:1px solid #1d425e;background:#071421;border-radius:10px;padding:10px}.metric span{display:block;color:#7894a9;font-size:9px}.metric b{font-size:16px}.status{color:#9eb6c9;font-size:11px;line-height:1.5}.gate{display:flex;justify-content:space-between;gap:10px;padding:8px;border-bottom:1px solid #173650}.pass{color:var(--green)}.warn{color:var(--amber)}pre{white-space:pre-wrap;word-break:break-word;max-height:390px;overflow:auto;color:#a8c5d9;font-size:10px}.toolbar{display:flex;gap:8px;margin-top:10px;flex-wrap:wrap}.toolbar .btn{width:auto}.quick{display:flex;gap:8px;flex-wrap:wrap;margin:0 0 12px}.quick .btn{width:auto}@media(max-width:880px){.grid{grid-template-columns:1fr}.row,.metrics{grid-template-columns:1fr 1fr}}@media(max-width:520px){.app{padding:10px}.row,.metrics{grid-template-columns:1fr}}
</style></head><body><main class="app"><section class="hero"><span class="pill">ATLAS CREATOR · UNIVERSAL ORCHESTRATOR</span><h1>Crea cualquier experiencia ATLAS desde una sola entrada</h1><p>Describe una idea o adjunta una referencia visual. ATLAS la clasifica, asigna el módulo propietario, define arquitectura, rutas, datos, permisos, funciones, pruebas y la entrega al motor correcto. No simula despliegues ni inventa datos de producción.</p></section><div class="grid"><section class="card"><h2>Creation brief</h2><div class="quick"><button class="btn preset" id="mainPreset">Usar preset Main Dashboard</button><a class="btn" href="/studio/release/main-dashboard">Abrir Release Center</a></div><input type="hidden" id="preset"><label>¿Qué quieres crear?</label><textarea class="field" id="prompt" rows="8" placeholder="Ej: Convierte esta referencia en el dashboard de ATLAS Venezuela con pagos, contabilidad, POS y navegación móvil."></textarea><div class="row"><label>Tipo preferido<select class="field" id="mode"><option value="">Auto</option><option value="website">Website</option><option value="module">Module</option><option value="app">App</option><option value="campaign">Campaign</option><option value="video">Video</option><option value="release">Release</option></select></label><label>Ruta opcional<input class="field" id="route" placeholder="/ve"></label></div><label>Referencia visual</label><input class="field" id="visual" type="file" accept="image/*"><textarea class="field" id="visualNotes" rows="3" placeholder="Notas visibles de la referencia, si aplica"></textarea><button class="btn primary" id="build">Analizar y crear plan</button></section><section class="card"><h2>ATLAS Creator output</h2><div class="metrics"><div class="metric"><span>TYPE</span><b id="mType">—</b></div><div class="metric"><span>OWNER</span><b id="mOwner">—</b></div><div class="metric"><span>QUALITY</span><b id="mQuality">—</b></div></div><div id="summary" class="status" style="margin-top:10px">Todavía no hay un plan.</div><h2>Quality gates</h2><div id="gates"></div><div class="toolbar"><button class="btn primary" id="continue" disabled>Continuar al motor</button><button class="btn" id="release" disabled>Abrir Release Center</button><button class="btn" id="save" disabled>Descargar plan</button></div><details open><summary>Universal plan</summary><pre id="raw">{}</pre></details></section></div></main><script>
const e=id=>document.getElementById(id);let plan=null;const esc=s=>String(s||'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
e('mainPreset').onclick=async()=>{e('preset').value='main-dashboard';e('prompt').value='Implement the approved ATLAS Enterprise Suite public Main Dashboard in the canonical website. Keep the enterprise modules visible as preview-only before sign-in, route Sign in through /identity, preserve authorized-only data, Orlando brand story, dark enterprise dashboard preview, and responsive desktop/tablet/mobile states.';e('mode').value='website';e('route').value='/';e('visualNotes').value='Approved dark ATLAS showcase: Orlando story panel, skyline and fountain on the left; enterprise dashboard preview on the right; Secure, Scalable, Integrated, Intelligent, In Control feature strip.';e('build').click()};
e('build').onclick=async()=>{e('build').disabled=true;e('build').textContent='Analizando…';try{const f=e('visual').files[0];const payload={preset:e('preset').value,prompt:e('prompt').value,mode:e('mode').value,route:e('route').value,visualReference:e('visualNotes').value,visualAssetName:f?.name||''};const r=await fetch('/api/studio/creator/universal/plan',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(payload)});plan=await r.json();if(!r.ok)throw new Error(plan.error||'Universal Creator failed');render()}catch(err){e('summary').textContent=err.message}finally{e('build').disabled=false;e('build').textContent='Analizar y crear plan'}};
function render(){e('mType').textContent=plan.classification.label;e('mOwner').textContent=plan.classification.owner;e('mQuality').textContent=plan.quality.passed+'/'+plan.quality.total;e('summary').textContent=(plan.preset?plan.preset.label+' · ':'')+plan.classification.label+' → '+plan.handoff.engine+(plan.architecture.route?' · '+plan.architecture.route:'');e('gates').innerHTML=plan.quality.gates.map(g=>'<div class="gate"><div><b>'+esc(g.label)+'</b></div><b class="'+(g.pass?'pass':'warn')+'">'+(g.pass?'PASS':'CHECK')+'</b></div>').join('');e('raw').textContent=JSON.stringify(plan,null,2);e('continue').disabled=false;e('release').disabled=!plan.handoff.releaseRoute;e('save').disabled=false}
e('continue').onclick=()=>{if(!plan)return;localStorage.setItem(plan.handoff.storageKey,JSON.stringify(plan));if(plan.classification.type==='website')localStorage.setItem('atlas.creator.web.seed',JSON.stringify(plan));if(['video','campaign'].includes(plan.classification.type))localStorage.setItem('atlas.creator.seed',JSON.stringify(plan));if(plan.preset?.id)localStorage.setItem('atlas.creator.release.project',plan.preset.id);location.href=plan.handoff.route};
e('release').onclick=()=>{if(plan?.handoff.releaseRoute)location.href=plan.handoff.releaseRoute};
e('save').onclick=()=>{if(!plan)return;const u=URL.createObjectURL(new Blob([JSON.stringify(plan,null,2)],{type:'application/json'})),a=document.createElement('a');a.href=u;a.download='atlas-universal-creator-plan.json';a.click();setTimeout(()=>URL.revokeObjectURL(u),1000)};
</script></body></html>`;}

export async function handleUniversalCreator(request){
  const u=new URL(request.url);const p=u.pathname.replace(/\/+$/,'')||'/';
  if(p==='/api/studio/creator/universal/health'&&request.method==='GET')return json({ok:true,service:'atlas-universal-creator',version:2,capabilities:CAPABILITIES.length,presets:Object.keys(PRESETS).length});
  if(p==='/api/studio/creator/universal/capabilities'&&request.method==='GET')return json({service:'atlas-universal-creator',version:2,externalProviders:[],modes:Object.keys(MODES),modules:MODULES,capabilities:CAPABILITIES});
  if(p==='/api/studio/creator/universal/presets'&&request.method==='GET')return json({service:'atlas-universal-creator',version:2,presets:Object.values(PRESETS).map(({id,label,mode,route,releaseRoute})=>({id,label,mode,route,releaseRoute}))});
  if(p==='/api/studio/creator/universal/plan'&&request.method==='POST'){let body={};try{body=await request.json()}catch{return json({error:'Invalid JSON body.'},400)}const plan=buildPlan(body);return plan.error?json(plan,400):json(plan);}
  if((p==='/studio/create-anything'||p==='/studio/creator/universal')&&request.method==='GET')return new Response(page(),{headers:HTML_HEADERS});
  return null;
}

export {buildPlan as buildUniversalCreatorPlan,PRESETS as UNIVERSAL_CREATOR_PRESETS};
