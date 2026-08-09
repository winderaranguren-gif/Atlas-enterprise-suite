'use strict';

const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
const migrationPath=path.join(root,'supabase/migrations/202608080006_atlas_gps_lane_intelligence.sql');
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

if(sql){
  lexicalBalance(sql);
  requireText('begin;','transaction');
  requireText('commit;','transaction');
  requireText('create extension if not exists postgis with schema extensions','PostGIS activation');
  requireText('with (security_invoker = true)','active-events view');
  requireText('on delete set null (road_segment_id)','nullable segment FK');
  requireText('on delete set null (lane_id)','nullable lane FK');

  const tables=[
    'gps_road_segments','gps_lanes','gps_lane_connectivity','gps_traffic_signs','gps_sign_lanes',
    'gps_speed_limits','gps_interchanges','gps_dynamic_road_events','gps_event_road_segments'
  ];
  for(const table of tables){
    requireText(`create table if not exists public.${table}`,`table ${table}`);
    requireText(`alter table public.${table} enable row level security`,`RLS ${table}`);
    requireText(`create policy ${table}_access on public.${table}`,`policy ${table}`);
  }

  const tableBlocks=[...sql.matchAll(/create table if not exists public\.(gps_[a-z_]+)\s*\(([\s\S]*?)\n\);/gi)];
  const blockMap=new Map(tableBlocks.map(match=>[match[1].toLowerCase(),match[2].toLowerCase()]));
  for(const table of tables){
    const block=blockMap.get(table);
    if(!block){fail(`Unable to inspect table block for ${table}`);continue;}
    if(!/\borg_id\s+uuid\s+not null/.test(block))fail(`${table} must require org_id.`);
  }

  const policies=[...sql.matchAll(/create policy\s+(gps_[a-z_]+_access)\s+on\s+public\.(gps_[a-z_]+)[\s\S]*?using\s*\(public\.is_org_member\(org_id\)\)[\s\S]*?with check\s*\(public\.has_org_role\(org_id,array\['owner','admin','manager'\]\)\)/gi)];
  if(policies.length!==tables.length)fail(`Expected ${tables.length} tenant-aware GPS policies, found ${policies.length}.`);

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
