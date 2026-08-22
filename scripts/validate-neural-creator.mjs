import {readFile} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';

function assert(value,message){if(!value)throw new Error(message)}
function run(command,args=[]){const r=spawnSync(command,args,{encoding:'utf8'});assert(r.status===0,`${command} ${args.join(' ')} failed (${r.status})\n${r.stdout}\n${r.stderr}`);return r.stdout.trim()?JSON.parse(r.stdout):null}

const files={
  orchestrator:await readFile('atlas/neural-creator.mjs','utf8'),
  gpu:await readFile('atlas/gpu-executor.mjs','utf8'),
  trainer:await readFile('atlas/trainers/creator_train.py','utf8'),
  pkg:JSON.parse(await readFile('package.json','utf8'))
};
const tasks=['speech-to-text','phoneme-recognition','voice-synthesis','voice-clone','facial-lipsync','super-resolution','video-restyle'];
for(const task of tasks){assert(files.orchestrator.includes(`id:'${task}'`),`orchestrator missing ${task}`);assert(files.gpu.includes(`'${task}'`),`GPU executor missing ${task}`)}
for(const token of ['train_phoneme','train_voice','train_lipsync','train_superres','train_restyle','ATLAS Neural Creator'])assert(files.trainer.includes(token),`creator trainer missing ${token}`);
for(const token of ['digital-twin','creator-video','validatedArtifactsRequiredForReady','identityFeaturesRequireConsent','fakeTrainingStates:false'])assert(files.orchestrator.includes(token),`orchestrator policy missing ${token}`);
assert(files.pkg.scripts['atlas:neural-create']==='node atlas/neural-creator.mjs','atlas:neural-create script missing');
assert(files.pkg.scripts['check:neural-creator']==='node scripts/validate-neural-creator.mjs','check:neural-creator script missing');
const taskList=run(process.execPath,['atlas/neural-creator.mjs','tasks']);
assert(taskList.service==='ATLAS Neural Creator','Neural Creator service mismatch');
assert(Array.isArray(taskList.externalProviders)&&taskList.externalProviders.length===0,'external neural provider detected');
assert(taskList.tasks.length===7,'expected seven ATLAS neural tasks');
assert(taskList.composites['digital-twin'].requires.includes('voice-clone'),'Digital Twin must require voice clone');
assert(taskList.composites['digital-twin'].requires.includes('facial-lipsync'),'Digital Twin must require neural lip sync');
assert(taskList.composites['digital-twin'].requires.includes('video-restyle'),'Digital Twin must require neural video restyle');
const status=run(process.execPath,['atlas/neural-creator.mjs','status']);
assert(status.policy?.fakeTrainingStates===false,'Neural Creator must not fake training states');
assert(status.policy?.dryRunByDefault===true,'Neural Creator must be dry-run by default');
assert(status.tasks.every(x=>x.readyForConsumption===false),'empty CI must not report validated neural models');
const gpu=run(process.execPath,['atlas/gpu-executor.mjs','status']);
assert(gpu.version===2,'GPU Executor v2 expected');
assert(tasks.every(t=>gpu.supportedTasks.includes(t)),'GPU Executor does not expose all creator tasks');
assert(gpu.ready===false,'hosted CPU CI unexpectedly reported a ready NVIDIA executor');
const doctor=run('python3',['atlas/trainers/creator_train.py','--doctor']);
assert(doctor.service==='ATLAS Neural Creator Trainers','trainer doctor service mismatch');
assert(Array.isArray(doctor.externalProviders)&&doctor.externalProviders.length===0,'trainer doctor reported external providers');
assert(doctor.supportedTasks.length===6,'creator trainer should own six non-STT tasks');
console.log(JSON.stringify({ok:true,service:'ATLAS Neural Creator',tasks:tasks.length,composites:Object.keys(taskList.composites),gpuReady:gpu.ready,externalProviders:0},null,2));
