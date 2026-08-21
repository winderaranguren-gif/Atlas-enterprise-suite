import fs from 'node:fs';
import {spawnSync} from 'node:child_process';
import {handleWalletIdentityGate} from '../modules/wallet-identity-gate.js';

const wallet=fs.readFileSync(new URL('../modules/wallet-worker.js',import.meta.url),'utf8');
const gateSource=fs.readFileSync(new URL('../modules/wallet-identity-gate.js',import.meta.url),'utf8');
const router=fs.readFileSync(new URL('../rideos-router.js',import.meta.url),'utf8');
const wrangler=fs.readFileSync(new URL('../wrangler.jsonc',import.meta.url),'utf8');
const pkg=fs.readFileSync(new URL('../package.json',import.meta.url),'utf8');

for(const required of [
  'export class WalletStore','export async function handleWallet','/api/wallet/status',
  '/api/wallet/snapshot','/api/wallet/payment-methods','/api/wallet/checkout/square',
  '/api/wallet/checkout/paypal/order','/capture','raw_card_data_prohibited_use_provider_tokenization',
  'Apple Pay Compatibility','Show History','Allow Notifications','Latest Transactions','Buy with ATLAS Pay',
  'private-device-http-only-cookie-v1','HttpOnly; Secure; SameSite=Lax','sanitizeSnapshot','sanitizeMethod',
  'cross_origin_write_rejected','verifyBuyer','customerInitiated:true','sellerKeyedIn:false'
]){
  if(!wallet.includes(required))throw new Error(`wallet-worker missing ${required}`);
}

for(const providerFeature of [
  'https://connect.squareup.com','https://connect.squareupsandbox.com','/v2/payments',
  'square-version','2026-07-15','https://api-m.paypal.com','https://api-m.sandbox.paypal.com',
  '/v1/oauth2/token','/v2/checkout/orders','paypal-request-id'
]){
  if(!wallet.includes(providerFeature))throw new Error(`wallet provider adapter missing ${providerFeature}`);
}

for(const required of [
  'export async function handleWalletIdentityGate','ATLAS_WALLET_IDENTITY_VERIFIED',
  'ATLAS_WALLET_IDENTITY_TOKEN','ATLAS_WALLET_SESSION_SECRET','organization+dba+user',
  'SameSite=Strict','wallet_authenticated_session_required','crypto.subtle'
]){
  if(!gateSource.includes(required))throw new Error(`wallet identity gate missing ${required}`);
}

for(const required of ['WALLET_STORE','WalletStore','v4-wallet-store']){
  if(!wrangler.includes(required))throw new Error(`wrangler missing ${required}`);
}
for(const required of [
  "import {WalletStore,handleWallet}","import {handleWalletIdentityGate}",
  "path==='/wallet'","path.startsWith('/api/wallet/')",'WalletStore};',
  'await handleWalletIdentityGate(request,env,ctx)'
]){
  if(!router.includes(required))throw new Error(`production router missing ${required}`);
}
if(!pkg.includes('check:wallet'))throw new Error('package.json missing check:wallet');

for(const forbidden of [
  /SQUARE_ACCESS_TOKEN\s*[:=]\s*['"][^'"]+/,
  /PAYPAL_CLIENT_SECRET\s*[:=]\s*['"][^'"]+/,
  /<input[^>]+(?:card.?number|cvv|cvc|security.?code)/i,
  /localStorage\.(?:getItem|setItem)\(['"]atlas\.wallet\.owner/
]){
  if(forbidden.test(wallet))throw new Error(`wallet contains forbidden credential/card collection pattern: ${forbidden}`);
}

for(const file of ['modules/wallet-worker.js','modules/wallet-identity-gate.js','rideos-router.js']){
  const result=spawnSync(process.execPath,['--check',file],{encoding:'utf8'});
  if(result.status!==0)throw new Error(`${file} syntax check failed:\n${result.stderr||result.stdout}`);
}

const unconfigured=await handleWalletIdentityGate(new Request('https://atlas.local/wallet'),{});
if(unconfigured?.status!==503)throw new Error('wallet identity gate must fail closed when identity verification is unavailable');

const env={
  ATLAS_WALLET_IDENTITY_VERIFIED:'true',
  ATLAS_WALLET_IDENTITY_TOKEN:'identity-gateway-test-token-000000000000000000000001',
  ATLAS_WALLET_SESSION_SECRET:'wallet-session-signing-secret-test-000000000000000000000001'
};
const session=await handleWalletIdentityGate(new Request('https://atlas.local/api/wallet/session',{
  method:'POST',
  headers:{
    authorization:`Bearer ${env.ATLAS_WALLET_IDENTITY_TOKEN}`,
    'x-atlas-organization-id':'organization-0001',
    'x-atlas-dba-id':'dba-00000001',
    'x-atlas-user-id':'user-00000001'
  }
}),env);
if(session?.status!==200)throw new Error(`wallet identity session issuance failed: ${session?.status}`);
const setCookie=session.headers.get('set-cookie')||'';
const cookie=setCookie.split(';')[0];
if(!cookie.startsWith('atlas_wallet_owner='))throw new Error('wallet identity session did not issue owner cookie');
const authorized=await handleWalletIdentityGate(new Request('https://atlas.local/wallet',{headers:{cookie}}),env);
if(authorized!==null)throw new Error('valid signed Wallet session should pass through identity gate');
const forged=await handleWalletIdentityGate(new Request('https://atlas.local/wallet',{headers:{cookie:'atlas_wallet_owner=forged_token'}}),env);
if(forged?.status!==401)throw new Error('forged Wallet session must be rejected');

console.log('ATLAS Wallet current-architecture validation passed');
