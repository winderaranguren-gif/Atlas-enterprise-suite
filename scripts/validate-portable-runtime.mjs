import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const stateDir=await mkdtemp(join(tmpdir(),'atlas-portable-state-'));
process.env.ATLAS_STATE_DIR=stateDir;
process.env.ATLAS_PORTABLE_STATE='local';
process.env.ATLAS_CAPABILITY_STATE_TOKEN='atlas-portable-test-token';

const { dispatchAtlasRequest }=await import('../atlas/portable-runtime.mjs');
const origin='http://portable.atlas.local';

async function request(path,{method='GET',body,headers={}}={}){
  const init={method,headers:new Headers(headers)};
  if(body!==undefined){init.headers.set('content-type','application/json');init.body=JSON.stringify(body);}
  return dispatchAtlasRequest(new Request(`${origin}${path}`,init));
}
async function check(path,{type,status=200,contains}={}){
  const response=await request(path);
  assert.equal(response.status,status,`${path} status`);
  if(type)assert.match(response.headers.get('content-type')||'',type,`${path} content type`);
  const text=await response.text();
  if(contains)assert.match(text,contains,`${path} expected content`);
  return text;
}

try{
  const health=await check('/_atlas/health',{type:/application\/json/,contains:/ATLAS Portable Runtime/});
  assert.doesNotMatch(health,new RegExp(stateDir.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')),'health must not expose filesystem path');
  assert.match(health,/local-json-durable/,'health identifies local durable adapter');

  await check('/browser',{type:/text\/html/,contains:/ATLAS Browser/});
  await check('/api/browser/status',{type:/application\/json/,contains:/atlas-browser/});
  await check('/workbench',{type:/text\/html/,contains:/ATLAS Workbench/});
  await check('/api/workbench/status',{type:/application\/json/,contains:/ATLAS Sovereign Workbench/});

  const contactResponse=await request('/api/connect/contacts',{
    method:'POST',
    body:{name:'Portable State Test',email:'portable@example.test',company:'ATLAS'}
  });
  assert.equal(contactResponse.status,201,'Connect contact must be created');
  const contactPayload=await contactResponse.json();
  assert.equal(contactPayload.ok,true);

  const snapshotResponse=await request('/api/connect/snapshot');
  assert.equal(snapshotResponse.status,200);
  const snapshot=await snapshotResponse.json();
  assert.ok(snapshot.contacts.some(row=>row.id===contactPayload.item.id&&row.name==='Portable State Test'),'Connect state must persist through portable binding');

  const capabilityHeaders={
    authorization:'Bearer atlas-portable-test-token',
    'x-atlas-organization-id':'org-test-001',
    'x-atlas-dba-id':'dba-test-001',
    'x-atlas-user-id':'user-test-001'
  };
  const saveState=await request('/api/capability-state/personalization?mode=user',{
    method:'PUT',headers:capabilityHeaders,body:{key:'theme',payload:{mode:'dark'}}
  });
  assert.equal(saveState.status,200,'Capability state write must succeed');
  const saved=await saveState.json();
  assert.equal(saved.saved,true);

  const readState=await request('/api/capability-state/personalization?mode=user&key=theme',{headers:capabilityHeaders});
  assert.equal(readState.status,200,'Capability state read must succeed');
  const state=await readState.json();
  assert.deepEqual(state.record?.payload,{mode:'dark'},'Capability state must round-trip through portable durable storage');

  console.log('ATLAS portable runtime + durable state validation passed.');
}finally{
  await rm(stateDir,{recursive:true,force:true});
}
