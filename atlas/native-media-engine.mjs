import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const ROOT=resolve(process.cwd());
const BASE=resolve(ROOT,'.atlas','native-media');
const MANIFEST=resolve(BASE,'manifest.json');
await mkdir(BASE,{recursive:true});

const DEFAULT={
  service:'ATLAS Native Media Engine',
  version:1,
  ownership:'ATLAS first-party',
  externalProviders:[],
  policy:{externalInference:false,externalCreativeSaaS:false,fakeReadyStates:false},
  models:[
    {id:'speech-to-text',artifact:'models/native/speech-to-text.atlasmodel',state:'model-not-trained'},
    {id:'digital-twin',artifact:'models/native/digital-twin.atlasmodel',state:'model-not-trained'},
    {id:'phoneme-lipsync',artifact:'models/native/phoneme-lipsync.atlasmodel',state:'model-not-trained'},
    {id:'super-resolution',artifact:'models/native/super-resolution.atlasmodel',state:'model-not-trained'},
    {id:'video-restyle',artifact:'models/native/video-restyle.atlasmodel',state:'model-not-trained'}
  ]
};

async function exists(path){try{await access(path);return true}catch{return false}}
async function load(){try{return JSON.parse(await readFile(MANIFEST,'utf8'))}catch{return structuredClone(DEFAULT)}}
async function hydrate(m){
  return {...m,models:await Promise.all((m.models||[]).map(async x=>({...x,artifactPresent:await exists(resolve(ROOT,x.artifact)),runtimeState:await exists(resolve(ROOT,x.artifact))?'artifact-present':'model-not-trained'})))};
}
function out(v,code=0){console.log(JSON.stringify(v,null,2));process.exitCode=code}
const [cmd,...args]=process.argv.slice(2);
try{
  if(cmd==='status'){
    const m=await hydrate(await load());
    out({...m,readyModels:m.models.filter(x=>x.artifactPresent).length,totalModels:m.models.length});
  }else if(cmd==='init'){
    const apply=args.includes('--apply');
    if(apply)await writeFile(MANIFEST,JSON.stringify(DEFAULT,null,2)+'\n','utf8');
    out({operation:'init',apply,path:'.atlas/native-media/manifest.json',manifest:DEFAULT});
  }else if(cmd==='verify'){
    const m=await hydrate(await load());
    const forbidden=(m.externalProviders||[]).length>0||m.policy?.externalInference!==false||m.policy?.externalCreativeSaaS!==false;
    out({service:m.service,ok:!forbidden,externalProviders:m.externalProviders||[],models:m.models.map(x=>({id:x.id,state:x.runtimeState}))},forbidden?1:0);
  }else{
    console.error('ATLAS Native Media Engine\n\nUsage:\n  node atlas/native-media-engine.mjs status\n  node atlas/native-media-engine.mjs init [--apply]\n  node atlas/native-media-engine.mjs verify');
    process.exitCode=2;
  }
}catch(error){out({service:'ATLAS Native Media Engine',ok:false,error:error instanceof Error?error.message:String(error)},1)}
