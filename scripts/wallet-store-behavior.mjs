import {WalletStore,handleWallet} from '../modules/wallet-worker.js';
import {handleWalletRequestSecurity} from '../modules/wallet-request-security.js';
import {handleWalletIdentityGate} from '../modules/wallet-identity-gate.js';

const assert=(condition,message)=>{if(!condition)throw new Error(message);};
const json=async response=>({status:response.status,body:await response.json()});

class MemoryStorage{
  #map=new Map();
  async get(key){return structuredClone(this.#map.get(key));}
  async put(key,value){this.#map.set(key,structuredClone(value));}
}

class MemoryWalletNamespace{
  constructor(){this.stores=new Map();}
  idFromName(name){return String(name);}
  get(id){
    if(!this.stores.has(id))this.stores.set(id,new WalletStore({storage:new MemoryStorage()}));
    return this.stores.get(id);
  }
}

const store=new WalletStore({storage:new MemoryStorage()});
const storeRequest=(path,method='GET',body)=>store.fetch(new Request(`https://wallet.internal${path}`,{
  method,
  headers:body===undefined?{}:{'content-type':'application/json'},
  body:body===undefined?undefined:JSON.stringify(body)
}));

// 1. Create a tokenized method and verify the internal store keeps only the provider reference supplied.
let result=await json(await storeRequest('/method','POST',{
  provider:'square',paymentMethodRef:'cnon:tokenized-card-ref-0001',brand:'Visa',last4:'4242',nickname:'Primary'
}));
assert(result.status===201,'tokenized method creation should succeed');
const methodId=result.body.item.id;
assert(result.body.item.paymentMethodRef==='cnon:tokenized-card-ref-0001','internal store should retain provider token reference');

// 2. Reject raw PAN/CVV payloads.
result=await json(await storeRequest('/method','POST',{
  provider:'square',paymentMethodRef:'cnon:tokenized-card-ref-0002',cardNumber:'4111111111111111',cvv:'123'
}));
assert(result.status===400&&result.body.error.includes('raw_card_data_prohibited'),'PAN/CVV must be rejected');

// 3. Preferences on payment methods: Show History and Allow Notifications.
result=await json(await storeRequest(`/method/${methodId}`,'PATCH',{showHistory:false,allowNotifications:false}));
assert(result.status===200,'method preference update should succeed');
assert(result.body.item.showHistory===false,'Show History preference must persist');
assert(result.body.item.allowNotifications===false,'Allow Notifications preference must persist');

// 4. Create and transition a transaction.
result=await json(await storeRequest('/transaction','POST',{
  paymentMethodId:methodId,amountCents:1299,currency:'USD',merchantName:'ATLAS Test Merchant',provider:'square'
}));
assert(result.status===201&&result.body.item.status==='created','transaction must start as created');
const transactionId=result.body.item.id;
for(const status of ['processing','authorized','captured']){
  result=await json(await storeRequest(`/transaction/${transactionId}`,'PATCH',{status}));
  assert(result.status===200&&result.body.item.status===status,`transaction should transition to ${status}`);
}

// 5. Profile isolation + safe listing through the public Wallet API.
const namespace=new MemoryWalletNamespace();
const tokenA='A'.repeat(64),tokenB='B'.repeat(64);
const apiRequest=(token,path,method='GET',body,origin='https://atlas.example')=>new Request(`https://atlas.example${path}`,{
  method,
  headers:{authorization:`Bearer ${token}`,'content-type':'application/json',origin},
  body:body===undefined?undefined:JSON.stringify(body)
});

let response=await handleWallet(apiRequest(tokenA,'/api/wallet/payment-methods','POST',{
  provider:'square',paymentMethodRef:'cnon:profile-a-token-0001',brand:'Visa',last4:'1111'
}),{WALLET_STORE:namespace});
result=await json(response);
assert(result.status===201,'profile A method should be created');
assert(!('paymentMethodRef' in result.body.item),'public method response must sanitize provider token reference');
const profileAMethodId=result.body.item.id;

result=await json(await handleWallet(apiRequest(tokenA,'/api/wallet/snapshot'),{WALLET_STORE:namespace}));
assert(result.body.methods.length===1,'profile A should see its method');
assert(!('paymentMethodRef' in result.body.methods[0]),'snapshot must not expose provider token reference');
result=await json(await handleWallet(apiRequest(tokenB,'/api/wallet/snapshot'),{WALLET_STORE:namespace}));
assert(result.body.methods.length===0,'profile B must be isolated from profile A');

// 6. Controlled provider failure: no Square credentials means fail closed, not throw.
result=await json(await handleWallet(apiRequest(tokenA,`/api/wallet/payment-methods/${profileAMethodId}/pay`,'POST',{
  merchantName:'Offline Provider Test',amountCents:500,currency:'USD'
}),{WALLET_STORE:namespace}));
assert(result.status===503,'unconfigured Square should return controlled 503');
assert(result.body.ok===false,'provider failure should be represented as ok=false');
assert(result.body.transaction?.status==='failed','provider failure must transition transaction to failed');
assert(result.body.transaction?.failureCode==='square_not_configured','provider failure code must be controlled and specific');

// 7. Same-origin write policy and token-reference guard.
response=await handleWalletRequestSecurity(new Request('https://atlas.example/api/wallet/payment-methods',{
  method:'POST',headers:{cookie:'atlas_wallet_owner=signed-session','content-type':'application/json'},
  body:JSON.stringify({provider:'square',paymentMethodRef:'cnon:valid-token-ref-0001'})
}));
assert(response?.status===403,'cookie-authenticated write without Origin must be rejected');
response=await handleWalletRequestSecurity(new Request('https://atlas.example/api/wallet/payment-methods',{
  method:'POST',headers:{origin:'https://evil.example',cookie:'atlas_wallet_owner=signed-session','content-type':'application/json'},
  body:JSON.stringify({provider:'square',paymentMethodRef:'cnon:valid-token-ref-0001'})
}));
assert(response?.status===403,'cross-origin write must be rejected');
response=await handleWalletRequestSecurity(new Request('https://atlas.example/api/wallet/payment-methods',{
  method:'POST',headers:{origin:'https://atlas.example',cookie:'atlas_wallet_owner=signed-session','content-type':'application/json'},
  body:JSON.stringify({provider:'square',paymentMethodRef:'4111111111111111'})
}));
assert(response?.status===400,'PAN-shaped token reference must be rejected');
response=await handleWalletRequestSecurity(new Request('https://atlas.example/api/wallet/payment-methods',{
  method:'POST',headers:{origin:'https://atlas.example',cookie:'atlas_wallet_owner=signed-session','content-type':'application/json'},
  body:JSON.stringify({provider:'square',paymentMethodRef:'cnon:valid-token-ref-0001'})
}));
assert(response===null,'same-origin tokenized write should pass request security');

// 8. Identity cookie flags: signed, Secure, HttpOnly, SameSite=Strict.
const identityEnv={
  ATLAS_WALLET_IDENTITY_VERIFIED:'true',
  ATLAS_WALLET_IDENTITY_TOKEN:'identity-gateway-test-token-000000000000000000000001',
  ATLAS_WALLET_SESSION_SECRET:'wallet-session-signing-secret-test-000000000000000000000001'
};
response=await handleWalletIdentityGate(new Request('https://atlas.example/api/wallet/session',{
  method:'POST',headers:{
    authorization:`Bearer ${identityEnv.ATLAS_WALLET_IDENTITY_TOKEN}`,
    'x-atlas-organization-id':'organization-0001','x-atlas-dba-id':'dba-00000001','x-atlas-user-id':'user-00000001'
  }
}),identityEnv);
assert(response.status===200,'identity gateway should issue test session');
const cookie=response.headers.get('set-cookie')||'';
for(const flag of ['HttpOnly','Secure','SameSite=Strict'])assert(cookie.includes(flag),`identity cookie must include ${flag}`);

console.log('ATLAS WalletStore in-memory behavior validation passed');
