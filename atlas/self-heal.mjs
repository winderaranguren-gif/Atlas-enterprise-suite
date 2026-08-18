const runtime=process.env.ATLAS_RUNTIME_URL||'http://127.0.0.1:8787';const control=process.env.ATLAS_CONTROL_URL||'http://127.0.0.1:8788';const interval=Number(process.env.ATLAS_HEALTH_INTERVAL||30000);
async function check(name,url){try{const r=await fetch(url,{signal:AbortSignal.timeout(5000)});return{name,url,ok:r.ok,status:r.status}}catch(e){return{name,url,ok:false,error:e.message}}
async function cycle(){const checks=await Promise.all([check('runtime',`${runtime}/health`),check('control',`${control}/health`)]);const report={service:'ATLAS Self-Heal',at:new Date().toISOString(),healthy:checks.every(x=>x.ok),checks};console.log(JSON.stringify(report));return report}
await cycle();setInterval(cycle,interval);
