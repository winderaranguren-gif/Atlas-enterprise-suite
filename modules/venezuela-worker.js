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
  {id:'education',category:'verticales',title:'Education',eyebrow:'EDUCACIÓN',desc:'Formación, contenidos y aprendizaje conectados al Knowledge Atlas y a los flujos de personas.',route:'/knowledge/training',status:'Knowledge Atlas disponible',icon:'E'},
  {id:'ai',category:'operacion',title:'IA',eyebrow:'INTELIGENCIA',desc:'Conocimiento, análisis y asistencia sobre datos autorizados, sin fabricar métricas empresariales.',route:'/knowledge',status:'Knowledge Atlas disponible',icon:'✦'},
  {id:'security',category:'operacion',title:'Seguridad & Auditoría',eyebrow:'GOBERNANZA',desc:'Controles Zero Trust, trazabilidad, resiliencia y superficies administrativas del núcleo ATLAS.',route:'/security',status:'Workspace disponible',icon:'S'}
];

const PILLARS=[
  {id:'mobility',label:'Movilidad',icon:'⌁',route:'/rideos',copy:'Transporte, delivery, flotas, rutas y operación urbana conectada.'},
  {id:'finance',label:'Finanzas',icon:'▥',route:'/finance',copy:'Contabilidad, tesorería, cobros, pagos, conciliación y control financiero.'},
  {id:'health',label:'Salud',icon:'♡',route:'/health',copy:'Experiencia de salud, coordinación, teleatención y espacios inteligentes.'},
  {id:'housing',label:'Vivienda',icon:'⌂',route:null,copy:'Planeación urbana, vivienda, mantenimiento, servicios y expedientes de infraestructura.'},
  {id:'energy',label:'Energía',icon:'ϟ',route:null,copy:'Planeación y observabilidad de energía para empresas, ciudades e infraestructura.'},
  {id:'water',label:'Agua',icon:'◉',route:null,copy:'Gestión operacional de agua, mantenimiento, incidencias y continuidad de servicio.'},
  {id:'education',label:'Educación',icon:'▤',route:'/knowledge/training',copy:'Aprendizaje, capacitación, conocimiento institucional y desarrollo de talento.'},
  {id:'security',label:'Seguridad',icon:'⬡',route:'/security',copy:'Zero Trust, auditoría, monitoreo, resiliencia y permisos por organización.'},
  {id:'community',label:'Comunidad',icon:'◎',route:'/connect',copy:'Conexión entre personas, empresas, instituciones, organizaciones y servicios.'},
  {id:'commerce',label:'Comercio',icon:'▦',route:'/operations/pos',copy:'POS, inventario, marketplace, ventas y operación comercial integrada.'},
  {id:'rescue',label:'Rescate',icon:'✚',route:null,copy:'Coordinación operativa para incidencias, emergencias y respuesta institucional.'},
  {id:'tourism',label:'Turismo',icon:'⌖',route:'/marketplace',copy:'Destinos, comercio, movilidad, experiencias y operación turística conectada.'}
];

const CITIES=[
  ['Caracas','Ávila Smart Metropolis','Núcleo nacional'],
  ['Maracaibo','Lake & Bridge of Progress','Movilidad + energía'],
  ['Valencia','Industry & Innovation','Industria + comercio'],
  ['La Guaira','Smart Port & Coast','Logística + turismo'],
  ['Mérida','Mountains of Opportunity','Educación + innovación'],
  ['Zulia','Energy & Lake Future','Energía + infraestructura'],
  ['Los Roques & Choroní','Natural Paradise','Turismo + sostenibilidad']
];

