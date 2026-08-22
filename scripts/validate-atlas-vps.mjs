import fs from 'node:fs';

const read=p=>fs.readFileSync(p,'utf8');
const compose=read('infra/vps/compose.yml');
const bootstrap=read('scripts/atlas-vps-bootstrap.sh');
const deploy=read('scripts/atlas-vps-deploy.sh');
const docs=read('docs/ATLAS_VPS.md');
const workflow=read('.github/workflows/deploy-atlas-vps.yml');

const must=(condition,message)=>{if(!condition)throw new Error(message)};

must(compose.includes('ghcr.io/winderaranguren-gif/atlas-enterprise-suite'), 'Canonical OCI image missing');
must(compose.includes('atlas_vps_state'), 'Persistent ATLAS VPS state volume missing');
must(compose.includes('read_only: true'), 'ATLAS container must be read-only outside declared state');
must(compose.includes('no-new-privileges:true'), 'No-new-privileges hardening missing');
must(compose.includes('cap_drop:'), 'Linux capability drop missing');
must(compose.includes('caddy:2-alpine'), 'ATLAS edge/TLS service missing');
must(compose.includes('condition: service_healthy'), 'Edge must wait for healthy ATLAS app');

must(bootstrap.includes('ATLAS VPS READY'), 'Bootstrap readiness signal missing');
must(bootstrap.includes('ufw allow'), 'Firewall bootstrap missing');
must(bootstrap.includes('docker compose -f compose.yml up -d'), 'Bootstrap does not launch the stack');
must(bootstrap.includes('/_atlas/health'), 'Bootstrap health gate missing');
must(!bootstrap.includes('password'), 'Bootstrap must not embed a password');
must(!bootstrap.includes('CLOUDFLARE'), 'VPS bootstrap must not depend on Cloudflare');

must(deploy.includes('.env.previous'), 'Deploy rollback snapshot missing');
must(deploy.includes('Rolling back'), 'Deploy rollback path missing');
must(deploy.includes('.State.Health.Status'), 'Container health gate missing');
must(deploy.includes('ATLAS_PUBLIC_URL'), 'Optional public verification URL missing');
must(!deploy.includes('wrangler'), 'VPS deploy must not depend on Wrangler');

must(workflow.includes('workflow_dispatch:'), 'VPS deployment must be explicit/manual');
must(workflow.includes('ATLAS_VPS_SSH_PRIVATE_KEY'), 'SSH deployment credential contract missing');
must(workflow.includes('ATLAS_VPS_KNOWN_HOST'), 'Pinned SSH host key contract missing');
must(workflow.includes('scripts/atlas-vps-bootstrap.sh'), 'Workflow bootstrap handoff missing');
must(workflow.includes('scripts/atlas-vps-deploy.sh'), 'Workflow deploy handoff missing');
must(workflow.includes('verify-sovereign-production.mjs'), 'Sovereign production verification missing');

must(docs.includes('Cloudflare is not required'), 'Provider-independent VPS rule missing from docs');
must(docs.includes('not a VPS provider'), 'Infrastructure boundary must be explicit');

console.log('ATLAS VPS validation passed.');
