import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
const dir=resolve(process.cwd(),'.atlas','nodes'); const file=resolve(dir,'registry.json'); await mkdir(dir,{recursive:true});
let nodes={}; try{nodes=JSON.parse(await readFile(file,'utf8'))}catch{}
const [cmd,nodeId,...rest]=process.argv.slice(2);
if(cmd==='heartbeat'&&nodeId){let payload={};try{payload=JSON.parse(rest.join(' '))}catch{};nodes[nodeId]={...(nodes[nodeId]||{}),...payload,node_id:nodeId,last_seen:new Date().toISOString(),status:'ONLINE'};await writeFile(file,JSON.stringify(nodes,null,2));console.log(JSON.stringify(nodes[nodeId],null,2));}
else if(cmd==='list'){const now=Date.now();const out=Object.values(nodes).map(n=>({...n,status:now-Date.parse(n.last_seen||0)<=90000?'ONLINE':'OFFLINE'}));console.log(JSON.stringify(out,null,2));}
else if(cmd==='get'&&nodeId){const n=nodes[nodeId]||null;if(n&&Date.now()-Date.parse(n.last_seen||0)>90000)n.status='OFFLINE';console.log(JSON.stringify(n,null,2));}
else{console.error('Usage: node-registry heartbeat <nodeId> <json> | list | get <nodeId>');process.exit(2)}
