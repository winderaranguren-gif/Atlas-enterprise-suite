'use strict';

const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
const migrationDir=path.join(root,'supabase/migrations');
const migrationName='202608080007_atlas_gps_lane_intelligence.sql';
const migrationPath=path.join(migrationDir,migrationName);
const failures=[];
const fail=message=>failures.push(message);

if(!fs.existsSync(migrationPath))fail('Missing GPS lane-intelligence migration.');
const sql=fs.existsSync(migrationPath)?fs.readFileSync(migrationPath,'utf8'):'';
const lower=sql.toLowerCase();
const requireText=(needle,label)=>{if(!lower.includes(needle.toLowerCase()))fail(`${label}: missing ${needle}`);};

function lexicalBalance(text){
  let state='normal',tag='',parens=0;
  for(let i=0;i<text.length;){
    const ch=text[i],two=text.slice(i,i+2);
    if(state==='line'){if(ch==='\n')state='normal';i++;continue;}
    if(state==='block'){if(two==='*/'){state='normal';i+=2;}else i++;continue;}
    if(state==='single'){if(two==="''")i+=2;else if(ch==="'"){state='normal';i++;}else i++;continue;}
    if(state==='double'){if(two==='""')i+=2;else if(ch==='"'){state='normal';i++;}else i++;continue;}
    if(state==='dollar'){if(text.startsWith(tag,i)){state='normal';i+=tag.length;}else i++;continue;}
    if(two==='--'){state='line';i+=2;continue;}
    if(two==='/*'){state='block';i+=2;continue;}
    if(ch==="'"){state='single';i++;continue;}
    if(ch==='"'){state='double';i++;continue;}
    if(ch==='$'){
      const match=text.slice(i).match(/^\$[A-Za-z_][A-Za-z0-9_]*\$|^\$\$/);
      if(match){tag=match[0];state='dollar';i+=tag.length;continue;}
    }
    if(ch==='(')parens++;
    if(ch===')')parens--;
    if(parens<0){fail(`Unmatched closing parenthesis near character ${i}`);parens=0;}
    i++;
  }
  if(state!=='normal'&&state!=='line')fail(`Migration ends inside ${state}.`);
  if(parens!==0)fail(`Migration has ${parens} unmatched parenthesis level(s).`);
}

function validateUniqueMigrationVersions(){
  if(!fs.existsSync(migrationDir))return fail('Missing Supabase migration directory.');
  const byVersion=new Map();
  for(const file of fs.readdirSync(migrationDir)){
    const match=file.match(/^(\d+)_.*\.sql$/);
    if(!match)continue;
    const version=match[1];
    const files=byVersion.get(version)||[];
    files.push(file);
    byVersion.set(version,files);
  }
  for(const [version,files] of byVersion){
    if(files.length>1)fail(`Duplicate Supabase migration version ${version}: ${files.join(', ')}`);
  }
}

validateUniqueMigrationVersions();

