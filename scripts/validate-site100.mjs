import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';

const site=await readFile('modules/public-site.js','utf8');
const visual=await readFile('modules/module-visual-runtime.js','utf8');
const tools=await readFile('modules/menu-tools.js','utf8');
const sensory=await readFile('modules/sensory.js','utf8');
const menu=await readFile('modules/menu-experience.js','utf8');
const entry=await readFile('worker-crm.js','utf8');
const pkg=JSON.parse(await readFile('package.json','utf8'));

const modules=[
 ['enterprise','/platform/enterprise-suite'],['finance','/platform/finance'],['operations','/platform/operations'],['hr-payroll','/platform/hr-payroll'],
 ['transportation','/platform/transportation'],['crm','/platform/crm'],['inventory','/platform/inventory'],['projects','/platform/projects'],
 ['reports','/platform/reports'],['documents','/platform/documents'],['integrations','/platform/integrations'],['settings','/platform/settings'],['audit-security','/platform/audit-security']
];
for(const [slug,route] of modules){
 assert.ok(site.includes(`slug:'${slug}'`),`public_module_missing:${slug}`);
 assert.ok(site.includes(`route:'${route}'`),`public_route_missing:${route}`);
 assert.ok(visual.includes(`'${route}'`),`module_visual_missing:${route}`);
}

for(const marker of ['/api/auth/login',"sessionStorage.setItem('atlas.session'",'location.assign(\'/dashboard\')','moduleSearch','/api/health','Open workspace'])assert.ok(site.includes(marker),`public_interaction_missing:${marker}`);
for(const marker of ['publicSiteRoutes','moduleVisualRuntimeScript','assetBindingRequest','repairDashboardNavigation','menuToolPage','/assets/atlas-module-visual.js'])assert.ok(entry.includes(marker),`entry_contract_missing:${marker}`);
assert.ok(entry.includes("target.pathname=target.pathname.slice('/assets'.length)||'/'"),'asset_binding_prefix_not_stripped');

const menuDestinations=new Map([
 ['/platform/enterprise-suite#companies','/platform/enterprise-suite'],['/platform/enterprise-suite#branches','/platform/enterprise-suite'],['/platform/enterprise-suite#departments','/platform/enterprise-suite'],['/platform/enterprise-suite#users','/platform/access-control'],['/platform/enterprise-suite#roles','/platform/access-control'],['/platform/enterprise-suite#audit','/platform/audit-security'],['/platform/enterprise-suite#logs','/platform/audit-security'],
 ['/platform/finance#general-ledger','/platform/finance/general-ledger'],['/platform/finance#accounts-payable','/platform/finance/accounts-payable'],['/platform/finance#accounts-receivable','/platform/finance/accounts-receivable'],['/platform/finance#banking','/platform/finance/banking'],['/platform/finance#reconciliations','/platform/finance/reconciliations'],['/platform/finance#budgets','/platform/finance/budgets'],['/platform/finance#statements','/platform/finance/statements'],['/platform/finance#taxes','/platform/finance/taxes'],['/platform/finance#fixed-assets','/platform/finance/fixed-assets'],
 ['/platform/operations#workflows','/platform/operations/workflows'],['/platform/operations#approvals','/platform/operations/approvals'],['/platform/operations#tasks','/platform/operations/tasks'],['/platform/operations#calendar','/platform/operations/calendar'],['/platform/operations#reminders','/platform/operations/reminders'],['/platform/operations#automation','/platform/operations/workflows'],['/platform/operations#alerts','/platform/operations/alerts'],
 ['/platform/hr-payroll#employees','/platform/hr-payroll/employees'],['/platform/hr-payroll#recruitment','/platform/hr-payroll/recruiting'],['/platform/hr-payroll#onboarding','/platform/hr-payroll/onboarding'],['/platform/hr-payroll#attendance','/platform/hr-payroll/time'],['/platform/hr-payroll#payroll','/platform/hr-payroll/payroll'],['/platform/hr-payroll#benefits','/platform/hr-payroll/benefits'],['/platform/hr-payroll#performance','/platform/hr-payroll/performance'],['/platform/hr-payroll#training','/platform/hr-payroll/training'],['/platform/hr-payroll#policies','/platform/documents'],
 ['/platform/operations#inventory','/platform/inventory'],['/platform/operations#products','/platform/inventory/items'],['/platform/operations#categories','/platform/inventory/categories'],['/platform/operations#warehouses','/platform/inventory/locations'],['/platform/operations#stock-movements','/platform/inventory/movements'],['/platform/operations#adjustments','/platform/inventory/adjustments'],['/platform/operations#cycle-counts','/platform/inventory/cycle-counts'],['/platform/operations#logistics','/platform/transportation'],
 ['/platform/enterprise-suite#projects','/platform/projects'],['/platform/enterprise-suite#documents','/platform/documents'],['/platform/enterprise-suite#reports','/platform/reports'],['/platform/enterprise-suite#bi','/platform/reports'],['/platform/enterprise-suite#custom-reports','/platform/reports'],['/platform/enterprise-suite#visualization','/platform/reports'],['/platform/enterprise-suite#kpis','/platform/reports'],['/platform/enterprise-suite#trends','/platform/reports'],['/platform/enterprise-suite#comparisons','/platform/reports'],['/platform/enterprise-suite#performance','/platform/reports'],['/dashboard#settings','/platform/settings']
]);
for(const [oldHref,target] of menuDestinations){
 assert.ok(menu.includes(`'${oldHref}'`)||menu.includes(`"${oldHref}"`),`dashboard_menu_source_missing:${oldHref}`);
 assert.ok(entry.includes(`'${oldHref}':'${target}'`),`dashboard_menu_rewrite_missing:${oldHref}->${target}`);
}

for(const route of ['/platform/operations/calendar','/platform/operations/reminders','/platform/operations/alerts','/platform/inventory/categories','/platform/inventory/adjustments'])assert.ok(tools.includes(`'${route}'`),`live_utility_view_missing:${route}`);
for(const api of ['/api/operations/tasks','/api/operations/overview','/api/operations/compliance','/api/inventory/items','/api/inventory/movements','/api/core/context'])assert.ok(tools.includes(api),`live_utility_api_missing:${api}`);
for(const marker of ['/platform/voice-vision','navigator.mediaDevices.getUserMedia','speechSynthesis','/api/sensory/status','serverMediaStorage: false'])assert.ok(sensory.includes(marker),`voice_vision_interaction_missing:${marker}`);

for(const route of ['/platform/inventory','/platform/transportation','/platform/projects','/platform/documents','/platform/reports','/platform/integrations','/platform/settings','/platform/access-control','/platform/audit-security','/platform/voice-vision'])assert.ok(entry.includes(route)||visual.includes(route),`functional_destination_missing:${route}`);

const images=[...site.matchAll(/image:'\/assets\/([^']+)'/g)].map(x=>x[1]);
const files=new Set(await readdir('assets'));
for(const image of images)assert.ok(files.has(image),`public_image_missing:${image}`);
for(const image of [...visual.matchAll(/'\/assets\/([^']+)'/g)].map(x=>x[1]))assert.ok(files.has(image),`module_visual_asset_missing:${image}`);

assert.equal(pkg.scripts['validate:site100'],'node scripts/validate-site100.mjs','site100_script_missing');
assert.ok(pkg.scripts['build:prod'].includes('validate:site100'),'site100_not_in_prod_build');
console.log(`ATLAS website 1-100 audit passed: ${menuDestinations.size} dashboard destinations, ${modules.length} public modules, login, imagery, live utility views, Voice & Vision and protected workspace visuals validated.`);
