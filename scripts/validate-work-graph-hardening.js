'use strict';

const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const migrationPath = path.join(root, 'supabase', 'migrations', '202608090011_atlas_work_graph_codex_review_hardening.sql');

function fail(message) {
  console.error(`ATLAS Work Graph hardening gate failed: ${message}`);
  process.exit(1);
}

if (!fs.existsSync(migrationPath)) fail('post-review hardening migration is missing');
const sql = fs.readFileSync(migrationPath, 'utf8');

for (const marker of [
  'unique (org_id, project_id, id)',
  'foreign key (org_id, project_id, parent_work_unit_id)',
  'foreign key (org_id, project_id, work_unit_id)',
  'deferrable initially deferred',
  "if new.status <> 'active' then",
  'pg_advisory_xact_lock',
  'guard_atlas_work_unit_parent_cycle',
  "new.org_id is distinct from old.org_id",
  "old.execution_policy = 'auto_safe'",
  'authority_changed'
]) {
  if (!sql.toLowerCase().includes(marker.toLowerCase())) fail(`required post-review safeguard missing: ${marker}`);
}

if (/on delete restrict/i.test(sql)) fail('post-review execution references must not reintroduce immediate RESTRICT semantics');

console.log('ATLAS Work Graph hardening gate passed: tenant/project integrity, cycle serialization and auto_safe authorization are regression-protected.');