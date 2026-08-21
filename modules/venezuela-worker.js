const VE_PATHS=new Set(['/ve','/venezuela','/global/ve']);

const MODULES=[
  {id:'business',category:'operacion',title:'Business OS',eyebrow:'NÚCLEO EMPRESARIAL',desc:'Panel unificado para operaciones, documentos, proyectos y control de la organización.',route:'/dashboard',status:'Disponible en ATLAS Core',icon:'A'},
  {id:'accounting',category:'finanzas',title:'Accounting VE',eyebrow:'FINANZAS',desc:'Contabilidad y reporting preparados para configuración local venezolana y operación multimoneda.',route:'/finance',status:'Base disponible · capa fiscal por validar',icon:'$'},
  {id:'pay',category:'finanzas',title:'ATLAS Pay',eyebrow:'PAGOS',desc:'Orquestación de cobros y conciliación sobre proveedores autorizados, sin simular conexiones bancarias.',route:'/finance/ar',status:'Requiere proveedor autorizado',icon:'P'},
  {id:'pos',category:'operacion',title:'POS',eyebrow:'COMERCIO',desc:'Punto de venta conectado con inventario y operaciones dentro del ecosistema ATLAS.',route:'/operations/pos',status:'Workspace disponible',icon:'▦'},
  {id:'inventory',category:'operacion',title:'Inventario',eyebrow:'OPERACIONES',desc:'Productos, existencias y movimientos con separación por organización y fuente de datos.',route:'/operations/inventory',status:'Workspace disponible',icon:'□'},
  {id:'crm',category:'operacion',title:'CRM',eyebrow:'RELACIONES',desc:'Experiencia comercial conectada con ATLAS Connect para clientes, partners y comunicaciones.',route:'/connect',status:'ATLAS Connect disponible',icon:'C'},
  {id:'hr',category:'personas',title:'HR & Payroll',eyebrow:'PERSONAS',desc:'Empleados, evaluaciones y nómina integrados al núcleo de permisos y auditoría.',route:'/hr',status:'Workspace disponible',icon:'H'},
  {id:'marketplace',category:'verticales',title:'Marketplace',eyebrow:'COMERCIO DIGITAL',desc:'Capa de catálogo y comercio conectada con los flujos de movilidad y operaciones existentes.',route:'/marketplace',status:'Ruta disponible',icon:'M'},
  {id:'ride',category:'verticales',title:'Ride / Delivery',eyebrow:'MOVILIDAD',desc:'Logística, entregas y movilidad mediante el módulo ATLAS RideOS existente.',route:'/rideos',status:'RideOS disponible',icon:'R'},
  {id:'health',category:'verticales',title:'Health',eyebrow:'SALUD',desc:'Workspace de salud conectado al shell de ATLAS, sujeto a permisos y fuentes clínicas autorizadas.',route:'/health',status:'Workspace disponible',icon:'+'},
  {id:'education',category:'verticales',title:'Education',eyebrow:'EDUCACIÓN',desc:'Vertical académica prevista para matrícula, aprendizaje y gestión institucional dentro del mismo tenant.',route:null,status:'Integración pendiente',icon:'E'},
  {id:'ai',category:'operacion',title:'IA',eyebrow:'INTELIGENCIA',desc:'Conocimiento, análisis y asistencia sobre datos autorizados, sin fabricar métricas empresariales.',route:'/knowledge',status:'Knowledge Atlas disponible',icon:'✦'},
  {id:'security',category:'operacion',title:'Seguridad & Auditoría',eyebrow:'GOBERNANZA',desc:'Controles Zero Trust, trazabilidad, resiliencia y superficies administrativas del núcleo ATLAS.',route:'/security',status:'Workspace disponible',icon:'S'}
];

