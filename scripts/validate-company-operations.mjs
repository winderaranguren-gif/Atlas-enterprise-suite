import fs from 'node:fs';

const moduleSource=fs.readFileSync(new URL('../modules/company-operations.js',import.meta.url),'utf8');
const worker=fs.readFileSync(new URL('../worker-meta.js',import.meta.url),'utf8');
const migration=fs.readFileSync(new URL('../migrations/0016_company_operations.sql',import.meta.url),'utf8');

const need=(source,text,label)=>{if(!source.includes(text))throw new Error(`company_operations_validation_failed:${label}`)};
const forbid=(source,re,label)=>{if(re.test(source))throw new Error(`company_operations_validation_failed:${label}`)};

need(worker,"import { companyOperationsRoutes } from './modules/company-operations.js';",'worker_import');
need(worker,'await companyOperationsRoutes(request,env,url)','worker_route');

for(const key of ['global-promo','aw-finance','advantage-health'])need(moduleSource,`'${key}'`,'profile_'+key);
for(const stage of ['Request','Quote','Artwork','Customer Approval','Materials','Production','Quality Control','Delivery','Invoice','Payment'])need(moduleSource,`'${stage}'`,'global_promo_stage_'+stage.replace(/\W+/g,'_'));

need(moduleSource,'requireTenantPermission','tenant_guard');
need(moduleSource,"'module.read'",'read_permission');
need(moduleSource,"'module.write'",'write_permission');
need(moduleSource,'appendAuditLedger','audit_ledger');
need(moduleSource,"fetch('/api/core/context'",'tenant_context_client');
need(moduleSource,"request.method==='POST'",'create_action');
need(moduleSource,"request.method==='PATCH'",'update_action');
need(moduleSource,"action==='advance'",'stage_transition');
need(moduleSource,'operations_approvals','approval_integration');
need(moduleSource,'No hay registros reales todavía','honest_empty_state');
need(moduleSource,"url.pathname==='/assets/atlas-company-operations.js'",'external_client_asset');
need(moduleSource,"permissions-policy':'camera=(), microphone=(), geolocation=()'",'device_permissions_policy');

need(migration,'CREATE TABLE IF NOT EXISTS company_work_items','work_items_migration');
need(migration,'CREATE TABLE IF NOT EXISTS company_work_item_events','events_migration');
need(migration,'organization_id TEXT NOT NULL','tenant_org_column');
need(migration,'dba_id TEXT NOT NULL','tenant_dba_column');

forbid(moduleSource,/localStorage\s*[.(]/,'browser_only_persistence');
forbid(moduleSource,/sessionStorage\s*[.(]/,'browser_only_session_persistence');
forbid(moduleSource,/href=["']#["']/,'fake_hash_navigation');
forbid(moduleSource,/Math\.random\s*\(/,'invented_random_metrics');
forbid(moduleSource,/\b(?:demo|fictional|mock data|sample data)\b/i,'demo_or_fictional_data');
forbid(moduleSource,/onclick=["'][^"']*alert\s*\(/i,'alert_button');

console.log('ATLAS Company Operations validation passed');
