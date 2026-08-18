import { createServer } from 'node:http';
import { readFile, writeFile, mkdir, readdir, stat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { join, resolve } from 'node:path';

const ROOT = resolve(process.cwd());
const STATE = join(ROOT, '.atlas');
const RELEASES = join(STATE, 'releases');
const PORT = Number(process.env.ATLAS_PORT || 8788);

async function ensureState(){ await mkdir(RELEASES,{recursive:true}); }
async function hashFile(path){ const b=await readFile(path); return createHash('sha256').update(b).digest('hex'); }
async function snapshot(){
  await ensureState();
  const id = new Date().toISOString().replace(/[:.]/g,'-');
  const manifest = { id, createdAt:new Date().toISOString(), files:{} };
  for (const file of ['worker.js','weather-worker.js','wrangler.jsonc','package.json']) {
    try { manifest.files[file] = await hashFile(join(ROOT,file)); } catch {}
  }
  await writeFile(join(RELEASES,`${id}.json`), JSON.stringify(manifest,null,2));
  await writeFile(join(STATE,'current.json'), JSON.stringify(manifest,null,2));
  return manifest;
}
async function status(){
  await ensureState();
  let current=null; try { current=JSON.parse(await readFile(join(STATE,'current.json'),'utf8')); } catch {}
  const releases=(await readdir(RELEASES)).filter(x=>x.endsWith('.json')).sort().reverse();
  return { service:'ATLAS Control Plane', status:'ready', node:process.env.ATLAS_NODE_ID||'ATLAS-NODE-01', current, releases:releases.slice(0,20), capabilities:['release-manifest','integrity-hashes','health','readiness','local-runtime-bootstrap'] };
}
function json(res,code,data){ res.writeHead(code,{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}); res.end(JSON.stringify(data,null,2)); }

await ensureState();
if (process.argv.includes('release')) { console.log(JSON.stringify(await snapshot(),null,2)); process.exit(0); }
if (process.argv.includes('status')) { console.log(JSON.stringify(await status(),null,2)); process.exit(0); }

createServer(async (req,res)=>{
  try {
    if(req.url==='/health') return json(res,200,{status:'ok',service:'ATLAS Control Plane'});
    if(req.url==='/api/readiness') return json(res,200,{ready:true,node:process.env.ATLAS_NODE_ID||'ATLAS-NODE-01'});
    if(req.url==='/api/control-plane/status') return json(res,200,await status());
    if(req.method==='POST' && req.url==='/api/releases') return json(res,201,await snapshot());
    return json(res,404,{error:'not_found'});
  } catch(error){ return json(res,500,{error:'control_plane_error',message:error.message}); }
}).listen(PORT,'0.0.0.0',()=>console.log(`ATLAS Control Plane listening on :${PORT}`));