const CSS=`
:root{
  color-scheme:dark;
  --bg:#020712;--bg2:#051225;--panel:#08182a;--panel2:#0c2238;--text:#f7fbff;--muted:#9ab2c9;
  --blue:#39b8ff;--blue2:#1479dc;--cyan:#76e6ff;--gold:#f2c64d;--red:#dc3545;--line:rgba(83,190,255,.25);
  --glass:rgba(5,22,42,.74);--shadow:0 28px 90px rgba(0,0,0,.48)
}
*{box-sizing:border-box}
html{scroll-behavior:smooth;background:var(--bg)}
body{margin:0;min-height:100vh;color:var(--text);font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;
background:
radial-gradient(circle at 50% 8%,rgba(24,126,213,.22),transparent 35%),
radial-gradient(circle at 18% 44%,rgba(242,198,77,.06),transparent 24%),
linear-gradient(180deg,#020612 0%,#06152a 45%,#020710 100%)}
a{color:inherit}.wrap{width:min(1240px,calc(100% - 34px));margin:auto}
.skip{position:absolute;left:-9999px;top:10px;background:white;color:#001;padding:10px 14px;border-radius:8px;z-index:100}.skip:focus{left:10px}
.topbar{position:sticky;top:0;z-index:80;border-bottom:1px solid rgba(110,204,255,.14);background:rgba(2,8,18,.76);backdrop-filter:blur(22px)}
.topinner{height:72px;display:flex;align-items:center;gap:24px}.brand{display:flex;align-items:center;gap:11px;text-decoration:none}
.brandmark{width:40px;height:40px;position:relative;filter:drop-shadow(0 0 15px rgba(57,184,255,.35))}
.brandmark:before,.brandmark:after{content:"";position:absolute;bottom:3px;width:8px;height:35px;border-radius:3px;background:linear-gradient(180deg,#c6f4ff,#2ca9ff)}
.brandmark:before{left:11px;transform:rotate(27deg)}.brandmark:after{right:11px;transform:rotate(-27deg)}
.brandmark i{position:absolute;bottom:8px;left:10px;right:10px;height:4px;border-radius:4px;background:#69d8ff}
.brandname{font-weight:760;letter-spacing:.18em;font-size:16px}.brandname small{display:block;margin-top:2px;color:#70cfff;font-size:7px;letter-spacing:.24em}
.nav{display:flex;align-items:center;gap:20px;margin-left:auto}.nav a{text-decoration:none;color:#a9bfd1;font-size:12px}.nav a:hover,.nav a:focus-visible{color:white}
.nav .enter{padding:10px 15px;border:1px solid rgba(88,194,255,.38);border-radius:11px;background:rgba(9,47,79,.62);color:#fff}
.menu{display:none;margin-left:auto;border:1px solid #275378;background:#07192b;color:white;border-radius:10px;padding:9px 11px}

.poster{position:relative;min-height:880px;overflow:hidden;border-bottom:1px solid rgba(75,179,240,.15);
background:
linear-gradient(116deg,rgba(242,198,77,.17) 0 10%,transparent 10.2%),
linear-gradient(122deg,transparent 0 16%,rgba(32,76,171,.2) 16.1% 22%,transparent 22.2%),
linear-gradient(128deg,transparent 0 22%,rgba(211,45,57,.15) 22.1% 27%,transparent 27.2%),
radial-gradient(circle at 54% 18%,rgba(48,170,255,.3),transparent 23%),
linear-gradient(180deg,#082446 0%,#0b3153 27%,#123c58 50%,#071b2c 72%,#020811 100%)}
.poster:before{content:"";position:absolute;inset:-8% -4% auto -4%;height:54%;opacity:.46;background:
repeating-radial-gradient(circle at 54% 32%,transparent 0 54px,rgba(95,211,255,.34) 55px 56px,transparent 57px 89px),
linear-gradient(90deg,transparent 49.8%,rgba(119,220,255,.28) 50%,transparent 50.2%)}
.poster:after{content:"";position:absolute;left:0;right:0;bottom:0;height:44%;background:
radial-gradient(ellipse at 50% 78%,rgba(35,167,255,.28),transparent 24%),
linear-gradient(180deg,rgba(2,9,17,0),rgba(1,6,13,.68) 65%,#01050b 100%)}
.posterInner{position:relative;z-index:3;width:min(1440px,100%);margin:auto;min-height:880px}
.hudRail{position:absolute;top:82px;width:190px;display:grid;gap:10px;z-index:8}.hudRail.left{left:20px}.hudRail.right{right:20px}
.hudBtn{appearance:none;text-align:left;border:1px solid rgba(75,188,255,.53);border-radius:9px;padding:12px 13px;background:linear-gradient(120deg,rgba(8,36,62,.92),rgba(7,24,45,.7));
color:#fff;box-shadow:inset 0 0 24px rgba(32,149,226,.08),0 0 22px rgba(0,137,226,.08);cursor:pointer;transition:.18s;display:flex;align-items:center;gap:12px}
.hudBtn:hover,.hudBtn:focus-visible{transform:translateX(3px);border-color:#76d9ff;background:linear-gradient(120deg,rgba(12,63,103,.96),rgba(7,31,58,.86))}
.right .hudBtn:hover,.right .hudBtn:focus-visible{transform:translateX(-3px)}
.hudIcon{width:35px;height:35px;border:1px solid rgba(112,214,255,.47);border-radius:8px;display:grid;place-items:center;color:#b9efff;font-size:18px;background:rgba(24,112,171,.15)}
.hudBtn b{font-size:12px;font-weight:650}.hudBtn span{display:block;color:#77a9c8;font-size:8px;margin-top:2px}

.heroCopy{position:relative;z-index:7;width:min(740px,calc(100% - 430px));margin:auto;text-align:center;padding-top:95px}
.flagArc{height:92px;margin:auto;width:420px;max-width:82vw;position:relative;opacity:.82;filter:drop-shadow(0 10px 20px rgba(0,0,0,.2))}
.flagArc:before{content:"";position:absolute;inset:8px;border-radius:50% 50% 8% 8%;transform:skewX(-11deg);background:linear-gradient(180deg,#f6c63a 0 33%,#244da4 33% 66%,#c92d3e 66%);
clip-path:polygon(0 20%,100% 0,95% 70%,0 100%);opacity:.86}
.heroEyebrow{margin-top:12px;color:#99dfff;font-size:10px;letter-spacing:.28em;text-transform:uppercase}
.atlasWord{font-size:clamp(52px,7.3vw,94px);line-height:.82;font-weight:230;letter-spacing:.17em;margin:12px 0 0;text-shadow:0 0 25px rgba(64,191,255,.38)}
.future{font-size:clamp(16px,2vw,26px);letter-spacing:.5em;margin-left:.5em;color:#e8f7ff;margin-top:12px}
.venezuela{font-size:clamp(36px,5.6vw,72px);line-height:.94;letter-spacing:.05em;margin:9px 0 0;font-weight:780}
.tagline{margin:12px auto 0;color:#f5d972;letter-spacing:.12em;font-size:clamp(12px,1.35vw,17px)}
.heroActions{display:flex;justify-content:center;gap:10px;flex-wrap:wrap;margin-top:23px}
.btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;text-decoration:none;border:1px solid rgba(104,207,255,.32);background:rgba(6,30,52,.72);border-radius:11px;padding:12px 16px;font-size:12px;font-weight:700}
.btn.primary{background:linear-gradient(180deg,#35baff,#127ed8);border-color:#53c9ff;color:#00111e}.btn:hover,.btn:focus-visible{filter:brightness(1.08)}

.drone{position:absolute;z-index:4;top:182px;right:28%;width:96px;height:26px;border-radius:50%;border:2px solid rgba(177,230,255,.9);background:linear-gradient(180deg,#b9e3fa,#336986 55%,#0d2839);box-shadow:0 12px 30px rgba(0,0,0,.35)}
.drone:before,.drone:after{content:"";position:absolute;top:-12px;width:50px;height:4px;background:#a4defc;border-radius:50%;box-shadow:0 0 0 2px rgba(57,136,183,.4)}
.drone:before{left:-36px;transform:rotate(12deg)}.drone:after{right:-36px;transform:rotate(-12deg)}
.drone i{position:absolute;left:40px;top:6px;width:14px;height:9px;border-radius:50%;background:#6adeff;box-shadow:0 0 12px #48c8ff}

.cityStage{position:absolute;z-index:4;left:0;right:0;bottom:92px;height:350px}
.mountain{position:absolute;left:27%;right:23%;bottom:116px;height:188px;background:linear-gradient(145deg,#1b3c51,#17344a 52%,#0f293f);
clip-path:polygon(0 100%,14% 60%,27% 72%,43% 17%,55% 55%,66% 40%,79% 73%,100% 44%,100% 100%);opacity:.95;filter:drop-shadow(0 18px 30px rgba(0,0,0,.35))}
.waterfront{position:absolute;left:2%;right:2%;bottom:0;height:125px;border-radius:50% 50% 0 0;background:linear-gradient(180deg,rgba(38,141,189,.44),rgba(9,54,85,.72) 44%,#071e31);box-shadow:inset 0 17px 55px rgba(55,199,255,.18)}
.skyline{position:absolute;left:17%;right:14%;bottom:85px;height:205px;display:flex;align-items:end;justify-content:center;gap:5px;filter:drop-shadow(0 15px 30px rgba(0,0,0,.5))}
.tower{width:22px;background:linear-gradient(90deg,#0a2133,#2a5876 55%,#102c43);border:1px solid rgba(89,194,243,.25);box-shadow:inset 0 0 20px rgba(53,174,238,.08);position:relative}
.tower:after{content:"";position:absolute;inset:8px 4px;background:repeating-linear-gradient(180deg,rgba(118,213,255,.7) 0 2px,transparent 2px 10px);opacity:.6}
.tower:nth-child(2n){width:30px}.tower:nth-child(3n){width:17px}.tower:nth-child(1){height:62px}.tower:nth-child(2){height:100px}.tower:nth-child(3){height:78px}.tower:nth-child(4){height:132px}.tower:nth-child(5){height:92px}.tower:nth-child(6){height:170px}.tower:nth-child(7){height:126px}.tower:nth-child(8){height:196px}.tower:nth-child(9){height:145px}.tower:nth-child(10){height:182px}.tower:nth-child(11){height:108px}.tower:nth-child(12){height:151px}.tower:nth-child(13){height:87px}.tower:nth-child(14){height:122px}.tower:nth-child(15){height:70px}
.arena{position:absolute;left:50%;bottom:32px;transform:translateX(-50%);width:260px;height:92px;border:2px solid rgba(74,195,255,.66);border-radius:50%;background:
radial-gradient(ellipse,rgba(38,178,255,.34) 0 22%,rgba(8,53,88,.82) 23% 47%,rgba(2,19,34,.8) 48% 62%,rgba(57,190,255,.25) 63% 65%,transparent 66%);
box-shadow:0 0 45px rgba(27,162,242,.28)}
.flagPole{position:absolute;left:50%;bottom:87px;width:2px;height:112px;background:#bce9ff}.flagPole:after{content:"";position:absolute;top:0;left:2px;width:66px;height:38px;background:linear-gradient(#f5c63d 0 33%,#244ca4 33% 66%,#ce3140 66%);clip-path:polygon(0 0,100% 16%,87% 100%,0 79%);box-shadow:0 5px 13px rgba(0,0,0,.3)}
.bridge{position:absolute;left:4%;bottom:70px;width:260px;height:76px;border-top:4px solid #6aa2bb;transform:rotate(-1deg)}.bridge:before,.bridge:after{content:"";position:absolute;bottom:0;width:4px;height:95px;background:#8cb5c8}.bridge:before{left:35px}.bridge:after{right:45px}
.bridge i{position:absolute;inset:0;background:linear-gradient(77deg,transparent 0 13%,#5f899d 13.3% 14%,transparent 14.3% 78%,#5f899d 78.3% 79%,transparent 79.3%)}
.wind{position:absolute;right:5%;bottom:70px;width:245px;height:100px;display:flex;justify-content:space-around;align-items:end}.wind span{width:2px;height:80px;background:#b7e5f4;position:relative}.wind span:before,.wind span:after{content:"";position:absolute;top:0;left:-25px;width:52px;height:2px;background:#d7f5ff}.wind span:before{transform:rotate(22deg)}.wind span:after{transform:rotate(-22deg)}

.cityLabels{position:absolute;z-index:6;inset:auto 0 76px 0;pointer-events:none}.cityTag{position:absolute;color:#f2f8fb;text-shadow:0 2px 8px rgba(0,0,0,.7);font-size:10px;font-weight:700;letter-spacing:.03em}.cityTag small{display:block;color:#9bc8df;font-size:7px;font-weight:500;margin-top:2px}.cityTag:nth-child(1){left:45%;bottom:178px}.cityTag:nth-child(2){left:8%;bottom:132px}.cityTag:nth-child(3){left:12%;bottom:30px}.cityTag:nth-child(4){right:7%;bottom:140px}.cityTag:nth-child(5){left:18%;bottom:-12px}.cityTag:nth-child(6){right:15%;bottom:25px}.cityTag:nth-child(7){right:3%;bottom:-12px}

.bottomSeal{position:absolute;z-index:7;left:50%;bottom:18px;transform:translateX(-50%);width:210px;text-align:center}
.veMap{width:140px;height:78px;margin:auto;position:relative;filter:drop-shadow(0 0 16px rgba(38,178,255,.4))}
.veMap:before{content:"";position:absolute;inset:3px;background:
radial-gradient(circle at 22% 39%,#8ce6ff 0 2px,transparent 3px),
radial-gradient(circle at 44% 25%,#8ce6ff 0 2px,transparent 3px),
radial-gradient(circle at 58% 45%,#8ce6ff 0 2px,transparent 3px),
radial-gradient(circle at 72% 58%,#8ce6ff 0 2px,transparent 3px),
linear-gradient(120deg,transparent 28%,rgba(64,192,255,.65) 29%,transparent 30%),
linear-gradient(25deg,transparent 45%,rgba(64,192,255,.5) 46%,transparent 47%);
background-color:rgba(18,98,151,.38);border:1px solid #69cfff;clip-path:polygon(4% 18%,18% 10%,37% 16%,51% 7%,71% 14%,94% 34%,86% 48%,91% 66%,75% 82%,54% 88%,41% 73%,26% 78%,18% 61%,6% 55%,11% 38%)}
.bottomSeal b{font-size:11px;letter-spacing:.18em}.bottomSeal span{display:block;color:#75c8f6;font-size:8px;margin-top:3px}
.posterFoot{position:absolute;z-index:7;left:20px;right:20px;bottom:18px;display:flex;justify-content:space-between;color:#b7d7e7;font-size:10px;letter-spacing:.05em}
.posterFoot div{width:190px;padding:10px 12px;border:1px solid rgba(65,177,237,.24);background:rgba(2,15,27,.62)}.posterFoot b{display:block;color:white}.posterFoot .rightText{text-align:right}

.section{padding:78px 0}.sectionHead{display:flex;justify-content:space-between;align-items:end;gap:24px;margin-bottom:28px}.sectionHead h2{margin:6px 0 0;font-size:clamp(32px,4.2vw,54px);letter-spacing:-.04em}.sectionHead p{max-width:530px;color:var(--muted);font-size:13px;line-height:1.65}
.kicker{color:#79d7ff;font-size:10px;font-weight:800;letter-spacing:.18em;text-transform:uppercase}
.pillarGrid{display:grid;grid-template-columns:repeat(6,1fr);gap:12px}.pillarCard{border:1px solid var(--line);border-radius:16px;padding:17px;background:linear-gradient(155deg,rgba(10,35,58,.94),rgba(4,17,31,.98));min-height:160px;cursor:pointer;color:white;text-align:left;transition:.18s}
.pillarCard:hover,.pillarCard:focus-visible{transform:translateY(-3px);border-color:#70d8ff;box-shadow:0 18px 50px rgba(0,0,0,.25)}.pillarGlyph{width:39px;height:39px;border:1px solid rgba(113,216,255,.34);border-radius:11px;display:grid;place-items:center;color:#a9ebff;background:rgba(32,130,191,.12);font-size:18px}
.pillarCard h3{margin:15px 0 6px;font-size:14px}.pillarCard p{margin:0;color:#86a5bb;font-size:10px;line-height:1.5}

.network{border:1px solid rgba(68,175,237,.25);border-radius:28px;padding:28px;background:
radial-gradient(circle at 50% 50%,rgba(25,131,207,.2),transparent 36%),
linear-gradient(145deg,#07182a,#03101f);position:relative;overflow:hidden}
.network:before{content:"";position:absolute;inset:0;background:repeating-radial-gradient(circle at 50% 54%,transparent 0 72px,rgba(69,175,236,.09) 73px 74px,transparent 75px 115px);pointer-events:none}
.networkGrid{position:relative;z-index:2;display:grid;grid-template-columns:1fr 1.2fr;gap:28px;align-items:center}.networkMap{min-height:390px;position:relative;display:grid;place-items:center}.mapLarge{width:min(520px,96%);aspect-ratio:1.45;position:relative;filter:drop-shadow(0 30px 55px rgba(0,0,0,.45))}
.mapLarge:before{content:"";position:absolute;inset:5%;border:1px solid #66ccff;background:
radial-gradient(circle at 18% 38%,#d3f7ff 0 3px,transparent 4px),
radial-gradient(circle at 35% 23%,#d3f7ff 0 3px,transparent 4px),
radial-gradient(circle at 51% 31%,#d3f7ff 0 3px,transparent 4px),
radial-gradient(circle at 68% 48%,#d3f7ff 0 3px,transparent 4px),
radial-gradient(circle at 45% 65%,#d3f7ff 0 3px,transparent 4px),
radial-gradient(circle at 79% 63%,#d3f7ff 0 3px,transparent 4px),
linear-gradient(115deg,transparent 25%,rgba(65,188,251,.5) 26%,transparent 27%),
linear-gradient(40deg,transparent 42%,rgba(65,188,251,.38) 43%,transparent 44%);
background-color:rgba(14,95,151,.32);clip-path:polygon(4% 18%,18% 10%,37% 16%,51% 7%,71% 14%,94% 34%,86% 48%,91% 66%,75% 82%,54% 88%,41% 73%,26% 78%,18% 61%,6% 55%,11% 38%);box-shadow:inset 0 0 60px rgba(52,181,255,.15)}
.cityList{display:grid;gap:9px}.cityRow{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:13px 14px;border:1px solid rgba(92,187,241,.16);border-radius:12px;background:rgba(3,18,33,.58)}
.cityRow b{font-size:12px}.cityRow small{display:block;color:#7ca0b7;margin-top:3px;font-size:9px}.cityRow span{color:#7ed8ff;font-size:9px;text-align:right}

.controls{display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin-bottom:18px}.search{flex:1;min-width:220px;background:#071829;border:1px solid #254969;border-radius:12px;padding:12px 14px;color:#fff;outline:none}.search:focus{border-color:#62c8ff}.pill{border:1px solid #284d6d;background:#071829;color:#a9bfd1;border-radius:999px;padding:10px 13px;font-size:11px;cursor:pointer}.pill.on{color:#001521;background:#63d1ff;border-color:#63d1ff}
.moduleGrid{display:grid;grid-template-columns:repeat(4,1fr);gap:14px}.moduleCard{border:1px solid rgba(92,185,240,.2);background:linear-gradient(160deg,rgba(11,34,57,.96),rgba(5,18,32,.98));border-radius:18px;padding:18px;min-height:212px;display:flex;flex-direction:column;transition:.18s}.moduleCard:hover{transform:translateY(-3px);border-color:rgba(99,210,255,.52);box-shadow:0 18px 44px rgba(0,0,0,.24)}
.moduleIcon{width:42px;height:42px;border-radius:12px;border:1px solid rgba(97,211,255,.32);display:grid;place-items:center;color:#a9ebff;font-weight:800;background:rgba(44,150,215,.08)}.moduleCard small{color:#6fa7c8;font-size:9px;letter-spacing:.12em;margin-top:16px}.moduleCard h3{margin:7px 0 7px;font-size:18px}.moduleCard p{color:#8fa9bc;font-size:12px;line-height:1.55;margin:0 0 18px}.moduleFoot{margin-top:auto;display:flex;justify-content:space-between;align-items:center;gap:10px}.status{font-size:9px;color:#7fd6b0}.openModule{border:0;background:none;color:#76d7ff;font-size:11px;font-weight:700;cursor:pointer;padding:0}.emptySearch{display:none;color:#9aacbf;border:1px dashed #31465d;border-radius:16px;padding:28px;text-align:center}

.systemBand{border:1px solid rgba(85,187,244,.22);border-radius:24px;background:linear-gradient(135deg,rgba(7,29,49,.97),rgba(4,17,29,.98));padding:28px;display:grid;grid-template-columns:1.1fr .9fr;gap:22px}
.systemBand h2{font-size:38px;line-height:1.05;margin:10px 0}.systemBand p{color:#91acc0;font-size:13px;line-height:1.65}.dataState{border:1px solid rgba(87,184,238,.18);border-radius:17px;padding:20px;background:#041423;display:grid;gap:11px}
.stateRow{display:flex;justify-content:space-between;gap:12px;border-bottom:1px solid rgba(109,190,233,.1);padding-bottom:10px}.stateRow:last-child{border-bottom:0;padding-bottom:0}.stateRow span{color:#779bb2;font-size:10px}.stateRow b{font-size:10px;color:#dff6ff}

.cta{padding:0 0 86px}.ctaBox{border:1px solid rgba(87,193,252,.3);border-radius:27px;padding:38px;background:radial-gradient(circle at 83% 15%,rgba(54,178,246,.18),transparent 28%),linear-gradient(135deg,#08223a,#04111e);display:flex;justify-content:space-between;gap:28px;align-items:center}.ctaBox h2{margin:6px 0 0;font-size:34px}.ctaBox p{color:#8eaabd;line-height:1.55;font-size:12px;max-width:680px}
.footer{border-top:1px solid rgba(88,180,234,.12);padding:25px 0 34px;color:#6e8ba0;font-size:10px}.footerin{display:flex;justify-content:space-between;gap:18px;flex-wrap:wrap}

dialog{width:min(560px,calc(100% - 28px));border:1px solid #37698d;border-radius:20px;background:#071827;color:#fff;padding:0;box-shadow:0 30px 100px rgba(0,0,0,.65)}dialog::backdrop{background:rgba(1,6,13,.82);backdrop-filter:blur(6px)}.dialogIn{padding:25px}.dialogTop{display:flex;justify-content:space-between;gap:15px}.dialogTop button{border:0;background:#112c43;color:#fff;width:34px;height:34px;border-radius:9px;cursor:pointer}.dialogIn h3{font-size:26px;margin:9px 0}.dialogIn p{color:#9cafc5;line-height:1.6}.dialogStatus{display:inline-block;margin:8px 0 18px;padding:7px 10px;border-radius:999px;background:#0d2f36;color:#86e4ff;font-size:10px;border:1px solid #1b5264}

@media(max-width:1160px){
 .poster{min-height:960px}.posterInner{min-height:960px}.hudRail{top:590px;width:auto;grid-template-columns:repeat(6,1fr);left:20px!important;right:20px!important}.hudRail.right{top:682px}.hudBtn{padding:9px}.hudIcon{width:28px;height:28px}.hudBtn b{font-size:10px}.hudBtn span{display:none}
 .heroCopy{width:min(720px,calc(100% - 40px));padding-top:76px}.cityStage{bottom:176px}.posterFoot{display:none}.bottomSeal{bottom:18px}
 .pillarGrid{grid-template-columns:repeat(3,1fr)}.moduleGrid{grid-template-columns:repeat(3,1fr)}
}
@media(max-width:820px){
 .nav{display:none;position:absolute;left:12px;right:12px;top:64px;padding:14px;border:1px solid #244866;background:#061727;border-radius:14px;flex-direction:column;align-items:stretch}.nav.open{display:flex}.menu{display:block}
 .poster{min-height:1050px}.posterInner{min-height:1050px}.heroCopy{padding-top:56px}.flagArc{height:68px}.drone{display:none}
 .cityStage{bottom:258px;height:300px}.bridge,.wind{opacity:.65}.cityLabels{display:none}
 .hudRail{top:715px;grid-template-columns:repeat(3,1fr);gap:7px}.hudRail.right{top:862px}.hudBtn{min-width:0}.hudBtn b{font-size:9px}.hudIcon{display:none}
 .bottomSeal{bottom:16px}.pillarGrid{grid-template-columns:repeat(2,1fr)}.networkGrid,.systemBand{grid-template-columns:1fr}.moduleGrid{grid-template-columns:repeat(2,1fr)}.sectionHead{display:block}.section{padding:58px 0}.ctaBox{display:block}
}
@media(max-width:560px){
 .wrap{width:min(100% - 22px,1240px)}.poster{min-height:1110px}.posterInner{min-height:1110px}.atlasWord{letter-spacing:.1em}.future{letter-spacing:.32em}.tagline{letter-spacing:.06em}
 .cityStage{bottom:322px;height:250px}.skyline{left:5%;right:5%;transform:scale(.82);transform-origin:bottom}.arena{width:210px}.mountain{left:5%;right:5%}.bridge,.wind{display:none}
 .hudRail{top:690px;grid-template-columns:repeat(2,1fr)}.hudRail.right{top:900px}.hudBtn{padding:10px 9px}.bottomSeal{bottom:20px}
 .pillarGrid,.moduleGrid{grid-template-columns:1fr}.network{padding:18px}.networkMap{min-height:270px}.ctaBox{padding:26px}.heroActions .btn{flex:1}
}
`;

