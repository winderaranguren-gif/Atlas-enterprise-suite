import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const ROOT=resolve(process.cwd());
const BASE=resolve(ROOT,'.atlas','sandboxes');
const SAFE_SCRIPTS=/^(check:[a-z0-9_-]+|atlas:(build|verify|guardian|status))$/;
await mkdir(BASE,{recursive:true});

function slugify(value){return String(value||'sandbox').trim().toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'')||'sandbox';}
function parse(args){const positional=[];const flags={};for(let i=0;i<args.length;i++){const v=args[i];if(!v.startsWith('--')){positional.push(v);continue;}const key=v.slice(2);const next=args[i+1];if(next&&!next.startsWith('--'))flags[key]=args[++i];else flags[key]=true;}return{positional,flags};}
function out(value,code=0){console.log(JSON.stringify(value,null,2));process.exitCode=code;}
function dirFor(id){return resolve(BASE,slugify(id));}

async function manifest(id){
  const dir=dirFor(id);const file=resolve(dir,'manifest.json');
  try{return JSON.parse(await readFile(file,'utf8'));}catch{return null;}
}

const [cmd,...raw]=process.argv.slice(2);
const {positional,flags}=parse(raw);

try{
  if(cmd==='status'){
    const names=await readdir(BASE,{withFileTypes:true});
    const rows=[];
    for(const entry of names.filter(x=>x.isDirectory())){const item=await manifest(entry.name);if(item)rows.push(item);}
    out({service:'ATLAS Sandbox',version:1,count:rows.length,sandboxes:rows});
  }else if(cmd==='create'){
    const id=slugify(positional[0]);const dir=dirFor(id);const item={id,name:flags.name||positional[0]||id,createdAt:new Date().toISOString(),root:dir.replace(ROOT,'.'),isolation:'workspace-metadata',network:'inherited-runtime',safeScriptsOnly:true};
    if(flags.apply){await mkdir(dir,{recursive:true});await writeFile(resolve(dir,'manifest.json'),JSON.stringify(item,null,2)+'\n','utf8');}
    out({service:'ATLAS Sandbox',operation:'create',apply:Boolean(flags.apply),sandbox:item});
  }else if(cmd==='inspect'){
    const id=slugify(positional[0]);const item=await manifest(id);if(!item)throw new Error(`Sandbox not found: ${id}`);out({service:'ATLAS Sandbox',sandbox:item});
  }else if(cmd==='run'){
    const id=slugify(positional[0]);const script=String(positional[1]||'');const item=await manifest(id);if(!item)throw new Error(`Sandbox not found: ${id}`);if(!SAFE_SCRIPTS.test(script))throw new Error('Only validation/build/status scripts are allowed in ATLAS Sandbox v1');
    if(!flags.apply){out({service:'ATLAS Sandbox',operation:'run',apply:false,sandbox:id,script,command:['npm','run',script]});}
    else{const r=spawnSync('npm',['run',script],{cwd:ROOT,encoding:'utf8',stdio:'pipe'});out({service:'ATLAS Sandbox',operation:'run',apply:true,sandbox:id,script,status:r.status,stdout:r.stdout,stderr:r.stderr},r.status||0);}
  }else{
    console.error('ATLAS Sandbox\n\nUsage:\n  node atlas/sandbox.mjs status\n  node atlas/sandbox.mjs create <name> [--apply]\n  node atlas/sandbox.mjs inspect <name>\n  node atlas/sandbox.mjs run <name> <safe-script> [--apply]');
    process.exitCode=2;
  }
}catch(error){out({service:'ATLAS Sandbox',ok:false,error:error instanceof Error?error.message:String(error)},1);}
