#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const corePath = path.join(root, 'supabase/migrations/202607270001_atlas_core_schema.sql');
const storagePath = path.join(root, 'supabase/migrations/202607270002_atlas_storage.sql');
const operationsPath = path.join(root, 'supabase/migrations/202607270003_atlas_cloud_operations.sql');
const securityPatchPath = path.join(root, 'supabase/migrations/202607270004_atlas_security_patch.sql');
const envPath = path.join(root, '.env.example');

function fail(message) {
  console.error(`DATABASE VALIDATION FAILED: ${message}`);
  process.exitCode = 1;
}

function read(filePath) {
  if (!fs.existsSync(filePath)) {
    fail(`Missing ${path.relative(root, filePath)}`);
    return '';
  }
  return fs.readFileSync(filePath, 'utf8');
}

function assertIncludes(text, needle, label) {
  if (!text.toLowerCase().includes(needle.toLowerCase())) {
    fail(`${label} is missing: ${needle}`);
  }
}

function validateLexicalBalance(text, label) {
  let i = 0;
  let state = 'normal';
  let dollarTag = '';
  let parens = 0;

  while (i < text.length) {
    const two = text.slice(i, i + 2);
    const ch = text[i];

    if (state === 'line-comment') {
      if (ch === '\n') state = 'normal';
      i += 1;
      continue;
    }
    if (state === 'block-comment') {
      if (two === '*/') {
        state = 'normal';
        i += 2;
      } else i += 1;
      continue;
    }
    if (state === 'single-quote') {
      if (two === "''") i += 2;
      else if (ch === "'") {
        state = 'normal';
        i += 1;
      } else i += 1;
      continue;
    }
    if (state === 'double-quote') {
      if (two === '""') i += 2;
      else if (ch === '"') {
        state = 'normal';
        i += 1;
      } else i += 1;
      continue;
    }
    if (state === 'dollar-quote') {
      if (text.startsWith(dollarTag, i)) {
        state = 'normal';
        i += dollarTag.length;
      } else i += 1;
      continue;
    }

    if (two === '--') {
      state = 'line-comment';
      i += 2;
      continue;
    }
    if (two === '/*') {
      state = 'block-comment';
      i += 2;
      continue;
    }
    if (ch === "'") {
      state = 'single-quote';
      i += 1;
      continue;
    }
    if (ch === '"') {
      state = 'double-quote';
      i += 1;
      continue;
    }
    if (ch === '$') {
      const match = text.slice(i).match(/^\$[A-Za-z_][A-Za-z0-9_]*\$|^\$\$/);
      if (match) {
        dollarTag = match[0];
        state = 'dollar-quote';
        i += dollarTag.length;
        continue;
      }
    }
    if (ch === '(') parens += 1;
    if (ch === ')') parens -= 1;
    if (parens < 0) {
      fail(`${label} has an unmatched closing parenthesis near character ${i}`);
      parens = 0;
    }
    i += 1;
  }

  if (state !== 'normal' && state !== 'line-comment') {
    fail(`${label} ends inside ${state}`);
  }
  if (parens !== 0) {
    fail(`${label} has ${parens} unmatched parenthesis level(s)`);
  }
}

function duplicates(text, regex) {
  const values = [...text.matchAll(regex)].map((match) => match[1].toLowerCase());
  return [...new Set(values.filter((value, index) => values.indexOf(value) !== index))];
}

const core = read(corePath);
const storage = read(storagePath);
const operations = read(operationsPath);
const securityPatch = read(securityPatchPath);
const env = read(envPath);

