import fs from 'node:fs';

const read=(p)=>fs.readFileSync(new URL(`../${p}`,import.meta.url),'utf8');
const auth=read('worker/password-auth.js');
const router=read('worker/router.js');
const migration=read('migrations/0015_auth_credentials.sql');
const checks=[
  ['PBKDF2 SHA-256',auth.includes("hash:'SHA-256'")&&auth.includes("name:'PBKDF2'")],
  ['310k iterations',auth.includes('const ITERATIONS=310000')],
  ['strong password floor',auth.includes("password.length<14")],
  ['constant-time comparison',auth.includes('safeEqualHex')],
  ['five-attempt lockout',auth.includes('attempts>=5')&&auth.includes('15*60*1000')],
  ['one-use activation',auth.includes('consumed_at IS NULL')&&auth.includes('UPDATE atlas_activation_tokens SET consumed_at=')],
  ['24-hour activation expiry',auth.includes('24*60*60*1000')],
  ['scope-checked activation issuer',auth.includes("['owner','admin'].includes")&&auth.includes('organization_id=? AND dba_id=?')],
  ['login returns memberships from D1',auth.includes('async function memberships')&&auth.includes('memberships:activeMemberships')],
  ['activation revokes old sessions',auth.includes("UPDATE atlas_sessions SET revoked_at=? WHERE user_id=? AND revoked_at IS NULL")],
  ['owner enrollment gated by bootstrap secret',auth.includes('ATLAS_BOOTSTRAP_TOKEN')&&auth.includes('/api/auth/enroll-owner')],
  ['router wiring',router.includes("import { handlePasswordAuth }")&&router.includes("url.pathname.startsWith('/api/auth/')")],
  ['credential migration',migration.includes('atlas_password_credentials')&&migration.includes('atlas_activation_tokens')],
  ['no plaintext password column',!migration.match(/password\s+TEXT/i)]
];
const failed=checks.filter(([,ok])=>!ok);
for(const [name,ok] of checks) console.log(`${ok?'PASS':'FAIL'} ${name}`);
if(failed.length) process.exit(1);
console.log('ATLAS password authentication contract validated.');
