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
for(const guard of ['quote_customer_scope_mismatch','purchase_order_inventory_item_not_found','global_promo.job.commercial_context.update','commercial_context_locked_after_invoice'])if(!integrity.includes(guard))throw new Error(`Commercial/inventory integrity guard missing: ${guard}`);
for(const guard of ['artwork_requires_artwork_phase','artwork_decision_requires_approval','approved_artwork_required_before_materials','embroidery_requires_pre_quality_phase','material_requires_materials_or_production','purchase_order_requires_materials_or_production','purchase_order_amount_out_of_range','materials_not_ready','work_order_requires_materials_or_production','work_order_required_before_quality','completed_work_order_required_before_quality','work_orders_incomplete','work_order_execution_requires_production','quality_check_requires_quality_control','quality_work_order_not_completed','quality_pass_required_before_packing','package_requires_packing','package_required_before_ready','packages_not_ready','package_status_incompatible_with_job_phase','package_required_before_delivery','delivered_package_required','packages_not_delivered','invalid_material_transition'])if(!integrity.includes(guard))throw new Error(`Phase/workflow integrity guard missing: ${guard}`);
for(const helper of ['globalPromoMaterialTransitionAllowed','globalPromoMaterialsGate','globalPromoWorkOrdersGate','globalPromoReadyGate','globalPromoWorkOrderCreationAllowed','globalPromoWorkOrderExecutionAllowed','globalPromoQualityAllowed','globalPromoArtworkCreationAllowed','globalPromoArtworkDecisionAllowed','globalPromoApprovalExitAllowed','globalPromoPackageCreationAllowed','globalPromoPackageFulfillmentAllowed','globalPromoEmbroideryCreationAllowed','globalPromoMaterialCreationAllowed','globalPromoPurchaseOrderCreationAllowed','globalPromoPurchaseLineCents'])if(!integrity.includes(helper))throw new Error(`Testable workflow invariant missing: ${helper}`);
for(const guard of ['GLOBAL_PROMO_PAYMENT_VALIDATE_TRIGGER_SQL','GLOBAL_PROMO_PAYMENT_APPLY_TRIGGER_SQL','trg_finance_invoice_payments_validate','trg_finance_invoice_payments_apply','payment_exceeds_invoice_balance','invoice_not_payable','SUM(p.amount_cents)','finance.invoice.payment.record','invoice_state_unavailable_after_payment'])if(!financeHandoff.includes(guard))throw new Error(`Finance/payment integrity guard missing: ${guard}`);
if(financeHandoff.includes('UPDATE finance_invoices SET received_cents=?,status=?'))throw new Error('Payment flow regressed to non-atomic manual invoice status update');
if(!commercialUi.includes('commercialContextForm')||!commercialUi.includes('/commercial-context'))throw new Error('Commercial context UI is not functional');
for(const marker of ['data-global-promo-phase-ui','phaseRules','artJob:new Set([\'artwork\'])','embJob:new Set([\'quoted\',\'artwork\',\'approval\',\'materials\',\'production\'])','materialJob:new Set([\'materials\',\'production\'])','poJob:new Set([\'materials\',\'production\'])','workJob:new Set([\'materials\',\'production\'])','qcJob:new Set([\'quality_control\'])','packageJob:new Set([\'packing\'])','Approval phase required','status===\'completed\'','packageRows','workRows','artRows'])if(!commercialUi.includes(marker))throw new Error(`Phase-aware UI control missing: ${marker}`);
if(!commercialUi.includes("url.pathname.startsWith('/platform/global-promo')"))throw new Error('Phase-aware UI enhancer is not applied across Global Promo routes');
for(const marker of ['data-global-promo-costing-basis','PROVISIONAL OPERATIONAL COSTING','operational projections','ATLAS Finance / General Ledger'])if(!commercialUi.includes(marker))throw new Error(`Provisional costing disclosure missing: ${marker}`);
if(!commercialUi.includes("url.pathname==='/platform/global-promo/costing'"))throw new Error('Costing basis disclosure is not scoped to the costing workspace');

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