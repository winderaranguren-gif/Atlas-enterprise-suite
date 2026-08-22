import { readFile } from 'node:fs/promises';

const read=path=>readFile(new URL(`../${path}`,import.meta.url),'utf8');
const fail=message=>{throw new Error(`Provider independence validation failed: ${message}`);};
const requireText=(text,needle,label)=>{if(!text.includes(needle))fail(`${label} missing ${needle}`);};
const forbidText=(text,needle,label)=>{if(text.includes(needle))fail(`${label} must not contain ${needle}`);};

const [pkgRaw,orchestrator,providers,cloudflare,portable,vps,portableDoc]=await Promise.all([
  read('package.json'),
  read('atlas/deploy-orchestrator.mjs'),
  read('atlas/providers.mjs'),
  read('.github/workflows/deploy-cloudflare-direct.yml'),
  read('.github/workflows/portable-runtime.yml'),
  read('.github/workflows/deploy-atlas-vps.yml'),
  read('docs/ATLAS_PORTABLE_RUNTIME.md')
]);

const pkg=JSON.parse(pkgRaw);
const scripts=pkg.scripts||{};
if(scripts['deploy:provider']!=='node atlas/deploy-orchestrator.mjs plan sovereign')fail('deploy:provider must default to the sovereign ATLAS release contract');
if(scripts['deploy:cloudflare']!=='wrangler deploy')fail('Cloudflare must have its own explicitly named optional adapter script');
if(String(scripts['deploy:provider']||'').includes('wrangler'))fail('provider-neutral deploy command cannot call Wrangler');

requireText(orchestrator,"const DEFAULT_PROVIDER='sovereign'",'deploy orchestrator');
requireText(orchestrator,"canonicalProductionHost:'vps'",'deploy orchestrator');
requireText(orchestrator,"automaticFailoverToThirdParty:false",'deploy orchestrator');
requireText(orchestrator,"script:'deploy:cloudflare'",'deploy orchestrator');
requireText(orchestrator,"optional:true",'deploy orchestrator');

requireText(providers,"id:'atlas-oci'",'provider catalog');
requireText(providers,"role:'canonical-release'",'provider catalog');
requireText(providers,"id:'atlas-vps'",'provider catalog');
requireText(providers,"role:'canonical-production'",'provider catalog');
requireText(providers,"id:'cloudflare'",'provider catalog');
requireText(providers,"role:'optional-adapter'",'provider catalog');
requireText(providers,'cloudflareRequired:false','provider catalog');

requireText(cloudflare,'name: Deploy ATLAS Cloudflare Adapter (Optional)','Cloudflare workflow');
requireText(cloudflare,'workflow_dispatch:','Cloudflare workflow');
if(/\n\s{2}push\s*:/.test(cloudflare))fail('Cloudflare workflow must not run automatically on push');
if(/\n\s{2}pull_request\s*:/.test(cloudflare))fail('Cloudflare workflow must not run automatically on pull requests');
forbidText(cloudflare,'atlas/production','Cloudflare workflow');
requireText(cloudflare,'atlas/cloudflare-adapter','Cloudflare workflow');

requireText(portable,'name: ATLAS Portable Runtime','portable workflow');
requireText(portable,'push:','portable workflow');
requireText(portable,'ghcr.io/${{ github.repository_owner }}/atlas-enterprise-suite:${{ github.sha }}','portable workflow');
requireText(portable,'atlas/sovereign-release','portable workflow');

requireText(vps,'workflow_run:','VPS workflow');
requireText(vps,'workflows: ["ATLAS Portable Runtime"]','VPS workflow');
requireText(vps,"vars.ATLAS_VPS_AUTO_DEPLOY == 'true'",'VPS workflow');
requireText(vps,'atlas/sovereign-production','VPS workflow');
requireText(vps,'StrictHostKeyChecking=yes','VPS workflow');
requireText(vps,'atlas-vps-deploy','VPS workflow');

requireText(portableDoc,'Cloud providers are deployment adapters, not the ATLAS architecture.','portable runtime documentation');

console.log(JSON.stringify({
  ok:true,
  service:'ATLAS Provider Independence Validator',
  canonicalRelease:'sovereign OCI',
  canonicalProduction:'ATLAS VPS',
  cloudflare:'optional-manual-adapter',
  automaticThirdPartyFallback:false
},null,2));
