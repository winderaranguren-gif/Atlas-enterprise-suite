import { ATLAS_MODULE_REGISTRY, orderedAtlasModules } from '../platform/module-registry.js';

const ids=new Set();
for(const module of ATLAS_MODULE_REGISTRY){
  if(ids.has(module.id)) throw new Error(`duplicate module id: ${module.id}`);
  ids.add(module.id);
}

for(const module of ATLAS_MODULE_REGISTRY){
  for(const dependency of module.dependsOn||[]){
    if(!ids.has(dependency)) throw new Error(`${module.id} depends on missing module ${dependency}`);
  }
  if(module.parent && !ids.has(module.parent)) throw new Error(`${module.id} has missing parent ${module.parent}`);
}

const analytics=ATLAS_MODULE_REGISTRY.find(module=>module.id==='analytics');
if(analytics?.parent!=='accounting' || analytics?.domain!=='finance'){
  throw new Error('analytics must remain under Accounting & Finance');
}

const ordered=orderedAtlasModules();
for(let i=1;i<ordered.length;i++){
  if(ordered[i-1].order>ordered[i].order) throw new Error('module ordering invalid');
}

console.log('ATLAS module registry valid');