if(sql){
  lexicalBalance(sql);
  requireText('begin;','transaction');
  requireText('commit;','transaction');
  requireText('create extension if not exists postgis with schema extensions','PostGIS activation');
  requireText("from pg_extension e\njoin pg_namespace n on n.oid = e.extnamespace\nwhere e.extname = 'postgis'",'PostGIS namespace detection');
  requireText("set_config(\n  'search_path'",'PostGIS search path');
  if(/extensions\.geometry\s*\(/i.test(sql))fail('Geometry types must resolve through the detected PostGIS namespace, not assume extensions.geometry.');
  requireText('with (security_invoker = true)','active-events view');
  requireText('on delete set null (road_segment_id)','nullable segment FK');
  requireText('on delete set null (lane_id)','nullable lane FK');
  requireText("travel_direction text not null default 'unknown'",'lane direction uniqueness');
  requireText('unique (id, org_id, road_segment_id)','lane composite identity');
  requireText('foreign key (lane_id, org_id, road_segment_id)','speed-limit lane/segment FK');
  requireText('references public.gps_lanes(id, org_id, road_segment_id)','speed-limit lane/segment reference');
  requireText('gps_lane_connectivity_org_to_lane_idx','reverse connectivity index');
  requireText('gps_sign_lanes_org_lane_idx','reverse sign/lane index');
  requireText('gps_event_road_segments_org_road_idx','reverse event/road index');
  requireText('gps_speed_limits_org_lane_segment_idx','speed-limit lane index');
  requireText('gps_traffic_signs_valid_window check (valid_from is null or valid_to is null or valid_to >= valid_from)','traffic-sign validity window');
  requireText('gps_speed_limits_valid_window check (valid_from is null or valid_to is null or valid_to >= valid_from)','speed-limit validity window');
  requireText('gps_dynamic_road_events_valid_window check (starts_at is null or ends_at is null or ends_at >= starts_at)','dynamic-event validity window');

  const tables=[
    'gps_road_segments','gps_lanes','gps_lane_connectivity','gps_traffic_signs','gps_sign_lanes',
    'gps_speed_limits','gps_interchanges','gps_dynamic_road_events','gps_event_road_segments'
  ];
  for(const table of tables){
    requireText(`create table if not exists public.${table}`,`table ${table}`);
    requireText(`alter table public.${table} enable row level security`,`RLS ${table}`);
    requireText(`create policy ${table}_read on public.${table} for select to authenticated using (public.is_org_member(org_id))`,`read policy ${table}`);
    requireText(`create policy ${table}_insert on public.${table} for insert to authenticated with check (public.has_org_role(org_id,array['owner','admin','manager']))`,`insert policy ${table}`);
    requireText(`create policy ${table}_update on public.${table} for update to authenticated using (public.has_org_role(org_id,array['owner','admin','manager'])) with check (public.has_org_role(org_id,array['owner','admin','manager']))`,`update policy ${table}`);
    requireText(`create policy ${table}_delete on public.${table} for delete to authenticated using (public.has_org_role(org_id,array['owner','admin','manager']))`,`delete policy ${table}`);
  }

  const tableBlocks=[...sql.matchAll(/create table if not exists public\.(gps_[a-z_]+)\s*\(([\s\S]*?)\n\);/gi)];
  const blockMap=new Map(tableBlocks.map(match=>[match[1].toLowerCase(),match[2].toLowerCase()]));
  for(const table of tables){
    const block=blockMap.get(table);
    if(!block){fail(`Unable to inspect table block for ${table}`);continue;}
    if(!/\borg_id\s+uuid\s+not null/.test(block))fail(`${table} must require org_id.`);
  }

  if(/create policy\s+gps_[a-z_]+_access\b|create policy[\s\S]*?\bfor all\b/i.test(sql)){
    fail('GPS RLS must use separate SELECT/INSERT/UPDATE/DELETE policies; FOR ALL is not permitted.');
  }

  requireText('foreign key (road_segment_id, org_id)','segment tenant FK');
  requireText('foreign key (from_lane_id, org_id)','from-lane tenant FK');
  requireText('foreign key (to_lane_id, org_id)','to-lane tenant FK');
  requireText('foreign key (sign_id, org_id)','sign tenant FK');
  requireText('foreign key (event_id, org_id)','event tenant FK');

  if(/create schema if not exists\s+atlas_gps/i.test(sql))fail('Lane Intelligence must use public.gps_* tables so existing Supabase exposure/RLS conventions remain authoritative.');
  if(/lane_ids\s+uuid\[\]|road_segment_ids\s+uuid\[\]/i.test(sql))fail('GPS relations must use normalized relation tables instead of unvalidated UUID arrays.');
  if(/sb_secret_|service_role|eyj[a-z0-9_-]{20,}\.[a-z0-9_-]{20,}\./i.test(sql))fail('Migration appears to contain a credential.');
}

if(failures.length){
  console.error('ATLAS GPS lane-intelligence validation failed:');
  failures.forEach(item=>console.error(`- ${item}`));
  process.exit(1);
}

console.log('ATLAS GPS lane-intelligence migration validation: PASS');
