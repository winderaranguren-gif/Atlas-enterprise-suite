const requiredServer=[
  ['Wallet identity gateway token','ATLAS_WALLET_IDENTITY_TOKEN'],
  ['Wallet session signing secret','ATLAS_WALLET_SESSION_SECRET'],
  ['Square server','SQUARE_ACCESS_TOKEN'],
  ['Square location','SQUARE_LOCATION_ID'],
  ['Square application','SQUARE_APPLICATION_ID'],
  ['PayPal client','PAYPAL_CLIENT_ID'],
  ['PayPal secret','PAYPAL_CLIENT_SECRET'],
];

const truthy=(value)=>['1','true','yes','verified','ready'].includes(String(value||'').trim().toLowerCase());
const checks=requiredServer.map(([name,env])=>({name,env,ready:Boolean(process.env[env])}));
checks.push(
  {name:'Canonical ATLAS identity binding',env:'ATLAS_WALLET_IDENTITY_VERIFIED',ready:truthy(process.env.ATLAS_WALLET_IDENTITY_VERIFIED)},
  {name:'Square sandbox payment verification',env:'ATLAS_WALLET_SQUARE_SANDBOX_VERIFIED',ready:truthy(process.env.ATLAS_WALLET_SQUARE_SANDBOX_VERIFIED)},
  {name:'PayPal sandbox payment verification',env:'ATLAS_WALLET_PAYPAL_SANDBOX_VERIFIED',ready:truthy(process.env.ATLAS_WALLET_PAYPAL_SANDBOX_VERIFIED)},
  {name:'Apple Pay domain registration',env:'ATLAS_WALLET_APPLE_PAY_DOMAIN_VERIFIED',ready:truthy(process.env.ATLAS_WALLET_APPLE_PAY_DOMAIN_VERIFIED)},
);

const blockers=checks.filter(x=>!x.ready).map(({name,env})=>({name,env}));
const report={
  service:'ATLAS Wallet Release Readiness',
  codeReady:true,
  releaseReady:blockers.length===0,
  checks,
  blockers,
  policy:{
    secretsPrinted:false,
    providerVerificationCannotBeSimulated:true,
    identitySessionMustBeSigned:true,
    productionReleaseRequiresAllChecks:true,
  },
};
console.log(JSON.stringify(report,null,2));
if(process.argv.includes('--enforce')&&blockers.length)process.exitCode=1;
