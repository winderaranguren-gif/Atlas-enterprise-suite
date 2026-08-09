'use strict';
const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
const read=name=>fs.readFileSync(path.join(root,name),'utf8');
const failures=[];
const requireText=(file,text)=>{if(!read(file).includes(text))failures.push(`${file} missing ${text}`)};
const forbid=(file,text)=>{if(read(file).includes(text))failures.push(`${file} contains forbidden production marker ${text}`)};
for(const file of ['atlas-data-fabric.js','atlas-intelligence-core.js','atlas-production-core.js','atlas-automation-field-ops.js','atlas-config.js','index.html','app.js','supabase/migrations/202608090001_atlas_horizontal_production_fabric.sql']){
  if(!fs.existsSync(path.join(root,file)))failures.push(`missing ${file}`);
}
requireText('atlas-config.js','allowDemoData: false');
requireText('atlas-config.js',"dataMode: 'production'");
requireText('atlas-data-fabric.js',"mode:'production'");
requireText('atlas-data-fabric.js','indexedDB.open');
requireText('atlas-intelligence-core.js',"mode:'production'");
requireText('atlas-production-core.js','ATLAS está conectado a producción');
requireText('app.js','atlas-production-core.js');
requireText('index.html','@supabase/supabase-js');
requireText('supabase/migrations/202608090001_atlas_horizontal_production_fabric.sql','create table if not exists public.atlas_events');
requireText('supabase/migrations/202608090001_atlas_horizontal_production_fabric.sql','create table if not exists public.atlas_module_records');
forbid('index.html','demo@atlas.local');
forbid('index.html','Atlas2026!');
forbid('app.js','atlas-suite.js?v=4');
forbid('app.js','atlas-os-operational.js?v=1');
forbid('atlas-production-core.js','localStorage');
forbid('atlas-automation-field-ops.js','localStorage');
if(failures.length){console.error('ATLAS production fabric validation failed:\n- '+failures.join('\n- '));process.exit(1)}
console.log('ATLAS production fabric validation passed.');
