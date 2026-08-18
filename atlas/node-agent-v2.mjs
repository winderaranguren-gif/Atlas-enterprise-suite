import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
const NODE_ID=process.env.ATLAS_NODE_ID||'winder-laptop-01';
const CONTROL=process.env.ATLAS_CONTROL_URL||'http://127.0.0.1:8788';
const POLL=Number(process.env.ATLAS_NODE_POLL_MS||5000);
const allowed={status:['npm','run','atlas:status'],verify:['npm','run','atlas:verify'],start:['npm','run','atlas:start'],deploy:['npm','run','atlas:deploy'],backup:['npm','run','atlas:backup']};
async function post(path,body){const r=await fetch(CONTROL+path,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});if(!r.ok)throw new Error(`${path} ${r.status}`);return r.json()}
async function heartbeat(){try{await post('/api/nodes/heartbeat',{node_id:NODE_ID,version:'2.0.0',os:process.platform,arch:process.arch,capabilities:Object.keys(allowed),timestamp:Date.now()})}catch(e){console.error('[ATLAS Node Agent] heartbeat',e.message)}}
function execCommand(action){return new Promise((resolve)=>{const spec=allowed[action];if(!spec)return resolve({ok:false,error:'action_not_allowed'});const [cmd,...args]=spec;const p=spawn(cmd,args,{shell:process.platform==='win32',cwd:process.cwd()});let out='';let err='';p.stdout?.on('data',d=>out+=d);p.stderr?.on('data',d=>err+=d);p.on('close',code=>resolve({ok:code===0,code,stdout:out.slice(-6000),stderr:err.slice(-6000)}));})}
async function poll(){try{const r=await fetch(`${CONTROL}/api/jobs/next?node_id=${encodeURIComponent(NODE_ID)}`);if(!r.ok)return;const job=await r.json();if(!job?.id)return;const result=await execCommand(job.action);await post('/api/jobs/complete',{id:job.id,status:result.ok?'SUCCESS':'FAILED',result});}catch(e){console.error('[ATLAS Node Agent] poll',e.message)}}
console.log(`[ATLAS Node Agent v2] ${NODE_ID} -> ${CONTROL}`);await heartbeat();setInterval(heartbeat,30000);setInterval(poll,POLL);
