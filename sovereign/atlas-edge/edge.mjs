import http from 'node:http';
import {mkdir,readdir,readFile,writeFile,rename,rm,lstat,symlink,realpath} from 'node:fs/promises';
import path from 'node:path';
const ROOT=process.env.ATLAS_ROOT||'/opt/atlas';
const RELEASES=path.join(ROOT,'releases');
const CURRENT=path.join(ROOT,'current');
const STATE=path.join(ROOT,'state','edge.json');
const TOKEN=process.env.ATLAS_CONTROL_TOKEN||'';
const HOST=process.env.ATLAS_EDGE_HOST||'127.0.0.1';
const PORT=Number(process.env.ATLAS_EDGE_PORT||7402);
const json=(res,code,data)=>{res.writeHead(code,{'content-type':'application/json','cache-control':'no-store','x-content-type-options':'nosniff'});res.end(JSON.stringify(data))};
const auth=req=>TOKEN&&req.headers.authorization===`Bearer ${TOKEN}`;
const validId=id=>/^[A-Za-z0-9._-]{1,128}$/.test(id||'');
async function ensure(){await mkdir(RELEASES,{recursive:true});await mkdir(path.dirname(STATE),{recursive:true})}
async function state(){try{return JSON.parse(await readFile(STATE,'utf8'))}catch{return {activeRelease:null,previousRelease:null,updatedAt:null}}}
async function save(s){const tmp=STATE+'.tmp';await writeFile(tmp,JSON.stringify(s,null,2));await rename(tmp,STATE)}
async function list(){await ensure();const names=await readdir(RELEASES);return names.sort().reverse()}
async function promote(id){if(!validId(id))throw new Error('invalid_release_id');const target=path.join(RELEASES,id);await realpath(target);let old=null;try{old=await realpath(CURRENT)}catch{}const next=CURRENT+'.next';await rm(next,{force:true,recursive:true});await symlink(target,next,'dir');await rename(next,CURRENT);const s=await state();const previous=s.activeRelease||old&&path.basename(old)||null;const n={activeRelease:id,previousRelease:previous===id?s.previousRelease:previous,updatedAt:new Date().toISOString()};await save(n);return n}
async function rollback(){const s=await state();if(!s.previousRelease)throw new Error('no_previous_release');return promote(s.previousRelease)}
const server=http.createServer(async(req,res)=>{try{const u=new URL(req.url,'http://atlas');if(u.pathname==='/health')return json(res,200,{ok:true,service:'atlas-edge'});if(u.pathname==='/readiness'){const s=await state();return json(res,s.activeRelease?200:503,{ok:Boolean(s.activeRelease),service:'atlas-edge',...s})}if(!auth(req))return json(res,401,{ok:false,error:'unauthorized'});if(req.method==='GET'&&u.pathname==='/api/releases')return json(res,200,{ok:true,releases:await list(),state:await state()});const m=u.pathname.match(/^\/api\/releases\/([^/]+)\/promote$/);if(req.method==='POST'&&m)return json(res,200,{ok:true,state:await promote(decodeURIComponent(m[1]))});if(req.method==='POST'&&u.pathname==='/api/rollback')return json(res,200,{ok:true,state:await rollback()});return json(res,404,{ok:false,error:'not_found'})}catch(e){return json(res,500,{ok:false,error:e?.message||'edge_error'})}});
await ensure();server.listen(PORT,HOST,()=>console.log(`ATLAS Edge listening on http://${HOST}:${PORT}`));
