(()=>{
'use strict';

const PROVIDER_ID='atlas-self-hosted-inference';
const HEALTH_ENDPOINT='/api/atlas-ai/health';
const INFER_ENDPOINT='/api/atlas-ai/infer';
let installed=false;

function sameOriginUrl(path){return new URL(path,window.location.origin).href;}
async function health(){
  const response=await fetch(sameOriginUrl(HEALTH_ENDPOINT),{
    method:'GET',
    credentials:'same-origin',
    headers:{Accept:'application/json'}
  });
  if(!response.ok)return{ok:false,status:response.status};
  const data=await response.json().catch(()=>({}));
  return{ok:data?.ok!==false,status:response.status,data};
}
async function infer(request){
  const response=await fetch(sameOriginUrl(INFER_ENDPOINT),{
    method:'POST',
    credentials:'same-origin',
    headers:{'Content-Type':'application/json',Accept:'application/json'},
    body:JSON.stringify({
      requestId:request.id,
      task:request.task,
      input:request.input,
      context:request.context,
      classification:request.classification
    })
  });
  const data=await response.json().catch(()=>({}));
  if(!response.ok){
    return{
      ok:false,
      blocked:response.status===404||response.status===503,
      status:`http-${response.status}`,
      detail:data?.detail||data?.message||'ATLAS self-hosted inference endpoint is unavailable.'
    };
  }
  return data&&typeof data==='object'?data:{ok:true,output:data};
}
function install(){
  if(installed)return true;
  const core=window.ATLASOwnedCore;
  if(!core?.registerProvider)return false;
  const existing=core.inspect?.().providers?.some(provider=>provider.id===PROVIDER_ID);
  if(existing){installed=true;return true;}
  core.registerProvider(PROVIDER_ID,{
    label:'ATLAS Self-Hosted Inference',
    ownership:'self-hosted',
    priority:10,
    network:true,
    recurringCost:false,
    supports:request=>request?.task!=='classify'&&request?.task!=='route',
    health,
    infer
  });
  installed=true;
  window.dispatchEvent(new CustomEvent('atlas:owned-core:self-hosted-ready',{detail:{provider:PROVIDER_ID}}));
  return true;
}

window.addEventListener('atlas:owned-core:ready',install,{once:true});
if(!install()){
  const timer=setInterval(()=>{if(install())clearInterval(timer);},100);
  setTimeout(()=>clearInterval(timer),5000);
}
})();