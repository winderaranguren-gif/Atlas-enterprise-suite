import fs from 'node:fs';

const core=fs.readFileSync(new URL('../worker/commercial-core.js',import.meta.url),'utf8');
const e2e=fs.readFileSync(new URL('./e2e-password-auth.mjs',import.meta.url),'utf8');

const checks=[
  ['audit role set excludes viewer/editor',/const AUDIT_ROLES=new Set\(\['owner','admin','auditor'\]\)/.test(core)],
  ['user directory requires privileged mode',/\/api\/users'&&request\.method==='GET'[\s\S]*authorize\(request,env,'directory'\)/.test(core)],
  ['audit endpoint requires audit mode',/\/api\/audit'&&request\.method==='GET'[\s\S]*authorize\(request,env,'audit'\)/.test(core)],
  ['directory mode maps to manage roles',/mode==='directory'\?MANAGE_ROLES\.has\(role\)/.test(core)],
  ['audit mode maps to audit roles',/mode==='audit'\?AUDIT_ROLES\.has\(role\)/.test(core)],
  ['production E2E denies viewer user-directory read',/Viewer cannot enumerate user directory/.test(e2e)&&/userDirectory\.status===403/.test(e2e)],
  ['production E2E denies viewer audit read',/Viewer cannot read audit trail/.test(e2e)&&/audit\.status===403/.test(e2e)]
];

const failed=checks.filter(([,ok])=>!ok);
for(const [name,ok] of checks) console.log(`${ok?'PASS':'FAIL'} ${name}`);
if(failed.length) process.exit(1);
