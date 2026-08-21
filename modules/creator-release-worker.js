const JSON_HEADERS={'content-type':'application/json; charset=utf-8','cache-control':'no-store','access-control-allow-origin':'*'};
const HTML_HEADERS={'content-type':'text/html; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff','referrer-policy':'same-origin'};

const REPO='winderaranguren-gif/Atlas-enterprise-suite';
const WORKFLOW='deploy-cloudflare-direct.yml';
const PROJECTS={
  venezuela:{
    id:'venezuela',name:'ATLAS Venezuela',country:'VE',locale:'es-VE',currency:'VES',
    route:'/ve',aliases:['/venezuela','/global/ve'],
    modules:['Business OS','Accounting VE','ATLAS Pay','POS','Inventario','CRM','HR & Payroll','Marketplace','Ride / Delivery','Health','Education','IA','Seguridad & Auditoría'],
    creative:{
      mode:'corporate',duration:45,format:'16:9',tone:'premium, clear, modern, enterprise',
      hook:'Una plataforma. Todo tu negocio. Hecho para Venezuela.',
      script:'ATLAS Venezuela conecta empresa, contabilidad, pagos, punto de venta, inventario, talento, comercio, logística, salud, educación e inteligencia artificial en un solo ecosistema. La edición Venezuela utiliza la arquitectura global de ATLAS con capas locales para moneda, fiscalidad, banca y cumplimiento. Las integraciones reguladas permanecen explícitamente condicionadas a proveedores y validación autorizada.',
      cta:'Conoce ATLAS Venezuela y explora la plataforma.'
    }
  }
};

function json(value,status=200){return new Response(JSON.stringify(value,null,2),{status,headers:JSON_HEADERS});}
function safeProject(id){return PROJECTS[String(id||'venezuela').toLowerCase()]||null;}

async function githubReleaseStatus(){
  const endpoint=`https://api.github.com/repos/${REPO}/actions/workflows/${WORKFLOW}/runs?branch=main&per_page=1`;
  try{
    const r=await fetch(endpoint,{headers:{accept:'application/vnd.github+json','user-agent':'ATLAS-Creator-Release-Center/1.0'}});
    if(!r.ok)return {available:false,status:'unavailable',httpStatus:r.status};
    const data=await r.json();const run=data.workflow_runs?.[0];
    if(!run)return {available:true,status:'no-run'};
    return {available:true,status:run.status,conclusion:run.conclusion||null,headSha:run.head_sha||null,updatedAt:run.updated_at||null,url:run.html_url||null,runNumber:run.run_number||null};
  }catch{return {available:false,status:'unavailable'};}
}

function releaseContract(project){
  return {
    project:{id:project.id,name:project.name,country:project.country,locale:project.locale,currency:project.currency,route:project.route,aliases:project.aliases,modules:project.modules},
    source:{repository:REPO,branch:'main',workflow:WORKFLOW},
    gates:[
      {id:'architecture',label:'Integrado al ATLAS canónico',state:'ready'},
      {id:'country-layer',label:'Capa país VE / es-VE / VES',state:'ready'},
      {id:'routes',label:'Rutas Venezuela registradas',state:'ready'},
      {id:'creator',label:'ATLAS Creator Director + Production',state:'ready'},
      {id:'cloudflare-auth',label:'Autenticación Cloudflare',state:'external-check'},
      {id:'production',label:'Ruta /ve verificada en producción',state:'live-check'}
    ],
    policy:{simulateDeploy:false,requiresAuthorizedProvider:true,fabricatedMetrics:false}
  };
}

