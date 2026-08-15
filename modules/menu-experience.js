import { ATLAS_VERSION } from './version.js';

const html=(body,status=200)=>new Response(body,{status,headers:{
  'content-type':'text/html; charset=utf-8',
  'cache-control':'no-store',
  'x-content-type-options':'nosniff',
  'referrer-policy':'strict-origin-when-cross-origin',
  'permissions-policy':'camera=(), microphone=(), geolocation=()',
  'content-security-policy':"default-src 'self'; img-src 'self' data:; style-src 'unsafe-inline'; script-src 'unsafe-inline' 'self'; connect-src 'self'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'"
}});

const icons={
  dashboard:'⌂', enterprise:'◈', finance:'＄', operations:'⌁', hr:'♙', crm:'◎', inventory:'▦', logistics:'⇄',
  projects:'▣', documents:'▤', reports:'⌁', ai:'✦', settings:'⚙', search:'⌕', menu:'☰', compact:'◧', close:'×'
};

const menu=[
  {id:'dashboard',label:'Dashboard',icon:icons.dashboard,href:'/dashboard'},
  {id:'enterprise',label:'Enterprise',icon:icons.enterprise,href:'/platform/enterprise-suite',children:[
    ['Companies','/platform/enterprise-suite#companies'],['Branches','/platform/enterprise-suite#branches'],['Departments','/platform/enterprise-suite#departments'],['User Management','/platform/enterprise-suite#users'],['Roles & Permissions','/platform/enterprise-suite#roles'],['Audit Trail','/platform/enterprise-suite#audit'],['System Logs','/platform/enterprise-suite#logs']
  ]},
  {id:'finance',label:'Finance',icon:icons.finance,href:'/platform/finance',children:[
    ['Dashboard','/platform/finance'],['General Ledger','/platform/finance#general-ledger'],['Accounts Payable','/platform/finance#accounts-payable'],['Accounts Receivable','/platform/finance#accounts-receivable'],['Banking','/platform/finance#banking'],['Reconciliations','/platform/finance#reconciliations'],['Budgets','/platform/finance#budgets'],['Financial Statements','/platform/finance#statements'],['Taxes','/platform/finance#taxes'],['Fixed Assets','/platform/finance#fixed-assets']
  ]},
  {id:'operations',label:'Operations',icon:icons.operations,href:'/platform/operations',children:[
    ['Dashboard','/platform/operations'],['Workflows','/platform/operations#workflows'],['Approvals','/platform/operations#approvals'],['Tasks','/platform/operations#tasks'],['Calendar','/platform/operations#calendar'],['Reminders','/platform/operations#reminders'],['Process Automation','/platform/operations#automation'],['Alerts','/platform/operations#alerts']
  ]},
  {id:'hr',label:'Human Resources',icon:icons.hr,href:'/platform/hr-payroll',children:[
    ['Employees','/platform/hr-payroll#employees'],['Recruitment','/platform/hr-payroll#recruitment'],['Onboarding','/platform/hr-payroll#onboarding'],['Time & Attendance','/platform/hr-payroll#attendance'],['Payroll','/platform/hr-payroll#payroll'],['Benefits','/platform/hr-payroll#benefits'],['Performance','/platform/hr-payroll#performance'],['Training','/platform/hr-payroll#training'],['Policies & Documents','/platform/hr-payroll#policies']
  ]},
  {id:'crm',label:'Sales & CRM',icon:icons.crm,href:'/platform/crm',children:[
    ['CRM Dashboard','/platform/crm'],['Leads','/platform/crm#leads'],['Contacts','/platform/crm#contacts'],['Opportunities','/platform/crm#opportunities'],['Quotes','/platform/crm#quotes'],['Activities','/platform/crm#activities']
  ]},
  {id:'inventory',label:'Inventory',icon:icons.inventory,href:'/platform/operations#inventory',children:[
    ['Products','/platform/operations#products'],['Categories','/platform/operations#categories'],['Warehouses','/platform/operations#warehouses'],['Stock Movements','/platform/operations#stock-movements'],['Adjustments','/platform/operations#adjustments'],['Cycle Counts','/platform/operations#cycle-counts']
  ]},
  {id:'logistics',label:'Logistics',icon:icons.logistics,href:'/platform/operations#logistics'},
  {id:'projects',label:'Projects',icon:icons.projects,href:'/platform/enterprise-suite#projects'},
  {id:'documents',label:'Documents',icon:icons.documents,href:'/platform/enterprise-suite#documents'},
  {id:'reports',label:'Reports & Analytics',icon:icons.reports,href:'/platform/enterprise-suite#reports',children:[
    ['Business Intelligence','/platform/enterprise-suite#bi'],['Custom Reports','/platform/enterprise-suite#custom-reports'],['Data Visualization','/platform/enterprise-suite#visualization'],['KPIs','/platform/enterprise-suite#kpis'],['Trends','/platform/enterprise-suite#trends'],['Comparisons','/platform/enterprise-suite#comparisons'],['Performance','/platform/enterprise-suite#performance']
  ]},
  {id:'ai',label:'AI Assistant',icon:icons.ai,href:'/platform/voice-vision'},
  {id:'settings',label:'Settings',icon:icons.settings,href:'/dashboard#settings'}
];

