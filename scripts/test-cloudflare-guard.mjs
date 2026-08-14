import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';

function run(extraEnv={}){
  return spawnSync(process.execPath,['scripts/guard-cloudflare-production.mjs'],{
    encoding:'utf8',
    env:{...process.env,WORKERS_CI:'',WORKERS_CI_BRANCH:'',WORKERS_CI_COMMIT_SHA:'',...extraEnv}
  });
}

const local=run();
assert.equal(local.status,0,'local environment must pass');

const main=run({WORKERS_CI:'1',WORKERS_CI_BRANCH:'main',WORKERS_CI_COMMIT_SHA:'abc123'});
assert.equal(main.status,0,'Cloudflare main must pass');
assert.match(main.stdout,/accepted main/);

const feature=run({WORKERS_CI:'1',WORKERS_CI_BRANCH:'feature/test',WORKERS_CI_COMMIT_SHA:'def456'});
assert.equal(feature.status,42,'non-main Cloudflare branch must be blocked');
assert.match(feature.stderr,/blocked Cloudflare Workers Build/);

const missing=run({WORKERS_CI:'1',WORKERS_CI_BRANCH:''});
assert.notEqual(missing.status,0,'missing Cloudflare branch must fail closed');

console.log('ATLAS Cloudflare production guard validation passed');