if (core) {
  validateLexicalBalance(core, 'core migration');
  assertIncludes(core, 'begin;', 'core migration');
  assertIncludes(core, 'commit;', 'core migration');
  assertIncludes(core, 'create or replace function public.create_organization', 'organization bootstrap');
  assertIncludes(core, 'create or replace function public.is_org_member', 'membership helper');
  assertIncludes(core, 'create or replace function public.validate_journal_entry', 'journal control');
  assertIncludes(core, 'create table if not exists public.audit_logs', 'audit table');

  const tables = [...core.matchAll(/create table if not exists public\.([a-z_]+)/gi)].map((m) => m[1]);
  const rlsTables = new Set([...core.matchAll(/alter table public\.([a-z_]+) enable row level security/gi)].map((m) => m[1]));
  for (const table of tables) {
    if (!rlsTables.has(table)) fail(`RLS is not enabled on public.${table}`);
  }

  const duplicatePolicies = duplicates(core, /create policy\s+([a-z0-9_]+)/gi);
  if (duplicatePolicies.length) fail(`Duplicate policy names: ${duplicatePolicies.join(', ')}`);

  const duplicateTriggers = duplicates(core, /create (?:constraint )?trigger\s+([a-z0-9_]+)/gi);
  if (duplicateTriggers.length) fail(`Duplicate trigger names: ${duplicateTriggers.join(', ')}`);

  const requiredTenantTables = [
    'organizations', 'organization_members', 'customers', 'vendors', 'products',
    'invoices', 'invoice_lines', 'payments', 'expenses', 'chart_of_accounts',
    'journal_entries', 'journal_lines', 'employees', 'documents', 'audit_logs'
  ];
  for (const table of requiredTenantTables) {
    assertIncludes(core, `public.${table}`, `tenant table ${table}`);
  }

  const unsafeServiceKey = /(SUPABASE_SERVICE_ROLE_KEY\s*=\s*[^\s#]+)|(SUPABASE_SECRET_KEY\s*=\s*[^\s#]+)|(sb_secret_[A-Za-z0-9_-]+)|(eyJ[a-zA-Z0-9_-]{20,}\.[a-zA-Z0-9_-]{20,}\.[a-zA-Z0-9_-]{20,})/;
  if (unsafeServiceKey.test(core)) fail('Core migration appears to contain a real credential');
}

if (storage) {
  validateLexicalBalance(storage, 'storage migration');
  assertIncludes(storage, "'atlas-documents'", 'private storage bucket');
  assertIncludes(storage, 'public.is_org_member', 'storage read policy');
  assertIncludes(storage, 'public.can_write_business_data', 'storage write policy');
  assertIncludes(storage, 'public.has_org_role', 'storage delete policy');
  assertIncludes(storage, 'commit;', 'storage migration');
}

if (operations) {
  validateLexicalBalance(operations, 'cloud operations migration');
  assertIncludes(operations, 'create or replace function public.record_invoice_payment', 'payment transaction');
  assertIncludes(operations, 'create or replace function public.create_balanced_journal_entry', 'balanced journal transaction');
  assertIncludes(operations, 'create or replace function public.audit_row_change', 'automatic audit');
  assertIncludes(operations, 'create or replace function public.normalize_invoice_balance', 'invoice balance control');
  assertIncludes(operations, 'commit;', 'cloud operations migration');
}

if (securityPatch) {
  validateLexicalBalance(securityPatch, 'security patch migration');
  assertIncludes(securityPatch, 'create or replace function public.refresh_invoice_from_payments', 'safe payment refresh');
  assertIncludes(securityPatch, 'expense_categories_insert', 'expense-category policy');
  assertIncludes(securityPatch, 'commit;', 'security patch migration');
}

if (env) {
  const assignments = env.split(/\r?\n/).filter((line) => /^[A-Z0-9_]+=/.test(line));
  for (const line of assignments) {
    const [name, ...parts] = line.split('=');
    const value = parts.join('=').trim();
    if (['SUPABASE_URL', 'SUPABASE_PUBLISHABLE_KEY', 'SUPABASE_SECRET_KEY', 'SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY', 'DATABASE_URL'].includes(name) && value) {
      fail(`${name} must remain empty in .env.example`);
    }
  }
}

if (!process.exitCode) {
  console.log('ATLAS database package structural validation: PASS');
}
