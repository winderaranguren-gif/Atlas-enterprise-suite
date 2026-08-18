import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { resolve } from 'node:path';
const dir=resolve(process.cwd(),'.atlas','jobs'); const file=resolve(dir,'queue.json'); await mkdir(dir,{recursive:true});
let jobs=[]; try{jobs=JSON.parse(await readFile(file,'utf8'))}catch{}
const allowed=new Set(['status','sync','verify','start','stop','deploy','logs','backup','rollback']);
const [cmd,...args]=process.argv.slice(2);
if(cmd==='enqueue'){const [nodeId,action,...rest]=args;if(!nodeId||!allowed.has(action)){console.error('invalid node/action');process.exit(2)}const job={id:randomUUID(),node_id:nodeId,action,args:rest,created_at:new Date().toISOString(),status:'QUEUED'};jobs.push(job);await writeFile(file,JSON.stringify(jobs,null,2));console.log(JSON.stringify(job,null,2));}
else if(cmd==='claim'){const [nodeId]=args;const job=jobs.find(j=>j.node_id===nodeId&&j.status==='QUEUED');if(job){job.status='RUNNING';job.claimed_at=new Date().toISOString();await writeFile(file,JSON.stringify(jobs,null,2));}console.log(JSON.stringify(job||null,null,2));}
else if(cmd==='complete'){const [id,status='SUCCESS',...rest]=args;const job=jobs.find(j=>j.id===id);if(!job){console.error('job not found');process.exit(2)}job.status=status;job.completed_at=new Date().toISOString();job.result=rest.join(' ').slice(0,8000);await writeFile(file,JSON.stringify(jobs,null,2));console.log(JSON.stringify(job,null,2));}
else if(cmd==='list'){console.log(JSON.stringify(jobs.slice(-100),null,2));}
else{console.error('Usage: job-queue enqueue <node> <allowed-action> [args...] | claim <node> | complete <id> [status] [result] | list');process.exit(2)}
