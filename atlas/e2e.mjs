import { spawn } from 'node:child_process';
const node=process.execPath;
const runtime=spawn(node,['atlas/runtime.mjs'],{env:{...process.env,ATLAS_RUNTIME_PORT:'8797'},stdio:['ignore','pipe','pipe']});
const control=spawn(node,['atlas/control-plane.mjs'],{env:{...process.env,ATLAS_PORT:'8798',ATLAS_NODE_ID:'ATLAS-NODE-E2E'},stdio:['ignore','pipe','pipe']});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function probe(url,expect=200){const r=await fetch(url);const text=await r.text();if(r.status!==expect)throw new Error(`${url} -> ${r.status} ${text.slice(0,200)}`);return {url,status:r.status,contentType:r.headers.get('content-type')};}
try{await sleep(900);const checks=[];checks.push(await probe('http://127.0.0.1:8798/health'));checks.push(await probe('http://127.0.0.1:8798/api/readiness'));checks.push(await probe('http://127.0.0.1:8798/api/control-plane/status'));checks.push(await probe('http://127.0.0.1:8797/dashboard'));checks.push(await probe('http://127.0.0.1:8797/weather'));console.log(JSON.stringify({service:'ATLAS E2E',ok:true,checks},null,2));}
catch(error){console.error(JSON.stringify({service:'ATLAS E2E',ok:false,error:error.message},null,2));process.exitCode=1;}
finally{runtime.kill('SIGTERM');control.kill('SIGTERM');setTimeout(()=>{runtime.kill('SIGKILL');control.kill('SIGKILL')},500).unref();}
