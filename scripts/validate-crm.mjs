import { access, readFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';

const modules=[
  'worker-crm.js','modules/crm.js','modules/crm-shared.js','modules/crm-accounts.js','modules/crm-contacts.js','modules/crm-contact-update.js',
  'modules/crm-leads.js','modules/crm-lead-update.js','modules/crm-lead-convert.js','modules/crm-stages.js','modules/crm-opportunities.js',
  'modules/crm-opportunity-update.js','modules/crm-pipeline.js','modules/crm-activities.js','modules/crm-activity-update.js','modules/crm-quotes.js',
  'modules/crm-quote-update.js','modules/crm-communications.js','modules/crm-dashboard.js','modules/crm-counts.js','modules/crm-value.js','modules/crm-search.js',
  'modules/crm-automations.js','modules/crm-rule-runner.js','modules/crm-ui.js','modules/crm-client.js'
];
for(const file of [...modules,'migrations/0005_crm.sql'])await access(file);
for(const file of modules)execFileSync(process.execPath,['--check',file],{stdio:'pipe'});
const migration=await readFile('migrations/0005_crm.sql','utf8');
for(const table of ['crm_accounts','crm_contacts','crm_pipeline_stages','crm_leads','crm_opportunities','crm_activities','crm_quotes','crm_quote_lines','crm_communications','crm_automation_rules','crm_automation_runs'])if(!migration.includes(`CREATE TABLE IF NOT EXISTS ${table}`))throw new Error(`missing_crm_table:${table}`);
for(const permission of ['crm.read','crm.write','crm.export','crm.admin'])if(!migration.includes(`'${permission}'`))throw new Error(`missing_crm_permission:${permission}`);
if(!migration.includes('FOREIGN KEY (dba_id, organization_id) REFERENCES dbas(id, organization_id)'))throw new Error('crm_tenant_integrity_missing');
const router=await readFile('modules/crm.js','utf8');
for(const route of ['/api/crm/status','/api/crm/dashboard','/api/crm/counts','/api/crm/value','/api/crm/pipeline','/api/crm/accounts','/api/crm/contacts','/api/crm/leads','/api/crm/opportunities','/api/crm/activities','/api/crm/quotes','/api/crm/communications'])if(!router.includes(route))throw new Error(`missing_crm_route:${route}`);
const shared=await readFile('modules/crm-shared.js','utf8');
if(!shared.includes('requireTenantPermission'))throw new Error('crm_tenant_guard_missing');
if(!shared.includes('appendAuditLedger'))throw new Error('crm_audit_missing');
const wrangler=await readFile('wrangler.jsonc','utf8');
if(!wrangler.includes('worker-crm.js'))throw new Error('crm_worker_entry_missing');
console.log('ATLAS CRM v1 validation passed');
