import { readFile } from 'node:fs/promises';
import { webRuntimeScript } from '../modules/web-runtime.js';
import { dashboardRuntimeScript } from '../modules/dashboard-runtime.js';

const runtime=webRuntimeScript();
const dashboard=dashboardRuntimeScript();
const worker=await readFile(new URL('../worker.js',import.meta.url),'utf8');
const requiredRuntime=[
  "'/platform/finance#accounts-payable':'/platform/finance/accounts-payable'",
  "'/platform/operations#workflows':'/platform/operations/workflows'",
  "'/platform/hr-payroll#recruitment':'/platform/hr-payroll/recruiting'",
  "'/platform/operations#cycle-counts':'/platform/inventory/cycle-counts'",
  "'/platform/enterprise-suite#documents':'/platform/documents'",
  "'/dashboard#settings':'/platform/settings'",
  "href=\"/platform/integrations\""
];
for(const marker of requiredRuntime)if(!runtime.includes(marker))throw new Error(`functional_navigation_missing:${marker}`);
for(const marker of ['atlas.dashboard.scope','/api/core/context','/api/reports/executive','x-atlas-organization','x-atlas-dba','OPERATING SNAPSHOT','OPERATING SIGNALS'])if(!dashboard.includes(marker))throw new Error(`dashboard_scope_runtime_missing:${marker}`);
for(const marker of ['sanitizeDashboardPlaceholders','inventoryCountsRoutes','enterpriseWorkspaceRoutes','dashboardRuntimeScript','/assets/atlas-dashboard-runtime.js'])if(!worker.includes(marker))throw new Error(`worker_functional_route_missing:${marker}`);
for(const forbidden of ['$2.45M','$245,800','1,783'])if(worker.includes(`>${forbidden}<`))throw new Error(`static_business_placeholder_exposed:${forbidden}`);
console.log('ATLAS functional navigation and scoped dashboard validation passed.');