const CSS=`
:root{
  --bg:#030914;--bg2:#071425;--panel:#0a1a2c;--panel2:#0e233a;--gold:#f1b84b;--gold2:#ffd77e;
  --text:#f7f8fb;--muted:#aebbd0;--line:rgba(241,184,75,.28);--blue:#2f7fd6;--ok:#53d29a;
  --shadow:0 30px 80px rgba(0,0,0,.36);--radius:22px
}
*{box-sizing:border-box}
html{scroll-behavior:smooth;background:var(--bg)}
body{margin:0;background:
  radial-gradient(circle at 18% 8%,rgba(28,83,148,.24),transparent 32%),
  radial-gradient(circle at 78% 22%,rgba(241,184,75,.08),transparent 28%),
  linear-gradient(180deg,#020813 0%,#05101d 58%,#030914 100%);
  color:var(--text);font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;min-height:100vh}
a{color:inherit}.wrap{width:min(1180px,calc(100% - 40px));margin:auto}
.topbar{position:sticky;top:0;z-index:50;background:rgba(3,9,20,.78);backdrop-filter:blur(20px);border-bottom:1px solid rgba(255,255,255,.06)}
.topinner{height:74px;display:flex;align-items:center;gap:28px}
.brand{display:flex;align-items:center;gap:11px;text-decoration:none;min-width:max-content}.brandmark{width:39px;height:39px;position:relative;display:grid;place-items:center}
.brandmark:before,.brandmark:after{content:"";position:absolute;background:linear-gradient(180deg,var(--gold2),#c98b22);border-radius:2px}
.brandmark:before{width:8px;height:34px;transform:rotate(29deg);left:10px}.brandmark:after{width:8px;height:34px;transform:rotate(-29deg);right:10px}
.brandmark span{position:absolute;width:21px;height:5px;background:var(--gold);bottom:8px;border-radius:3px}
.brandname{font-size:19px;font-weight:760;letter-spacing:.12em}.brandname small{display:block;font-size:8px;color:#9daec7;letter-spacing:.22em;margin-top:2px}
.nav{display:flex;gap:22px;margin-left:auto;align-items:center}.nav a{text-decoration:none;color:#c7d1df;font-size:13px}.nav a:hover{color:white}
.nav .primary{padding:10px 16px;border:1px solid var(--line);border-radius:999px;color:#fff;background:linear-gradient(180deg,rgba(241,184,75,.14),rgba(241,184,75,.04))}
.menu{display:none;margin-left:auto;background:#0c1d30;border:1px solid #29425f;border-radius:11px;color:#fff;padding:9px 11px}
.hero{padding:76px 0 52px;position:relative;overflow:hidden}.hero:before{content:"";position:absolute;width:820px;height:820px;border:1px solid rgba(241,184,75,.13);border-radius:50%;right:-310px;top:-380px;box-shadow:0 0 0 100px rgba(70,120,190,.025),0 0 0 210px rgba(70,120,190,.018)}
.heroGrid{display:grid;grid-template-columns:1.02fr .98fr;gap:52px;align-items:center;position:relative;z-index:2}
.kicker{display:inline-flex;gap:8px;align-items:center;color:var(--gold2);font-weight:700;font-size:11px;letter-spacing:.16em;text-transform:uppercase}
.kicker:before{content:"";width:26px;height:1px;background:var(--gold)}
h1{font-size:clamp(46px,6vw,80px);line-height:.98;margin:16px 0 20px;letter-spacing:-.045em}
h1 .gold{color:var(--gold)}.lead{font-size:18px;line-height:1.7;color:#c1cde0;max-width:650px}.heroActions{display:flex;gap:12px;flex-wrap:wrap;margin-top:30px}
.btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;text-decoration:none;border-radius:12px;padding:13px 18px;font-weight:700;font-size:13px;border:1px solid #29425f;background:#0b1c2f;color:#fff;cursor:pointer}
.btn.gold{border-color:#e2aa3d;background:linear-gradient(180deg,#f1bd58,#d89a2e);color:#0b1421}.btn:hover{transform:translateY(-1px)}
.micro{margin-top:18px;color:#7f92ad;font-size:11px;line-height:1.5}
.device{border-radius:28px;padding:10px;background:linear-gradient(145deg,#1d2938,#05080e);box-shadow:var(--shadow);border:1px solid rgba(255,255,255,.12);transform:perspective(1200px) rotateY(-4deg) rotateX(1deg)}
.screen{background:#eef3f8;border-radius:19px;min-height:450px;overflow:hidden;color:#0b1730;display:grid;grid-template-columns:112px 1fr}
.mockSide{background:#07162a;color:#afc1d6;padding:16px 10px}.miniBrand{color:#fff;font-size:11px;font-weight:800;letter-spacing:.14em;margin-bottom:24px}.mockNav{display:grid;gap:8px}.mockNav span{font-size:8px;padding:7px;border-radius:7px;color:#9cb0c9}.mockNav .on{background:#164886;color:white}
.mockMain{padding:15px 16px 17px}.mockTop{display:flex;justify-content:space-between;align-items:center;font-size:9px;color:#5f7085}.mockTitle{font-size:17px;font-weight:800;margin:16px 0 4px}.mockSub{font-size:9px;color:#6b7a8a;margin-bottom:14px}
.kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}.kpi{background:#fff;border:1px solid #d9e2ec;border-radius:9px;padding:10px}.kpi small{display:block;font-size:7px;color:#798698}.kpi b{display:block;margin-top:7px;font-size:13px}.kpi em{display:block;font-style:normal;font-size:7px;color:#8c99a8;margin-top:5px}
.mockGrid{display:grid;grid-template-columns:1.3fr .9fr;gap:9px;margin-top:9px}.mockCard{background:white;border:1px solid #d9e2ec;border-radius:9px;padding:10px;min-height:112px}.mockCard strong{font-size:8px}.chartline{height:70px;margin-top:10px;position:relative;background:linear-gradient(180deg,transparent 24%,#eef2f6 25%,transparent 26%,transparent 49%,#eef2f6 50%,transparent 51%,transparent 74%,#eef2f6 75%,transparent 76%)}
.chartline svg{width:100%;height:100%}.ring{width:76px;height:76px;border:10px solid #dbe5ef;border-top-color:#2e79d2;border-right-color:#f0b848;border-radius:50%;margin:12px auto 0;display:grid;place-items:center;font-size:10px;font-weight:800}
.mockBottom{display:grid;grid-template-columns:1.2fr .8fr;gap:9px;margin-top:9px}.rows{display:grid;gap:7px;margin-top:9px}.row{height:10px;border-radius:7px;background:#edf2f6}.tiles{display:grid;grid-template-columns:repeat(2,1fr);gap:6px;margin-top:9px}.tile{height:31px;border-radius:7px;background:#f4f7fa;border:1px solid #e0e7ee}
.noData{color:#78899c;font-size:7px;margin-top:6px}
.section{padding:74px 0}.sectionHead{display:flex;justify-content:space-between;align-items:end;gap:24px;margin-bottom:28px}.sectionHead h2{font-size:clamp(32px,4vw,52px);margin:7px 0 0;letter-spacing:-.035em}.sectionHead p{max-width:500px;color:#98a9bf;line-height:1.6;font-size:13px}
.controls{display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin-bottom:18px}.search{flex:1;min-width:220px;background:#08182a;border:1px solid #223a57;border-radius:12px;padding:12px 14px;color:#fff;outline:none}.search:focus{border-color:#5a7da5}.pill{border:1px solid #243c59;background:#08182a;color:#aebed0;border-radius:999px;padding:10px 13px;font-size:11px;cursor:pointer}.pill.on{color:#111b27;background:var(--gold);border-color:var(--gold)}
.moduleGrid{display:grid;grid-template-columns:repeat(4,1fr);gap:14px}.moduleCard{border:1px solid rgba(116,150,188,.22);background:linear-gradient(160deg,rgba(13,31,52,.96),rgba(6,18,32,.96));border-radius:18px;padding:18px;min-height:206px;display:flex;flex-direction:column;transition:.18s}.moduleCard:hover{transform:translateY(-3px);border-color:rgba(241,184,75,.42);box-shadow:0 18px 44px rgba(0,0,0,.24)}
.moduleIcon{width:42px;height:42px;border-radius:12px;border:1px solid rgba(241,184,75,.32);display:grid;place-items:center;color:var(--gold);font-weight:800;background:rgba(241,184,75,.06)}.moduleCard small{color:#7890ae;font-size:9px;letter-spacing:.12em;margin-top:16px}.moduleCard h3{margin:7px 0 7px;font-size:18px}.moduleCard p{color:#9aacbf;font-size:12px;line-height:1.55;margin:0 0 18px}.moduleFoot{margin-top:auto;display:flex;justify-content:space-between;align-items:center;gap:10px}.status{font-size:9px;color:#7fb797}.openModule{border:0;background:none;color:#e7bd69;font-size:11px;font-weight:700;cursor:pointer;padding:0}.emptySearch{display:none;color:#9aacbf;border:1px dashed #31465d;border-radius:16px;padding:28px;text-align:center}
.local{display:grid;grid-template-columns:1fr 1fr;gap:18px;align-items:stretch}.localPanel{border:1px solid var(--line);border-radius:24px;background:linear-gradient(150deg,rgba(12,28,48,.95),rgba(7,18,32,.97));overflow:hidden;padding:28px;position:relative}.veVisual{min-height:410px;display:grid;place-items:center}
.veShape{width:min(390px,82%);aspect-ratio:1.35;position:relative;filter:drop-shadow(0 20px 40px rgba(0,0,0,.35))}
.veShape:before{content:"";position:absolute;inset:5%;background:
 radial-gradient(circle at 24% 38%,#f4c05a 0 2px,transparent 3px),
 radial-gradient(circle at 43% 29%,#f4c05a 0 2px,transparent 3px),
 radial-gradient(circle at 61% 42%,#f4c05a 0 2px,transparent 3px),
 radial-gradient(circle at 72% 61%,#f4c05a 0 2px,transparent 3px),
 radial-gradient(circle at 37% 63%,#f4c05a 0 2px,transparent 3px),
 linear-gradient(120deg,transparent 20%,rgba(241,184,75,.5) 21%,transparent 22%),
 linear-gradient(30deg,transparent 42%,rgba(241,184,75,.4) 43%,transparent 44%);
 border:1px solid rgba(241,184,75,.72);clip-path:polygon(4% 18%,18% 10%,37% 16%,51% 7%,71% 14%,94% 34%,86% 48%,91% 66%,75% 82%,54% 88%,41% 73%,26% 78%,18% 61%,6% 55%,11% 38%);
 background-color:rgba(18,48,78,.42)}
.veFlag{position:absolute;right:6%;bottom:5%;width:52px;height:52px;border-radius:50%;background:linear-gradient(#f5c93f 0 33%,#2349a0 33% 66%,#cc2d36 66%);border:3px solid #0b1727;box-shadow:0 8px 20px rgba(0,0,0,.3)}
.veLabel{position:absolute;left:7%;bottom:9%;font-weight:800;font-size:22px;letter-spacing:.1em}.veLabel small{display:block;color:#8fa3bc;font-size:9px;font-weight:600;letter-spacing:.16em;margin-top:7px}
.layerList{display:grid;gap:12px;margin-top:20px}.layer{display:flex;gap:13px;padding:15px;border:1px solid #213a56;border-radius:14px;background:rgba(3,13,24,.42)}.layerIcon{width:36px;height:36px;border-radius:10px;background:rgba(241,184,75,.08);border:1px solid rgba(241,184,75,.26);display:grid;place-items:center;color:var(--gold);font-weight:800}.layer b{display:block;font-size:13px}.layer span{display:block;color:#8fa2b9;font-size:11px;margin-top:4px;line-height:1.4}
.roadmap{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}.phase{position:relative;border:1px solid #213952;border-radius:18px;padding:21px;background:linear-gradient(160deg,#0c1d31,#07131f);min-height:170px}.phaseNum{width:38px;height:38px;border-radius:50%;display:grid;place-items:center;background:rgba(241,184,75,.1);border:1px solid rgba(241,184,75,.38);color:var(--gold);font-weight:800}.phase h3{font-size:16px;margin:18px 0 8px}.phase p{font-size:11px;color:#8fa2b7;line-height:1.5;margin:0}.phase:after{content:"";position:absolute;right:-13px;top:39px;width:13px;height:1px;background:#56687b}.phase:last-child:after{display:none}
.valueBand{display:grid;grid-template-columns:repeat(7,1fr);border:1px solid rgba(241,184,75,.25);border-radius:18px;overflow:hidden;background:#071423}.value{padding:17px 12px;text-align:center;border-right:1px solid rgba(241,184,75,.14)}.value:last-child{border:0}.value b{font-size:11px;display:block}.value span{font-size:9px;color:#7f93ac;display:block;margin-top:4px}
.cta{padding:64px 0 88px}.ctaBox{border:1px solid var(--line);border-radius:28px;padding:42px;background:
 radial-gradient(circle at 85% 20%,rgba(241,184,75,.16),transparent 25%),
 linear-gradient(135deg,#0d2238,#07131f);display:flex;justify-content:space-between;gap:28px;align-items:center}.ctaBox h2{margin:0;font-size:34px}.ctaBox p{margin:9px 0 0;color:#98a9be;max-width:650px;line-height:1.55}
.footer{border-top:1px solid rgba(255,255,255,.07);padding:25px 0 36px;color:#71859f;font-size:11px}.footerin{display:flex;justify-content:space-between;gap:20px;flex-wrap:wrap}
dialog{width:min(560px,calc(100% - 30px));border:1px solid #38506b;border-radius:20px;background:#091827;color:#fff;padding:0;box-shadow:0 30px 100px rgba(0,0,0,.6)}dialog::backdrop{background:rgba(1,6,13,.78);backdrop-filter:blur(5px)}.dialogIn{padding:25px}.dialogTop{display:flex;justify-content:space-between;gap:15px}.dialogTop button{border:0;background:#13283e;color:#fff;width:34px;height:34px;border-radius:9px;cursor:pointer}.dialogIn h3{font-size:26px;margin:9px 0}.dialogIn p{color:#9cafc5;line-height:1.6}.dialogStatus{display:inline-block;margin:8px 0 18px;padding:7px 10px;border-radius:999px;background:#0e2d29;color:#79d2ac;font-size:10px;border:1px solid #1f5346}
@media(max-width:1000px){.heroGrid{grid-template-columns:1fr}.device{max-width:720px;margin:auto;transform:none}.moduleGrid{grid-template-columns:repeat(2,1fr)}.local{grid-template-columns:1fr}.roadmap{grid-template-columns:1fr 1fr}.phase:after{display:none}.valueBand{grid-template-columns:repeat(4,1fr)}.value:nth-child(4){border-right:0}}
@media(max-width:720px){.wrap{width:min(100% - 24px,1180px)}.nav{display:none;position:absolute;left:12px;right:12px;top:66px;padding:14px;border:1px solid #243a54;background:#071524;border-radius:15px;flex-direction:column;align-items:stretch}.nav.open{display:flex}.menu{display:block}.hero{padding-top:48px}.heroGrid{gap:30px}.screen{grid-template-columns:78px 1fr;min-height:390px}.mockSide{padding:12px 7px}.kpis{grid-template-columns:1fr 1fr}.kpi:nth-child(n+3){display:none}.mockGrid,.mockBottom{grid-template-columns:1fr}.mockCard:nth-child(2),.mockBottom .mockCard:nth-child(2){display:none}.moduleGrid,.roadmap{grid-template-columns:1fr}.section{padding:56px 0}.sectionHead{display:block}.valueBand{grid-template-columns:1fr 1fr}.value:nth-child(even){border-right:0}.ctaBox{display:block;padding:28px}.ctaBox .heroActions{margin-top:22px}}
`;

