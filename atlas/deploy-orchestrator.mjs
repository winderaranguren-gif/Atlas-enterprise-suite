import { spawnSync } from 'node:child_process';

const PROVIDERS={
  cloudflare:{env:['CLOUDFLARE_API_TOKEN','CLOUDFLARE_ACCOUNT_ID'],script:'deploy:provider',applySupported:true},
  vercel:{env:['VERCEL_TOKEN'],script:null,applySupported:false},
};

function parse(args){
  const positional=[];const flags={};
  for(let i=0;i<args.length;i++){
    const value=args[i];
    if(!value.startsWith('--')){positional.push(value);continue;}
    const key=value.slice(2);const next=args[i+1];
    if(next&&!next.startsWith('--'))flags[key]=args[++i];else flags[key]=true;
  }
  return {positional,flags};
}
function out(value,code=0){console.log(JSON.stringify(value,null,2));process.exitCode=code;}
function provider(id){const p=PROVIDERS[id];if(!p)throw new Error(`Unknown deploy provider: ${id}`);return p;}
function readiness(id){
  const p=provider(id);const checks=p.env.map(name=>({name,configured:Boolean(process.env[name])}));
  return {id,configured:checks.every(x=>x.configured),envChecks:checks,applySupported:p.applySupported,script:p.script};
}
function contract(id,input={}){
  const ready=readiness(id);
  return {service:'ATLAS Deploy Orchestrator',provider:id,input,readiness:ready,apply:false,tenantScoped:true,auditRequired:true,secretValuesLogged:false};
}
function runScript(script,args=[]){
  const npm=process.platform==='win32'?'npm.cmd':'npm';
  const r=spawnSync(npm,['run',script,'--',...args],{stdio:'inherit',env:process.env});
  if(r.error)throw r.error;
  if(r.status!==0)throw new Error(`${script} failed with exit code ${r.status}`);
}

const [cmd,...raw]=process.argv.slice(2);const {positional,flags}=parse(raw);
try{
  if(cmd==='status'){
    out({service:'ATLAS Deploy Orchestrator',version:1,mutationDefault:'dry-run',providers:Object.keys(PROVIDERS).map(readiness),policy:{providerNeutral:true,credentialsFromEnvironmentOnly:true,auditRequired:true}});
  }else if(cmd==='plan'){
    const id=String(positional[0]||'cloudflare');let input={};
    if(flags.json){try{input=JSON.parse(String(flags.json));}catch{throw new Error('--json must be valid JSON');}}
    out(contract(id,input));
  }else if(cmd==='run'){
    const id=String(positional[0]||'cloudflare');const ready=readiness(id);const base=contract(id,{mode:flags.apply?'apply':'dry-run'});
    if(!flags.apply){
      if(id==='cloudflare'){
        runScript(ready.script,['--dry-run']);
        out({...base,validatedLocally:true});
      }else out({...base,validatedLocally:false,reason:'No local provider adapter is installed for this provider.'});
    }else{
      if(!ready.applySupported)throw new Error(`${id} remote apply is not supported by the installed adapter`);
      const missing=ready.envChecks.filter(x=>!x.configured).map(x=>x.name);
      if(missing.length)throw new Error(`Missing environment: ${missing.join(', ')}`);
      runScript(ready.script,[]);
      out({...base,apply:true,remoteMutationAttempted:true});
    }
  }else if(cmd==='fallback-plan'){
    const order=(flags.providers?String(flags.providers):'cloudflare,vercel').split(',').map(x=>x.trim()).filter(Boolean);
    const rows=order.map(readiness);
    const selected=rows.find(x=>x.configured&&x.applySupported)||null;
    out({service:'ATLAS Deploy Orchestrator',operation:'fallback-plan',order,providers:rows,selected:selected?.id||null,automaticFailover:false,reason:selected?'A configured apply-capable provider is available. Explicit --apply remains required.':'No configured apply-capable provider is available.'});
  }else{
    console.error('ATLAS Deploy Orchestrator\n\nUsage:\n  node atlas/deploy-orchestrator.mjs status\n  node atlas/deploy-orchestrator.mjs plan [cloudflare|vercel] [--json PAYLOAD]\n  node atlas/deploy-orchestrator.mjs run [cloudflare|vercel] [--apply]\n  node atlas/deploy-orchestrator.mjs fallback-plan [--providers cloudflare,vercel]');
    process.exitCode=2;
  }
}catch(error){out({service:'ATLAS Deploy Orchestrator',ok:false,error:error instanceof Error?error.message:String(error)},1);}
