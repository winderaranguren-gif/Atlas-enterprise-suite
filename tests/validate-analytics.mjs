import fs from 'node:fs';

const route=fs.readFileSync(new URL('../modules/analytics/routes.js',import.meta.url),'utf8');
const worker=fs.readFileSync(new URL('../worker/index.js',import.meta.url),'utf8');

const required=[
  '/api/analytics/overview',
  '/api/analytics/trends/monthly',
  '/api/analytics/account-mix',
  '/api/analytics/anomalies',
  'requireSession',
  'requireScope',
  'organization_and_dba_required',
  'analytics.overview.read'
];
for(const token of required){
  if(!route.includes(token)) throw new Error(`analytics validation failed: missing ${token}`);
}
if(!worker.includes("import { analyticsRoutes } from '../modules/analytics/routes.js'")) throw new Error('analytics validation failed: worker import missing');
if(!worker.includes('await analyticsRoutes(request,env,url)')) throw new Error('analytics validation failed: worker routing missing');
console.log('analytics validation: ok');
