import { mkdir, readdir, readFile, writeFile, copyFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
const ROOT=resolve(process.cwd());const DIR=resolve(ROOT,'.atlas','backups');await mkdir(DIR,{recursive:true});
const files=['worker.js','atlas-router.js','weather-worker.js','package.json','wrangler.jsonc'];
const [cmd,arg]=process.argv.slice(2);
const safe=s=>String(s||'').replace(/[^a-z0-9._-]/gi,'_');
if(cmd==='create'){const id=safe(arg||new Date().toISOString());const dir=join(DIR,id);await mkdir(dir,{recursive:true});const saved=[];for(const f of files){try{const dest=join(dir,safe(f));await copyFile(join(ROOT,f),dest);saved.push(f)}catch{}}await writeFile(join(dir,'manifest.json'),JSON.stringify({id,createdAt:new Date().toISOString(),files:saved},null,2));console.log(JSON.stringify({created:true,id,files:saved},null,2));}
else if(cmd==='list'){console.log(JSON.stringify((await readdir(DIR)).sort().reverse(),null,2));}
else if(cmd==='restore'&&arg){const dir=join(DIR,safe(arg));const m=JSON.parse(await readFile(join(dir,'manifest.json'),'utf8'));for(const f of m.files){await copyFile(join(dir,safe(f)),join(ROOT,f))}console.log(JSON.stringify({restored:true,id:m.id,files:m.files},null,2));}
else{console.error('Usage: backup create [id] | backup list | backup restore <id>');process.exit(2)}