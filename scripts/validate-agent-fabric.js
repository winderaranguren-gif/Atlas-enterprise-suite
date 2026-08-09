'use strict';

const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const fail=message=>{throw new Error(`ATLAS Agent Fabric validation failed: ${message}`);};

const required=[
  'atlas-skill-registry.js',
  'atlas-agent-fabric.js',
  'app.js',
  'package.json',
  'docs/ATLAS_AGENT_FABRIC.md',
  '.github/skills/atlas-agent-fabric/SKILL.md'
];
for(const file of required){
  if(!fs.existsSync(path.join(root,file)))fail(`missing ${file}`);
}

const registry=read('atlas-skill-registry.js');
const fabric=read('atlas-agent-fabric.js');
const app=read('app.js');
const pkg=JSON.parse(read('package.json'));

for(const skill of ['technical-support','deployment','security','knowledge','accounting','hr','iot-digital-twin']){
  if(!registry.includes(`id:'${skill}'`))fail(`builtin skill ${skill} is not registered`);
}

const canonicalPermissions=new Set([
  'core.read','organization.manage','members.read','members.manage','modules.read','modules.manage',
  'accounting.read','accounting.write','crm.read','crm.write','inventory.read','inventory.write',
  'hr.read','hr.write','documents.read','documents.write','audit.read','identity.manage','security.events.read'
]);
const permissionBlocks=[...registry.matchAll(/permissions:\[([^\]]*)\]/g)].map(match=>match[1]);
for(const block of permissionBlocks){
  const values=[...block.matchAll(/['"]([^'"]+)['"]/g)].map(match=>match[1]);
  for(const permission of values){
    if(!canonicalPermissions.has(permission))fail(`skill uses non-canonical ATLAS Identity permission: ${permission}`);
  }
}

for(const invariant of [
  'Discover current state before mutation',
  'Apply policy and permission gates',
  'Execute only the minimum authorized action',
  'Perform a fresh post-action verification'
]){
  if(!fabric.includes(invariant))fail(`runtime invariant missing: ${invariant}`);
}

if(!fabric.includes("providerAgnostic:true"))fail('provider-agnostic policy marker is missing');
if(!fabric.includes("registerHandler('technical-support'"))fail('Technical Support handler is not connected');
if(!fabric.includes("typeof api?.current==='function'"))fail('ATLAS_IDENTITY.current() compatibility is missing');
if(!fabric.includes("typeof api?.can==='function'"))fail('ATLAS_IDENTITY.can() compatibility is missing');
if(!fabric.includes('identitySnapshot()'))fail('identity/permission policy integration is missing');

const registryIndex=app.indexOf("atlas-skill-registry.js?v=1");
const fabricIndex=app.indexOf("atlas-agent-fabric.js?v=1");
const supportIndex=app.indexOf("atlas-technical-support.js?v=1");
if(registryIndex<0||fabricIndex<0||supportIndex<0)fail('runtime loader is missing Agent Fabric assets');
if(!(registryIndex<fabricIndex&&fabricIndex<supportIndex))fail('load order must be skill registry → Agent Fabric → Technical Support');

if(!pkg.scripts?.['check:agent-fabric'])fail('package.json is missing check:agent-fabric');
if(!String(pkg.scripts.validate||'').includes('check:agent-fabric'))fail('main validate chain does not include check:agent-fabric');
if(!String(pkg.scripts['check:js']||'').includes('atlas-agent-fabric.js'))fail('check:js does not syntax-check Agent Fabric');
if(!String(pkg.scripts['check:js']||'').includes('atlas-skill-registry.js'))fail('check:js does not syntax-check skill registry');

const forbidden=[/api[_-]?key\s*[:=]\s*['"][^'"]+/i,/client[_-]?secret\s*[:=]\s*['"][^'"]+/i,/bearer\s+[a-z0-9._-]{20,}/i];
for(const pattern of forbidden){
  if(pattern.test(registry)||pattern.test(fabric))fail(`possible embedded secret matched ${pattern}`);
}

console.log('ATLAS Agent Fabric validation passed: skills, canonical Identity permissions, runtime invariants, loader order and package validation are wired.');