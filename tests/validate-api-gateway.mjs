import assert from 'node:assert/strict';
import { API_ROUTE_CATALOG, dispatchApi } from '../modules/api-gateway/src/router.js';

const ids=API_ROUTE_CATALOG.map(([id])=>id);
assert.equal(new Set(ids).size,ids.length,'gateway route ids must be unique');
for(const required of ['auth','identity','crm','documents','accounting','backups']){
  assert.ok(ids.includes(required),`missing commercial pilot route: ${required}`);
}

const unknown=await dispatchApi(new Request('https://atlas.invalid/api/__gateway_probe__'),{},new URL('https://atlas.invalid/api/__gateway_probe__'));
assert.equal(unknown.status,501);
assert.deepEqual(await unknown.json(),{ok:false,error:'not_implemented'});

const nonApi=await dispatchApi(new Request('https://atlas.invalid/dashboard'),{},new URL('https://atlas.invalid/dashboard'));
assert.equal(nonApi,null);

console.log('modular api gateway validation passed');
