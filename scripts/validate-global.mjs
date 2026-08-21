import assert from 'node:assert/strict';
import {handleGlobalCountry,ISO_COUNTRIES,REGION_GROUPS} from '../modules/global-country-worker.js';

assert.equal(ISO_COUNTRIES.length,249,'ISO registry must contain 249 assigned alpha-2 entries');
assert.equal(new Set(ISO_COUNTRIES).size,249,'country codes must be unique');
for(const [region,codes] of Object.entries(REGION_GROUPS)){
  assert.ok(codes.length>0,`${region} must not be empty`);
  for(const code of codes)assert.ok(ISO_COUNTRIES.includes(code),`${code} in ${region} must be ISO registered`);
}
const context=await handleGlobalCountry(new Request('https://atlasenterprisesuite.com/api/global/context',{headers:{'cf-ipcountry':'US','accept-language':'en-US'}})).json();
assert.equal(context.detected.code,'US');
assert.equal(context.detected.currency,'USD');
const venezuela=await handleGlobalCountry(new Request('https://atlasenterprisesuite.com/global/ve'));
assert.equal(venezuela.status,200);
assert.match(await venezuela.text(),/ATLAS Venezuela/);
const invalid=await handleGlobalCountry(new Request('https://atlasenterprisesuite.com/global/xx'));
assert.equal(invalid.status,404);
console.log(`ATLAS Global validated: ${ISO_COUNTRIES.length} country and territory editions.`);
