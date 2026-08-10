(()=>{
'use strict';

const registry=new Map();
const normalize=value=>String(value??'').trim().toLowerCase();
const terms=value=>normalize(value).split(/[^a-z0-9áéíóúñü_-]+/i).filter(Boolean);

function freezeSkill(input={}){
  if(!input.id||typeof input.id!=='string')throw new TypeError('ATLAS skill id is required.');
  const id=normalize(input.id);
  if(!/^[a-z0-9][a-z0-9._-]*$/.test(id))throw new TypeError(`Invalid ATLAS skill id: ${input.id}`);
  return Object.freeze({
    id,
    version:String(input.version||'1.0.0'),
    title:String(input.title||id),
    description:String(input.description||''),
    domain:String(input.domain||id),
    intents:Object.freeze([...(input.intents||[])].map(String)),
    capabilities:Object.freeze([...(input.capabilities||[])].map(String)),
    permissions:Object.freeze([...(input.permissions||[])].map(String)),
    risk:String(input.risk||'low'),
    execution:String(input.execution||'local-safe'),
    source:String(input.source||'atlas-core'),
    metadata:Object.freeze({...input.metadata})
  });
}

function register(input,{replace=false}={}){
  const skill=freezeSkill(input);
  if(registry.has(skill.id)&&!replace)throw new Error(`ATLAS skill already registered: ${skill.id}`);
  registry.set(skill.id,skill);
  window.dispatchEvent(new CustomEvent('atlas:skills:registered',{detail:{skill}}));
  return skill;
}

function unregister(id){
  const key=normalize(id);
  const removed=registry.delete(key);
  if(removed)window.dispatchEvent(new CustomEvent('atlas:skills:unregistered',{detail:{id:key}}));
  return removed;
}

function get(id){return registry.get(normalize(id))||null;}
function list(){return [...registry.values()];}

function score(skill,task='',context={}){
  const text=[task,context.intent,context.module,context.domain,context.summary].filter(Boolean).join(' ');
  const haystack=new Set(terms(text));
  let points=0;
  const matches=[];
  for(const intent of skill.intents){
    const pieces=terms(intent);
    if(!pieces.length)continue;
    const hit=pieces.every(piece=>haystack.has(piece)||normalize(text).includes(piece));
    if(hit){points+=pieces.length>1?5:3;matches.push(intent);}
  }
  if(context.domain&&normalize(context.domain)===normalize(skill.domain))points+=8;
  if(context.module&&normalize(context.module).includes(normalize(skill.domain)))points+=4;
  return {skill,score:points,matches};
}

function match(task,context={},{limit=3,minScore=1}={}){
  return list().map(skill=>score(skill,task,context))
    .filter(item=>item.score>=minScore)
    .sort((a,b)=>b.score-a.score||a.skill.id.localeCompare(b.skill.id))
    .slice(0,Math.max(1,limit));
}

const builtins=[
  {
    id:'technical-support',title:'ATLAS Technical Support',domain:'support',risk:'medium',execution:'safe-reversible',
    description:'Diagnose, repair safe reversible faults, and verify the environment after every repair.',
    intents:['support','technical support','diagnose','repair','fix','error','failure','deploy failure','troubleshoot','falla','error técnico','reparar'],
    capabilities:['discover-state','diagnose','safe-repair','post-change-verification','blocker-reporting'],
    permissions:['core.read']
  },
  {
    id:'deployment',title:'ATLAS Deployment',domain:'deployment',risk:'high',execution:'approval-gated-destructive',
    description:'Build, validate, deploy, health-check and roll back ATLAS workloads through provider adapters.',
    intents:['deploy','deployment','cloudflare','github actions','build','release','rollback','ci','production','despliegue','producción'],
    capabilities:['preflight','build','validate','deploy','health-check','rollback'],
    permissions:['organization.manage']
  },
  {
    id:'security',title:'ATLAS Security',domain:'security',risk:'high',execution:'least-privilege',
    description:'Evaluate trust boundaries, identity permissions, security posture and auditable remediation plans.',
    intents:['security','identity','permission','mfa','oauth','oidc','vulnerability','access','seguridad','identidad','permiso'],
    capabilities:['policy-evaluation','identity-context','risk-classification','audit-event','remediation-plan'],
    permissions:['security.events.read']
  },
  {
    id:'knowledge',title:'ATLAS Knowledge',domain:'knowledge',risk:'low',execution:'read-mostly',
    description:'Retrieve grounded enterprise knowledge while preserving source provenance and treating retrieved content as untrusted data.',
    intents:['knowledge','search documents','rag','document','policy','manual','research','knowledge base','conocimiento','buscar documento'],
    capabilities:['retrieval','provenance','grounding','document-routing','untrusted-content-boundary'],
    permissions:['documents.read']
  },
  {
    id:'accounting',title:'ATLAS Accounting',domain:'accounting',risk:'medium',execution:'policy-gated',
    description:'Accounting workflows for GL, AP, AR, reconciliation, reporting and controlled postings.',
    intents:['accounting','general ledger','gl','accounts payable','ap','accounts receivable','ar','invoice','reconcile','journal','contabilidad','factura','conciliar'],
    capabilities:['gl-analysis','ap','ar','reconciliation','financial-reporting','journal-draft'],
    permissions:['accounting.read']
  },
  {
    id:'hr',title:'ATLAS HR',domain:'hr',risk:'medium',execution:'policy-gated',
    description:'HR, candidate assessment, workforce administration and payroll-adjacent orchestration.',
    intents:['hr','human resources','employee','candidate','assessment','payroll','hiring','rrhh','empleado','candidato','nómina'],
    capabilities:['candidate-assessment','employee-routing','workforce-workflow','payroll-routing'],
    permissions:['hr.read']
  },
  {
    id:'iot-digital-twin',title:'ATLAS IoT & Digital Twin',domain:'iot',risk:'high',execution:'discover-change-verify',
    description:'Operate device and digital-twin workflows with mandatory discovery before mutation and fresh verification after mutation.',
    intents:['iot','digital twin','device','telemetry','sensor','smart room','elevator','fleet device','gemelo digital','telemetría','sensor'],
    capabilities:['discover-state','telemetry','twin-model','command-plan','minimal-change','post-change-verification'],
    permissions:['modules.manage']
  }
];

for(const skill of builtins)register(skill);

window.ATLASSkillRegistry=Object.freeze({
  version:'1.0.0',
  register,
  unregister,
  get,
  list,
  match,
  score
});

window.dispatchEvent(new CustomEvent('atlas:skills:ready',{detail:{version:'1.0.0',count:registry.size}}));
})();