import http from 'node:http';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {mkdir,readdir,stat} from 'node:fs/promises';
import path from 'node:path';
const exec=promisify(execFile);
const ROOT=process.env.ATLAS_FORGE_ROOT||'/opt/atlas/forge/repos';
const TOKEN=process.env.ATLAS_CONTROL_TOKEN||'';
const HOST=process.env.ATLAS_FORGE_HOST||'127.0.0.1';
const PORT=Number(process.env.ATLAS_FORGE_PORT||7401);
const json=(res,code,data)=>{res.writeHead(code,{'content-type':'application/json','cache-control':'no-store','x-content-type-options':'nosniff'});res.end(JSON.stringify(data))};
const safe=n=>/^[a-zA-Z0-9._-]+$/.test(n||'');
const auth=req=>TOKEN&&req.headers.authorization===`Bearer ${TOKEN}`;
async function git(args,cwd){const {stdout}=await exec('git',args,{cwd,maxBuffer:8*1024*1024});return stdout.trim()}
async function listRepos(){await mkdir(ROOT,{recursive:true});const names=await readdir(ROOT);const out=[];for(const name of names){if(!name.endsWith('.git'))continue;const p=path.join(ROOT,name);if((await stat(p)).isDirectory())out.push(name.slice(0,-4))}return out.sort()}
async function createRepo(name){if(!safe(name))throw new Error('invalid_repository_name');await mkdir(ROOT,{recursive:true});const repo=path.join(ROOT,`${name}.git`);await git(['init','--bare',repo],ROOT);await git(['config','receive.denyNonFastforwards','true'],repo);return repo}
async function repoInfo(name){if(!safe(name))throw new Error('invalid_repository_name');const repo=path.join(ROOT,`${name}.git`);const branches=(await git(['for-each-ref','--format=%(refname:short)','refs/heads'],repo)).split('\n').filter(Boolean);let head=null;try{head=await git(['rev-parse','HEAD'],repo)}catch{}return {name,head,branches}}
async function commits(name,limit=25){if(!safe(name))throw new Error('invalid_repository_name');const repo=path.join(ROOT,`${name}.git`);let text='';try{text=await git(['log',`-${Math.min(Math.max(limit,1),100)}`,'--pretty=format:%H%x09%an%x09%aI%x09%s'],repo)}catch{return []}return text.split('\n').filter(Boolean).map(line=>{const [sha,author,date,...msg]=line.split('\t');return {sha,author,date,message:msg.join('\t')}})}
const server=http.createServer(async(req,res)=>{try{const u=new URL(req.url,'http://atlas');if(u.pathname==='/health')return json(res,200,{ok:true,service:'atlas-forge'});if(!auth(req))return json(res,401,{ok:false,error:'unauthorized'});if(req.method==='GET'&&u.pathname==='/api/repos')return json(res,200,{ok:true,repositories:await listRepos()});const m=u.pathname.match(/^\/api\/repos\/([^/]+)$/);if(req.method==='POST'&&m)return json(res,201,{ok:true,repository:await createRepo(decodeURIComponent(m[1]))});if(req.method==='GET'&&m)return json(res,200,{ok:true,repository:await repoInfo(decodeURIComponent(m[1]))});const c=u.pathname.match(/^\/api\/repos\/([^/]+)\/commits$/);if(req.method==='GET'&&c)return json(res,200,{ok:true,commits:await commits(decodeURIComponent(c[1]),Number(u.searchParams.get('limit')||25))});return json(res,404,{ok:false,error:'not_found'})}catch(e){return json(res,500,{ok:false,error:e?.message||'forge_error'})}});
await mkdir(ROOT,{recursive:true});server.listen(PORT,HOST,()=>console.log(`ATLAS Forge listening on http://${HOST}:${PORT}`));