function page(project){
  const modules=project.modules.map(m=>`<span class="chip">${m}</span>`).join('');
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><title>ATLAS Creator · Release Center</title><style>
  :root{--bg:#030712;--panel:#081524;--panel2:#0c1e31;--line:#214968;--text:#f7fbff;--muted:#91a9bd;--cyan:#64ddff;--blue:#2f9cff;--green:#52dca1;--amber:#ffd06a;--red:#ff7880;--gold:#e5b454}*{box-sizing:border-box}body{margin:0;background:radial-gradient(circle at 82% -8%,#123d6b 0,transparent 35%),var(--bg);color:var(--text);font:14px Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}.shell{max-width:1380px;margin:auto;padding:18px}.top{display:flex;gap:10px;align-items:center;margin-bottom:12px}.brand{font-weight:900;letter-spacing:.18em}.top a{color:#bfeeff;text-decoration:none}.top .links{margin-left:auto;display:flex;gap:8px;flex-wrap:wrap}.btn{display:inline-flex;align-items:center;justify-content:center;border:1px solid #2e6c96;background:#0b2b47;color:#fff;border-radius:9px;padding:10px 13px;text-decoration:none;cursor:pointer}.btn.primary{background:linear-gradient(135deg,#1478d4,#18a9d4);border-color:#45c8ed}.btn.gold{background:#382b12;border-color:#826429;color:#ffe1a2}.hero,.card{border:1px solid var(--line);border-radius:17px;background:linear-gradient(145deg,var(--panel2),var(--panel))}.hero{padding:24px;display:flex;gap:20px;align-items:flex-start}.hero h1{font-size:34px;margin:5px 0 8px}.hero p{color:var(--muted);max-width:820px;line-height:1.55;margin:0}.eyebrow{font-size:10px;letter-spacing:.13em;color:var(--cyan)}.badge{display:inline-block;border:1px solid #3a715c;background:#0b2b22;color:#a7f0ce;padding:6px 9px;border-radius:999px;font-size:10px}.grid{display:grid;grid-template-columns:1.1fr .9fr;gap:12px;margin-top:12px}.card{padding:16px}.card h2{font-size:15px;margin:0 0 11px}.gates{display:grid;gap:8px}.gate{display:flex;justify-content:space-between;gap:12px;border-bottom:1px solid #18364e;padding:9px 0}.state{font-size:10px;font-weight:800}.ready{color:var(--green)}.check{color:var(--amber)}.fail{color:var(--red)}.meta{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}.metric{border:1px solid #183e5b;background:#06121f;border-radius:10px;padding:11px}.metric span{display:block;color:#7895aa;font-size:9px}.metric b{display:block;margin-top:5px}.chips{display:flex;gap:7px;flex-wrap:wrap}.chip{border:1px solid #214d6d;background:#071a2b;color:#bfeaff;border-radius:999px;padding:6px 9px;font-size:10px}.brief{white-space:pre-wrap;color:#c9d8e5;line-height:1.55}.notice{border:1px solid #775d2b;background:#30250f;color:#ffe1a2;padding:11px;border-radius:10px;line-height:1.45}.actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}.log{min-height:86px;border:1px solid #183b56;background:#05101c;border-radius:10px;padding:10px;color:#90a9bc;font:11px ui-monospace,SFMono-Regular,Menlo,monospace;white-space:pre-wrap}.route{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;color:#8eeaff}@media(max-width:820px){.grid{grid-template-columns:1fr}.hero{display:block}.meta{grid-template-columns:1fr}.top{align-items:flex-start}.top .links{margin-left:0}.top{flex-wrap:wrap}.shell{padding:10px}}
  </style></head><body><main class="shell"><header class="top"><div class="brand">ATLAS CREATOR</div><div class="links"><a class="btn" href="/studio">Studio</a><a class="btn" href="/studio/director">Director</a><a class="btn" href="/studio/production">Production</a><a class="btn" href="/dashboard">Dashboard</a></div></header>
  <section class="hero"><div><span class="eyebrow">RELEASE CENTER · COUNTRY LAUNCH</span><h1>${project.name}</h1><p>Centro de lanzamiento de ATLAS Creator para coordinar producto, contenido y verificación de producción. Este panel no simula despliegues: consulta el estado real disponible y deja cualquier credencial o proveedor externo como una dependencia explícita.</p></div><div><span class="badge">${project.country} · ${project.locale} · ${project.currency}</span></div></section>
  <section class="grid"><article class="card"><h2>Release gates</h2><div class="gates"><div class="gate"><span>Integrado al ATLAS canónico</span><b class="state ready">READY</b></div><div class="gate"><span>Rutas Venezuela</span><b class="state ready">READY</b></div><div class="gate"><span>Creator Director + Production</span><b class="state ready">READY</b></div><div class="gate"><span>Cloudflare authentication</span><b class="state check" id="cfState">CHECK</b></div><div class="gate"><span>Producción <span class="route">/ve</span></span><b class="state check" id="prodState">CHECK</b></div></div><div class="actions"><button class="btn primary" id="recheck">Revisar producción</button><a class="btn" href="${project.route}">Abrir ${project.route}</a><a class="btn" id="workflow" target="_blank" rel="noreferrer" style="display:none">Abrir workflow</a></div></article>
  <article class="card"><h2>Estado del release</h2><div class="meta"><div class="metric"><span>REPOSITORY</span><b>${REPO}</b></div><div class="metric"><span>BRANCH</span><b>main</b></div><div class="metric"><span>WORKFLOW</span><b>${WORKFLOW}</b></div></div><div style="height:10px"></div><div id="statusLog" class="log">Consultando ATLAS release state…</div></article></section>
  <section class="grid"><article class="card"><h2>Módulos de ${project.name}</h2><div class="chips">${modules}</div><div style="height:12px"></div><div class="notice">Las métricas operativas permanecen vacías hasta conectar fuentes autorizadas. Fiscalidad, banca, pagos regulados y cumplimiento se mantienen como capas sujetas a validación local y proveedores autorizados.</div></article>
  <article class="card"><h2>ATLAS Creator launch package</h2><div class="brief"><b>Hook:</b> ${project.creative.hook}\n\n<b>Formato:</b> ${project.creative.format} · ${project.creative.duration}s\n\n<b>CTA:</b> ${project.creative.cta}</div><div class="actions"><button class="btn gold" id="buildVideo">Crear plan en Creator Director</button><button class="btn" id="copyBrief">Copiar brief</button></div></article></section>
  </main><script>
  const project=${JSON.stringify(project)};const log=document.getElementById('statusLog');const prod=document.getElementById('prodState');const cf=document.getElementById('cfState');const wf=document.getElementById('workflow');
  function setState(el,label,cls){el.textContent=label;el.className='state '+cls}
  async function check(){log.textContent='Consultando workflow y ruta de producción…';setState(prod,'CHECK','check');setState(cf,'CHECK','check');let lines=[];try{const r=await fetch('/api/studio/release/status?project='+encodeURIComponent(project.id),{cache:'no-store'});const s=await r.json();const g=s.github||{};lines.push('Workflow: '+(g.status||'unavailable')+(g.conclusion?' / '+g.conclusion:''));lines.push('Commit: '+(g.headSha||'unknown'));if(g.url){wf.href=g.url;wf.style.display='inline-flex'}if(g.conclusion==='success')setState(cf,'PASS','ready');else if(g.conclusion==='failure')setState(cf,'BLOCKED','fail');else setState(cf,'PENDING','check')}catch(e){lines.push('Workflow: unavailable')}
    try{const r=await fetch(project.route+'?atlas_release_check='+Date.now(),{cache:'no-store'});const text=await r.text();const live=r.ok&&text.includes('ATLAS Venezuela');setState(prod,live?'LIVE':'NOT LIVE',live?'ready':'fail');lines.push('Production '+project.route+': '+(live?'verified':'not verified'));}catch(e){setState(prod,'UNREACHABLE','fail');lines.push('Production '+project.route+': unreachable')}log.textContent=lines.join('\n')}
  document.getElementById('recheck').onclick=check;document.getElementById('copyBrief').onclick=async()=>{const text=[project.creative.hook,project.creative.script,project.creative.cta].join('\n\n');try{await navigator.clipboard.writeText(text);log.textContent='Launch brief copied.'}catch{log.textContent=text}};
  document.getElementById('buildVideo').onclick=async()=>{log.textContent='ATLAS Creator Director está construyendo el plan…';try{const r=await fetch('/api/studio/director/recipe',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(project.creative)});const recipe=await r.json();if(!r.ok)throw new Error(recipe.error||'Creator Director failed');localStorage.setItem('atlas.creator.recipe',JSON.stringify(recipe));localStorage.setItem('atlas.creator.release.project',project.id);location.href='/studio/production';}catch(e){log.textContent='Creator Director: '+e.message}};check();
  </script></body></html>`;
}

export async function handleCreatorRelease(request){
  const url=new URL(request.url);const path=url.pathname.replace(/\/+$/,'')||'/';
  if(path==='/api/studio/release/projects'&&request.method==='GET')return json({service:'atlas-creator-release',projects:Object.values(PROJECTS).map(p=>({id:p.id,name:p.name,country:p.country,route:p.route}))});
  if(path==='/api/studio/release/status'&&request.method==='GET'){
    const project=safeProject(url.searchParams.get('project'));if(!project)return json({ok:false,error:'unknown_project'},404);
    const github=url.searchParams.get('offline')==='1'?{available:false,status:'offline-validation'}:await githubReleaseStatus();
    return json({ok:true,service:'atlas-creator-release',...releaseContract(project),github,time:new Date().toISOString()});
  }
  if((path==='/studio/release'||path==='/studio/release/venezuela')&&request.method==='GET')return new Response(page(PROJECTS.venezuela),{headers:HTML_HEADERS});
  if(path.startsWith('/api/studio/release/')||path.startsWith('/studio/release'))return json({ok:false,error:'not_found'},404);
  return null;
}

export {PROJECTS,releaseContract};
