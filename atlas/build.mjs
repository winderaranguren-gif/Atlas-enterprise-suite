import { spawnSync } from 'node:child_process';
import { readFile, access } from 'node:fs/promises';
import { resolve } from 'node:path';
const ROOT=resolve(process.cwd());
const checks=[];
async function exists(path){try{await access(resolve(ROOT,path));return true}catch{return false}}
for(const f of ['package.json','worker.js','atlas-router.js','atlas/control-plane.mjs','atlas/guardian.mjs','atlas/vault.mjs','atlas/store.mjs','atlas/forge.mjs']){const ok=await exists(f);checks.push({name:`exists:${f}`,ok});}
for(const f of ['worker.js','atlas-router.js','weather-worker.js','atlas/control-plane.mjs','atlas/guardian.mjs','atlas/vault.mjs','atlas/store.mjs','atlas/forge.mjs']){if(await exists(f)){const r=spawnSync(process.execPath,['--check',resolve(ROOT,f)],{encoding:'utf8'});checks.push({name:`syntax:${f}`,ok:r.status===0,error:r.status===0?null:(r.stderr||r.stdout).trim()});}}
try{JSON.parse(await readFile(resolve(ROOT,'package.json'),'utf8'));checks.push({name:'json:package.json',ok:true});}catch(e){checks.push({name:'json:package.json',ok:false,error:e.message});}
const ok=checks.every(c=>c.ok);console.log(JSON.stringify({service:'ATLAS Build',ok,checkedAt:new Date().toISOString(),checks},null,2));process.exit(ok?0:1);