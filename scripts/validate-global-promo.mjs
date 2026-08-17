import fs from 'node:fs';
import { globalPromoPage } from '../modules/global-promo-ui.js';

const read=path=>fs.readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
const api=read('modules/global-promo.js');
const schema=read('modules/global-promo-schema.js');
const ui=read('modules/global-promo-ui.js');
const worker=read('worker-meta.js');
const wrangler=read('wrangler.jsonc');

const requiredTables=['global_promo_jobs','global_promo_artwork_versions','global_promo_embroidery_specs','global_promo_material_requirements','global_promo_purchase_orders','global_promo_purchase_order_lines','global_promo_work_orders','global_promo_quality_checks','global_promo_packages'];
for(const table of requiredTables)if(!schema.includes(table))throw new Error(`Global Promo schema missing ${table}`);

const requiredApis=['/api/global-promo/overview','/api/global-promo/jobs','/api/global-promo/artwork','/api/global-promo/embroidery','/api/global-promo/materials','/api/global-promo/purchase-orders','/api/global-promo/work-orders','/api/global-promo/quality','/api/global-promo/packages','/api/global-promo/costing'];
for(const route of requiredApis)if(!api.includes(route))throw new Error(`Global Promo API missing ${route}`);

const requiredPages=['overview','jobs','artwork','embroidery','materials','purchasing','production','quality','packing','costing'];
for(const section of requiredPages){const html=globalPromoPage(section);if(!html.includes('GLOBAL PROMO LLC · PRODUCTION ERP'))throw new Error(`Global Promo page failed for ${section}`);if(html.includes('href="#"'))throw new Error(`Blueprint href detected in ${section}`);if(!html.includes('scopeSelect'))throw new Error(`Scoped company selector missing in ${section}`)}

for(const route of ['/platform/crm','/platform/inventory','/platform/operations/vendors','/platform/operations/approvals','/platform/finance/accounts-receivable','/platform/finance/accounts-payable','/platform/finance/general-ledger'])if(!ui.includes(route))throw new Error(`Connected ATLAS route missing: ${route}`);
for(const control of ['jobForm','artForm','embForm','materialForm','poForm','workForm','qcForm','packageForm'])if(!ui.includes(control))throw new Error(`Functional control missing: ${control}`);
for(const guard of ['requireTenantPermission','appendAuditLedger','organizationId','dbaId','invalid_job_status_transition','work_orders_incomplete','quality_pass_required','packages_not_delivered','purchase_order_approval_role_required'])if(!api.includes(guard))throw new Error(`Security/workflow guard missing: ${guard}`);
if(!worker.includes("globalPromoRoutes"))throw new Error('Global Promo is not registered in canonical worker-meta.js');
if(!worker.includes("requireBrowserSession"))throw new Error('Global Promo protected UI session gate missing');
if(!wrangler.includes('"main": "worker-meta.js"'))throw new Error('Canonical production entrypoint changed unexpectedly');
if(/\$\d+(?:\.\d+)?M\b|2\.45M|245,800|1,783/.test(ui))throw new Error('Fabricated dashboard metric pattern detected');
if(ui.includes('Coming Soon')||ui.includes('console.log('))throw new Error('Static/fake control marker detected');
console.log('Global Promo Production ERP validation passed');
