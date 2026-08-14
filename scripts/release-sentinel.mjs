const env=process.env;
const isCloudflare=env.WORKERS_CI==='1';
const isGitHub=env.GITHUB_ACTIONS==='true';
const mode=String(env.ATLAS_RELEASE_MODE||'').trim().toLowerCase();
const branch=String(env.WORKERS_CI_BRANCH||env.GITHUB_REF_NAME||'').trim();
const sha=String(env.WORKERS_CI_COMMIT_SHA||env.GITHUB_SHA||'').trim();
const expected=String(env.ATLAS_RELEASE_EXPECTED_SHA||'').trim();

function fail(code,message){console.error(`ATLAS Release Sentinel blocked release: ${message}`);process.exit(code)}

if(isCloudflare){
  if(branch!=='main')fail(51,`cloudflare_branch_not_main:${branch||'missing'}`);
  if(!sha)fail(52,'cloudflare_commit_sha_missing');
}

if(mode==='production'){
  if(branch!=='main')fail(53,`production_branch_not_main:${branch||'missing'}`);
  if(!sha)fail(54,'production_commit_sha_missing');
  if(expected&&sha!==expected)fail(55,`production_sha_mismatch:actual=${sha}:expected=${expected}`);
}

if(isGitHub&&mode==='production'&&env.GITHUB_EVENT_NAME==='pull_request'){
  fail(56,'pull_request_cannot_run_production_release');
}

console.log(JSON.stringify({ok:true,gate:'ATLAS Release Sentinel',mode:mode||'validation',branch:branch||'local',sha:sha||'local',provider:isCloudflare?'cloudflare':isGitHub?'github':'local'}));
