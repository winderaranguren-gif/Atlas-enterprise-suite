const MODULE_VISUALS=[
 ['/platform/enterprise-suite','Enterprise Administration','Multi-company control, users, roles, business units and administration.','/assets/atlas-showcase-genesis.webp'],
 ['/platform/finance','Accounting & Finance','Ledger, AP, AR, banking, reconciliation, reporting, taxes and fixed assets.','/assets/atlas-finance-command.svg'],
 ['/platform/operations','Operations','Workflows, approvals, tasks, automation and operational execution.','/assets/atlas-operations-command.svg'],
 ['/platform/hr-payroll','HR & Payroll','Employees, talent, time, payroll, benefits, performance and learning.','/assets/atlas-hr-command.svg'],
 ['/platform/transportation','Transportation','Fleet, dispatch, routes, drivers, maintenance, fuel and trip operations.','/assets/atlas-transport-command.svg'],
 ['/platform/crm','CRM & Sales','Accounts, contacts, leads, pipeline, quotes, activities and communications.','/assets/atlas-crm-command.svg'],
 ['/platform/inventory','Inventory','Items, locations, movements, adjustments and cycle counts.','/assets/atlas-inventory-command.svg'],
 ['/platform/projects','Projects','Planning, budgets, milestones, resources, tasks and project reporting.','/assets/atlas-projects-command.svg'],
 ['/platform/reports','Reports & Analytics','KPIs, trends, comparisons, business intelligence and executive views.','/assets/atlas-reports-command.svg'],
 ['/platform/documents','Documents','Document center, templates, approvals, versions and archive.','/assets/atlas-documents-command.svg'],
 ['/platform/integrations','Integrations','Connections, synchronization, webhooks, API access and logs.','/assets/atlas-integrations-command.svg'],
 ['/platform/settings','Settings','Company preferences, notifications, localization, security and system controls.','/assets/atlas-scene-indigo-orbit.webp'],
 ['/platform/access-control','Access Control','Tenant-scoped users, roles, permissions and membership administration.','/assets/atlas-showcase-genesis.webp'],
 ['/platform/audit-security','Audit & Security','Audit evidence, security events and access-control decisions.','/assets/atlas-scene-glass-bridge.webp'],
 ['/platform/voice-vision','Voice & Vision','Consent-first sensory capabilities and multilingual interaction.','/assets/atlas-scene-indigo-orbit.webp'],
 ['/platform/bridge','ATLAS Bridge','Secure continuity and handoff across devices.','/assets/atlas-cloud-network-bg-v1.webp'],
 ['/platform/invest','Portfolio Lab','Portfolio intelligence and investment exploration.','/assets/atlas-reports-command.svg']
];

export function moduleVisualRuntimeScript(){return `(()=>{
const cfg=${JSON.stringify(MODULE_VISUALS)}.find(x=>location.pathname===x[0]||location.pathname.startsWith(x[0]+'/'));
if(!cfg||document.querySelector('[data-atlas-module-visual]'))return;
const [,name,description,image]=cfg;
const style=document.createElement('style');
style.textContent='.atlas-module-visual{position:fixed;right:14px;bottom:14px;z-index:9997;width:min(360px,calc(100vw - 28px));border:1px solid rgba(73,199,255,.42);border-radius:16px;background:rgba(4,16,29,.96);box-shadow:0 24px 70px rgba(0,0,0,.58),0 0 34px rgba(25,169,255,.12);overflow:hidden;color:#eef8ff;font:12px Inter,system-ui,sans-serif}.atlas-module-visual[open]{width:min(430px,calc(100vw - 28px))}.atlas-module-visual summary{list-style:none;cursor:pointer;padding:11px 13px;display:flex;gap:9px;align-items:center}.atlas-module-visual summary::-webkit-details-marker{display:none}.atlas-module-visual summary:before{content:"A";width:28px;height:28px;border:1px solid rgba(73,199,255,.55);border-radius:9px;display:grid;place-items:center;color:#49d2ff;font-weight:900}.atlas-module-visual summary b{font-size:11px;letter-spacing:.08em}.atlas-module-visual summary span{margin-left:auto;color:#71cfff;font-size:10px}.atlas-module-body{border-top:1px solid rgba(73,199,255,.18)}.atlas-module-body img{display:block;width:100%;height:170px;object-fit:cover}.atlas-module-copy{padding:12px 13px}.atlas-module-copy p{margin:4px 0 11px;color:#9eb7ca;line-height:1.5}.atlas-module-actions{display:flex;gap:7px}.atlas-module-actions a,.atlas-module-actions button{flex:1;border:1px solid rgba(73,199,255,.28);border-radius:9px;padding:8px;background:#ffffff08;color:#eaf7ff;text-decoration:none;text-align:center;cursor:pointer;font:inherit}@media(max-width:700px){.atlas-module-visual{right:8px;bottom:8px;width:calc(100vw - 16px)}.atlas-module-body img{height:130px}}';
document.head.appendChild(style);
const card=document.createElement('details');card.className='atlas-module-visual';card.dataset.atlasModuleVisual='1';
const summary=document.createElement('summary'),title=document.createElement('b'),hint=document.createElement('span');title.textContent=name;hint.textContent='About module';summary.append(title,hint);
const body=document.createElement('div');body.className='atlas-module-body';const img=document.createElement('img');img.src=image;img.alt=name+' visual';img.loading='lazy';
const copy=document.createElement('div');copy.className='atlas-module-copy';const p=document.createElement('p');p.textContent=description;const actions=document.createElement('div');actions.className='atlas-module-actions';
const dashboard=document.createElement('a');dashboard.href='/dashboard';dashboard.textContent='Dashboard';const refresh=document.createElement('button');refresh.type='button';refresh.textContent='Refresh';refresh.onclick=()=>location.reload();
actions.append(dashboard,refresh);copy.append(p,actions);body.append(img,copy);card.append(summary,body);document.body.append(card);
})();`}

export {MODULE_VISUALS};