const navMarkup=menu.map(item=>{
  const children=item.children?.map(([label,href])=>`<a class="sub-link" href="${href}"><span>${label}</span><span class="sub-arrow">›</span></a>`).join('')||'';
  return `<div class="nav-group" data-menu-group="${item.id}" data-search="${item.label.toLowerCase()} ${item.children?.map(c=>c[0].toLowerCase()).join(' ')||''}">
    <div class="nav-row ${item.id==='dashboard'?'active':''}">
      <a class="nav-link" href="${item.href}"><span class="nav-icon">${item.icon}</span><span class="nav-label">${item.label}</span></a>
      ${item.children?`<button class="expand" type="button" aria-label="Expand ${item.label}" aria-expanded="false">⌄</button>`:''}
    </div>
    ${item.children?`<div class="submenu">${children}</div>`:''}
  </div>`;
}).join('');

const css=`
:root{color-scheme:dark;--bg:#020711;--panel:rgba(5,17,32,.88);--panel2:rgba(8,25,45,.78);--line:rgba(55,174,255,.22);--line-strong:rgba(59,190,255,.58);--text:#eff8ff;--muted:#8fa9c0;--blue:#16a9ff;--cyan:#43d7ff;--violet:#7f6dff;--green:#44e49a;--shadow:0 22px 70px rgba(0,0,0,.36),0 0 42px rgba(25,142,255,.08);--sidebar:260px}
*{box-sizing:border-box}html,body{min-height:100%;margin:0}body{font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;background:#020711;color:var(--text);overflow-x:hidden}body:before{content:"";position:fixed;inset:0;z-index:-3;background:linear-gradient(118deg,rgba(1,6,15,.98),rgba(2,14,29,.88) 54%,rgba(2,5,14,.98)),url('/assets/atlas-scene-indigo-orbit.webp') center/cover no-repeat}body:after{content:"";position:fixed;inset:0;z-index:-2;pointer-events:none;background:radial-gradient(circle at 18% 10%,rgba(0,170,255,.14),transparent 26%),radial-gradient(circle at 82% 24%,rgba(102,78,255,.12),transparent 24%),linear-gradient(rgba(38,159,255,.028) 1px,transparent 1px),linear-gradient(90deg,rgba(38,159,255,.028) 1px,transparent 1px);background-size:auto,auto,42px 42px,42px 42px}.app{min-height:100vh;display:grid;grid-template-columns:var(--sidebar) minmax(0,1fr);transition:grid-template-columns .24s ease}.sidebar{height:100vh;position:sticky;top:0;padding:14px 12px;border-right:1px solid var(--line);background:linear-gradient(180deg,rgba(3,13,25,.96),rgba(3,11,22,.88));backdrop-filter:blur(22px);box-shadow:18px 0 55px rgba(0,0,0,.25);z-index:30;overflow:auto}.brand{height:72px;display:flex;align-items:center;gap:13px;padding:9px 10px 14px;border-bottom:1px solid var(--line);margin-bottom:10px;text-decoration:none;color:inherit}.logo{width:44px;height:44px;display:grid;place-items:center;font-size:30px;font-weight:900;font-style:italic;color:transparent;-webkit-text-stroke:2px #61dcff;filter:drop-shadow(0 0 13px rgba(26,178,255,.55))}.brand-copy strong{display:block;letter-spacing:.28em;font-size:1rem}.brand-copy small{display:block;margin-top:4px;color:#8db9d9;font-size:.56rem;letter-spacing:.2em}.menu{display:grid;gap:4px}.nav-group{border-radius:12px}.nav-row{display:flex;align-items:center;border:1px solid transparent;border-radius:11px;transition:.18s}.nav-row:hover,.nav-row.active{border-color:rgba(48,170,255,.28);background:linear-gradient(90deg,rgba(18,111,200,.28),rgba(11,50,91,.1));box-shadow:inset 3px 0 #35c7ff,0 0 22px rgba(0,158,255,.08)}.nav-link{flex:1;min-width:0;display:flex;align-items:center;gap:11px;padding:10px 11px;color:#c9d8e5;text-decoration:none;font-size:.78rem}.nav-icon{width:24px;text-align:center;color:#70d9ff;font-size:1rem}.nav-label{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.expand{width:34px;height:34px;margin-right:5px;border:0;border-radius:9px;background:transparent;color:#7eabc9;cursor:pointer;transition:.18s}.expand:hover{background:#ffffff0b;color:white}.nav-group.open .expand{transform:rotate(180deg)}.submenu{max-height:0;overflow:hidden;transition:max-height .24s ease}.nav-group.open .submenu{max-height:640px}.sub-link{display:flex;align-items:center;justify-content:space-between;margin-left:38px;padding:8px 10px 8px 14px;border-left:1px solid rgba(72,185,255,.2);color:#8fa8bd;text-decoration:none;font-size:.7rem}.sub-link:hover{color:white;border-left-color:#48c6ff;background:linear-gradient(90deg,rgba(31,144,226,.12),transparent)}.sub-arrow{opacity:.45}.sidebar-footer{margin-top:16px;padding:12px 10px;border-top:1px solid var(--line);display:flex;align-items:center;gap:10px}.avatar{width:36px;height:36px;border-radius:50%;display:grid;place-items:center;background:radial-gradient(circle at 35% 25%,#62e0ff,#1d579e 56%,#071523);border:1px solid #70dbff;font-weight:800}.sidebar-footer strong{display:block;font-size:.72rem}.sidebar-footer small{display:block;margin-top:3px;color:#6fbce8;font-size:.61rem}.main{min-width:0;padding:14px 18px 28px}.topbar{height:72px;display:flex;align-items:center;gap:12px;position:sticky;top:0;z-index:20;margin-bottom:14px;padding:10px 12px;border:1px solid var(--line);border-radius:16px;background:linear-gradient(145deg,rgba(7,23,42,.88),rgba(3,13,26,.83));backdrop-filter:blur(22px);box-shadow:var(--shadow)}.mobile-menu{display:none}.title{min-width:180px}.title strong{display:block;font-size:.85rem;letter-spacing:.14em}.title small{display:block;margin-top:3px;color:var(--muted);font-size:.62rem}.search{flex:1;max-width:690px;margin:auto;position:relative}.search input{width:100%;height:42px;border:1px solid rgba(66,183,255,.28);border-radius:12px;background:#07182a;color:white;padding:0 42px 0 14px;outline:none}.search input:focus{border-color:#45c7ff;box-shadow:0 0 0 3px rgba(46,173,255,.1)}.search span{position:absolute;right:13px;top:10px;color:#68cffa}.top-actions{display:flex;gap:8px}.icon-btn{height:42px;min-width:42px;padding:0 12px;border:1px solid var(--line);border-radius:12px;background:#ffffff08;color:#c7e3f7;cursor:pointer}.icon-btn:hover{border-color:var(--line-strong);background:#0b2742}.content{display:grid;gap:14px}.hero{display:grid;grid-template-columns:minmax(0,1.3fr) minmax(320px,.7fr);gap:14px}.glass{border:1px solid var(--line);background:linear-gradient(145deg,rgba(7,24,44,.86),rgba(3,13,26,.78));border-radius:18px;box-shadow:var(--shadow);backdrop-filter:blur(18px)}.hero-main{min-height:330px;padding:24px;position:relative;overflow:hidden}.hero-main:before{content:"";position:absolute;inset:0;background:linear-gradient(100deg,rgba(4,14,29,.94),rgba(4,20,40,.62)),url('/assets/atlas-showcase-genesis.webp') center/cover;opacity:.68}.hero-copy{position:relative;z-index:1;max-width:640px}.eyebrow{color:#5cd6ff;text-transform:uppercase;letter-spacing:.18em;font-weight:800;font-size:.64rem}.hero h1{font-size:clamp(2rem,4vw,4.6rem);line-height:.94;margin:18px 0 14px;letter-spacing:-.045em}.hero p{max-width:620px;color:#a6bed2;line-height:1.65;margin:0}.chips{display:flex;gap:8px;flex-wrap:wrap;margin-top:24px}.chip{border:1px solid var(--line);border-radius:999px;padding:8px 11px;color:#b9d3e5;background:#ffffff07;font-size:.66rem}.command{padding:18px;display:grid;align-content:start}.command h2{margin:2px 0 5px;font-size:.9rem;letter-spacing:.12em}.command>p{color:var(--muted);font-size:.72rem;margin:0 0 14px}.quick-grid{display:grid;grid-template-columns:1fr 1fr;gap:9px}.quick{min-height:86px;border:1px solid var(--line);border-radius:13px;padding:12px;text-decoration:none;color:inherit;background:linear-gradient(145deg,rgba(10,38,66,.72),rgba(4,17,31,.68));transition:.18s}.quick:hover{transform:translateY(-2px);border-color:#44c8ff;box-shadow:0 0 25px rgba(29,163,255,.12)}.quick b{display:block;font-size:.74rem}.quick span{display:block;margin-top:6px;color:#80a4bd;font-size:.62rem}.metrics{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px}.metric{padding:17px;min-height:118px}.metric span{color:#8fa9bf;font-size:.62rem;text-transform:uppercase;letter-spacing:.1em}.metric strong{display:block;font-size:1.55rem;font-weight:520;margin:10px 0 4px}.metric small{color:var(--green);font-size:.62rem}.workspace{display:grid;grid-template-columns:minmax(0,1.4fr) minmax(300px,.6fr);gap:14px}.chart,.activity{padding:18px;min-height:310px}.section-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:15px}.section-head h2{margin:0;font-size:.84rem;letter-spacing:.12em}.section-head span{font-size:.62rem;color:var(--muted)}.chart-area{height:220px;border-radius:14px;border:1px solid rgba(44,157,235,.15);background:linear-gradient(180deg,rgba(17,89,147,.08),transparent),repeating-linear-gradient(0deg,transparent 0 43px,rgba(63,161,228,.06) 44px),repeating-linear-gradient(90deg,transparent 0 70px,rgba(63,161,228,.045) 71px);position:relative;overflow:hidden}.chart-line{position:absolute;left:5%;right:5%;top:16%;bottom:12%;filter:drop-shadow(0 0 8px rgba(52,194,255,.7))}.chart-line svg{width:100%;height:100%}.activity-list{display:grid;gap:10px}.event{display:grid;grid-template-columns:10px 1fr auto;gap:10px;align-items:start;padding:10px 0;border-bottom:1px solid rgba(60,157,220,.12)}.dot{width:8px;height:8px;border-radius:50%;background:var(--cyan);box-shadow:0 0 12px var(--cyan);margin-top:5px}.event b{display:block;font-size:.69rem}.event span{display:block;color:#7f9bb1;font-size:.61rem;margin-top:3px}.event time{font-size:.58rem;color:#6487a1}.mobile-nav{display:none}.compact .app{--sidebar:82px}.compact .brand-copy,.compact .nav-label,.compact .expand,.compact .sidebar-footer span{display:none}.compact .brand{justify-content:center;padding-left:0;padding-right:0}.compact .nav-link{justify-content:center;padding-left:0;padding-right:0}.compact .nav-icon{font-size:1.15rem}.compact .submenu{display:none}.compact .sidebar-footer{justify-content:center}.filter-hidden{display:none!important}.empty-search{display:none;color:#7fa3bb;font-size:.72rem;padding:18px 11px}.search-empty .empty-search{display:block}
@media(max-width:1180px){:root{--sidebar:220px}.hero{grid-template-columns:1fr}.command{display:none}.metrics{grid-template-columns:repeat(2,1fr)}.workspace{grid-template-columns:1fr}.activity{min-height:auto}}
@media(max-width:840px){body{padding-bottom:74px}.app{display:block}.sidebar{position:fixed;left:0;top:0;width:min(82vw,310px);transform:translateX(-105%);transition:transform .22s ease;box-shadow:26px 0 70px rgba(0,0,0,.5)}.nav-open .sidebar{transform:translateX(0)}.nav-open:after{content:"";position:fixed;inset:0;background:rgba(0,0,0,.52);z-index:25}.main{padding:10px}.topbar{height:66px;border-radius:14px}.mobile-menu{display:inline-grid;place-items:center}.title{display:none}.top-actions .compact-toggle{display:none}.metrics{grid-template-columns:1fr 1fr}.hero-main{min-height:300px;padding:20px}.mobile-nav{display:grid;grid-template-columns:repeat(5,1fr);position:fixed;left:8px;right:8px;bottom:8px;height:58px;z-index:40;border:1px solid var(--line);border-radius:16px;background:rgba(3,14,27,.94);backdrop-filter:blur(20px);box-shadow:0 18px 55px rgba(0,0,0,.45)}.mobile-nav a{display:grid;place-items:center;align-content:center;gap:2px;text-decoration:none;color:#8baec6;font-size:.56rem}.mobile-nav b{font-size:1rem;color:#6edaff}.mobile-nav a.active{color:white}.mobile-nav a.active b{filter:drop-shadow(0 0 8px #31bfff)}}
@media(max-width:560px){.main{padding:8px}.topbar{gap:7px;padding:8px}.search input{height:40px;font-size:.78rem}.icon-btn{height:40px;min-width:40px;padding:0 9px}.top-actions .ai-shortcut{display:none}.metrics{grid-template-columns:1fr}.hero-main{min-height:330px}.hero h1{font-size:2.45rem}.workspace{display:block}.activity{margin-top:12px}.chart{min-height:280px}.chart-area{height:195px}}
`;

