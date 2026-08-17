import {handleFinance} from '../modules/finance-worker.js';

const health=await handleFinance(new Request('https://atlasenterprisesuite.com/api/finance/health'));
if(!health||health.status!==200)throw new Error('Finance health endpoint failed');
const healthBody=await health.json();
if(healthBody.service!=='atlas-finance-intelligence')throw new Error('Unexpected finance service identity');

const capabilities=await handleFinance(new Request('https://atlasenterprisesuite.com/api/finance/capabilities'));
if(!capabilities||capabilities.status!==200)throw new Error('Finance capabilities endpoint failed');
const caps=await capabilities.json();
if(!Array.isArray(caps.capabilities)||caps.capabilities.length<10)throw new Error('Finance capability manifest is incomplete');

for(const path of ['/finance','/finance/bookkeeping','/finance/gl','/finance/ap','/finance/ar','/finance/reports','/finance/close','/finance/assistant']){
  const res=await handleFinance(new Request('https://atlasenterprisesuite.com'+path));
  if(!res||res.status!==200)throw new Error('Finance route failed: '+path);
  const html=await res.text();
  if(!html.includes('ATLAS Finance Intelligence'))throw new Error('Finance HTML identity missing: '+path);
}

console.log('ATLAS Finance Intelligence smoke validation passed.');