function esc(value){return String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[ch]));}
function gate(path){return `/identity?app=${encodeURIComponent(path)}`;}

function modulesMarkup(){
  return MODULES.map(m=>`<article class="moduleCard" data-category="${m.category}" data-search="${esc((m.title+' '+m.eyebrow+' '+m.desc).toLowerCase())}">
    <div class="moduleIcon">${esc(m.icon)}</div><small>${esc(m.eyebrow)}</small><h3>${esc(m.title)}</h3><p>${esc(m.desc)}</p>
    <div class="moduleFoot"><span class="status">${esc(m.status)}</span><button class="openModule" type="button" data-open-module="${esc(m.id)}">Ver módulo →</button></div>
  </article>`).join('');
}

function pillarsMarkup(){
  return PILLARS.map(p=>`<button class="pillarCard" type="button" data-open-pillar="${esc(p.id)}"><span class="pillarGlyph">${esc(p.icon)}</span><h3>${esc(p.label)}</h3><p>${esc(p.copy)}</p></button>`).join('');
}

function hudMarkup(items){
  return items.map(p=>`<button class="hudBtn" type="button" data-open-pillar="${esc(p.id)}"><span class="hudIcon">${esc(p.icon)}</span><span><b>${esc(p.label)}</b><span>${p.route?'Abrir en ATLAS':'Programa nacional'}</span></span></button>`).join('');
}

