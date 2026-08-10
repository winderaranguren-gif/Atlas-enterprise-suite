import fs from 'node:fs';

const read = path => fs.readFileSync(path,'utf8');
const fail = message => { console.error(`ATLAS security contract failed: ${message}`); process.exit(1); };
const requireMarker = (text,marker,label) => { if (!text.includes(marker)) fail(`${label} missing ${marker}`); };

const wrangler = read('wrangler.jsonc');
const secure = read('worker/secure-entry.js');
const core = read('worker/index.js');
const migration1 = read('migrations/0001_commercial_pilot_core.sql');
const migration2 = read('migrations/0002_security_events.sql');
const deploy = read('.github/workflows/atlas-deploy.yml');

for (const marker of [
  '"main": "worker/secure-entry.js"',
  '"binding": "DB"',
  '"crons": ["*/10 * * * *"]'
]) requireMarker(wrangler,marker,'wrangler.jsonc');

for (const marker of [
  "READ_ROLES = new Set(['owner','admin','editor','viewer','auditor'])",
  "WRITE_ROLES = new Set(['owner','admin','editor'])",
  'atlas_security_events',
  "url.pathname === '/api/system/self-repair'",
  'x-atlas-bootstrap-key',
  "reason:'membership_missing'",
  "reason:`role_${role}_not_allowed`"
]) requireMarker(secure,marker,'worker/secure-entry.js');

for (const marker of [
  'atlas_users',
  'atlas_memberships',
  'atlas_sessions',
  'token_hash',
  'actor_user_id',
  'Forbidden for requested organization/DBA scope'
]) requireMarker(core,marker,'worker/index.js');

for (const marker of [
  'CREATE TABLE IF NOT EXISTS atlas_users',
  'CREATE TABLE IF NOT EXISTS atlas_memberships',
  'CREATE TABLE IF NOT EXISTS atlas_sessions',
  'CREATE TABLE IF NOT EXISTS audit_log',
  'actor_user_id TEXT'
]) requireMarker(migration1,marker,'migration 0001');

for (const marker of [
  'CREATE TABLE IF NOT EXISTS atlas_security_events',
  'idx_security_events_scope',
  'idx_security_events_user'
]) requireMarker(migration2,marker,'migration 0002');

for (const marker of [
  'cloudflare-provision.mjs',
  'd1 migrations apply DB --remote',
  'secret put ATLAS_BOOTSTRAP_KEY',
  'wrangler@4 deploy',
  '/api/system/health'
]) requireMarker(deploy,marker,'deployment workflow');

if (/session_token\s*[:=]\s*["'][^"']+["']/.test(core)) fail('hard-coded session token detected');
if (/CLOUDFLARE_API_TOKEN\s*[:=]\s*["'][^"']+["']/.test(deploy)) fail('hard-coded Cloudflare API token detected');

console.log('ATLAS security contract passed: scoped identity, RBAC, auditability, D1 migrations and production deployment boundaries are present.');
