import { mkdir, writeFile, rm, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { handleStudioModelLab,MODEL_LAB_CAPABILITIES,MODEL_TASKS } from '../modules/studio-model-lab-worker.js';
const ROOT=resolve(process.cwd()),FIX=resolve(ROOT,'.atlas','ci-foundry-fixtures');
function assert(v,m){if(!v)throw new Error(m)}
function run(args,expect=0){const r=spawnSync(process.execPath,['atlas/neural-foundry.mjs',...args],{cwd:ROOT,encoding:'utf8'});assert(r.status===expect,`Foundry command failed (${r.status}): ${args.join(' ')}\n${r.stdout}\n${r.stderr}`);return r.stdout.trim()?JSON.parse(r.stdout):null}
async function endpoint(path){const r=handleStudioModelLab(new Request('https://atlas.local'+path));assert(r instanceof Response,`Missing response ${path}`);assert(r.ok,`${path} ${r.status}`);return r}
try{
  await mkdir(FIX,{recursive:true});
  const modelPath=resolve(FIX,'mock-model.bin'),manifestPath=resolve(FIX,'dataset.json');
  await writeFile(modelPath,Buffer.from('ATLAS-NEURAL-FOUNDRY-CI-MODEL\n'));
  await writeFile(manifestPath,JSON.stringify({id:'ci-dataset',task:'speech-to-text',license:'ci-only',items:[{id:'sample-1',source:'fixture://one',authorized:true}]},null,2));
  const status=run(['status']);
  assert(status.service==='ATLAS Neural Foundry','Foundry service mismatch');
  assert(status.gpuExecutorConfigured===false,'Foundry registry itself must not falsely configure a GPU');
  assert(Array.isArray(status.externalProviders)&&status.externalProviders.length===0,'External model provider detected');
  for(const c of ['artifact.register','artifact.verify','artifact.promote','dataset.register','recipe.define','job.create','job.transition'])assert(status.capabilities.includes(c),`Missing Foundry capability ${c}`);
  const artifact=run(['artifact','register','--path',modelPath,'--task','speech-to-text','--id','ci-artifact','--metrics','{"wer":0.1}']);
  assert(artifact.apply===false&&artifact.artifact.sha256?.length===64,'Artifact dry-run or SHA-256 failed');
  const dataset=run(['dataset','register','--manifest',manifestPath,'--task','speech-to-text','--id','ci-dataset']);assert(dataset.apply===false&&dataset.dataset.itemCount===1,'Dataset dry-run failed');
  const recipe=run(['recipe','define','--task','speech-to-text','--id','ci-recipe','--json','{"architecture":"atlas-test","learningRate":0.0001,"batchSize":2,"epochs":1,"seed":42}']);assert(recipe.apply===false&&recipe.recipe.configSha256?.length===64,'Recipe dry-run failed');
  const caps=await(await endpoint('/api/studio/models/capabilities')).json();
  assert(caps.service==='atlas-neural-foundry','Model Lab service mismatch');
  assert(caps.trainingExecutionAvailable==='runtime-dependent'&&caps.gpuExecutorConfigured==='probe-on-training-node','Model Lab must describe runtime-dependent execution honestly');
  assert(Array.isArray(caps.externalProviders)&&caps.externalProviders.length===0,'Model Lab external provider detected');
  assert(caps.policy?.trainedStateRequiresArtifact===true&&caps.policy?.identityTasksRequireConsent===true&&caps.policy?.trainingStateRequiresRealProcess===true,'Model policy missing');
  const ready=new Set(caps.capabilities.filter(x=>x.state==='ready').map(x=>x.id));
  for(const id of ['task-contracts','dataset-manifest','training-recipe','consent-gate','artifact-integrity','promotion-gate','job-registry'])assert(ready.has(id),`Missing Model Lab capability ${id}`);
  assert(caps.capabilities.find(x=>x.id==='gpu-executor')?.state==='foundation-ready','GPU executor foundation state mismatch');
  assert(MODEL_LAB_CAPABILITIES.some(x=>x.id==='external-model-provider'&&x.state==='not-required'),'External model provider must be not-required');
  assert(MODEL_TASKS.length===7,'Expected seven ATLAS neural tasks');
  const gpu=await(await endpoint('/api/studio/models/gpu/capabilities')).json();assert(gpu.service==='atlas-gpu-executor'&&gpu.externalProviders.length===0,'GPU capability endpoint mismatch');
  const stt=await(await endpoint('/api/studio/models/stt/capabilities')).json();assert(stt.service==='atlas-stt-training-lab'&&stt.state==='foundation-ready','STT capability endpoint mismatch');
  const html=await(await endpoint('/studio/models')).text();for(const marker of ['ATLAS Neural Foundry','Build training package','GPU Executor','Speech Training Lab','CONSENT REQUIRED'])assert(html.includes(marker),`Model Lab UI missing ${marker}`);
  const gpuHtml=await(await endpoint('/studio/models/gpu')).text();assert(gpuHtml.includes('node atlas/gpu-executor.mjs status'),'GPU page command missing');
  const sttHtml=await(await endpoint('/studio/models/stt')).text();assert(sttHtml.includes('ATLAS Speech Training Lab')&&sttHtml.includes('CTC'),'STT page missing');
  const source=await readFile(resolve(ROOT,'atlas','neural-foundry.mjs'),'utf8');assert(source.includes("executor:'not-configured'"),'Job manifests must still default to executor not-configured');assert(source.includes('executionStarted:false'),'Foundry must explicitly report no training start');
  assert(handleStudioModelLab(new Request('https://atlas.local/unrelated'))===null,'Model Lab must ignore unrelated route');
  console.log(JSON.stringify({ok:true,service:status.service,tasks:MODEL_TASKS.length,externalProviders:0,gpuFoundation:true,sttFoundation:true},null,2));
}finally{await rm(FIX,{recursive:true,force:true})}