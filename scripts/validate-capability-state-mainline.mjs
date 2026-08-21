import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {resolve} from 'node:path';
import {CAPABILITY_STATE_CAPABILITIES,CapabilityStateStore,handleCapabilityState} from '../modules/capability-state-worker.js';

const ROOT=resolve(process.cwd());
for(const file of ['modules/capability-state-worker.js','rideos-router.js']){
  const r=spawnSync(process.execPath,['--check',resolve(ROOT,file)],{encoding:'utf8'});
  assert.equal(r.status,0,`${file} syntax failed: ${r.stderr||r.stdout}`);
}
assert.equal(CAPABILITY_STATE_CAPABILITIES.length,10);
for(const id of ['lingua','academy','tax-compliance','candidate-hub','subscriptions'])assert.ok(CAPABILITY_STATE_CAPABILITIES.includes(id));

const unconfigured=await handleCapabilityState(new Request('https://atlas.local/api/capability-state/lingua'),{CAPABILITY_STATE_STORE:{}});
assert.equal(unconfigured.status,503);
assert.equal((await unconfigured.json()).error,'capability_state_identity_gateway_not_configured');

const unknown=await handleCapabilityState(new Request('https://atlas.local/api/capability-state/not-real'),{});
assert.equal(unknown.status,404);

class MemoryStorage{
  constructor(){this.map=new Map();}
  async get(key){return this.map.get(key);}
  async put(key,value){this.map.set(key,value);}
  async delete(key){return this.map.delete(key);}
  async list({prefix,limit}){return new Map([...this.map].filter(([k])=>k.startsWith(prefix)).slice(0,limit));}
}
const store=new CapabilityStateStore({storage:new MemoryStorage()});
let response=await store.fetch(new Request('https://state.local/state?subject=user:user-12345678&key=profile',{method:'PUT',headers:{'content-type':'application/json'},body:JSON.stringify({payload:{locale:'es'},updatedBy:'user-12345678'})}));
assert.equal(response.status,200);
assert.equal((await response.json()).saved,true);
response=await store.fetch(new Request('https://state.local/state?subject=user:user-12345678&key=profile'));
const record=(await response.json()).record;
assert.equal(record.payload.locale,'es');
response=await store.fetch(new Request('https://state.local/state?subject=user:user-12345678'));
assert.equal((await response.json()).records.length,1);
response=await store.fetch(new Request('https://state.local/state?subject=user:user-12345678&key=profile',{method:'DELETE'}));
assert.equal((await response.json()).deleted,true);

const router=await import('../rideos-router.js');
assert.equal(typeof router.CapabilityStateStore,'function');
const wrangler=await import('node:fs/promises').then(fs=>fs.readFile(resolve(ROOT,'wrangler.jsonc'),'utf8'));
assert.match(wrangler,/CAPABILITY_STATE_STORE/);
assert.match(wrangler,/v3-capability-state-store/);

console.log('ATLAS Capability State mainline validation passed.');
