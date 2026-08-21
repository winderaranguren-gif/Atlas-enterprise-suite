const PROVIDERS=[
  {id:'github',name:'GitHub',kind:'development',env:['GITHUB_TOKEN'],capabilities:['repositories','branches','pull_requests','issues','actions']},
  {id:'cloudflare',name:'Cloudflare',kind:'deployment',env:['CLOUDFLARE_API_TOKEN','CLOUDFLARE_ACCOUNT_ID'],capabilities:['workers','routes','durable_objects','realtime_turn']},
  {id:'vercel',name:'Vercel',kind:'deployment',env:['VERCEL_TOKEN'],capabilities:['deployments','projects','domains']},
  {id:'supabase',name:'Supabase',kind:'data',env:['SUPABASE_URL','SUPABASE_SERVICE_ROLE_KEY'],capabilities:['postgres','auth','storage','edge_functions']},
  {id:'openai',name:'OpenAI',kind:'ai',env:['OPENAI_API_KEY'],capabilities:['generation','responses','embeddings','agents']},
  {id:'anthropic',name:'Anthropic',kind:'ai',env:['ANTHROPIC_API_KEY'],capabilities:['generation','tool_use']},
  {id:'google-ai',name:'Google AI',kind:'ai',env:['GOOGLE_API_KEY'],capabilities:['generation','multimodal']},
  {id:'microsoft',name:'Microsoft',kind:'workspace',env:[],capabilities:['outlook','teams','sharepoint'],auth:'oauth2'},
  {id:'google-workspace',name:'Google Workspace',kind:'workspace',env:[],capabilities:['gmail','calendar','drive','contacts'],auth:'oauth2'}
];

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

function safeJson(raw,fallback={}){
  if(raw===undefined)return fallback;
  try{return JSON.parse(String(raw));}catch{throw new Error('Invalid JSON payload');}
}

function readiness(provider){
  const checks=(provider.env||[]).map(name=>({name,configured:Boolean(process.env[name])}));
  const oauth=provider.auth==='oauth2';
  return {
    ...provider,
    readiness:oauth?'authorization-required-at-runtime':checks.every(x=>x.configured)?'configured':'missing-environment',
    envChecks:checks
  };
}

function providerById(id){
  const provider=PROVIDERS.find(x=>x.id===id);
  if(!provider)throw new Error(`Unknown provider: ${id}`);
  return provider;
}

function out(value,code=0){console.log(JSON.stringify(value,null,2));process.exitCode=code;}

const [cmd,...raw]=process.argv.slice(2);
const {positional,flags}=parse(raw);

try{
  if(cmd==='catalog'){
    out({
      service:'ATLAS Provider Adapters',
      version:1,
      providers:PROVIDERS,
      policy:{
        secretValuesStored:false,
        readinessChecksPresenceOnly:true,
        providerBrandCloning:false,
        normalizedCapabilityContracts:true,
        executionRequiresExplicitAdapter:true
      }
    });
  }else if(cmd==='status'){
    const id=positional[0];
    if(id)out(readiness(providerById(id)));
    else out({service:'ATLAS Provider Adapters',providers:PROVIDERS.map(readiness)});
  }else if(cmd==='plan'){
    const id=positional[0];const operation=positional[1];
    if(!id||!operation)throw new Error('Usage: plan <provider> <operation> [--json PAYLOAD]');
    const provider=providerById(id);const ready=readiness(provider);const payload=safeJson(flags.json,{});
    out({
      service:'ATLAS Provider Adapters',
      provider:{id:provider.id,name:provider.name,kind:provider.kind},
      operation,
      payload,
      readiness:ready.readiness,
      missingEnvironment:ready.envChecks.filter(x=>!x.configured).map(x=>x.name),
      executable:false,
      reason:'This command produces a provider-neutral execution contract. A provider-specific authenticated adapter must perform the remote mutation.',
      contract:{provider:provider.id,operation,input:payload,tenantScoped:true,auditRequired:true}
    });
  }else{
    console.error('ATLAS Provider Adapters\n\nUsage:\n  node atlas/providers.mjs catalog\n  node atlas/providers.mjs status [provider]\n  node atlas/providers.mjs plan <provider> <operation> [--json PAYLOAD]');
    process.exitCode=2;
  }
}catch(error){out({service:'ATLAS Provider Adapters',ok:false,error:error instanceof Error?error.message:String(error)},1);}
