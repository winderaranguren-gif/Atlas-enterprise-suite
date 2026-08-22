import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';

const ROOT=resolve(process.cwd());
const OUT=resolve(ROOT,'build','models','atlas-audio-canary-v1.json');
const RESULT=resolve(ROOT,'build','models','atlas-audio-canary-v1-result.json');
function output(v,code=0){console.log(JSON.stringify(v,null,2));process.exitCode=code}
async function sha(path){return createHash('sha256').update(await readFile(path)).digest('hex')}
async function run(){
  const child=spawn('python3',['atlas/trainers/canary_train.py','--out',OUT],{cwd:ROOT,stdio:'inherit'});
  const code=await new Promise((resolveCode,reject)=>{child.once('error',reject);child.once('exit',c=>resolveCode(c??1))});
  if(code!==0)throw new Error(`ATLAS canary trainer exited ${code}`);
  const model=JSON.parse(await readFile(OUT,'utf8'));
  const result=JSON.parse(await readFile(RESULT,'utf8'));
  const actual=await sha(OUT);
  if(actual!==result.sha256)throw new Error('ATLAS model artifact hash mismatch');
  if(model.externalProviders?.length)throw new Error('External provider detected in ATLAS canary artifact');
  if(model.productionCapability!==false)throw new Error('Canary must not be presented as a production model');
  return{service:'ATLAS Model Factory',model:model.model,state:model.state,artifact:OUT,sha256:actual,metrics:model.metrics,externalProviders:[],productionCapability:false};
}
try{output(await run())}catch(error){output({service:'ATLAS Model Factory',ok:false,error:error instanceof Error?error.message:String(error)},1)}
