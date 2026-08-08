#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');

const required = {
  'supabase/migrations/202608080005_atlas_production_function_hardening.sql': [
    'revoke execute on all functions in schema public from public',
    'revoke execute on all functions in schema public from anon'
  ],
  'supabase/migrations/202608080006_atlas_personal_intelligence_cloud_core.sql': [
    'create table if not exists public.calendar_events',
    'create table if not exists public.personal_intelligence_memory',
    'create table if not exists public.personal_intelligence_runs',
    'alter table public.calendar_events enable row level security',
    'alter table public.personal_intelligence_memory enable row level security',
    'alter table public.personal_intelligence_runs enable row level security',
    "timezone text not null default 'America/New_York'"
  ],
  'supabase/migrations/202608080007_atlas_private_authorization_helpers.sql': [
    'create schema if not exists atlas_private',
    'security invoker',
    'revoke all on schema atlas_private from anon'
  ],
  'supabase/migrations/202608080008_atlas_calendar_owner_isolation.sql': [
    'using (owner_user_id = auth.uid())',
    'calendar_events_owner_external_ref_uidx',
    'create policy calendar_events_update'
  ]
};

let failed = false;
for (const [relative, needles] of Object.entries(required)) {
  const file = path.join(root, relative);
  if (!fs.existsSync(file)) {
    console.error(`PERSONAL INTELLIGENCE VALIDATION FAILED: missing ${relative}`);
    failed = true;
    continue;
  }
  const text = fs.readFileSync(file, 'utf8').toLowerCase();
  for (const needle of needles) {
    if (!text.includes(needle.toLowerCase())) {
      console.error(`PERSONAL INTELLIGENCE VALIDATION FAILED: ${relative} missing ${needle}`);
      failed = true;
    }
  }
}

if (failed) process.exitCode = 1;
else console.log('ATLAS Personal Intelligence production package validation: PASS');
