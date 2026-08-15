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
for(const marker of [
  ".replace('<span>Total Revenue</span><strong>$2.45M</strong>",
  "<span>Receivables</span><strong>—</strong>",
  ".replace('<span>Net Profit</span><strong>$245,800</strong>",
  "<span>Payables</span><strong>—</strong>",
  ".replace('<span>Orders</span><strong>1,783</strong>",
  "<span>Open Tasks</span><strong>—</strong>"
])if(!worker.includes(marker))throw new Error(`dashboard_placeholder_sanitizer_missing:${marker}`);
console.log('ATLAS functional navigation and scoped dashboard validation passed.');
