import { execFile, spawn } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const execFileAsync=promisify(execFile);
const ROOT=resolve(process.cwd());
const FOUNDRY=resolve(ROOT,'.atlas','models','foundry');
const JOBS=resolve(FOUNDRY,'jobs.json');
const RECIPES=resolve(FOUNDRY,'recipes.json');
const DATASETS=resolve(FOUNDRY,'datasets.json');
const RUNS=resolve(FOUNDRY,'runs');
const EXECUTOR='atlas-gpu-executor/local-nvidia-v2';
const TRAINERS={
  'speech-to-text':['python3','atlas/trainers/stt_train.py'],
  'phoneme-recognition':['python3','atlas/trainers/creator_train.py'],
  'voice-synthesis':['python3','atlas/trainers/creator_train.py'],
  'voice-clone':['python3','atlas/trainers/creator_train.py'],
  'facial-lipsync':['python3','atlas/trainers/creator_train.py'],
  'super-resolution':['python3','atlas/trainers/creator_train.py'],
  'video-restyle':['python3','atlas/trainers/creator_train.py']
};
await mkdir(RUNS,{recursive:true});

function output(v,code=0){console.log(JSON.stringify(v,null,2));process.exitCode=code}
function args(values){const positional=[],flags={};for(let i=0;i<values.length;i++){const v=values[i];if(!v.startsWith('--')){positional.push(v);continue}const k=v.slice(2);if(values[i+1]&&!values[i+1].startsWith('--'))flags[k]=values[++i];else flags[k]=true}return{positional,flags}}
function bool(v){return v===true||String(v).toLowerCase()==='true'||String(v)==='1'}
async function readJson(path,fallback=[]){try{return JSON.parse(await readFile(path,'utf8'))}catch{return fallback}}
async function saveJson(path,v){await writeFile(path,JSON.stringify(v,null,2)+'\n','utf8')}
function now(){return new Date().toISOString()}

async function detectNvidia(){
  try{
    const {stdout}=await execFileAsync('nvidia-smi',['--query-gpu=name,memory.total,driver_version,compute_cap','--format=csv,noheader,nounits'],{timeout:8000,maxBuffer:1024*1024});
    const gpus=stdout.trim().split(/\r?\n/).filter(Boolean).map((line,index)=>{const parts=line.split(',').map(x=>x.trim());return{index,name:parts[0]||'unknown',memoryMiB:Number(parts[1]||0),driver:parts[2]||null,computeCapability:parts[3]||null}});
    return{available:gpus.length>0,gpus};
  }catch(error){return{available:false,gpus:[],error:error?.code==='ENOENT'?'nvidia-smi-not-found':String(error?.message||error)}}
}
async function detectPython(){
  try{const {stdout,stderr}=await execFileAsync('python3',['--version'],{timeout:5000});return{available:true,version:String(stdout||stderr).trim()}}catch(error){return{available:false,error:error?.code==='ENOENT'?'python3-not-found':String(error?.message||error)}}
}
async function hardwareStatus(){
  const [nvidia,python]=await Promise.all([detectNvidia(),detectPython()]);
  return{service:'ATLAS GPU Executor',version:2,ownership:'ATLAS first-party',externalProviders:[],executionMode:'local-nvidia-node',supportedTasks:Object.keys(TRAINERS),nvidia,python,ready:nvidia.available&&python.available,policy:{shellExecution:false,foundryJobRequired:true,trainingStateRequiresRealProcess:true,dryRunByDefault:true}};
}
function find(rows,id,label){const row=rows.find(x=>x.id===id);if(!row)throw new Error(`${label} not found: ${id}`);return row}
async function loadJob(id){
  const [jobs,recipes,datasets]=await Promise.all([readJson(JOBS,[]),readJson(RECIPES,[]),readJson(DATASETS,[])]);
  const job=find(jobs,id,'job'),recipe=find(recipes,job.recipeId,'recipe'),dataset=find(datasets,job.datasetId,'dataset');
  if(!TRAINERS[job.task])throw new Error(`GPU Executor does not support task ${job.task}`);
  if(recipe.task!==job.task||dataset.task!==job.task)throw new Error('Foundry job, recipe and dataset task mismatch');
  return{jobs,job,recipe,dataset};
}
async function planJob(id){
  const {job,recipe,dataset}=await loadJob(id),base=TRAINERS[job.task],command=[...base,'--job',id];
  return{service:'ATLAS GPU Executor',jobId:id,task:job.task,executor:EXECUTOR,command,recipe:{id:recipe.id,config:recipe.config},dataset:{id:dataset.id,manifestPath:dataset.manifestPath,itemCount:dataset.itemCount},writes:false,externalProviders:[]};
}
async function transition(id,state,reason,extra={}){
  const rows=await readJson(JOBS,[]),i=rows.findIndex(x=>x.id===id);if(i<0)throw new Error(`job not found: ${id}`);
  const next={...rows[i],...extra,state,executor:EXECUTOR,updatedAt:now(),history:[...(rows[i].history||[]),{state,at:now(),reason}]};rows[i]=next;await saveJson(JOBS,rows);return next;
}
async function runJob(id,flags){
  const hw=await hardwareStatus();if(!hw.ready)throw new Error(`GPU runtime is not ready: NVIDIA=${hw.nvidia.available}, Python=${hw.python.available}`);
  const plan=await planJob(id);if(!bool(flags.apply))return{...plan,dryRun:true,message:'Add --apply to start the real local GPU process.'};
  const {job}=await loadJob(id);if(!['queued','failed'].includes(job.state))throw new Error(`job state must be queued or failed, got ${job.state}`);
  const runDir=resolve(RUNS,id);await mkdir(runDir,{recursive:true});
  await transition(id,'running','atlas-gpu-executor-start',{runDir});
  const child=spawn(plan.command[0],plan.command.slice(1),{cwd:ROOT,stdio:'inherit',env:{...process.env,ATLAS_FOUNDRY_ROOT:FOUNDRY,ATLAS_JOB_ID:id}});
  const code=await new Promise((resolveCode,reject)=>{child.once('error',reject);child.once('exit',(c,signal)=>resolveCode(c??(signal?128:1)))});
  const resultPath=resolve(runDir,'result.json');
  if(code===0){await transition(id,'succeeded','trainer-exit-0',{resultPath});return{ok:true,jobId:id,task:job.task,state:'succeeded',resultPath,exitCode:0}}
  await transition(id,'failed',`trainer-exit-${code}`,{resultPath});throw new Error(`ATLAS neural trainer exited with code ${code}`);
}

const [domain,action,...raw]=process.argv.slice(2),{positional,flags}=args(raw);
try{
  if(domain==='status'||domain==='doctor')output(await hardwareStatus());
  else if(domain==='job'&&action==='plan')output(await planJob(String(positional[0]||flags.job||'')));
  else if(domain==='job'&&action==='run')output(await runJob(String(positional[0]||flags.job||''),flags));
  else{console.error('ATLAS GPU Executor\n\nUsage:\n  node atlas/gpu-executor.mjs status\n  node atlas/gpu-executor.mjs job plan <job-id>\n  node atlas/gpu-executor.mjs job run <job-id> [--apply]\n\nExecution is dry-run unless --apply is supplied.');process.exitCode=2}
}catch(error){output({service:'ATLAS GPU Executor',ok:false,error:error instanceof Error?error.message:String(error)},1)}
