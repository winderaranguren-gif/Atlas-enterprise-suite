import fs from 'node:fs';

const deploy=fs.readFileSync('.github/workflows/deploy.yml','utf8');
const render=fs.readFileSync('scripts/render-production-wrangler.mjs','utf8');
const e2e=fs.readFileSync('scripts/e2e-production.mjs','utf8');

for(const marker of ['wrangler d1 migrations apply DB --remote','wrangler deploy --config wrangler.production.jsonc','node scripts/e2e-production.mjs','ATLAS_E2E_BEARER_TOKEN','ATLAS_PRODUCTION_BASE_URL']){
  if(!deploy.includes(marker)) throw new Error(`Deploy workflow invariant missing: ${marker}`);
}
for(const marker of ['ATLAS_D1_DATABASE_NAME','ATLAS_D1_DATABASE_ID','ATLAS_BACKUPS_BUCKET_NAME','ATLAS_DEPLOYED_SHA','Unresolved deployment placeholder']){
  if(!render.includes(marker)) throw new Error(`Production renderer invariant missing: ${marker}`);
}
for(const marker of ['/api/health','/api/auth/me','/api/crm/contacts','/api/documents','/api/audit-events','Document v2 content mismatch']){
  if(!e2e.includes(marker)) throw new Error(`Production E2E invariant missing: ${marker}`);
}
console.log('ATLAS deployment/E2E contract validation passed');