function citiesMarkup(){
  return CITIES.map(c=>`<div class="cityRow"><div><b>${esc(c[0])}</b><small>${esc(c[1])}</small></div><span>${esc(c[2])}</span></div>`).join('');
}

function script(){
  return `
const modules=${JSON.stringify(MODULES)};
const pillars=${JSON.stringify(PILLARS)};
const menu=document.querySelector('#menu'),nav=document.querySelector('#nav');
menu?.addEventListener('click',()=>nav?.classList.toggle('open'));
nav?.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>nav.classList.remove('open')));

const dlg=document.querySelector('#atlasDialog'),dlgTitle=document.querySelector('#dlgTitle'),dlgBody=document.querySelector('#dlgBody'),dlgStatus=document.querySelector('#dlgStatus'),dlgAction=document.querySelector('#dlgAction');
function gate(path){return '/identity?app='+encodeURIComponent(path)}
function openDialog(item,type){
  dlgTitle.textContent=item.title||item.label;
  dlgBody.textContent=item.desc||item.copy;
  dlgStatus.textContent=type==='pillar'?(item.route?'Conectado a un módulo ATLAS':'Diseño operativo preparado para integración'):(item.status||'ATLAS');
  if(item.route){dlgAction.hidden=false;dlgAction.href=gate(item.route);dlgAction.textContent='Abrir en ATLAS';}
  else{dlgAction.hidden=true;dlgAction.removeAttribute('href');}
  dlg?.showModal();
}
document.querySelectorAll('[data-open-module]').forEach(btn=>btn.addEventListener('click',()=>{const item=modules.find(x=>x.id===btn.dataset.openModule);if(item)openDialog(item,'module')}));
document.querySelectorAll('[data-open-pillar]').forEach(btn=>btn.addEventListener('click',()=>{const item=pillars.find(x=>x.id===btn.dataset.openPillar);if(item)openDialog(item,'pillar')}));
document.querySelector('#dlgClose')?.addEventListener('click',()=>dlg?.close());
dlg?.addEventListener('click',e=>{if(e.target===dlg)dlg.close()});

const search=document.querySelector('#moduleSearch');
const pills=[...document.querySelectorAll('.pill')],cards=[...document.querySelectorAll('.moduleCard')],empty=document.querySelector('#emptySearch');
let category='todos';
function apply(){
  const q=(search?.value||'').trim().toLowerCase();let visible=0;
  cards.forEach(card=>{const okCategory=category==='todos'||card.dataset.category===category;const okSearch=!q||card.dataset.search.includes(q);const show=okCategory&&okSearch;card.hidden=!show;if(show)visible++;});
  if(empty)empty.style.display=visible?'none':'block';
}
search?.addEventListener('input',apply);
pills.forEach(p=>p.addEventListener('click',()=>{category=p.dataset.filter;pills.forEach(x=>x.classList.toggle('on',x===p));apply()}));
document.querySelector('#year').textContent=new Date().getFullYear();
`;
}

