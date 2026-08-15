import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';

const site=await readFile('modules/public-site.js','utf8');
const visual=await readFile('modules/module-visual-runtime.js','utf8');
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
for(const marker of ['publicSiteRoutes','moduleVisualRuntimeScript','assetBindingRequest','repairDashboardNavigation','/assets/atlas-module-visual.js'])assert.ok(entry.includes(marker),`entry_contract_missing:${marker}`);
assert.ok(entry.includes("target.pathname=target.pathname.slice('/assets'.length)||'/'"),'asset_binding_prefix_not_stripped');
for(const route of ['/platform/inventory','/platform/transportation','/platform/projects','/platform/documents','/platform/reports','/platform/integrations','/platform/settings','/platform/access-control','/platform/audit-security'])assert.ok(entry.includes(route),`server_navigation_rewrite_missing:${route}`);
const images=[...site.matchAll(/image:'\/assets\/([^']+)'/g)].map(x=>x[1]);
const files=new Set(await readdir('assets'));
for(const image of images)assert.ok(files.has(image),`public_image_missing:${image}`);
assert.equal(pkg.scripts['validate:site100'],'node scripts/validate-site100.mjs','site100_script_missing');
assert.ok(pkg.scripts['build:prod'].includes('validate:site100'),'site100_not_in_prod_build');
console.log('ATLAS website 1-100 navigation, login, imagery and module visual validation passed');
