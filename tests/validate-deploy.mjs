import fs from 'node:fs';

const deploy=fs.readFileSync('.github/workflows/deploy.yml','utf8');
const ci=fs.readFileSync('.github/workflows/ci.yml','utf8');
const release=fs.readFileSync('scripts/release-production.mjs','utf8');
const render=fs.readFileSync('scripts/render-production-wrangler.mjs','utf8');
const e2e=fs.readFileSync('scripts/e2e-production.mjs','utf8');
const pkg=JSON.parse(fs.readFileSync('package.json','utf8'));

for(const marker of ['workflow_run:','workflows: ["ATLAS CI"]','conclusion == \'success\'','workflow_run.event == \'push\'','workflow_run.head_branch == \'main\'','workflow_run.head_sha','ref: ${{ env.ATLAS_RELEASE_SHA }}','node scripts/release-production.mjs','environment: production']){
  if(!deploy.includes(marker)) throw new Error(`Deploy workflow invariant missing: ${marker}`);
}
if(/on:\s*\n\s*push:/m.test(deploy)) throw new Error('Production deploy must not trigger directly from push; it must follow successful CI');
for(const forbidden of ['wrangler d1 migrations apply','wrangler deploy --config','node scripts/e2e-production.mjs']){
  if(deploy.includes(forbidden)) throw new Error(`Deploy workflow must not duplicate release step: ${forbidden}`);
}
for(const marker of ['name: ATLAS CI','push:','pull_request:','npm run build:prod']){
  if(!ci.includes(marker)) throw new Error(`CI workflow invariant missing: ${marker}`);
}
for(const marker of ['npm','build:prod','wrangler@4','d1','migrations','apply','secret','ATLAS_BOOTSTRAP_TOKEN','deploy','scripts/e2e-production.mjs','ATLAS_RELEASE_SHA','working tree is not clean']){
  if(!release.includes(marker)) throw new Error(`Production release runner invariant missing: ${marker}`);
}
if(pkg.scripts?.['release:prod']!=='node scripts/release-production.mjs') throw new Error('package.json release:prod must use the canonical production release runner');
for(const marker of ['ATLAS_D1_DATABASE_NAME','ATLAS_D1_DATABASE_ID','ATLAS_BACKUPS_BUCKET_NAME','ATLAS_DEPLOYED_SHA','Unresolved deployment placeholder']){
  if(!render.includes(marker)) throw new Error(`Production renderer invariant missing: ${marker}`);
}
for(const marker of ['/api/health','/api/meta','/api/auth/me','/api/identity/memberships','/api/crm/contacts','/api/documents','/api/accounting/accounts','/api/accounting/journals','/api/backups','/api/audit-events','Document v2 content mismatch','ATLAS_DEPLOYED_SHA']){
  if(!e2e.includes(marker)) throw new Error(`Production E2E invariant missing: ${marker}`);
}
console.log('ATLAS CI-gated deployment/release/E2E contract validation passed');
