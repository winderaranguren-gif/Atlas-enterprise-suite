import fs from 'node:fs';

const security=fs.readFileSync('worker/security-events.js','utf8');
const router=fs.readFileSync('worker/router.js','utf8');
const e2e=fs.readFileSync('scripts/e2e-password-auth.mjs','utf8');

const checks=[
  ['exact scoped membership',security.includes("WHERE user_id=? AND organization_id=? AND dba_id=? AND status='active'")],
  ['privileged audit roles',security.includes("new Set(['owner','admin','auditor'])")],
  ['scope-filtered security events',security.includes('FROM atlas_security_events WHERE organization_id=? AND dba_id=?')],
  ['bounded result limit',security.includes('Math.max(1,Math.min(200,limitRaw))')],
  ['decision filter allow deny only',security.includes("new Set(['allow','deny'])")],
  ['router import',router.includes("import { handleSecurityEvents } from './security-events.js';")],
  ['router endpoint',router.includes("url.pathname==='/api/security-events'")],
  ['viewer E2E denial',e2e.includes("mark('Viewer cannot read security evidence',security.status===403")],
  ['manager E2E access',e2e.includes("mark('Privileged security evidence readable',securityBefore.status===200")],
  ['deny evidence E2E',e2e.includes("mark('Denied authorization evidence queryable',deniedEvidence.status===200")]
];

const failed=checks.filter(([,ok])=>!ok).map(([name])=>name);
if(failed.length){
  console.error(JSON.stringify({ok:false,failed},null,2));
  process.exit(1);
}
console.log(JSON.stringify({ok:true,checks:checks.map(([name])=>name)},null,2));