function esc(value){return String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[ch]));}
function modulesMarkup(){
  return MODULES.map(m=>`<article class="moduleCard" data-category="${m.category}" data-search="${esc((m.title+' '+m.eyebrow+' '+m.desc).toLowerCase())}">
    <div class="moduleIcon">${esc(m.icon)}</div><small>${esc(m.eyebrow)}</small><h3>${esc(m.title)}</h3><p>${esc(m.desc)}</p>
    <div class="moduleFoot"><span class="status">${esc(m.status)}</span><button class="openModule" data-open="${esc(m.id)}">Ver módulo →</button></div>
  </article>`).join('');
}

function script(){
  const payload=JSON.stringify(MODULES);
  return `
const modules=${payload};
const nav=document.querySelector('#nav'),menu=document.querySelector('#menu');
menu?.addEventListener('click',()=>nav.classList.toggle('open'));
nav?.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>nav.classList.remove('open')));
const search=document.querySelector('#moduleSearch');
const pills=[...document.querySelectorAll('.pill')];
const cards=[...document.querySelectorAll('.moduleCard')];
const empty=document.querySelector('#emptySearch');
let category='todos';
function apply(){
  const q=(search?.value||'').trim().toLowerCase();let visible=0;
  cards.forEach(card=>{const okCategory=category==='todos'||card.dataset.category===category;const okSearch=!q||card.dataset.search.includes(q);const show=okCategory&&okSearch;card.hidden=!show;if(show)visible++;});
  if(empty)empty.style.display=visible?'none':'block';
}
search?.addEventListener('input',apply);
pills.forEach(p=>p.addEventListener('click',()=>{category=p.dataset.filter;pills.forEach(x=>x.classList.toggle('on',x===p));apply()}));
const dlg=document.querySelector('#moduleDialog'),title=document.querySelector('#dlgTitle'),body=document.querySelector('#dlgBody'),status=document.querySelector('#dlgStatus'),action=document.querySelector('#dlgAction');
document.querySelectorAll('[data-open]').forEach(btn=>btn.addEventListener('click',()=>{const m=modules.find(x=>x.id===btn.dataset.open);if(!m)return;title.textContent=m.title;body.textContent=m.desc;status.textContent=m.status;if(m.route){action.hidden=false;action.href=m.route;action.textContent='Abrir en ATLAS';}else{action.hidden=true;action.removeAttribute('href');}dlg?.showModal();}));
document.querySelector('#dlgClose')?.addEventListener('click',()=>dlg.close());
dlg?.addEventListener('click',e=>{if(e.target===dlg)dlg.close()});
document.querySelector('#year').textContent=new Date().getFullYear();
`;
}

