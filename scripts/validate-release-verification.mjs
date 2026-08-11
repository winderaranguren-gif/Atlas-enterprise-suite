import fs from 'node:fs';

const fail=(message)=>{throw new Error(`ATLAS release verification contract: ${message}`);};
const release=fs.readFileSync(new URL('../worker/release-verification.js',import.meta.url),'utf8');
const router=fs.readFileSync(new URL('../worker/router.js',import.meta.url),'utf8');
const workflow=fs.readFileSync(new URL('../.github/workflows/atlas-production-release.yml',import.meta.url),'utf8');
const e2e=fs.readFileSync(new URL('./e2e-commercial-pilot.mjs',import.meta.url),'utf8');

for(const required of [
  "const VERIFY_ORG='atlas-e2e'",
  "const VERIFY_DBA='pilot'",
  "ATLAS_RELEASE_VERIFICATION_TOKEN",
  "x-atlas-release-verification-token",
  "expected_sha",
  "requestedSha!==deployedSha",
  "15*60*1000",
  "UPDATE atlas_sessions SET revoked_at",
  "release_verification_session"
]) if(!release.includes(required)) fail(`worker/release-verification.js missing required guard: ${required}`);

if(!router.includes("handleReleaseVerification")) fail('router does not import release verification handler');
if(!router.includes("/api/admin/release-verification-session")) fail('router does not dispatch release verification endpoint');

for(const required of [
  'ATLAS_RELEASE_VERIFICATION_TOKEN: ${{ secrets.ATLAS_RELEASE_VERIFICATION_TOKEN }}',
  'secret put ATLAS_RELEASE_VERIFICATION_TOKEN',
  'test ${#ATLAS_RELEASE_VERIFICATION_TOKEN} -ge 32',
  'Run exact-SHA commercial pilot E2E'
]) if(!workflow.includes(required)) fail(`production workflow missing: ${required}`);

for(const required of [
  "org!=='atlas-e2e'||dba!=='pilot'",
  '/api/admin/release-verification-session',
  'releaseVerification.length<32',
  'expected_sha:expectedSha',
  'Date.now().toString(36)'
]) if(!e2e.includes(required)) fail(`E2E is not repeatability-safe: ${required}`);

console.log('ATLAS release verification contract is fail-closed and repeatable.');
