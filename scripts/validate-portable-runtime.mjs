import assert from 'node:assert/strict';
import { dispatchAtlasRequest } from '../atlas/portable-runtime.mjs';

async function check(path,{type,status=200,contains}={}){
  const response=await dispatchAtlasRequest(new Request(`http://portable.atlas.local${path}`));
  assert.equal(response.status,status,`${path} status`);
  if(type)assert.match(response.headers.get('content-type')||'',type,`${path} content type`);
  const text=await response.text();
  if(contains)assert.match(text,contains,`${path} expected content`);
  return text;
}
await check('/_atlas/health',{type:/application\/json/,contains:/ATLAS Portable Runtime/});
await check('/browser',{type:/text\/html/,contains:/ATLAS Browser/});
await check('/api/browser/status',{type:/application\/json/,contains:/ATLAS Browser/});
await check('/workbench',{type:/text\/html/,contains:/ATLAS Workbench/});
await check('/api/workbench/status',{type:/application\/json/,contains:/ATLAS Sovereign Workbench/});
console.log('ATLAS portable runtime validation passed.');
