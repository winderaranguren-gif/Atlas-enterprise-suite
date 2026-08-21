import assert from 'node:assert/strict';
import {handleGlobalCountry,ISO_COUNTRIES,REGION_GROUPS} from '../modules/global-country-worker.js';
import {handleVenezuela,VENEZUELA_MODULES} from '../modules/venezuela-worker.js';

assert.equal(ISO_COUNTRIES.length,249,'ISO registry must contain 249 assigned alpha-2 entries');
assert.equal(new Set(ISO_COUNTRIES).size,249,'country codes must be unique');
for(const [region,codes] of Object.entries(REGION_GROUPS)){
  assert.ok(codes.length>0,`${region} must not be empty`);
  for(const code of codes)assert.ok(ISO_COUNTRIES.includes(code),`${code} in ${region} must be ISO registered`);
}
const context=await handleGlobalCountry(new Request('https://atlasenterprisesuite.com/api/global/context',{headers:{'cf-ipcountry':'US','accept-language':'en-US'}})).json();
assert.equal(context.detected.code,'US');
assert.equal(context.detected.currency,'USD');

const genericVenezuela=await handleGlobalCountry(new Request('https://atlasenterprisesuite.com/global/ve'));
assert.equal(genericVenezuela.status,200);
assert.match(await genericVenezuela.text(),/ATLAS Venezuela/);

assert.equal(VENEZUELA_MODULES.length,13,'Venezuela edition must expose the approved module set');
for(const path of ['/ve','/venezuela','/global/ve']){
  const response=handleVenezuela(new Request(`https://atlasenterprisesuite.com${path}`));
  assert.ok(response,`${path} must be handled by the Venezuela edition`);
  assert.equal(response.status,200);
  assert.equal(response.headers.get('x-atlas-country'),'VE');
  const html=await response.text();
  assert.match(html,/Sistema Operativo Empresarial/);
  assert.match(html,/ATLAS Venezuela/);
  assert.match(html,/Sin datos conectados/);
  assert.match(html,/Accounting VE/);
  assert.match(html,/Seguridad &amp; Auditoría/);
}
assert.equal(handleVenezuela(new Request('https://atlasenterprisesuite.com/global/us')),null,'non-VE country routes must pass through');

const invalid=await handleGlobalCountry(new Request('https://atlasenterprisesuite.com/global/xx'));
assert.equal(invalid.status,404);
console.log(`ATLAS Global validated: ${ISO_COUNTRIES.length} country and territory editions + ATLAS Venezuela visual edition.`);