function page(){
  const left=PILLARS.slice(0,6),right=PILLARS.slice(6);
  return `<!doctype html><html lang="es-VE"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="theme-color" content="#020712"><meta name="description" content="ATLAS Venezuela: una plataforma conectada para movilidad, finanzas, salud, educación, comercio, seguridad, operaciones y servicios.">
<title>ATLAS Future Venezuela · Sistema Operativo Empresarial</title><style>${CSS}</style></head><body>
<a class="skip" href="#contenido">Saltar al contenido</a>
<header class="topbar"><div class="wrap topinner"><a class="brand" href="/ve" aria-label="ATLAS Venezuela"><span class="brandmark"><i></i></span><span class="brandname">ATLAS <small>FUTURE VENEZUELA</small></span></a>
<button class="menu" id="menu" type="button" aria-label="Abrir menú">☰</button>
<nav class="nav" id="nav"><a href="#vision">Visión</a><a href="#pilares">Pilares</a><a href="#territorios">Territorios</a><a href="#modulos">Módulos</a><a class="enter" href="${gate('/dashboard')}">Entrar a ATLAS</a></nav></div></header>

<main id="contenido">
<section class="poster" id="vision" aria-labelledby="heroTitle"><div class="posterInner">
  <aside class="hudRail left" aria-label="Pilares nacionales, columna izquierda">${hudMarkup(left)}</aside>
  <aside class="hudRail right" aria-label="Pilares nacionales, columna derecha">${hudMarkup(right)}</aside>
  <div class="heroCopy">
    <div class="flagArc" aria-hidden="true"></div>
    <div class="heroEyebrow">Una nación · Una plataforma · Potencial conectado</div>
    <h1 id="heroTitle" class="atlasWord">ATLAS</h1><div class="future">FUTURE</div><div class="venezuela">VENEZUELA</div>
    <p class="tagline">Ciudades visionarias. Una nación conectada.</p>
    <div class="heroActions"><a class="btn primary" href="#pilares">Explorar la visión</a><a class="btn" href="${gate('/dashboard')}">Abrir plataforma</a></div>
  </div>
  <div class="drone" aria-hidden="true"><i></i></div>
  <div class="cityStage" aria-hidden="true"><div class="mountain"></div><div class="waterfront"></div><div class="bridge"><i></i></div><div class="wind"><span></span><span></span><span></span><span></span></div>
    <div class="skyline">${Array.from({length:15},()=>'<span class="tower"></span>').join('')}</div><div class="arena"></div><div class="flagPole"></div>
  </div>
  <div class="cityLabels" aria-hidden="true">${CITIES.map(c=>`<div class="cityTag">${esc(c[0])}<small>${esc(c[1])}</small></div>`).join('')}</div>
  <div class="posterFoot"><div><b>UNA NACIÓN</b>Una plataforma, potencial sin límites.</div><div class="rightText"><b>SOSTENIBLE · INNOVADORA · INCLUSIVA</b>Diseño orientado a operación real.</div></div>
  <div class="bottomSeal"><div class="veMap" aria-hidden="true"></div><b>ATLAS VENEZUELA</b><span>Country layer VE · es-VE · VES</span></div>
</div></section>

<section class="section" id="pilares"><div class="wrap"><div class="sectionHead"><div><div class="kicker">ATLAS Future Venezuela</div><h2>Doce pilares para una nación conectada.</h2></div><p>La referencia visual se convierte aquí en software navegable. Cada bloque abre un destino ATLAS real cuando el módulo ya existe; las áreas que dependen de nueva infraestructura muestran su estado sin simular conexiones activas.</p></div>
<div class="pillarGrid">${pillarsMarkup()}</div></div></section>

<section class="section" id="territorios"><div class="wrap"><div class="sectionHead"><div><div class="kicker">Red territorial</div><h2>Venezuela como sistema conectado.</h2></div><p>La capa país une ciudades, costa, industria, turismo, energía y conocimiento dentro de la misma arquitectura empresarial, con permisos y datos separados por organización.</p></div>
<div class="network"><div class="networkGrid"><div class="networkMap"><div class="mapLarge" aria-label="Representación digital de Venezuela"></div></div><div class="cityList">${citiesMarkup()}</div></div></div></div></section>

<section class="section" id="modulos"><div class="wrap"><div class="sectionHead"><div><div class="kicker">Sistema Operativo Empresarial</div><h2>ATLAS Venezuela, módulos reales.</h2></div><p>Se conservan las funciones existentes del ecosistema y se presenta una portada venezolana más visual. Sin datos conectados, ATLAS mantiene estados vacíos en lugar de fabricar métricas.</p></div>
<div class="controls"><input class="search" id="moduleSearch" type="search" placeholder="Buscar módulos..." aria-label="Buscar módulos"><button class="pill on" type="button" data-filter="todos">Todos</button><button class="pill" type="button" data-filter="operacion">Operación</button><button class="pill" type="button" data-filter="finanzas">Finanzas</button><button class="pill" type="button" data-filter="personas">Personas</button><button class="pill" type="button" data-filter="verticales">Verticales</button></div>
<div class="moduleGrid">${modulesMarkup()}</div><div class="emptySearch" id="emptySearch">No hay módulos que coincidan con la búsqueda.</div></div></section>

<section class="section"><div class="wrap"><div class="systemBand"><div><div class="kicker">Capa país VE</div><h2>Diseñada para Venezuela, integrada con ATLAS Global.</h2><p>ATLAS Venezuela no es un producto paralelo. Reutiliza identidad, organizaciones, roles, permisos, auditoría, módulos y rutas del núcleo. La localización venezolana se aplica encima de esa base y deja la fiscalidad, banca y proveedores regulados sujetos a integración y validación autorizada.</p></div>
<div class="dataState"><div class="stateRow"><span>Locale</span><b>es-VE</b></div><div class="stateRow"><span>Moneda local base</span><b>VES</b></div><div class="stateRow"><span>Estado de datos empresariales</span><b>Sin datos conectados</b></div><div class="stateRow"><span>Acceso a aplicaciones</span><b>ATLAS Identity</b></div><div class="stateRow"><span>Seguridad</span><b>Seguridad &amp; Auditoría</b></div><div class="stateRow"><span>Finanzas</span><b>Accounting VE</b></div></div></div></div></section>

<section class="cta"><div class="wrap"><div class="ctaBox"><div><div class="kicker">Una nación · Una plataforma</div><h2>ATLAS Future Venezuela</h2><p>Portada visual futurista, navegación funcional, módulos empresariales existentes y capa país VE bajo un solo ecosistema.</p></div><div class="heroActions"><a class="btn primary" href="${gate('/dashboard')}">Entrar al dashboard</a><a class="btn" href="/global">Ver ATLAS Global</a></div></div></div></section>
</main>

<footer class="footer"><div class="wrap footerin"><span>© <span id="year"></span> ATLAS Enterprise Suite · Venezuela</span><span>Sostenible · Innovadora · Inclusiva · Conectada</span></div></footer>

<dialog id="atlasDialog"><div class="dialogIn"><div class="dialogTop"><div><div class="kicker">ATLAS Venezuela</div><h3 id="dlgTitle">Módulo</h3></div><button id="dlgClose" type="button" aria-label="Cerrar">×</button></div><span class="dialogStatus" id="dlgStatus"></span><p id="dlgBody"></p><a class="btn primary" id="dlgAction" href="${gate('/dashboard')}">Abrir en ATLAS</a></div></dialog>
<script>${script()}</script></body></html>`;
}

export function handleVenezuela(request){
  const url=new URL(request.url);
  const clean=url.pathname.replace(/\/+$/,'')||'/';
  if(!VE_PATHS.has(clean))return null;
  return new Response(page(),{headers:{'content-type':'text/html; charset=utf-8','cache-control':'public, max-age=300','x-atlas-country':'VE'}});
}

export {MODULES as VENEZUELA_MODULES};
