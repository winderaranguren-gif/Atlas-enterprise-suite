import { execFile, spawn } from 'node:child_process';
import { promisify } from 'node:util';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const execFileAsync=promisify(execFile);
const ROOT=resolve(process.cwd());
const FOUNDRY=resolve(ROOT,'.atlas','models','foundry');
const JOBS=resolve(FOUNDRY,'jobs.json');
const ARTIFACTS=resolve(FOUNDRY,'artifacts.json');
const TASKS=[
  {id:'speech-to-text',stage:1,label:'Speech-to-Text',consumer:'/studio/speech',trainer:'atlas/trainers/stt_train.py'},
  {id:'phoneme-recognition',stage:2,label:'Phoneme Recognition',consumer:'/studio/lipsync',trainer:'atlas/trainers/creator_train.py'},
  {id:'voice-synthesis',stage:3,label:'Voice Synthesis',consumer:'/studio/voice',trainer:'atlas/trainers/creator_train.py',consent:true},
  {id:'voice-clone',stage:4,label:'Voice Clone',consumer:'/studio/voice',trainer:'atlas/trainers/creator_train.py',consent:true},
  {id:'facial-lipsync',stage:5,label:'Neural Lip Sync',consumer:'/studio/lipsync',trainer:'atlas/trainers/creator_train.py',consent:true},
  {id:'super-resolution',stage:6,label:'Neural Super Resolution',consumer:'/studio/resolution',trainer:'atlas/trainers/creator_train.py'},
  {id:'video-restyle',stage:7,label:'Neural Video Restyle',consumer:'/studio/look',trainer:'atlas/trainers/creator_train.py',consent:true}
];
const COMPOSITES={
  'digital-twin':{label:'ATLAS Digital Twin',requires:['voice-clone','facial-lipsync','video-restyle'],policy:{consentRequired:true,identityBearing:true}},
  'creator-video':{label:'ATLAS Creator Neural Video',requires:['speech-to-text','phoneme-recognition','voice-synthesis','facial-lipsync','super-resolution','video-restyle'],policy:{consentRequiredForIdentityFeatures:true}}
};

