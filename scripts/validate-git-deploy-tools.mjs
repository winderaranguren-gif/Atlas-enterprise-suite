import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

const ROOT=resolve(process.cwd());
for(const file of ['atlas/git-gateway.mjs','atlas/deploy-orchestrator.mjs']){
  const r=spawnSync(process.execPath,['--check',resolve(ROOT,file)],{encoding:'utf8'});
  assert.equal(r.status,0,`${file} syntax failed: ${r.stderr||r.stdout}`);
}
function run(file,args=[]){
  const r=spawnSync(process.execPath,[resolve(ROOT,file),...args],{cwd:ROOT,encoding:'utf8'});
  assert.equal(r.status,0,`${file} failed: ${r.stderr||r.stdout}`);
  return JSON.parse(r.stdout);
}
const git=run('atlas/git-gateway.mjs',['status','--repo','atlas/example']);
assert.equal(git.service,'ATLAS Git Gateway');
assert.equal(git.mutationDefault,'dry-run');
assert.equal(git.auditRequired,true);
const branch=run('atlas/git-gateway.mjs',['branch-create','feature/test','--from','main','--repo','atlas/example']);
assert.equal(branch.apply,false);
assert.equal(branch.operation,'branch.create');
const deploy=run('atlas/deploy-orchestrator.mjs',['status']);
assert.equal(deploy.service,'ATLAS Deploy Orchestrator');
assert.equal(deploy.mutationDefault,'dry-run');
assert.equal(deploy.policy.credentialsFromEnvironmentOnly,true);
const plan=run('atlas/deploy-orchestrator.mjs',['plan','cloudflare','--json','{"artifact":"worker"}']);
assert.equal(plan.apply,false);
assert.equal(plan.provider,'cloudflare');
assert.equal(plan.auditRequired,true);
assert.equal(plan.secretValuesLogged,false);
console.log('ATLAS Git/deploy tool validation passed.');
