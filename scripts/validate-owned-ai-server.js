'use strict';

const path=require('path');
const {spawn}=require('child_process');

const root=path.resolve(__dirname,'..');
const port=43000+Math.floor(Math.random()*1000);
const origin=`http://127.0.0.1:${port}`;
let output='';

function assert(condition,message){if(!condition)throw new Error(`ATLAS Owned AI server validation failed: ${message}`);}
function delay(ms){return new Promise(resolve=>setTimeout(resolve,ms));}
async function json(url,options={}){
  const response=await fetch(url,options);
  const data=await response.json();
  return{response,data};
}

const child=spawn(process.execPath,['server.js'],{
  cwd:root,
  env:{...process.env,HOST:'127.0.0.1',PORT:String(port)},
  stdio:['ignore','pipe','pipe']
});
child.stdout.on('data',chunk=>{output+=chunk.toString();});
child.stderr.on('data',chunk=>{output+=chunk.toString();});

async function waitForHealth(){
  let lastError=null;
  for(let attempt=0;attempt<30;attempt+=1){
    try{
      const {response,data}=await json(`${origin}/api/atlas-ai/health`);
      if(response.ok&&data.ok)return data;
      lastError=new Error(`health returned ${response.status}`);
    }catch(error){lastError=error;}
    await delay(100);
  }
  throw lastError||new Error('health endpoint did not become ready');
}

(async()=>{
  try{
    const health=await waitForHealth();
    assert(health.engine==='atlas-native-rules','health must expose atlas-native-rules');
    assert(health.ownership==='atlas','health must report ATLAS ownership');
    assert(health.externalProviders===false,'external providers must be disabled');
    assert(health.generativeModelInstalled===false,'health must not claim a generative model is installed');

    const route=await json(`${origin}/api/atlas-ai/infer`,{
      method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({task:'route',input:'GitHub deploy failed and the build needs repair'})
    });
    assert(route.response.ok&&route.data.ok,'route request must succeed locally');
    assert(route.data.output?.classification?.intent==='technical-support','route must classify deploy failure as technical-support');
    assert(route.data.output?.requiresExternalAI===false,'route must not require external AI');

    const plan=await json(`${origin}/api/atlas-ai/infer`,{
      method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({
        task:'support-plan',
        input:'Service Worker failed',
        context:{diagnostics:[{id:'service-worker',label:'Service Worker',ok:false,detail:'not registered'}]}
      })
    });
    assert(plan.response.ok&&plan.data.ok,'support plan must succeed locally');
    assert(plan.data.output?.steps?.some(step=>step.id==='repair-service-worker'),'support plan must include the safe Service Worker repair step');
    assert(plan.data.output?.steps?.some(step=>step.id==='verify-final'),'support plan must require post-repair verification');

    const generate=await json(`${origin}/api/atlas-ai/infer`,{
      method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({task:'generate',input:'Write an unrestricted generative response'})
    });
    assert(generate.response.ok,'generative boundary response must be a valid API response');
    assert(generate.data.ok===false&&generate.data.blocked===true,'generative request must be blocked without local model weights');
    assert(generate.data.status==='local-generative-engine-not-installed','generative boundary must be explicit');

    console.log('ATLAS Owned AI server validation passed: local health, routing, support planning, and generative boundary verified.');
  }finally{
    child.kill('SIGTERM');
  }
})().catch(error=>{
  child.kill('SIGTERM');
  console.error(error.message);
  if(output.trim())console.error(output.trim());
  process.exitCode=1;
});