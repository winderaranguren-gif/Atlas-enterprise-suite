import fs from 'node:fs';
import { globalPromoPage } from '../modules/global-promo-ui.js';
import { globalPromoBillingPage } from '../modules/global-promo-billing-ui.js';

const read=path=>fs.readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
const api=read('modules/global-promo.js');
const schema=read('modules/global-promo-schema.js');
const ui=read('modules/global-promo-ui.js');
const integrity=read('modules/global-promo-integrity.js');
const commercialUi=read('modules/global-promo-commercial-ui.js');
const financeHandoff=read('modules/global-promo-finance-handoff.js');
const billingUi=read('modules/global-promo-billing-ui.js');
const worker=read('worker-meta.js');
const wrangler=read('wrangler.jsonc');

const requiredTables=['global_promo_jobs','global_promo_artwork_versions','global_promo_embroidery_specs','global_promo_material_requirements','global_promo_purchase_orders','global_promo_purchase_order_lines','global_promo_work_orders','global_promo_quality_checks','global_promo_packages'];
for(const table of requiredTables)if(!schema.includes(table))throw new Error(`Global Promo schema missing ${table}`);
for(const table of ['global_promo_finance_links','finance_invoice_payments'])if(!financeHandoff.includes(table))throw new Error(`Global Promo finance handoff missing ${table}`);

const requiredApis=['/api/global-promo/overview','/api/global-promo/jobs','/api/global-promo/artwork','/api/global-promo/embroidery','/api/global-promo/materials','/api/global-promo/purchase-orders','/api/global-promo/work-orders','/api/global-promo/quality','/api/global-promo/packages','/api/global-promo/costing'];
for(const route of requiredApis)if(!api.includes(route))throw new Error(`Global Promo API missing ${route}`);
for(const route of ['/api/global-promo/billing','/invoice','/payments'])if(!financeHandoff.includes(route))throw new Error(`Global Promo finance route missing ${route}`);
if(!integrity.includes('/commercial-context'))throw new Error('Post-request commercial linking endpoint missing');
for(const guard of ['quote_customer_scope_mismatch','purchase_order_inventory_item_not_found','global_promo.job.commercial_context.update'])if(!integrity.includes(guard))throw new Error(`Commercial/inventory integrity guard missing: ${guard}`);
for(const guard of ['quality_pass_required_before_packing','package_required_before_delivery','delivered_package_required','packages_not_delivered'])if(!integrity.includes(guard))throw new Error(`Mandatory QC/delivery transition guard missing: ${guard}`);
for(const guard of ['trg_finance_invoice_payments_validate','payment_exceeds_invoice_balance','invoice_not_payable','SUM(amount_cents)','finance.invoice.payment.record'])if(!financeHandoff.includes(guard))throw new Error(`Finance/payment integrity guard missing: ${guard}`);
if(!commercialUi.includes('commercialContextForm')||!commercialUi.includes('/commercial-context'))throw new Error('Commercial context UI is not functional');

const requiredPages=['overview','jobs','artwork','embroidery','materials','purchasing','production','quality','packing','costing'];
for(const section of requiredPages){const html=globalPromoPage(section);if(!html.includes('GLOBAL PROMO LLC · PRODUCTION ERP'))throw new Error(`Global Promo page failed for ${section}`);if(html.includes('href="#"'))throw new Error(`Blueprint href detected in ${section}`);if(!html.includes('scopeSelect'))throw new Error(`Scoped company selector missing in ${section}`)}
const billing=globalPromoBillingPage();
for(const marker of ['Billing & Payments','invoiceForm','paymentForm','/api/global-promo/billing','/invoice','/payments','/platform/finance/accounts-receivable'])if(!billing.includes(marker))throw new Error(`Billing workspace missing ${marker}`);
if(billing.includes('href="#"')||billing.includes('Coming Soon')||billing.includes('console.log('))throw new Error('Static/fake Billing control marker detected');
if(!billing.includes('Payment processing itself is not simulated here'))throw new Error('Billing workspace must distinguish payment recording from processor capture');

for(const route of ['/platform/crm','/platform/inventory','/platform/operations/vendors','/platform/operations/approvals','/platform/finance/accounts-receivable','/platform/finance/accounts-payable','/platform/finance/general-ledger'])if(!ui.includes(route))throw new Error(`Connected ATLAS route missing: ${route}`);
for(const control of ['jobForm','artForm','embForm','materialForm','poForm','workForm','qcForm','packageForm'])if(!ui.includes(control))throw new Error(`Functional control missing: ${control}`);
for(const guard of ['requireTenantPermission','appendAuditLedger','organizationId','dbaId','invalid_job_status_transition','work_orders_incomplete','quality_pass_required','packages_not_delivered','purchase_order_approval_role_required'])if(!api.includes(guard))throw new Error(`Security/workflow guard missing: ${guard}`);
for(const wiring of ['globalPromoRoutes','globalPromoCommercialContextRoute','preflightGlobalPromoRequest','enhanceGlobalPromoCommercialUI','globalPromoFinanceHandoffRoutes','globalPromoBillingPage','enhanceGlobalPromoBillingNavigation','href="/platform/global-promo"'])if(!worker.includes(wiring))throw new Error(`Canonical Global Promo wiring missing: ${wiring}`);
if(!worker.includes('requireBrowserSession'))throw new Error('Global Promo protected UI session gate missing');
if(!worker.includes("'/feeds/meta/atlas-catalog.csv'"))throw new Error('Canonical Meta catalog feed mapping drifted');
if(!wrangler.includes('"main": "worker-meta.js"'))throw new Error('Canonical production entrypoint changed unexpectedly');
if(/\$\d+(?:\.\d+)?M\b|2\.45M|245,800|1,783/.test(ui+billingUi))throw new Error('Fabricated dashboard metric pattern detected');
if([ui,commercialUi,billingUi].some(source=>source.includes('Coming Soon')||source.includes('console.log(')))throw new Error('Static/fake control marker detected');
console.log('Global Promo Production ERP validation passed');