function page(){return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#020711"><meta name="robots" content="noindex,nofollow"><title>ATLAS Command Center</title><style>${css}</style></head><body>
<div class="app-shell"><div class="app">
  <aside class="sidebar" aria-label="ATLAS main navigation">
    <a class="brand" href="/"><span class="logo">A</span><span class="brand-copy"><strong>ATLAS</strong><small>ENTERPRISE SUITE</small></span></a>
    <nav class="menu" id="mainMenu">${navMarkup}</nav>
    <div class="empty-search" id="emptySearch">No menu items match your search.</div>
    <div class="sidebar-footer"><span class="avatar">W</span><span><strong>Winder Aranguren</strong><small>Founder & Developer</small></span></div>
  </aside>

  <section class="main">
    <header class="topbar">
      <button class="icon-btn mobile-menu" id="mobileMenu" type="button" aria-label="Open menu">${icons.menu}</button>
      <div class="title"><strong>ATLAS COMMAND CENTER</strong><small>Neon adaptive navigation · v${ATLAS_VERSION}</small></div>
      <label class="search"><input id="menuSearch" autocomplete="off" placeholder="Search menu, module or action…" aria-label="Search ATLAS menu"><span>${icons.search}</span></label>
      <div class="top-actions"><a class="icon-btn ai-shortcut" href="/platform/voice-vision" aria-label="Open AI Assistant" style="display:grid;place-items:center;text-decoration:none">${icons.ai}</a><button class="icon-btn compact-toggle" id="compactToggle" type="button" aria-label="Toggle compact navigation">${icons.compact}</button></div>
    </header>

    <main class="content">
      <section class="hero">
        <article class="glass hero-main"><div class="hero-copy"><div class="eyebrow">Adaptive enterprise navigation</div><h1>Welcome back.<br>Everything starts here.</h1><p>One navigation system for desktop, tablet and mobile, with fast expandable submenus, instant filtering and direct access to the operating areas of ATLAS.</p><div class="chips"><span class="chip">Fast dropdowns</span><span class="chip">Responsive navigation</span><span class="chip">Compact mode</span><span class="chip">Persistent preferences</span></div></div></article>
        <aside class="glass command"><h2>QUICK ACCESS</h2><p>Your most-used ATLAS workspaces.</p><div class="quick-grid"><a class="quick" href="/platform/finance"><b>Finance</b><span>Accounting & reporting</span></a><a class="quick" href="/platform/operations"><b>Operations</b><span>Workflows & automation</span></a><a class="quick" href="/platform/hr-payroll"><b>Human Resources</b><span>People & payroll</span></a><a class="quick" href="/platform/crm"><b>Sales & CRM</b><span>Customers & growth</span></a></div></aside>
      </section>

      <section class="metrics">
        <article class="glass metric"><span>Total Revenue</span><strong>$2.45M</strong><small>▲ 12.5% vs last month</small></article>
        <article class="glass metric"><span>Net Profit</span><strong>$245,800</strong><small>▲ 8.2% current period</small></article>
        <article class="glass metric"><span>Orders</span><strong>1,783</strong><small>▲ 4.7% active volume</small></article>
        <article class="glass metric"><span>Employees</span><strong>156</strong><small>● workforce online</small></article>
      </section>

      <section class="workspace">
        <article class="glass chart"><div class="section-head"><h2>REVENUE OVERVIEW</h2><span>Live visual preview</span></div><div class="chart-area"><div class="chart-line"><svg viewBox="0 0 1000 260" preserveAspectRatio="none" aria-hidden="true"><defs><linearGradient id="fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2bc8ff" stop-opacity=".34"/><stop offset="1" stop-color="#2bc8ff" stop-opacity="0"/></linearGradient></defs><path d="M0,205 C90,178 110,190 185,148 S310,155 390,110 S520,140 605,83 S740,92 810,52 S925,70 1000,24 L1000,260 L0,260 Z" fill="url(#fill)"/><path d="M0,205 C90,178 110,190 185,148 S310,155 390,110 S520,140 605,83 S740,92 810,52 S925,70 1000,24" fill="none" stroke="#43d7ff" stroke-width="4"/></svg></div></div></article>
        <aside class="glass activity"><div class="section-head"><h2>RECENT ACTIVITY</h2><span>System feed</span></div><div class="activity-list"><div class="event"><i class="dot"></i><div><b>Finance workspace synchronized</b><span>Reporting state updated</span></div><time>Now</time></div><div class="event"><i class="dot"></i><div><b>Operations automation ready</b><span>Workflow engine available</span></div><time>2m</time></div><div class="event"><i class="dot"></i><div><b>HR Knowledge connected</b><span>People modules available</span></div><time>8m</time></div><div class="event"><i class="dot"></i><div><b>ATLAS AI online</b><span>Assistant route operational</span></div><time>12m</time></div></div></aside>
      </section>
    </main>
  </section>
</div></div>
<nav class="mobile-nav" aria-label="Mobile quick navigation"><a class="active" href="/dashboard"><b>⌂</b><span>Home</span></a><a href="/platform/finance"><b>＄</b><span>Finance</span></a><a href="/platform/operations"><b>⌁</b><span>Operations</span></a><a href="/platform/hr-payroll"><b>♙</b><span>People</span></a><a href="/platform/voice-vision"><b>✦</b><span>AI</span></a></nav>
<script>
(function(){
  var root=document.documentElement;
  var shell=document.querySelector('.app-shell');
  var compact=document.getElementById('compactToggle');
  var mobile=document.getElementById('mobileMenu');
  var search=document.getElementById('menuSearch');
  var menu=document.getElementById('mainMenu');
  var savedCompact=localStorage.getItem('atlas.menu.compact')==='1';
  if(savedCompact) root.classList.add('compact');
  compact.addEventListener('click',function(){root.classList.toggle('compact');localStorage.setItem('atlas.menu.compact',root.classList.contains('compact')?'1':'0');});
  mobile.addEventListener('click',function(){root.classList.toggle('nav-open');});
  document.addEventListener('click',function(e){if(root.classList.contains('nav-open') && !e.target.closest('.sidebar') && !e.target.closest('#mobileMenu')) root.classList.remove('nav-open');});
  menu.addEventListener('click',function(e){var btn=e.target.closest('.expand');if(!btn)return;var group=btn.closest('.nav-group');var open=group.classList.toggle('open');btn.setAttribute('aria-expanded',open?'true':'false');localStorage.setItem('atlas.menu.open.'+group.dataset.menuGroup,open?'1':'0');});
  Array.prototype.forEach.call(menu.querySelectorAll('.nav-group'),function(group){if(localStorage.getItem('atlas.menu.open.'+group.dataset.menuGroup)==='1'){group.classList.add('open');var btn=group.querySelector('.expand');if(btn)btn.setAttribute('aria-expanded','true');}});
  search.addEventListener('input',function(){var q=search.value.trim().toLowerCase();var shown=0;Array.prototype.forEach.call(menu.querySelectorAll('.nav-group'),function(group){var match=!q || group.dataset.search.indexOf(q)!==-1;group.classList.toggle('filter-hidden',!match);if(match){shown++;if(q && group.querySelector('.submenu')) group.classList.add('open');}});shell.classList.toggle('search-empty',shown===0);});
})();
</script></body></html>`}

export async function menuExperienceRoutes(request,env,url){
  if(request.method!=='GET') return null;
  if(url.pathname==='/dashboard' || url.pathname==='/menu-experience') return html(page());
  return null;
}
