import { spawnSync } from 'node:child_process';

const DEFAULT_PROVIDER='sovereign';
const PROVIDERS={
  sovereign:{
    kind:'canonical-release',
    env:[],
    script:'check:portable-runtime',
    applySupported:false,
    canonical:true,
    artifact:'OCI image',
    note:'Canonical ATLAS release path. GitHub Actions publishes the immutable OCI artifact.'
  },
  vps:{
    kind:'canonical-production-host',
    env:['ATLAS_VPS_HOST','ATLAS_VPS_USER','ATLAS_VPS_SSH_PRIVATE_KEY','ATLAS_VPS_KNOWN_HOST','ATLAS_VPS_PRODUCTION_URL'],
    script:'check:vps',
    applySupported:false,
    canonical:true,
    artifact:'OCI image',
    note:'Production apply is performed by the Deploy ATLAS VPS workflow with pinned SSH host verification and rollback.'
  },
  cloudflare:{
    kind:'optional-provider-adapter',
    env:['CLOUDFLARE_API_TOKEN','CLOUDFLARE_ACCOUNT_ID'],
    script:'deploy:cloudflare',
    applySupported:true,
    canonical:false,
    optional:true,
    note:'Optional compatibility adapter. It is never selected automatically as ATLAS production.'
  },
  vercel:{
    kind:'optional-provider-adapter',
    env:['VERCEL_TOKEN'],
    script:null,
    applySupported:false,
    canonical:false,
    optional:true,
    note:'Optional HTTP adapter. No remote apply adapter is installed.'
  },
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
  return {id,kind:p.kind,canonical:Boolean(p.canonical),optional:Boolean(p.optional),configured:checks.every(x=>x.configured),envChecks:checks,applySupported:p.applySupported,script:p.script,artifact:p.artifact||null,note:p.note};
}
function contract(id,input={}){
  const ready=readiness(id);
  return {service:'ATLAS Deploy Orchestrator',version:2,mutationDefault:'dry-run',provider:id,input,readiness:ready,apply:false,tenantScoped:true,auditRequired:true,secretValuesLogged:false,productionAuthority:id==='sovereign'||id==='vps'};
}
function runScript(script,args=[]){
  if(!script)return false;
  const npm=process.platform==='win32'?'npm.cmd':'npm';
  const r=spawnSync(npm,['run',script,'--',...args],{stdio:'inherit',env:process.env});
  if(r.error)throw r.error;
  if(r.status!==0)throw new Error(`${script} failed with exit code ${r.status}`);
  return true;
}

const [cmd,...raw]=process.argv.slice(2);const {positional,flags}=parse(raw);
try{
  if(cmd==='status'){
    out({service:'ATLAS Deploy Orchestrator',version:2,mutationDefault:'dry-run',defaultProvider:DEFAULT_PROVIDER,providers:Object.keys(PROVIDERS).map(readiness),policy:{providerNeutral:true,canonicalRelease:'sovereign',canonicalProductionHost:'vps',optionalAdaptersNeverAutoSelected:true,credentialsFromEnvironmentOnly:true,auditRequired:true}});
  }else if(cmd==='plan'){
    const id=String(positional[0]||DEFAULT_PROVIDER);let input={};
    if(flags.json){try{input=JSON.parse(String(flags.json));}catch{throw new Error('--json must be valid JSON');}}
    out(contract(id,input));
  }else if(cmd==='run'){
    const id=String(positional[0]||DEFAULT_PROVIDER);const ready=readiness(id);const base=contract(id,{mode:flags.apply?'apply':'dry-run'});
    if(!flags.apply){
      const args=id==='cloudflare'?['--dry-run']:[];
      const validatedLocally=runScript(ready.script,args);
      out({...base,validatedLocally,reason:validatedLocally?'Local adapter contract validated.':'No local validation adapter is installed.'});
    }else{
      if(id==='sovereign')throw new Error('Sovereign release apply is performed by the ATLAS Portable Runtime workflow so the OCI artifact is immutable and auditable.');
      if(id==='vps')throw new Error('VPS production apply is performed by the Deploy ATLAS VPS workflow with pinned SSH verification and rollback.');
      if(!ready.applySupported)throw new Error(`${id} remote apply is not supported by the installed adapter`);
      const missing=ready.envChecks.filter(x=>!x.configured).map(x=>x.name);
      if(missing.length)throw new Error(`Missing environment: ${missing.join(', ')}`);
      runScript(ready.script,[]);
      out({...base,apply:true,remoteMutationAttempted:true});
    }
  }else if(cmd==='fallback-plan'){
    const order=(flags.providers?String(flags.providers):'sovereign,vps,cloudflare,vercel').split(',').map(x=>x.trim()).filter(Boolean);
    const rows=order.map(readiness);
    const vps=rows.find(x=>x.id==='vps'&&x.configured)||null;
    const optional=flags['allow-optional']?rows.find(x=>x.optional&&x.configured&&x.applySupported)||null:null;
    out({service:'ATLAS Deploy Orchestrator',version:2,mutationDefault:'dry-run',operation:'fallback-plan',order,providers:rows,canonicalRelease:'sovereign',selectedProductionTarget:vps?.id||null,optionalAdapterCandidate:optional?.id||null,automaticFailoverToThirdParty:false,reason:vps?'Configured ATLAS VPS is the production target.':optional?'No ATLAS VPS is configured; an optional adapter is available only because --allow-optional was explicit.':'No configured ATLAS VPS production target. Sovereign OCI release remains valid without silently selecting a third party.'});
  }else{
    console.error('ATLAS Deploy Orchestrator\n\nUsage:\n  node atlas/deploy-orchestrator.mjs status\n  node atlas/deploy-orchestrator.mjs plan [sovereign|vps|cloudflare|vercel] [--json PAYLOAD]\n  node atlas/deploy-orchestrator.mjs run [sovereign|vps|cloudflare|vercel] [--apply]\n  node atlas/deploy-orchestrator.mjs fallback-plan [--providers sovereign,vps,cloudflare,vercel] [--allow-optional]');
    process.exitCode=2;
  }
}catch(error){out({service:'ATLAS Deploy Orchestrator',ok:false,error:error instanceof Error?error.message:String(error)},1);}
