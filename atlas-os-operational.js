(()=>{
'use strict';
const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const uid=()=>crypto.randomUUID?.()||`${Date.now()}-${Math.random().toString(16).slice(2)}`;
const today=()=>new Date().toISOString().slice(0,10);
const money=n=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(Number(n)||0);
const number=n=>new Intl.NumberFormat('en-US',{maximumFractionDigits:2}).format(Number(n)||0);
const KEY='atlas-os-operational-v1';
const LEGACY_KEY='atlas-suite-functional-v4';
const RATE_CHANGE='2026-07-01';
const DEFAULTS={ssRate:0.062,medicareRate:0.0145,withholdingRate:0.10,ssWageBase:184500};

const MODULES=[
 ['dashboard','▦','Dashboard','Centro de mando consolidado'],
 ['enterprise','⌘','ATLAS Enterprise','Operaciones empresariales multiárea'],
 ['finance','▥','ATLAS Finance','Contabilidad, CxC, CxP y conciliación'],
 ['hr','♙','ATLAS HR Suite','Personas, reclutamiento y evaluaciones'],
 ['payroll','◇','ATLAS Payroll','Horas, cálculo y ciclos de nómina'],
 ['health','♡','ATLAS Health','Administración de salud e interoperabilidad'],
 ['ride','⌁','ATLAS Ride','Viajes, ingresos, millaje y gastos'],
 ['pos','▣','ATLAS POS','Ventas, carrito, caja y recibos'],
 ['inventory','▤','ATLAS Inventory','SKU, existencias y movimientos'],
 ['projects','▦','ATLAS Projects','Proyectos, tareas y seguimiento'],
 ['crm','◎','ATLAS CRM','Leads, oportunidades y clientes'],
 ['education','◇','ATLAS Education','Cursos, alumnos y evaluaciones'],
 ['analytics','▥','ATLAS Analytics','Indicadores y análisis transversal'],
 ['security','⬡','ATLAS Security','Roles, incidentes y auditoría'],
 ['settings','⚙','ATLAS Settings','Configuración, respaldo y datos']
];
const META=Object.fromEntries(MODULES.map(x=>[x[0],x]));

const S=(label,fields,columns)=>({label,fields,columns});
const SCHEMAS={
 enterprise:{
  vendors:S('Proveedor',[['name','Nombre','text',1],['category','Categoría'],['email','Correo','email'],['phone','Teléfono'],['status','Estado','select',1,['active','review','inactive']]],[['name','Proveedor'],['category','Categoría'],['email','Correo'],['status','Estado']]),
  locations:S('Ubicación',[['name','Nombre','text',1],['type','Tipo','select',1,['office','warehouse','store','remote']],['address','Dirección'],['manager','Responsable'],['status','Estado','select',1,['active','inactive']]],[['name','Ubicación'],['type','Tipo'],['manager','Responsable'],['status','Estado']]),
  approvals:S('Aprobación',[['reference','Referencia','text',1],['area','Área','text',1],['requestor','Solicitante'],['amount','Monto','number'],['approver','Aprobador'],['status','Estado','select',1,['pending','approved','rejected']]],[['reference','Referencia'],['area','Área'],['requestor','Solicitante'],['amount','Monto','money'],['status','Estado']])
 },
 finance:{
  accounts:S('Cuenta contable',[['code','Código','text',1],['name','Nombre','text',1],['type','Tipo','select',1,['asset','liability','equity','revenue','expense']],['status','Estado','select',1,['active','inactive']]],[['code','Código'],['name','Cuenta'],['type','Tipo'],['status','Estado']]),
  journals:S('Línea de asiento',[['date','Fecha','date',1],['number','Asiento','text',1],['account','Cuenta','text',1],['memo','Descripción'],['debit','Débito','number'],['credit','Crédito','number'],['status','Estado','select',1,['draft','posted']]],[['date','Fecha','date'],['number','Asiento'],['account','Cuenta'],['debit','Débito','money'],['credit','Crédito','money'],['status','Estado']]),
  invoices:S('Factura CxC',[['number','Número','text',1],['customer','Cliente','text',1],['date','Fecha','date',1],['due','Vencimiento','date'],['total','Total','number',1],['balance','Saldo','number'],['status','Estado','select',1,['draft','open','paid','overdue']]],[['number','Factura'],['customer','Cliente'],['date','Fecha','date'],['total','Total','money'],['balance','Saldo','money'],['status','Estado']]),
  bills:S('Factura CxP',[['number','Número','text',1],['vendor','Proveedor','text',1],['date','Fecha','date',1],['due','Vencimiento','date'],['total','Total','number',1],['balance','Saldo','number'],['status','Estado','select',1,['draft','open','paid','overdue']]],[['number','Factura'],['vendor','Proveedor'],['date','Fecha','date'],['total','Total','money'],['balance','Saldo','money'],['status','Estado']]),
  bank:S('Movimiento bancario',[['date','Fecha','date',1],['account','Cuenta','text',1],['description','Descripción','text',1],['amount','Importe','number',1],['reference','Referencia'],['status','Conciliación','select',1,['unmatched','matched','reconciled']]],[['date','Fecha','date'],['account','Cuenta'],['description','Descripción'],['amount','Importe','money'],['status','Estado']])
 },
 hr:{
  employees:S('Empleado',[['name','Nombre','text',1],['department','Departamento','text',1],['role','Cargo','text',1],['email','Correo','email'],['rate','Tarifa / hora','number'],['hireDate','Fecha de ingreso','date'],['status','Estado','select',1,['active','leave','inactive']]],[['name','Empleado'],['department','Departamento'],['role','Cargo'],['rate','Tarifa','money'],['status','Estado']]),
  candidates:S('Candidato',[['name','Nombre','text',1],['role','Puesto','text',1],['email','Correo','email'],['stage','Etapa','select',1,['applied','screening','assessment','interview','offer','hired','rejected']],['score','Puntaje','number'],['owner','Responsable']],[['name','Candidato'],['role','Puesto'],['stage','Etapa'],['score','Puntaje','number'],['owner','Responsable']]),
  evaluations:S('Evaluación',[['employee','Empleado','text',1],['date','Fecha','date',1],['competency','Competencia','text',1],['score','Puntaje','number',1],['reviewer','Evaluador'],['notes','Notas','textarea']],[['employee','Empleado'],['date','Fecha','date'],['competency','Competencia'],['score','Puntaje','number'],['reviewer','Evaluador']])
 },
 payroll:{
  timecards:S('Tarjeta de tiempo',[['employee','Empleado','text',1],['week','Semana','date',1],['hours','Horas','number',1],['rate','Tarifa','number'],['status','Estado','select',1,['open','approved','processed']]],[['employee','Empleado'],['week','Semana','date'],['hours','Horas','number'],['rate','Tarifa','money'],['status','Estado']]),
  payruns:S('Resultado de nómina',[['runId','Ciclo','text',1],['employee','Empleado','text',1],['period','Periodo','text',1],['regular','Regular','number'],['overtime','Overtime','number'],['gross','Bruto','number'],['fica','FICA est.','number'],['withholding','Retención est.','number'],['net','Neto est.','number'],['status','Estado','select',1,['calculated','approved','paid']]],[['runId','Ciclo'],['employee','Empleado'],['period','Periodo'],['gross','Bruto','money'],['fica','FICA','money'],['withholding','Retención','money'],['net','Neto','money'],['status','Estado']])
 },
 health:{
  people:S('Persona',[['name','Nombre','text',1],['recordId','ID interno','text',1],['dob','Fecha de nacimiento','date'],['contact','Contacto'],['status','Estado','select',1,['active','inactive']]],[['name','Persona'],['recordId','ID'],['dob','Nacimiento','date'],['status','Estado']]),
  appointments:S('Cita',[['date','Fecha','date',1],['time','Hora','time'],['person','Persona','text',1],['provider','Proveedor'],['type','Tipo'],['status','Estado','select',1,['scheduled','checked_in','completed','cancelled']]],[['date','Fecha','date'],['time','Hora'],['person','Persona'],['provider','Proveedor'],['status','Estado']]),
  records:S('Registro administrativo',[['date','Fecha','date',1],['person','Persona','text',1],['type','Tipo','select',1,['document','follow_up','referral','consent','administrative']],['summary','Resumen','textarea',1],['status','Estado','select',1,['open','completed','archived']]],[['date','Fecha','date'],['person','Persona'],['type','Tipo'],['summary','Resumen'],['status','Estado']])
 },
 ride:{
  trips:S('Viaje',[['date','Fecha','date',1],['platform','Plataforma','select',1,['Uber','Lyft','DoorDash','Instacart','Shipt','Spark','Amazon Flex','Other']],['type','Tipo','select',1,['ride','delivery','shopping']],['gross','Ingreso bruto','number'],['tips','Propinas','number'],['miles','Millas negocio','number'],['expense','Gasto','number'],['status','Estado','select',1,['pending','matched','paid']]],[['date','Fecha','date'],['platform','Plataforma'],['type','Tipo'],['gross','Bruto','money'],['tips','Propinas','money'],['miles','Millas','number'],['expense','Gasto','money'],['status','Estado']]),
  payouts:S('Depósito',[['date','Fecha','date',1],['platform','Plataforma','text',1],['amount','Monto','number',1],['account','Cuenta'],['reference','Referencia'],['status','Estado','select',1,['pending','matched','posted']]],[['date','Fecha','date'],['platform','Plataforma'],['amount','Monto','money'],['account','Cuenta'],['status','Estado']])
 },
 pos:{
  products:S('Producto POS',[['sku','SKU','text',1],['name','Producto','text',1],['category','Categoría'],['price','Precio','number',1],['taxRate','Impuesto %','number'],['qty','Stock','number'],['status','Estado','select',1,['active','inactive']]],[['sku','SKU'],['name','Producto'],['category','Categoría'],['price','Precio','money'],['qty','Stock','number'],['status','Estado']]),
  orders:S('Orden POS',[['number','Orden','text',1],['date','Fecha','date',1],['items','Artículos'],['subtotal','Subtotal','number'],['tax','Impuesto','number'],['total','Total','number'],['payment','Pago'],['status','Estado','select',1,['paid','void','refunded']]],[['number','Orden'],['date','Fecha','date'],['items','Artículos'],['subtotal','Subtotal','money'],['tax','Impuesto','money'],['total','Total','money'],['payment','Pago'],['status','Estado']])
 },
 inventory:{
  items:S('Artículo',[['sku','SKU','text',1],['name','Artículo','text',1],['location','Ubicación'],['qty','Existencia','number',1],['reorder','Punto de reorden','number'],['cost','Costo','number'],['price','Precio','number'],['barcode','GTIN / Código'],['status','Estado','select',1,['active','inactive']]],[['sku','SKU'],['name','Artículo'],['location','Ubicación'],['qty','Existencia','number'],['reorder','Reorden','number'],['cost','Costo','money'],['price','Precio','money']]),
  movements:S('Movimiento',[['date','Fecha','date',1],['sku','SKU','text',1],['type','Tipo','select',1,['receipt','sale','transfer','adjustment']],['qty','Cantidad (+/-)','number',1],['from','Origen'],['to','Destino'],['reference','Referencia']],[['date','Fecha','date'],['sku','SKU'],['type','Tipo'],['qty','Cantidad','number'],['from','Origen'],['to','Destino'],['reference','Referencia']])
 },
 projects:{
  projects:S('Proyecto',[['name','Nombre','text',1],['owner','Responsable','text',1],['start','Inicio','date'],['due','Entrega','date'],['budget','Presupuesto','number'],['progress','Progreso %','number'],['status','Estado','select',1,['planned','active','blocked','completed','cancelled']]],[['name','Proyecto'],['owner','Responsable'],['due','Entrega','date'],['budget','Presupuesto','money'],['progress','Progreso','number'],['status','Estado']]),
  tasks:S('Tarea',[['project','Proyecto','text',1],['title','Tarea','text',1],['owner','Responsable'],['due','Vence','date'],['priority','Prioridad','select',1,['low','medium','high','critical']],['status','Estado','select',1,['todo','doing','review','done']]],[['project','Proyecto'],['title','Tarea'],['owner','Responsable'],['due','Vence','date'],['priority','Prioridad'],['status','Estado']])
 },
 crm:{
  leads:S('Lead',[['name','Nombre / Empresa','text',1],['contact','Contacto'],['email','Correo','email'],['source','Fuente'],['stage','Etapa','select',1,['new','qualified','proposal','won','lost']],['value','Valor esperado','number'],['owner','Responsable']],[['name','Lead'],['contact','Contacto'],['source','Fuente'],['stage','Etapa'],['value','Valor','money'],['owner','Responsable']]),
  customers:S('Cliente',[['name','Nombre','text',1],['company','Empresa'],['email','Correo','email'],['phone','Teléfono'],['status','Estado','select',1,['active','lead','inactive']],['notes','Notas','textarea']],[['name','Cliente'],['company','Empresa'],['email','Correo'],['phone','Teléfono'],['status','Estado']]),
  activities:S('Actividad',[['date','Fecha','date',1],['lead','Lead / Cliente','text',1],['type','Tipo','select',1,['call','email','meeting','task']],['owner','Responsable'],['next','Próximo paso'],['status','Estado','select',1,['open','done','cancelled']]],[['date','Fecha','date'],['lead','Lead / Cliente'],['type','Tipo'],['owner','Responsable'],['next','Próximo paso'],['status','Estado']])
 },
 education:{
  courses:S('Curso',[['code','Código','text',1],['title','Curso','text',1],['category','Categoría'],['hours','Horas','number'],['status','Estado','select',1,['draft','active','archived']]],[['code','Código'],['title','Curso'],['category','Categoría'],['hours','Horas','number'],['status','Estado']]),
  learners:S('Alumno',[['name','Nombre','text',1],['email','Correo','email'],['course','Curso','text',1],['progress','Progreso %','number'],['score','Puntaje','number'],['status','Estado','select',1,['enrolled','in_progress','passed','failed','completed']]],[['name','Alumno'],['course','Curso'],['progress','Progreso','number'],['score','Puntaje','number'],['status','Estado']]),
  assessments:S('Evaluación',[['course','Curso','text',1],['learner','Alumno','text',1],['date','Fecha','date',1],['score','Puntaje','number',1],['max','Máximo','number'],['result','Resultado','select',1,['passed','failed','pending']]],[['course','Curso'],['learner','Alumno'],['date','Fecha','date'],['score','Puntaje','number'],['max','Máximo','number'],['result','Resultado']])
 },
 security:{
  users:S('Usuario',[['name','Nombre','text',1],['email','Correo','email',1],['role','Rol','select',1,['Super Admin','Finance','HR','Payroll','Health','Operations','Viewer']],['mfa','MFA','select',1,['enabled','disabled']],['status','Estado','select',1,['active','locked','inactive']]],[['name','Usuario'],['email','Correo'],['role','Rol'],['mfa','MFA'],['status','Estado']]),
  incidents:S('Incidente',[['date','Fecha','date',1],['reference','Referencia','text',1],['type','Tipo','text',1],['severity','Severidad','select',1,['low','medium','high','critical']],['owner','Responsable'],['status','Estado','select',1,['open','investigating','contained','resolved']],['summary','Resumen','textarea']],[['date','Fecha','date'],['reference','Referencia'],['type','Tipo'],['severity','Severidad'],['owner','Responsable'],['status','Estado']])
 }
};

function blankCompany(){
 const datasets={};
 for(const [module,sets] of Object.entries(SCHEMAS))for(const key of Object.keys(sets))datasets[`${module}.${key}`]=[];
 return{datasets,audit:[],settings:{companyName:'ATLAS Demo LLC',industry:'Technology',...DEFAULTS},cart:[]};
}
function seedCompany(){
 const c=blankCompany();
 c.datasets['finance.accounts']=[
  {id:uid(),code:'1000',name:'Cash',type:'asset',status:'active'},
  {id:uid(),code:'1100',name:'Accounts Receivable',type:'asset',status:'active'},
  {id:uid(),code:'2000',name:'Accounts Payable',type:'liability',status:'active'},
  {id:uid(),code:'4000',name:'Revenue',type:'revenue',status:'active'},
  {id:uid(),code:'6000',name:'Operating Expense',type:'expense',status:'active'}
 ];
 c.datasets['crm.customers']=[{id:uid(),name:'Orlando Pilot Client',company:'Pilot Company',email:'pilot@example.com',phone:'',status:'active',notes:''}];
 c.datasets['finance.invoices']=[{id:uid(),number:'INV-1001',customer:'Orlando Pilot Client',date:today(),due:today(),total:1250,balance:1250,status:'open'}];
 c.datasets['inventory.items']=[{id:uid(),sku:'ATLAS-CORE',name:'ATLAS Core Setup',location:'Main',qty:10,reorder:3,cost:120,price:499,barcode:'',status:'active'}];
 c.datasets['pos.products']=[{id:uid(),sku:'ATLAS-CORE',name:'ATLAS Core Setup',category:'Services',price:499,taxRate:0,qty:10,status:'active'}];
 c.datasets['hr.employees']=[{id:uid(),name:'Winder Admin',department:'Executive',role:'Owner',email:'',rate:0,hireDate:today(),status:'active'}];
 c.datasets['security.users']=[{id:uid(),name:'ATLAS Super Admin',email:'demo@atlas.local',role:'Super Admin',mfa:'enabled',status:'active'}];
 c.audit.push({id:uid(),at:new Date().toISOString(),action:'system.ready',detail:'ATLAS OS operational modules initialized'});
 return c;
}
function initial(){return{version:1,module:'dashboard',company:'atlas',companies:{atlas:seedCompany(),uh4h:{...blankCompany(),settings:{...blankCompany().settings,companyName:'United Hands for Humanity',industry:'Community Impact'}}}}}
function migrate(){
 let state=initial();
 try{
  const legacy=JSON.parse(localStorage.getItem(LEGACY_KEY)||'null');
  if(!legacy?.data)return state;
  for(const lc of legacy.companies||[]){
   const id=lc.id||uid();
   const src=legacy.data[id]; if(!src)continue;
   if(!state.companies[id])state.companies[id]=blankCompany();
   const dst=state.companies[id]; dst.settings.companyName=lc.name||dst.settings.companyName; dst.settings.industry=lc.industry||'';
   const copy=(from,to)=>{if(Array.isArray(src[from])&&src[from].length)dst.datasets[to]=src[from].map(x=>({...x,id:x.id||uid()}))};
   copy('customers','crm.customers');copy('invoices','finance.invoices');copy('journals','finance.journals');copy('employees','hr.employees');copy('ride','ride.trips');copy('health','health.records');
   if(Array.isArray(src.products)&&src.products.length){
    dst.datasets['inventory.items']=src.products.map(x=>({...x,id:x.id||uid(),location:x.location||'Main',barcode:x.barcode||''}));
    dst.datasets['pos.products']=src.products.map(x=>({id:x.id||uid(),sku:x.sku,name:x.name,category:'',price:+x.price||0,taxRate:0,qty:+x.qty||0,status:x.status||'active'}));
   }
   if(Array.isArray(src.expenses)&&src.expenses.length)dst.datasets['finance.bills']=src.expenses.map(x=>({id:x.id||uid(),number:x.reference||`BILL-${String(Math.random()).slice(2,7)}`,vendor:x.vendor||'',date:x.date||today(),due:x.date||today(),total:+x.amount||0,balance:x.status==='paid'?0:+x.amount||0,status:x.status==='paid'?'paid':'open'}));
  }
  if(legacy.company&&state.companies[legacy.company])state.company=legacy.company;
 }catch{}
 return state;
}
let state;
try{state=JSON.parse(localStorage.getItem(KEY)||'null')||migrate()}catch{state=migrate()}
function company(){return state.companies[state.company]||state.companies.atlas}
function save(){localStorage.setItem(KEY,JSON.stringify(state))}
function log(action,detail){const c=company();c.audit.unshift({id:uid(),at:new Date().toISOString(),action,detail});c.audit=c.audit.slice(0,1000);save()}
function toast(title,detail=''){const root=$('#toast-root');if(!root)return;const n=document.createElement('div');n.className='toast';n.innerHTML=`<strong>${esc(title)}</strong>${detail?`<span>${esc(detail)}</span>`:''}`;root.append(n);setTimeout(()=>n.remove(),3200)}
function dataset(module,set){const k=`${module}.${set}`;return company().datasets[k]||(company().datasets[k]=[])}
function statusClass(v){return ['active','paid','posted','completed','done','won','approved','reconciled','matched','resolved','enabled','passed'].includes(String(v).toLowerCase())?'active':['overdue','inactive','cancelled','rejected','failed','critical','locked'].includes(String(v).toLowerCase())?'overdue':'pending'}
function renderValue(v,type){if(type==='money')return money(v);if(type==='number')return number(v);if(type==='date'&&v)return new Date(`${v}T00:00:00`).toLocaleDateString();return esc(v)}
function moduleCounts(m){const sets=SCHEMAS[m]||{};return Object.keys(sets).reduce((a,k)=>a+dataset(m,k).length,0)}

function applyNav(){
 const nav=$('#main-nav'); if(!nav)return;
 nav.innerHTML=`<span class="atlas-operational-nav" hidden></span>`+MODULES.map(([k,icon,label])=>`<button class="nav-item ${state.module===k?'active':''}" data-atlas-module="${k}"><span class="nav-icon">${icon}</span>${label}</button>`).join('');
 const label=$('.workspace-card > span'); if(label)label.textContent='EMPRESA ACTIVA';
 const brand=$('.brand small'); if(brand)brand.textContent='TOTAL CONTROL';
 const loginBrand=$('.mobile-brand small'); if(loginBrand)loginBrand.textContent='TOTAL CONTROL';
}
function setHeader(module){const m=META[module]||META.dashboard;const title=$('#page-title'),eye=$('#page-eyebrow');if(title)title.textContent=m[2];if(eye)eye.textContent=module==='dashboard'?'ATLAS OS · TOTAL CONTROL':'ATLAS OS · OPERATIONAL MODULE';}
function activateQuickAdd(){
 const old=$('#quick-add-btn');if(!old||old.dataset.atlasOperational==='1')return;
 const b=old.cloneNode(true);b.dataset.atlasOperational='1';old.replaceWith(b);
 b.addEventListener('click',()=>{const m=state.module;const first=Object.keys(SCHEMAS[m]||{})[0];if(first)openForm(m,first);else toast('ATLAS','No hay un formulario directo en este módulo.');});
}
function activate(){if(!$('#app-view')||$('#app-view').classList.contains('hidden'))return;applyNav();activateQuickAdd();render(state.module);}
function render(module){state.module=module;save();applyNav();setHeader(module);const content=$('#content');if(!content)return;
 if(module==='dashboard')content.innerHTML=renderDashboard();
 else if(module==='analytics')content.innerHTML=renderAnalytics();
 else if(module==='settings')content.innerHTML=renderSettings();
 else if(module==='pos')content.innerHTML=renderPOS();
 else if(module==='payroll')content.innerHTML=renderPayroll();
 else if(module==='security')content.innerHTML=renderSecurity();
 else content.innerHTML=renderGenericModule(module);
 bindContent();
}
function hero(title,subtitle,actions=''){return `<section class="atlas-op-hero"><div><p class="eyebrow">ATLAS OS</p><h3>${esc(title)}</h3><p>${esc(subtitle)}</p></div><div class="atlas-op-actions">${actions}</div></section>`}
function card(title,value,sub=''){return `<article class="card atlas-op-kpi"><span>${esc(title)}</span><strong>${value}</strong><small>${esc(sub)}</small></article>`}
function renderDashboard(){
 const c=company();
 const invoices=dataset('finance','invoices'), bills=dataset('finance','bills'), trips=dataset('ride','trips'), tasks=dataset('projects','tasks');
 const ar=invoices.reduce((a,x)=>a+(+x.balance||0),0), ap=bills.reduce((a,x)=>a+(+x.balance||0),0), ride=trips.reduce((a,x)=>a+(+x.gross||0)+(+x.tips||0)-(+x.expense||0),0);
 const activeEmployees=dataset('hr','employees').filter(x=>x.status==='active').length, low=dataset('inventory','items').filter(x=>(+x.qty||0)<=(+x.reorder||0)).length, openTasks=tasks.filter(x=>x.status!=='done').length;
 const modules=MODULES.filter(x=>!['dashboard','settings'].includes(x[0]));
 return hero(c.settings.companyName,'Vista consolidada y navegación operacional de todos los módulos.',`<button class="button primary" data-atlas-export>Exportar respaldo</button>`)+
 `<div class="atlas-op-kpis">${card('Cuentas por cobrar',money(ar),'Saldo abierto')}${card('Cuentas por pagar',money(ap),'Saldo abierto')}${card('Empleados activos',activeEmployees,'HR Suite')}${card('Ride neto',money(ride),'Ingreso - gastos')}${card('Stock bajo',low,'Requiere atención')}${card('Tareas abiertas',openTasks,'Projects')}</div>`+
 `<section class="card atlas-op-section"><div class="atlas-op-section-head"><div><h3>Núcleo ATLAS</h3><p class="muted">Cada módulo abre un flujo CRUD operativo y conserva auditoría local.</p></div></div><div class="atlas-op-module-grid">${modules.map(([k,icon,label])=>`<button class="atlas-op-module-card" data-atlas-module="${k}"><span class="atlas-op-module-icon">${icon}</span><strong>${label}</strong><small>${moduleCounts(k)} registros</small><em>Operativo</em></button>`).join('')}</div></section>`+
 `<section class="card atlas-op-section"><div class="atlas-op-section-head"><h3>Actividad reciente</h3></div>${auditTable(8)}</section>`;
}
function renderGenericModule(module){
 const meta=META[module];const sets=SCHEMAS[module]||{};const keys=Object.keys(sets);const active=state.activeSet?.[module]&&sets[state.activeSet[module]]?state.activeSet[module]:keys[0];state.activeSet={...(state.activeSet||{}),[module]:active};save();
 const rows=dataset(module,active);let extra='';
 if(module==='finance')extra=financeHealth();
 if(module==='inventory')extra=inventoryHealth();
 if(module==='ride')extra=rideHealth();
 if(module==='health')extra=`<div class="atlas-op-notice"><strong>Privacidad:</strong> este modo usa almacenamiento local del navegador. No cargues PHI real hasta activar backend seguro, control de acceso, cifrado y políticas HIPAA aplicables.</div>`;
 if(module==='education')extra=`<div class="atlas-op-notice"><strong>Learning record:</strong> el modelo queda preparado para progreso, evaluaciones y futuras integraciones xAPI/LRS.</div>`;
 return hero(meta[2],meta[3],`<button class="button primary" data-atlas-add="${module}.${active}">＋ Crear ${esc(sets[active].label)}</button>`)+extra+
 tabs(module,sets,active)+renderTable(module,active,sets[active],rows);
}
function tabs(module,sets,active){return `<div class="atlas-op-tabs">${Object.entries(sets).map(([k,s])=>`<button class="${k===active?'active':''}" data-atlas-set="${module}.${k}">${esc(s.label)} <span>${dataset(module,k).length}</span></button>`).join('')}</div>`}
function renderTable(module,set,schema,rows){
 return `<section class="card atlas-op-section"><div class="atlas-op-section-head"><div><h3>${esc(schema.label)}</h3><p class="muted">${rows.length} registro(s)</p></div><div class="atlas-op-table-actions"><input class="atlas-op-search" data-atlas-filter="${module}.${set}" placeholder="Buscar..."><button class="button ghost" data-atlas-csv="${module}.${set}">CSV</button></div></div><div class="atlas-op-table-wrap"><table class="data-table"><thead><tr>${schema.columns.map(c=>`<th>${esc(c[1])}</th>`).join('')}<th>Acciones</th></tr></thead><tbody>${rows.length?rows.map(r=>`<tr data-atlas-row data-search="${esc(JSON.stringify(r).toLowerCase())}">${schema.columns.map(c=>`<td>${c[0]==='status'||c[0]==='stage'||c[0]==='result'||c[0]==='severity'||c[0]==='mfa'?`<span class="status ${statusClass(r[c[0]])}">${esc(r[c[0]]||'')}</span>`:renderValue(r[c[0]],c[2])}</td>`).join('')}<td><button class="button ghost small" data-atlas-edit="${module}.${set}" data-id="${r.id}">Editar</button> <button class="button danger small" data-atlas-delete="${module}.${set}" data-id="${r.id}">Eliminar</button></td></tr>`).join(''):`<tr><td colspan="${schema.columns.length+1}"><div class="empty-state">Sin registros. Crea el primero.</div></td></tr>`}</tbody></table></div></section>`;
}
function financeHealth(){
 const groups={};for(const x of dataset('finance','journals')){const n=x.number||'SIN-NÚMERO';groups[n]??={d:0,c:0};groups[n].d+=+x.debit||0;groups[n].c+=+x.credit||0}
 const unbalanced=Object.entries(groups).filter(([,v])=>Math.abs(v.d-v.c)>0.005);
 return `<div class="atlas-op-kpis">${card('Asientos',Object.keys(groups).length,'Agrupados por número')}${card('Desbalanceados',unbalanced.length,unbalanced.length?'Revisar antes de postear':'Débito = crédito')}${card('CxC abierta',money(dataset('finance','invoices').reduce((a,x)=>a+(+x.balance||0),0)),'Receivables')}${card('CxP abierta',money(dataset('finance','bills').reduce((a,x)=>a+(+x.balance||0),0)),'Payables')}</div>`;
}
function inventoryHealth(){const items=dataset('inventory','items'),low=items.filter(x=>(+x.qty||0)<=(+x.reorder||0));const value=items.reduce((a,x)=>a+(+x.qty||0)*(+x.cost||0),0);return `<div class="atlas-op-kpis">${card('SKUs',items.length,'Catálogo')}${card('Stock bajo',low.length,'Qty ≤ Reorder')}${card('Valor a costo',money(value),'Cantidad × costo')}</div>`}
function rideRate(date){return date&&date<RATE_CHANGE?0.725:0.76}
function rideHealth(){const trips=dataset('ride','trips');let gross=0,net=0,miles=0,ded=0;for(const x of trips){gross+=(+x.gross||0)+(+x.tips||0);net+=(+x.gross||0)+(+x.tips||0)-(+x.expense||0);miles+=+x.miles||0;ded+=(+x.miles||0)*rideRate(x.date)}return `<div class="atlas-op-kpis">${card('Ingreso bruto',money(gross),'Incluye propinas')}${card('Neto operativo',money(net),'Antes de impuestos')}${card('Millas negocio',number(miles),'Registro')}${card('Millaje estimado',money(ded),'IRS 2026 por fecha')}</div><div class="atlas-op-notice">Para 2026, ATLAS aplica 72.5¢/milla hasta el 30 de junio y 76¢/milla desde el 1 de julio en el estimador. Confirma elegibilidad fiscal antes de usarlo en una declaración.</div>`}

function renderPayroll(){
 const sets=SCHEMAS.payroll,active=state.activeSet?.payroll&&sets[state.activeSet.payroll]?state.activeSet.payroll:'timecards';state.activeSet={...(state.activeSet||{}),payroll:active};save();
 const tc=dataset('payroll','timecards'),pr=dataset('payroll','payruns');const gross=pr.reduce((a,x)=>a+(+x.gross||0),0),net=pr.reduce((a,x)=>a+(+x.net||0),0);
 return hero('ATLAS Payroll','Horas, cálculo de bruto a neto y trazabilidad del ciclo.',`<button class="button primary" data-atlas-payrun>Calcular ciclo</button>`)+
 `<div class="atlas-op-kpis">${card('Timecards abiertos',tc.filter(x=>x.status!=='processed').length,'Listos para cálculo')}${card('Bruto calculado',money(gross),'Histórico local')}${card('Neto estimado',money(net),'No sustituye payroll filing')}</div>`+
 `<div class="atlas-op-notice"><strong>Motor 2026:</strong> usa 6.2% de Social Security y 1.45% de Medicare como valores por defecto, más una retención federal configurable. El cálculo es operacional para simulación/control; la presentación de impuestos, formularios y reglas estatales requiere motor fiscal y validación de producción.</div>`+
 tabs('payroll',sets,active)+renderTable('payroll',active,sets[active],dataset('payroll',active));
}
function runPayroll(){
 const c=company(), cfg={...DEFAULTS,...c.settings},cards=dataset('payroll','timecards').filter(x=>x.status==='approved'||x.status==='open');if(!cards.length)return toast('Payroll','No hay timecards abiertos o aprobados.');
 const runId=`PR-${today().replaceAll('-','')}-${String(Date.now()).slice(-4)}`;let count=0;
 for(const x of cards){const h=+x.hours||0;let rate=+x.rate||0;if(!rate){const emp=dataset('hr','employees').find(e=>e.name===x.employee);rate=+emp?.rate||0}const reg=Math.min(h,40)*rate,ot=Math.max(h-40,0)*rate*1.5,gross=reg+ot,fica=gross*(+cfg.ssRate+ +cfg.medicareRate),withholding=gross*(+cfg.withholdingRate||0),net=Math.max(0,gross-fica-withholding);dataset('payroll','payruns').unshift({id:uid(),runId,employee:x.employee,period:x.week,regular:reg,overtime:ot,gross,fica,withholding,net,status:'calculated'});x.status='processed';count++}
 log('payroll.calculate',`${runId} · ${count} employee(s)`);save();render('payroll');toast('Payroll calculado',`${count} resultado(s) creados.`)
}

function renderPOS(){
 const products=dataset('pos','products').filter(x=>x.status!=='inactive'),cart=company().cart||[];const subtotal=cart.reduce((a,x)=>a+x.qty*x.price,0),tax=cart.reduce((a,x)=>a+x.qty*x.price*(x.taxRate/100),0),total=subtotal+tax;
 return hero('ATLAS POS','Terminal local con catálogo, carrito, cobro y registro de órdenes.',`<button class="button ghost" data-atlas-add="pos.products">＋ Producto</button>`)+
 `<div class="atlas-op-pos"><section class="card atlas-op-section"><div class="atlas-op-section-head"><div><h3>Catálogo</h3><p class="muted">Selecciona productos para agregarlos al carrito.</p></div></div><div class="atlas-op-product-grid">${products.length?products.map(p=>`<button class="atlas-op-product" data-atlas-cart-add="${p.id}" ${(+p.qty||0)<=0?'disabled':''}><strong>${esc(p.name)}</strong><span>${money(p.price)}</span><small>SKU ${esc(p.sku)} · stock ${number(p.qty)}</small></button>`).join(''):'<div class="empty-state">No hay productos POS.</div>'}</div></section><section class="card atlas-op-section"><div class="atlas-op-section-head"><h3>Carrito</h3><button class="button ghost small" data-atlas-cart-clear>Limpiar</button></div>${cart.length?`<div class="atlas-op-cart">${cart.map(x=>`<div><span><strong>${esc(x.name)}</strong><small>${x.qty} × ${money(x.price)}</small></span><span>${money(x.qty*x.price)}</span><button class="icon-button" data-atlas-cart-remove="${x.id}">−</button></div>`).join('')}</div>`:'<div class="empty-state">Carrito vacío</div>'}<div class="atlas-op-total"><span>Subtotal <b>${money(subtotal)}</b></span><span>Impuesto <b>${money(tax)}</b></span><strong>Total <b>${money(total)}</b></strong></div><button class="button primary wide" data-atlas-checkout ${cart.length?'':'disabled'}>Cobrar ${money(total)}</button></section></div>`+
 `<div class="atlas-op-tabs"><button class="active" data-atlas-set="pos.orders">Órdenes <span>${dataset('pos','orders').length}</span></button><button data-atlas-set="pos.products">Productos <span>${dataset('pos','products').length}</span></button></div>`+
 renderTable('pos','orders',SCHEMAS.pos.orders,dataset('pos','orders'));
}
function cartAdd(id){const p=dataset('pos','products').find(x=>x.id===id);if(!p||(+p.qty||0)<=0)return;const c=company();c.cart=c.cart||[];const x=c.cart.find(i=>i.productId===id);if(x){if(x.qty<(+p.qty||0))x.qty++}else c.cart.push({id:uid(),productId:id,sku:p.sku,name:p.name,price:+p.price||0,taxRate:+p.taxRate||0,qty:1});save();render('pos')}
function cartRemove(id){const c=company();c.cart=(c.cart||[]).filter(x=>x.id!==id);save();render('pos')}
function checkout(){const c=company(),cart=c.cart||[];if(!cart.length)return;const method=prompt('Método de pago: cash, card, other','card');if(!method)return;const subtotal=cart.reduce((a,x)=>a+x.qty*x.price,0),tax=cart.reduce((a,x)=>a+x.qty*x.price*(x.taxRate/100),0),total=subtotal+tax;const n=`POS-${String(Date.now()).slice(-8)}`;dataset('pos','orders').unshift({id:uid(),number:n,date:today(),items:cart.map(x=>`${x.qty}× ${x.name}`).join('; '),subtotal,tax,total,payment:method,status:'paid'});for(const x of cart){const p=dataset('pos','products').find(p=>p.id===x.productId);if(p)p.qty=Math.max(0,(+p.qty||0)-x.qty);const inv=dataset('inventory','items').find(i=>i.sku===x.sku);if(inv){inv.qty=(+inv.qty||0)-x.qty;dataset('inventory','movements').unshift({id:uid(),date:today(),sku:x.sku,type:'sale',qty:-x.qty,from:inv.location||'Main',to:'POS',reference:n})}}
 c.cart=[];log('pos.checkout',`${n} · ${money(total)} · ${method}`);save();render('pos');toast('Venta registrada',`${n} · ${money(total)}`)}

function renderAnalytics(){
 const invoices=dataset('finance','invoices'),bills=dataset('finance','bills'),leads=dataset('crm','leads'),projects=dataset('projects','projects'),trips=dataset('ride','trips'),orders=dataset('pos','orders');
 const revenue=invoices.reduce((a,x)=>a+(+x.total||0),0)+orders.reduce((a,x)=>a+(+x.total||0),0),cost=bills.reduce((a,x)=>a+(+x.total||0),0),pipeline=leads.filter(x=>!['won','lost'].includes(x.stage)).reduce((a,x)=>a+(+x.value||0),0),ride=trips.reduce((a,x)=>a+(+x.gross||0)+(+x.tips||0)-(+x.expense||0),0);
 return hero('ATLAS Analytics','Indicadores generados directamente desde los módulos operacionales.',`<button class="button primary" data-atlas-export>Exportar dataset</button>`)+
 `<div class="atlas-op-kpis">${card('Ingresos registrados',money(revenue),'Facturas + POS')}${card('CxP / costos',money(cost),'Bills')}${card('Pipeline CRM',money(pipeline),'Oportunidades abiertas')}${card('Ride neto',money(ride),'Antes de impuestos')}${card('Proyectos activos',projects.filter(x=>x.status==='active').length,'Seguimiento')}${card('Eventos auditados',company().audit.length,'Security log')}</div>`+
 `<section class="card atlas-op-section"><div class="atlas-op-section-head"><h3>Volumen por módulo</h3></div><div class="atlas-op-bars">${MODULES.filter(x=>SCHEMAS[x[0]]).map(([k,,label])=>{const n=moduleCounts(k);return `<div><span>${label}</span><div><i style="width:${Math.min(100,n*10)}%"></i></div><b>${n}</b></div>`}).join('')}</div></section>`;
}
function auditTable(limit=50){const rows=company().audit.slice(0,limit);return `<div class="atlas-op-table-wrap"><table class="data-table"><thead><tr><th>Fecha</th><th>Acción</th><th>Detalle</th></tr></thead><tbody>${rows.length?rows.map(x=>`<tr><td>${new Date(x.at).toLocaleString()}</td><td>${esc(x.action)}</td><td>${esc(x.detail)}</td></tr>`).join(''):'<tr><td colspan="3">Sin eventos</td></tr>'}</tbody></table></div>`}
function renderSecurity(){const users=dataset('security','users'),inc=dataset('security','incidents'),mfa=users.filter(x=>x.mfa==='enabled').length;const posture=[['MFA de usuarios',users.length?Math.round(mfa/users.length*100):100],['Auditoría local',100],['Cifrado backend',0],['RBAC backend',0],['Backups remotos',0]];return hero('ATLAS Security','Gobierno de acceso, incidentes y evidencia de auditoría.')+`<div class="atlas-op-kpis">${card('Usuarios',users.length,'Identidades')}${card('MFA',`${users.length?Math.round(mfa/users.length*100):100}%`,'Usuarios con MFA marcado')}${card('Incidentes abiertos',inc.filter(x=>!['resolved','contained'].includes(x.status)).length,'Security operations')}${card('Eventos de auditoría',company().audit.length,'Local')}</div><section class="card atlas-op-section"><div class="atlas-op-section-head"><h3>Postura de producción</h3></div><div class="atlas-op-posture">${posture.map(([a,b])=>`<div><span>${a}</span><div><i style="width:${b}%"></i></div><b>${b}%</b></div>`).join('')}</div><div class="atlas-op-notice">Los controles de cifrado, RBAC y backups remotos aparecen en 0% porque requieren backend real y secretos gestionados; ATLAS no los marca como activos sin evidencia técnica.</div></section>`+tabs('security',SCHEMAS.security,'users')+renderTable('security','users',SCHEMAS.security.users,users)+`<section class="card atlas-op-section"><div class="atlas-op-section-head"><h3>Auditoría</h3></div>${auditTable()}</section>`}
function renderSettings(){const c=company(),s=c.settings;return hero('ATLAS Settings','Configuración local del espacio de trabajo, respaldo y controles base.')+`<div class="atlas-op-settings"><section class="card atlas-op-section"><h3>Empresa</h3><label>Nombre<input id="atlas-setting-company" value="${esc(s.companyName)}"></label><label>Industria<input id="atlas-setting-industry" value="${esc(s.industry||'')}"></label><button class="button primary" data-atlas-settings-save>Guardar</button></section><section class="card atlas-op-section"><h3>Payroll defaults</h3><label>Social Security rate<input id="atlas-setting-ss" type="number" step="0.0001" value="${s.ssRate}"></label><label>Medicare rate<input id="atlas-setting-medicare" type="number" step="0.0001" value="${s.medicareRate}"></label><label>Retención federal estimada<input id="atlas-setting-withholding" type="number" step="0.0001" value="${s.withholdingRate}"></label><button class="button primary" data-atlas-settings-save>Guardar</button></section><section class="card atlas-op-section"><h3>Datos</h3><p class="muted">Exporta un respaldo JSON, importa uno previamente exportado o restablece solo el estado operacional ATLAS OS.</p><div class="atlas-op-actions"><button class="button ghost" data-atlas-export>Exportar JSON</button><label class="button ghost atlas-op-file">Importar JSON<input type="file" accept="application/json" data-atlas-import hidden></label><button class="button danger" data-atlas-reset>Restablecer</button></div></section><section class="card atlas-op-section"><h3>Estado técnico</h3><p><strong>Frontend:</strong> operacional local-first</p><p><strong>Persistencia:</strong> localStorage + backup JSON</p><p><strong>Backend:</strong> pendiente de conexión productiva</p><p><strong>Pagos:</strong> simulación POS, sin procesador externo</p><p><strong>Health:</strong> no usar PHI real en modo local</p></section></div>`}

function openForm(module,set,id){const schema=SCHEMAS[module]?.[set];if(!schema)return;const rows=dataset(module,set),obj=rows.find(x=>x.id===id)||{};const fields=schema.fields.map(([k,label,type='text',req,opts])=>{const val=obj[k]??(type==='date'?today():'');if(type==='select')return `<label>${esc(label)}<select name="${k}" ${req?'required':''}>${(opts||[]).map(o=>`<option value="${esc(o)}" ${String(val)===String(o)?'selected':''}>${esc(o)}</option>`).join('')}</select></label>`;if(type==='textarea')return `<label>${esc(label)}<textarea name="${k}" ${req?'required':''}>${esc(val)}</textarea></label>`;return `<label>${esc(label)}<input name="${k}" type="${type}" value="${esc(val)}" ${req?'required':''}></label>`}).join('');const root=$('#modal-root');root.innerHTML=`<div class="modal-backdrop"><form class="modal-card atlas-op-modal" data-atlas-form="${module}.${set}" data-id="${id||''}"><div class="modal-header"><div><p class="eyebrow">${esc(META[module]?.[2]||'ATLAS')}</p><h3>${id?'Editar':'Crear'} ${esc(schema.label)}</h3></div><button class="icon-button" type="button" data-atlas-close>✕</button></div><div class="modal-body form-grid">${fields}</div><div class="modal-footer"><button class="button ghost" type="button" data-atlas-close>Cancelar</button><button class="button primary" type="submit">Guardar</button></div></form></div>`}
function submitForm(form){const [module,set]=form.dataset.atlasForm.split('.'),schema=SCHEMAS[module][set],rows=dataset(module,set),id=form.dataset.id,existing=rows.find(x=>x.id===id),fd=new FormData(form),obj={...(existing||{}),id:existing?.id||uid()};for(const [k,,type='text'] of schema.fields){const v=fd.get(k);obj[k]=type==='number'?Number(v||0):v}if(module==='finance'&&(set==='invoices'||set==='bills')&&!obj.balance)obj.balance=obj.status==='paid'?0:+obj.total||0;if(existing)Object.assign(existing,obj);else rows.unshift(obj);log(`${module}.${set}.${existing?'update':'create'}`,obj.name||obj.number||obj.title||obj.reference||obj.employee||obj.sku||obj.id);save();$('#modal-root').innerHTML='';render(module);toast('Guardado',schema.label)}
function deleteRow(module,set,id){if(!confirm('¿Eliminar este registro?'))return;company().datasets[`${module}.${set}`]=dataset(module,set).filter(x=>x.id!==id);log(`${module}.${set}.delete`,id);save();render(module)}
function csv(module,set){const rows=dataset(module,set);if(!rows.length)return toast('CSV','No hay datos.');const cols=[...new Set(rows.flatMap(Object.keys))].filter(x=>x!=='id'),text=[cols.join(','),...rows.map(r=>cols.map(k=>`"${String(r[k]??'').replaceAll('"','""')}"`).join(','))].join('\n');download(`atlas-${module}-${set}-${today()}.csv`,text,'text/csv')}
function download(name,text,type='application/json'){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([text],{type}));a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)}
function exportData(){download(`atlas-os-backup-${today()}.json`,JSON.stringify(state,null,2));log('settings.export','JSON backup exported');toast('Respaldo exportado','ATLAS OS JSON')}
function importData(file){const r=new FileReader();r.onload=()=>{try{const x=JSON.parse(r.result);if(!x?.companies)throw new Error('Formato inválido');state=x;save();render(state.module||'dashboard');toast('Respaldo importado')}catch(e){toast('Importación fallida',e.message)}};r.readAsText(file)}
function saveSettings(){const c=company();c.settings.companyName=$('#atlas-setting-company')?.value||c.settings.companyName;c.settings.industry=$('#atlas-setting-industry')?.value||'';c.settings.ssRate=Number($('#atlas-setting-ss')?.value??c.settings.ssRate);c.settings.medicareRate=Number($('#atlas-setting-medicare')?.value??c.settings.medicareRate);c.settings.withholdingRate=Number($('#atlas-setting-withholding')?.value??c.settings.withholdingRate);log('settings.update',c.settings.companyName);save();toast('Configuración guardada');render('settings')}
function setActive(module,set){state.activeSet={...(state.activeSet||{}),[module]:set};save();if(module==='pos'&&set==='products'){const content=$('#content');content.innerHTML=hero('ATLAS POS','Gestión de catálogo POS.',`<button class="button primary" data-atlas-add="pos.products">＋ Producto</button>`)+tabs('pos',SCHEMAS.pos,'products')+renderTable('pos','products',SCHEMAS.pos.products,dataset('pos','products'));bindContent()}else render(module)}
function bindContent(){
 $$('[data-atlas-module]').forEach(b=>b.onclick=()=>render(b.dataset.atlasModule));
 $$('[data-atlas-set]').forEach(b=>b.onclick=()=>{const [m,s]=b.dataset.atlasSet.split('.');setActive(m,s)});
 $$('[data-atlas-add]').forEach(b=>b.onclick=()=>{const [m,s]=b.dataset.atlasAdd.split('.');openForm(m,s)});
 $$('[data-atlas-edit]').forEach(b=>b.onclick=()=>{const [m,s]=b.dataset.atlasEdit.split('.');openForm(m,s,b.dataset.id)});
 $$('[data-atlas-delete]').forEach(b=>b.onclick=()=>{const [m,s]=b.dataset.atlasDelete.split('.');deleteRow(m,s,b.dataset.id)});
 $$('[data-atlas-csv]').forEach(b=>b.onclick=()=>{const [m,s]=b.dataset.atlasCsv.split('.');csv(m,s)});
 $$('[data-atlas-filter]').forEach(i=>i.oninput=()=>{const q=i.value.toLowerCase();const section=i.closest('.atlas-op-section');$$('[data-atlas-row]',section).forEach(r=>r.hidden=!r.dataset.search.includes(q))});
 $$('[data-atlas-export]').forEach(b=>b.onclick=exportData);$$('[data-atlas-settings-save]').forEach(b=>b.onclick=saveSettings);
 $$('[data-atlas-payrun]').forEach(b=>b.onclick=runPayroll);
 $$('[data-atlas-cart-add]').forEach(b=>b.onclick=()=>cartAdd(b.dataset.atlasCartAdd));$$('[data-atlas-cart-remove]').forEach(b=>b.onclick=()=>cartRemove(b.dataset.atlasCartRemove));$$('[data-atlas-cart-clear]').forEach(b=>b.onclick=()=>{company().cart=[];save();render('pos')});$$('[data-atlas-checkout]').forEach(b=>b.onclick=checkout);
 const imp=$('[data-atlas-import]');if(imp)imp.onchange=()=>imp.files?.[0]&&importData(imp.files[0]);
 const reset=$('[data-atlas-reset]');if(reset)reset.onclick=()=>{if(confirm('¿Restablecer ATLAS OS operacional local?')){localStorage.removeItem(KEY);state=migrate();save();render('dashboard')}};
}
document.addEventListener('submit',e=>{const f=e.target.closest?.('[data-atlas-form]');if(f){e.preventDefault();submitForm(f)}});
document.addEventListener('click',e=>{if(e.target.closest('[data-atlas-close]')){$('#modal-root').innerHTML=''}});
const companySelect=$('#company-select');if(companySelect)companySelect.addEventListener('change',()=>setTimeout(()=>{const v=companySelect.value;if(state.companies[v])state.company=v;else{state.companies[v]=blankCompany();state.companies[v].settings.companyName=companySelect.options[companySelect.selectedIndex]?.text||'ATLAS Company';state.company=v}save();activate()},0));
const nav=$('#main-nav');if(nav)new MutationObserver(()=>{if(!nav.querySelector('.atlas-operational-nav')&&!$('#app-view')?.classList.contains('hidden'))setTimeout(activate,0)}).observe(nav,{childList:true,subtree:true});
const app=$('#app-view');if(app)new MutationObserver(()=>{if(!app.classList.contains('hidden'))setTimeout(activate,0)}).observe(app,{attributes:true,attributeFilter:['class']});
window.addEventListener('load',()=>setTimeout(activate,60));
})();
