import { readFile, access } from 'node:fs/promises';
import { resolve } from 'node:path';
const ROOT=resolve(process.cwd());
const required=['package.json','atlas/control-plane.mjs'];
const report={service:'ATLAS Guardian',checkedAt:new Date().toISOString(),checks:[],ready:true};
for(const file of required){try{await access(resolve(ROOT,file));report.checks.push({name:`file:${file}`,ok:true});}catch{report.ready=false;report.checks.push({name:`file:${file}`,ok:false});}}
try{const pkg=JSON.parse(await readFile(resolve(ROOT,'package.json'),'utf8'));const ok=Boolean(pkg.scripts?.['atlas:control']&&pkg.scripts?.['atlas:release']);report.checks.push({name:'native-control-scripts',ok});if(!ok)report.ready=false;}catch(e){report.ready=false;report.checks.push({name:'package-json',ok:false,error:e.message});}
console.log(JSON.stringify(report,null,2));
process.exit(report.ready?0:1);
