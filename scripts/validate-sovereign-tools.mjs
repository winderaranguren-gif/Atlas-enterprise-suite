import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

const ROOT=resolve(process.cwd());
const files=['atlas/providers.mjs','atlas/oauth.mjs','atlas/sandbox.mjs'];
for(const file of files){
  const r=spawnSync(process.execPath,['--check',resolve(ROOT,file)],{encoding:'utf8'});
  assert.equal(r.status,0,`${file} syntax failed: ${r.stderr||r.stdout}`);
}

function run(script,args=[]){
  const r=spawnSync(process.execPath,[resolve(ROOT,script),...args],{cwd:ROOT,encoding:'utf8'});
  assert.equal(r.status,0,`${script} ${args.join(' ')} failed: ${r.stderr||r.stdout}`);
  return JSON.parse(r.stdout);
}

const providers=run('atlas/providers.mjs',['catalog']);
assert.equal(providers.service,'ATLAS Provider Adapters');
assert.equal(providers.policy.secretValuesStored,false);
assert.equal(providers.policy.providerBrandCloning,false);
for(const id of ['github','cloudflare','vercel','supabase','openai','anthropic','google-ai']){
  assert.ok(providers.providers.some(p=>p.id===id),`missing provider ${id}`);
}

const plan=run('atlas/providers.mjs',['plan','cloudflare','deploy','--json','{"artifact":"worker"}']);
assert.equal(plan.executable,false);
assert.equal(plan.contract.auditRequired,true);
assert.equal(plan.contract.tenantScoped,true);

const oauth=run('atlas/oauth.mjs',['status']);
assert.equal(oauth.pkce,true);
assert.equal(oauth.tokenPersistence,false);
assert.equal(oauth.clientSecretStorage,false);

const pkce=run('atlas/oauth.mjs',['pkce','--auth-url','https://example.test/authorize','--client-id','atlas-test','--redirect-uri','https://atlas.test/callback','--scope','openid profile']);
assert.equal(pkce.method,'S256');
assert.ok(pkce.verifier.length>=43);
assert.ok(pkce.challenge.length>=43);
assert.match(pkce.authorizationUrl,/code_challenge_method=S256/);
assert.equal(pkce.policy.persistedByTool,false);

const sandbox=run('atlas/sandbox.mjs',['status']);
assert.equal(sandbox.service,'ATLAS Sandbox');

const preview=run('atlas/sandbox.mjs',['create','ci-preview']);
assert.equal(preview.apply,false);
assert.equal(preview.sandbox.safeScriptsOnly,true);

console.log('ATLAS sovereign provider/OAuth/sandbox validation passed.');
