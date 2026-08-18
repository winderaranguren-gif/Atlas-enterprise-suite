import { mkdir, readFile, writeFile, readdir, copyFile, stat } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { createHash } from 'node:crypto';
const ROOT=resolve(process.cwd()); const FORGE=resolve(ROOT,'.atlas','forge'); await mkdir(FORGE,{recursive:true});
const [cmd,...args]=process.argv.slice(2);
const safe=s=>String(s||'').replace(/[^a-z0-9._-]/gi,'_');
async function sha(p){const b=await readFile(p);return createHash('sha256').update(b).digest('hex')}
async function manifest(name='workspace'){const files=['worker.js','atlas-router.js','weather-worker.js','package.json','wrangler.jsonc'];const out={name,createdAt:new Date().toISOString(),files:{}};for(const f of files){try{out.files[f]={sha256:await sha(join(ROOT,f)),bytes:(await stat(join(ROOT,f))).size}}catch{}}return out}
if(cmd==='snapshot'){const name=safe(args[0]||new Date().toISOString());const dir=join(FORGE,name);await mkdir(dir,{recursive:true});const m=await manifest(name);for(const f of Object.keys(m.files)){await copyFile(join(ROOT,f),join(dir,safe(f)))}await writeFile(join(dir,'manifest.json'),JSON.stringify(m,null,2));console.log(JSON.stringify(m,null,2));}
else if(cmd==='list'){console.log(JSON.stringify((await readdir(FORGE)).sort(),null,2));}
else if(cmd==='inspect'){console.log(JSON.stringify(await manifest(args[0]||'workspace'),null,2));}
else{console.error('Usage: forge snapshot [name] | forge list | forge inspect');process.exit(2)}