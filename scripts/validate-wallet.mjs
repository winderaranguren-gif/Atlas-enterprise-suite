import fs from 'node:fs';
import {spawnSync} from 'node:child_process';

const wallet=fs.readFileSync(new URL('../modules/wallet-worker.js',import.meta.url),'utf8');
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

for(const required of ['WALLET_STORE','WalletStore','v3-wallet-store']){
  if(!wrangler.includes(required))throw new Error(`wrangler missing ${required}`);
}
for(const required of ["import {WalletStore,handleWallet}","path==='/wallet'","path.startsWith('/api/wallet/')","export {ConnectStore,WalletStore}"]){
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

for(const file of ['modules/wallet-worker.js','rideos-router.js']){
  const result=spawnSync(process.execPath,['--check',file],{encoding:'utf8'});
  if(result.status!==0)throw new Error(`${file} syntax check failed:\n${result.stderr||result.stdout}`);
}

console.log('ATLAS Wallet current-architecture validation passed');
