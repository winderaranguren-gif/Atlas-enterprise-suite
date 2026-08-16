import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { capabilityStateRoutes } from '../modules/capability-state.js';

const root=resolve(new URL('..',import.meta.url).pathname);
const fail=message=>{throw new Error(`[capability-state] ${message}`)};
const assert=(condition,message)=>{if(!condition)fail(message)};
const makeUrl=path=>new URL(`https://atlas.validation.local${path}`);
const env={DB:{}};

const unknown=await capabilityStateRoutes(new Request(makeUrl('/api/capability-state/not-real')),env,makeUrl('/api/capability-state/not-real'));
assert(unknown?.status===404,'unknown capability must return 404');

const unauth=await capabilityStateRoutes(new Request(makeUrl('/api/capability-state/academy?organizationId=org-valid1&dbaId=dba-valid1&mode=user')),env,makeUrl('/api/capability-state/academy?organizationId=org-valid1&dbaId=dba-valid1&mode=user'));
assert(unauth?.status===401,'known capability state must require authentication');

const invalidMode=await capabilityStateRoutes(new Request(makeUrl('/api/capability-state/academy?organizationId=org-valid1&dbaId=dba-valid1&mode=public')),env,makeUrl('/api/capability-state/academy?organizationId=org-valid1&dbaId=dba-valid1&mode=public'));
assert(invalidMode?.status===400,'invalid sharing mode must be rejected');

const unsupported=await capabilityStateRoutes(new Request(makeUrl('/api/capability-state/academy'),{method:'POST'}),env,makeUrl('/api/capability-state/academy'));
assert(unsupported?.status===405,'unsupported method must return 405');

const migration=await readFile(resolve(root,'migrations/0016_capability_state.sql'),'utf8');
for(const marker of ['CREATE TABLE IF NOT EXISTS capability_state','UNIQUE (organization_id, dba_id, capability_slug, subject_key, record_key)','length(payload_json) <= 65536'])assert(migration.includes(marker),`migration missing ${marker}`);

const entry=await readFile(resolve(root,'worker-meta.js'),'utf8');
assert(entry.includes("import { capabilityStateRoutes } from './modules/capability-state.js';"),'production entrypoint must import capability state routes');
assert(entry.includes("'capability_state'"),'readiness must require capability_state schema');
assert(entry.includes('capabilityStateRoutes(request,env,url)'),'production entrypoint must invoke capability state routes');

console.log('ATLAS Capability State contract passed: auth boundary, mode validation, migration invariants and production routing verified.');
