#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const foundationPath = path.join(root, 'supabase/migrations/202608082250_atlas_identity_foundation.sql');
const hardeningPath = path.join(root, 'supabase/migrations/202608082251_atlas_identity_audit_hardening.sql');
const clientPath = path.join(root, 'atlas-identity.js');
const authHtmlPath = path.join(root, 'cloud-auth.html');

function fail(message) {
  console.error(`IDENTITY VALIDATION FAILED: ${message}`);
  process.exitCode = 1;
}

function read(filePath) {
  if (!fs.existsSync(filePath)) {
    fail(`Missing ${path.relative(root, filePath)}`);
    return '';
  }
  return fs.readFileSync(filePath, 'utf8');
}

function mustInclude(text, needle, label) {
  if (!text.includes(needle)) fail(`${label} is missing: ${needle}`);
}

function balancedSql(text, label) {
  let state = 'normal';
  let dollarTag = '';
  let parens = 0;

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    const two = text.slice(i, i + 2);

    if (state === 'line-comment') {
      if (ch === '\n') state = 'normal';
      continue;
    }
    if (state === 'single-quote') {
      if (two === "''") { i += 1; continue; }
      if (ch === "'") state = 'normal';
      continue;
    }
    if (state === 'dollar-quote') {
      if (text.startsWith(dollarTag, i)) {
        i += dollarTag.length - 1;
        state = 'normal';
      }
      continue;
    }

    if (two === '--') { state = 'line-comment'; i += 1; continue; }
    if (ch === "'") { state = 'single-quote'; continue; }
    if (ch === '$') {
      const match = text.slice(i).match(/^\$[A-Za-z_][A-Za-z0-9_]*\$|^\$\$/);
      if (match) {
        dollarTag = match[0];
        state = 'dollar-quote';
        i += dollarTag.length - 1;
        continue;
      }
    }
    if (ch === '(') parens += 1;
    if (ch === ')') parens -= 1;
    if (parens < 0) fail(`${label} has an unmatched closing parenthesis`);
  }

  if (state !== 'normal' && state !== 'line-comment') fail(`${label} ends inside ${state}`);
  if (parens !== 0) fail(`${label} has ${parens} unmatched parenthesis level(s)`);
}

const foundation = read(foundationPath);
const hardening = read(hardeningPath);
const client = read(clientPath);
const authHtml = read(authHtmlPath);

if (foundation) {
  balancedSql(foundation, 'identity foundation migration');
  mustInclude(foundation, 'create table if not exists public.identity_permissions', 'permission catalog');
  mustInclude(foundation, 'create table if not exists public.organization_role_permissions', 'organization overrides');
  mustInclude(foundation, 'create table if not exists public.identity_security_events', 'security event table');
  mustInclude(foundation, 'create or replace function public.has_identity_permission', 'permission helper');
  mustInclude(foundation, 'create or replace function public.get_identity_context', 'identity context RPC');
  mustInclude(foundation, 'create or replace function public.set_identity_role_permission', 'audited policy RPC');
  mustInclude(foundation, 'revoke execute on function public.get_identity_context() from public, anon', 'RPC privilege hardening');
  mustInclude(foundation, 'commit;', 'identity foundation transaction');

  const secretPattern = /(sb_secret_[A-Za-z0-9_-]+)|(SUPABASE_SERVICE_ROLE_KEY\s*=\s*[^\s#]+)|(SUPABASE_SECRET_KEY\s*=\s*[^\s#]+)/;
  if (secretPattern.test(foundation)) fail('Identity foundation appears to contain a privileged credential');
}

if (hardening) {
  balancedSql(hardening, 'identity audit hardening migration');
  mustInclude(hardening, 'drop policy if exists organization_role_permissions_manage', 'direct policy removal');
  mustInclude(hardening, 'revoke insert, update, delete on public.organization_role_permissions from authenticated', 'direct mutation revoke');
  mustInclude(hardening, 'commit;', 'identity hardening transaction');
}

if (client) {
  mustInclude(client, 'window.ATLAS_IDENTITY', 'browser identity API');
  mustInclude(client, "client.rpc('get_identity_context')", 'identity context client');
  mustInclude(client, "client.rpc('set_identity_role_permission'", 'audited permission client');
  mustInclude(client, 'getAuthenticatorAssuranceLevel', 'MFA assurance surface');
}

if (authHtml) {
  mustInclude(authHtml, '<script src="atlas-identity.js"></script>', 'cloud-auth identity loader');
}

if (!process.exitCode) console.log('ATLAS Identity structural validation: PASS');
