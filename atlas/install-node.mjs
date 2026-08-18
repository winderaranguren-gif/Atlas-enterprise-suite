import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
const ROOT=resolve(process.cwd());const base=resolve(ROOT,'.atlas');
for(const d of ['releases','forge','backups','deployments','vault','store','logs'])await mkdir(resolve(base,d),{recursive:true});
const node={id:process.env.ATLAS_NODE_ID||'ATLAS-NODE-01',installedAt:new Date().toISOString(),runtimePort:Number(process.env.ATLAS_RUNTIME_PORT||8787),controlPort:Number(process.env.ATLAS_PORT||8788),mode:'sovereign-local'};
await writeFile(resolve(base,'node.json'),JSON.stringify(node,null,2));
console.log(JSON.stringify({installed:true,node,next:['npm run atlas:verify','npm run atlas:e2e','npm run atlas:runtime','npm run atlas:control']},null,2));