function page(){
  return `<!doctype html><html lang="es-VE"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="theme-color" content="#030914"><meta name="description" content="ATLAS Venezuela: sistema operativo empresarial para operaciones, finanzas, pagos, personas y servicios.">
<title>ATLAS Venezuela · Sistema Operativo Empresarial</title><style>${CSS}</style></head>
<body>
<header class="topbar"><div class="wrap topinner"><a class="brand" href="/ve" aria-label="ATLAS Venezuela"><div class="brandmark"><span></span></div><div class="brandname">ATLAS <small>VENEZUELA</small></div></a>
<button class="menu" id="menu" aria-label="Abrir menú">☰</button><nav class="nav" id="nav"><a href="#producto">Producto</a><a href="#modulos">Módulos</a><a href="#venezuela">Venezuela</a><a href="#roadmap">Hoja de ruta</a><a class="primary" href="/dashboard">Entrar a ATLAS</a></nav></div></header>

<main>
<section class="hero" id="producto"><div class="wrap heroGrid"><div>
<div class="kicker">Edición Venezuela · ATLAS Global</div><h1>El sistema operativo <span class="gold">empresarial</span> para Venezuela.</h1>
<p class="lead">Una experiencia unificada para empresas, operaciones, contabilidad, pagos, personas y servicios. Diseñada sobre el núcleo existente de ATLAS y preparada para capas locales de moneda, fiscalidad, banca y cumplimiento.</p>
<div class="heroActions"><a class="btn gold" href="/dashboard">Abrir ATLAS</a><a class="btn" href="#modulos">Explorar módulos</a><a class="btn" href="/global">Ver ATLAS Global</a></div>
<p class="micro">La interfaz no inventa cifras operativas. Las métricas aparecen cuando una organización conecta una fuente de datos autorizada.</p>
</div>
<div class="device" aria-label="Vista conceptual del dashboard de ATLAS Venezuela"><div class="screen"><aside class="mockSide"><div class="miniBrand">ATLAS</div><div class="mockNav"><span class="on">Inicio</span><span>Finanzas</span><span>Ventas</span><span>Inventario</span><span>RRHH</span><span>Reportes</span></div></aside>
<div class="mockMain"><div class="mockTop"><span>ATLAS Venezuela</span><span>Organización · Sin datos conectados</span></div><div class="mockTitle">Bienvenido a ATLAS Venezuela</div><div class="mockSub">Tu centro de operación empresarial</div>
<div class="kpis"><div class="kpi"><small>Ingresos</small><b>—</b><em>Conectar fuente</em></div><div class="kpi"><small>Cobranzas</small><b>—</b><em>Conectar fuente</em></div><div class="kpi"><small>Gastos</small><b>—</b><em>Conectar fuente</em></div><div class="kpi"><small>Resultado</small><b>—</b><em>Conectar fuente</em></div></div>
<div class="mockGrid"><div class="mockCard"><strong>Actividad financiera</strong><div class="chartline"><svg viewBox="0 0 300 70" preserveAspectRatio="none"><path d="M0 58 C45 49 58 53 92 40 S145 48 178 31 S232 33 300 14" fill="none" stroke="#2d7ad4" stroke-width="3"/><path d="M0 60 C55 57 75 43 112 50 S180 42 212 46 S263 38 300 40" fill="none" stroke="#e8ad3d" stroke-width="2"/></svg></div><div class="noData">Vista preparada · datos reales al conectar la organización</div></div>
<div class="mockCard"><strong>Distribución</strong><div class="ring">—</div><div class="noData" style="text-align:center">Sin fuente conectada</div></div></div>
<div class="mockBottom"><div class="mockCard"><strong>Actividad reciente</strong><div class="rows"><div class="row"></div><div class="row"></div><div class="row"></div><div class="row"></div></div></div><div class="mockCard"><strong>Módulos rápidos</strong><div class="tiles"><div class="tile"></div><div class="tile"></div><div class="tile"></div><div class="tile"></div></div></div></div>
</div></div></div></div></section>

<section class="section" id="modulos"><div class="wrap"><div class="sectionHead"><div><div class="kicker">Una plataforma</div><h2>Todo tu negocio, conectado.</h2></div><p>Los módulos reutilizan las rutas y servicios existentes de ATLAS. Cuando una función local todavía requiere proveedor, regulación o persistencia específica, la página lo indica en lugar de fingir que ya está conectada.</p></div>
<div class="controls"><input class="search" id="moduleSearch" type="search" placeholder="Buscar módulos..." aria-label="Buscar módulos"><button class="pill on" data-filter="todos">Todos</button><button class="pill" data-filter="operacion">Operación</button><button class="pill" data-filter="finanzas">Finanzas</button><button class="pill" data-filter="personas">Personas</button><button class="pill" data-filter="verticales">Verticales</button></div>
<div class="moduleGrid">${modulesMarkup()}</div><div class="emptySearch" id="emptySearch">No hay módulos que coincidan con la búsqueda.</div></div></section>

<section class="section" id="venezuela"><div class="wrap local"><div class="localPanel veVisual"><div class="veShape"><div class="veLabel">VENEZUELA<small>ATLAS COUNTRY LAYER · VE</small></div><div class="veFlag" aria-hidden="true"></div></div></div>
<div class="localPanel"><div class="kicker">Capa país</div><h2 style="font-size:38px;margin:13px 0 8px">Hecho para operar en Venezuela.</h2><p style="color:#93a5bb;line-height:1.6;font-size:13px">La edición venezolana se monta sobre ATLAS Global. El país ya está registrado como VE, con locale es-VE y moneda base VES. Las reglas fiscales, bancarias y de cumplimiento permanecen sujetas a validación e integraciones autorizadas.</p>
<div class="layerList"><div class="layer"><div class="layerIcon">$</div><div><b>Moneda y multimoneda</b><span>VES como moneda local base, con arquitectura preparada para operaciones multimoneda.</span></div></div>
<div class="layer"><div class="layerIcon">F</div><div><b>Fiscalidad VE</b><span>Configuración local versionada. No se fijan tasas o reglas sin fuente normativa validada.</span></div></div>
<div class="layer"><div class="layerIcon">B</div><div><b>Banca y pagos</b><span>Integración únicamente mediante proveedores y credenciales autorizadas.</span></div></div>
<div class="layer"><div class="layerIcon">S</div><div><b>Cumplimiento y auditoría</b><span>Roles, permisos, trazabilidad y separación de datos por organización.</span></div></div></div></div></div></section>

<section class="section" id="roadmap"><div class="wrap"><div class="sectionHead"><div><div class="kicker">Hoja de ruta</div><h2>Construir por capas, no por islas.</h2></div><p>La secuencia prioriza una base empresarial útil antes de ampliar pagos y verticales reguladas.</p></div>
<div class="roadmap"><div class="phase"><div class="phaseNum">1</div><h3>ERP + POS</h3><p>Operación central, finanzas, inventario, RR. HH., documentos y punto de venta.</p></div><div class="phase"><div class="phaseNum">2</div><h3>ATLAS Pay</h3><p>Pagos, cobranzas y conciliación sobre integraciones financieras autorizadas.</p></div><div class="phase"><div class="phaseNum">3</div><h3>Marketplace + Delivery</h3><p>Comercio digital conectado a catálogo, inventario, movilidad y logística.</p></div><div class="phase"><div class="phaseNum">4</div><h3>Verticales</h3><p>Salud, educación y nuevos sectores sobre el mismo núcleo de identidad y auditoría.</p></div></div>
<div class="valueBand" style="margin-top:18px"><div class="value"><b>Multimoneda</b><span>VES + monedas configurables</span></div><div class="value"><b>Pagos</b><span>Proveedores autorizados</span></div><div class="value"><b>Nómina</b><span>Personas y procesos</span></div><div class="value"><b>Inventario</b><span>Operación conectada</span></div><div class="value"><b>IA</b><span>Datos autorizados</span></div><div class="value"><b>Auditoría</b><span>Trazabilidad</span></div><div class="value"><b>Escalable</b><span>Country layer global</span></div></div>
</div></section>

<section class="cta"><div class="wrap"><div class="ctaBox"><div><div class="kicker">ATLAS Venezuela</div><h2>Una plataforma. Todo tu negocio.</h2><p>La edición Venezuela se integra al ecosistema ATLAS existente. No es un segundo producto ni un repositorio paralelo.</p></div><div class="heroActions"><a class="btn gold" href="/dashboard">Entrar al dashboard</a><a class="btn" href="/global/ve">Abrir edición VE</a></div></div></div></section>
</main>

<footer class="footer"><div class="wrap footerin"><span>© <span id="year"></span> ATLAS Enterprise Suite · Venezuela</span><span>Country layer VE · es-VE · VES · Cumplimiento local sujeto a validación</span></div></footer>

<dialog id="moduleDialog"><div class="dialogIn"><div class="dialogTop"><div><div class="kicker">Módulo ATLAS</div><h3 id="dlgTitle">Módulo</h3></div><button id="dlgClose" aria-label="Cerrar">×</button></div><span class="dialogStatus" id="dlgStatus"></span><p id="dlgBody"></p><a class="btn gold" id="dlgAction" href="/dashboard">Abrir en ATLAS</a></div></dialog>
<script>${script()}</script></body></html>`;
}

export function handleVenezuela(request){
  const url=new URL(request.url);
  const clean=url.pathname.replace(/\/+$/,'')||'/';
  if(!VE_PATHS.has(clean))return null;
  return new Response(page(),{headers:{'content-type':'text/html; charset=utf-8','cache-control':'public, max-age=300','x-atlas-country':'VE'}});
}

export {MODULES as VENEZUELA_MODULES};