async function readJson(path,fallback=[]){try{return JSON.parse(await readFile(path,'utf8'))}catch{return fallback}}
function output(value,code=0){console.log(JSON.stringify(value,null,2));process.exitCode=code}
function args(values){const positional=[],flags={};for(let i=0;i<values.length;i++){const v=values[i];if(!v.startsWith('--')){positional.push(v);continue}const k=v.slice(2);if(values[i+1]&&!values[i+1].startsWith('--'))flags[k]=values[++i];else flags[k]=true}return{positional,flags}}
function bool(v){return v===true||String(v).toLowerCase()==='true'||String(v)==='1'}
function taskById(id){const task=TASKS.find(x=>x.id===id);if(!task)throw new Error(`Unknown neural creator task: ${id}`);return task}
async function gpuStatus(){try{const {stdout}=await execFileAsync(process.execPath,['atlas/gpu-executor.mjs','status'],{cwd:ROOT,timeout:10000,maxBuffer:1024*1024});return JSON.parse(stdout)}catch(error){return{service:'ATLAS GPU Executor',ready:false,error:String(error?.message||error)}}}
async function status(){
  const [jobs,artifacts,gpu]=await Promise.all([readJson(JOBS,[]),readJson(ARTIFACTS,[]),gpuStatus()]);
  const tasks=TASKS.map(task=>{
    const taskJobs=jobs.filter(x=>x.task===task.id);
    const validated=artifacts.filter(x=>x.task===task.id&&x.state==='validated');
    const candidates=artifacts.filter(x=>x.task===task.id&&x.state==='candidate');
    return{...task,jobs:{total:taskJobs.length,queued:taskJobs.filter(x=>x.state==='queued').length,running:taskJobs.filter(x=>x.state==='running').length,succeeded:taskJobs.filter(x=>x.state==='succeeded').length,failed:taskJobs.filter(x=>x.state==='failed').length},artifacts:{validated:validated.length,candidate:candidates.length},readyForConsumption:validated.length>0};
  });
  const composites=Object.fromEntries(Object.entries(COMPOSITES).map(([id,c])=>[id,{...c,ready:c.requires.every(task=>tasks.find(x=>x.id===task)?.readyForConsumption)}]));
  return{service:'ATLAS Neural Creator',version:1,ownership:'ATLAS first-party',externalProviders:[],gpu,tasks,composites,policy:{dryRunByDefault:true,validatedArtifactsRequiredForReady:true,identityFeaturesRequireConsent:true,fakeTrainingStates:false}};
}
async function plan(target='creator-video'){
  const composite=COMPOSITES[target];
  const ids=composite?composite.requires:[taskById(target).id];
  const state=await status();
  const stages=ids.map(id=>{const task=state.tasks.find(x=>x.id===id);return{stage:task.stage,task:id,label:task.label,consumer:task.consumer,consentRequired:Boolean(task.consent),validatedArtifacts:task.artifacts.validated,queuedJobs:task.jobs.queued,next:task.artifacts.validated?'use-validated-artifact':task.jobs.queued?'run-queued-job':'register-dataset-recipe-and-job'}});
  return{service:'ATLAS Neural Creator',target,composite:composite||null,externalProviders:[],gpuReady:Boolean(state.gpu?.ready),stages,executionCommand:'node atlas/neural-creator.mjs run <job-id> --apply',message:'ATLAS will not claim a neural capability is ready until a real training process produces an artifact that Neural Foundry validates.'};
}
async function runJob(jobId,apply){
  const jobs=await readJson(JOBS,[]),job=jobs.find(x=>x.id===jobId);if(!job)throw new Error(`Foundry job not found: ${jobId}`);
  taskById(job.task);
  const command=[process.execPath,'atlas/gpu-executor.mjs','job','run',jobId,...(apply?['--apply']:[])];
  if(!apply){const {stdout}=await execFileAsync(command[0],command.slice(1),{cwd:ROOT,timeout:15000,maxBuffer:1024*1024});return{service:'ATLAS Neural Creator',dryRun:true,jobId,task:job.task,plan:JSON.parse(stdout),externalProviders:[]}}
  return await new Promise((resolvePromise,reject)=>{
    const child=spawn(command[0],command.slice(1),{cwd:ROOT,stdio:'inherit',env:{...process.env,ATLAS_NEURAL_CREATOR:'1'}});
    child.once('error',reject);child.once('exit',(code,signal)=>{if(code===0)resolvePromise({service:'ATLAS Neural Creator',ok:true,jobId,task:job.task,exitCode:0,externalProviders:[]});else reject(new Error(`GPU executor failed for ${jobId} with ${code??signal}`))});
  });
}

const [command,...raw]=process.argv.slice(2),{positional,flags}=args(raw);
try{
  if(command==='status'||command==='doctor')output(await status());
  else if(command==='plan')output(await plan(String(positional[0]||flags.target||'creator-video')));
  else if(command==='run')output(await runJob(String(positional[0]||flags.job||''),bool(flags.apply)));
  else if(command==='tasks')output({service:'ATLAS Neural Creator',tasks:TASKS,composites:COMPOSITES,externalProviders:[]});
  else{console.error('ATLAS Neural Creator\n\nUsage:\n  node atlas/neural-creator.mjs status\n  node atlas/neural-creator.mjs tasks\n  node atlas/neural-creator.mjs plan [creator-video|digital-twin|task-id]\n  node atlas/neural-creator.mjs run <job-id> [--apply]\n\nTraining remains dry-run until --apply is supplied.');process.exitCode=2}
}catch(error){output({service:'ATLAS Neural Creator',ok:false,error:error instanceof Error?error.message:String(error)},1)}
