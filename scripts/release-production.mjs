import { spawnSync } from 'node:child_process';
import fs from 'node:fs';

const required=[
  'CLOUDFLARE_API_TOKEN','CLOUDFLARE_ACCOUNT_ID',
  'ATLAS_D1_DATABASE_NAME','ATLAS_D1_DATABASE_ID','ATLAS_BACKUPS_BUCKET_NAME',
  'ATLAS_BOOTSTRAP_TOKEN','ATLAS_PRODUCTION_BASE_URL',
  'ATLAS_E2E_BEARER_TOKEN','ATLAS_E2E_ORGANIZATION_ID','ATLAS_E2E_DBA_ID'
];
for(const key of required){
  if(!process.env[key]) throw new Error(`Missing required production value: ${key}`);
}

function run(command,args,{input,env=process.env}={}){
  const result=spawnSync(command,args,{stdio:input===undefined?'inherit':['pipe','inherit','inherit'],input,env,encoding:'utf8'});
  if(result.error) throw result.error;
  if(result.status!==0) throw new Error(`${command} ${args.join(' ')} failed with exit code ${result.status}`);
}

function capture(command,args){
  const result=spawnSync(command,args,{encoding:'utf8'});
  if(result.error||result.status!==0) return null;
  return result.stdout.trim();
}

const releaseSha=process.env.ATLAS_RELEASE_SHA||process.env.GITHUB_SHA||capture('git',['rev-parse','HEAD']);
if(!releaseSha||!/^[0-9a-f]{40}$/i.test(releaseSha)) throw new Error('Unable to resolve an exact 40-character release SHA');
process.env.GITHUB_SHA=releaseSha;

const localSha=capture('git',['rev-parse','HEAD']);
if(localSha&&localSha!==releaseSha) throw new Error(`Release SHA ${releaseSha} does not match checked-out HEAD ${localSha}`);

const dirty=capture('git',['status','--porcelain']);
if(dirty) throw new Error('Production release refused: working tree is not clean');

console.log(`ATLAS production release ${releaseSha}`);
run('npm',['run','build:prod']);
run(process.execPath,['scripts/render-production-wrangler.mjs']);

try{
  run('npx',['--yes','wrangler@4','d1','migrations','apply','DB','--remote','--config','wrangler.production.jsonc']);
  run('npx',['--yes','wrangler@4','secret','put','ATLAS_BOOTSTRAP_TOKEN','--config','wrangler.production.jsonc'],{input:process.env.ATLAS_BOOTSTRAP_TOKEN});
  run('npx',['--yes','wrangler@4','deploy','--config','wrangler.production.jsonc']);
  run(process.execPath,['scripts/e2e-production.mjs']);
  console.log(JSON.stringify({ok:true,releaseSha,verified:'production-e2e'}));
} finally {
  if(fs.existsSync('wrangler.production.jsonc')) fs.rmSync('wrangler.production.jsonc');
}
