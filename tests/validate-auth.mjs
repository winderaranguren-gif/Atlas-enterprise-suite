import fs from 'node:fs';

const migration=fs.readFileSync('migrations/0007_login.sql','utf8');
const auth=fs.readFileSync('platform/security/auth.js','utf8');
const routes=fs.readFileSync('modules/identity/auth-routes.js','utf8');
const worker=fs.readFileSync('worker/index.js','utf8');

for(const marker of [
  'CREATE TABLE password_credentials',
  'CREATE TABLE credential_setup_tokens',
  'token_hash TEXT NOT NULL UNIQUE',
  'used_at TEXT',
  'iterations INTEGER NOT NULL CHECK(iterations >= 100000)',
  'idx_credential_setup_token'
]) if(!migration.includes(marker)) throw new Error(`Auth migration invariant missing: ${marker}`);

for(const marker of [
  'PBKDF2',
  "hash:'SHA-256'",
  'PASSWORD_ITERATIONS=210000',
  "password.length<12",
  'crypto.getRandomValues',
  'verifyPassword'
]) if(!auth.includes(marker)) throw new Error(`Password security invariant missing: ${marker}`);

for(const marker of [
  '/api/auth/setup-token',
  "['owner','admin']",
  "datetime('now','+30 minutes')",
  '/api/auth/activate',
  'invalid_or_expired_setup_token',
  'UPDATE sessions SET revoked_at=CURRENT_TIMESTAMP WHERE user_id=?',
  '/api/auth/login',
  'invalid_credentials',
  'active_membership_required',
  '/api/auth/logout',
  'auth.setup_token.issue',
  'auth.activate',
  'auth.login',
  'auth.logout'
]) if(!routes.includes(marker)) throw new Error(`Auth route invariant missing: ${marker}`);

if(!worker.includes('authRoutes(request,env,url)')) throw new Error('Commercial auth router wiring missing');

console.log('ATLAS commercial authentication contracts passed');
