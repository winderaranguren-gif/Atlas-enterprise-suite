#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const foundationPath = path.join(root, 'supabase/migrations/202608082250_atlas_identity_foundation.sql');
const hardeningPath = path.join(root, 'supabase/migrations/202608082251_atlas_identity_audit_hardening.sql');
const invokerHardeningPath = path.join(root, 'supabase/migrations/202608082252_atlas_identity_invoker_hardening.sql');
const indexesPath = path.join(root, 'supabase/migrations/202608082253_atlas_identity_indexes.sql');
const mfaStepupPath = path.join(root, 'supabase/migrations/202608082254_atlas_identity_mfa_stepup.sql');
const memberAdminPath = path.join(root, 'supabase/migrations/202608082255_atlas_identity_member_admin.sql');
const hierarchyPath = path.join(root, 'supabase/migrations/202608082256_atlas_identity_hierarchy_locking.sql');
const memberIndexesPath = path.join(root, 'supabase/migrations/202608082257_atlas_identity_member_indexes.sql');
const clientPath = path.join(root, 'atlas-identity.js');
const authHtmlPath = path.join(root, 'cloud-auth.html');
const authClientPath = path.join(root, 'cloud-auth.js');
const configPath = path.join(root, 'atlas-config.js');

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
const invokerHardening = read(invokerHardeningPath);
const indexes = read(indexesPath);
const mfaStepup = read(mfaStepupPath);
const memberAdmin = read(memberAdminPath);
const hierarchy = read(hierarchyPath);
const memberIndexes = read(memberIndexesPath);
const client = read(clientPath);
const authHtml = read(authHtmlPath);
const authClient = read(authClientPath);
const config = read(configPath);

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

if (invokerHardening) {
  balancedSql(invokerHardening, 'identity invoker hardening migration');
  mustInclude(invokerHardening, 'alter function public.has_identity_permission(uuid, text) security invoker', 'permission helper invoker mode');
  mustInclude(invokerHardening, 'alter function public.get_identity_context() security invoker', 'identity context invoker mode');
  mustInclude(invokerHardening, 'set_identity_role_permission', 'intentional privileged mutation note');
  mustInclude(invokerHardening, 'commit;', 'identity invoker hardening transaction');
}

if (indexes) {
  balancedSql(indexes, 'identity index migration');
  mustInclude(indexes, 'identity_role_permissions_permission_code_idx', 'role permission foreign-key index');
  mustInclude(indexes, 'identity_security_events_org_created_idx', 'security events organization index');
  mustInclude(indexes, 'identity_security_events_actor_user_id_idx', 'security events actor index');
  mustInclude(indexes, 'organization_role_permissions_permission_code_idx', 'override permission index');
  mustInclude(indexes, 'organization_role_permissions_updated_by_idx', 'override updater index');
  mustInclude(indexes, 'commit;', 'identity index transaction');
}

if (mfaStepup) {
  balancedSql(mfaStepup, 'identity MFA step-up migration');
  mustInclude(mfaStepup, "coalesce(auth.jwt() ->> 'aal', 'aal1') <> 'aal2'", 'AAL2 backend guard');
  mustInclude(mfaStepup, 'Identity administration permission required', 'owner/admin authorization guard');
  mustInclude(mfaStepup, "'aal', coalesce(auth.jwt() ->> 'aal', 'aal1')", 'audited AAL metadata');
  mustInclude(mfaStepup, 'revoke execute on function public.set_identity_role_permission(uuid,text,text,boolean) from public, anon', 'MFA RPC anonymous revoke');
  mustInclude(mfaStepup, 'grant execute on function public.set_identity_role_permission(uuid,text,text,boolean) to authenticated', 'MFA RPC authenticated grant');
  mustInclude(mfaStepup, 'commit;', 'identity MFA step-up transaction');
}

if (memberAdmin) {
  balancedSql(memberAdmin, 'identity member administration migration');
  mustInclude(memberAdmin, 'create or replace function public.list_identity_members', 'member listing RPC');
  mustInclude(memberAdmin, 'create or replace function public.set_identity_member_role', 'member role RPC');
  mustInclude(memberAdmin, 'create or replace function public.set_identity_member_status', 'member status RPC');
  mustInclude(memberAdmin, "coalesce(auth.jwt() ->> 'aal', 'aal1') <> 'aal2'", 'member administration AAL2 guard');
  mustInclude(memberAdmin, "actor_role = 'admin'", 'admin hierarchy restriction');
  mustInclude(memberAdmin, 'The organization must retain at least one active owner', 'last-owner protection');
  mustInclude(memberAdmin, 'drop policy if exists member_manage on public.organization_members', 'direct member mutation policy removal');
  mustInclude(memberAdmin, 'revoke insert, update, delete on public.organization_members from authenticated', 'direct member mutation revoke');
  mustInclude(memberAdmin, 'grant execute on function public.list_identity_members(uuid) to authenticated', 'member listing RPC grant');
  mustInclude(memberAdmin, 'commit;', 'identity member administration transaction');
}

if (hierarchy) {
  balancedSql(hierarchy, 'identity hierarchy locking migration');
  mustInclude(hierarchy, "has_identity_permission(organization_id, 'identity.manage')", 'effective identity.manage enforcement');
  mustInclude(hierarchy, "has_identity_permission(organization_id, 'members.manage')", 'effective members.manage enforcement');
  mustInclude(hierarchy, "actor_role = 'admin' and target_role in ('owner','admin')", 'admin permission hierarchy protection');
  mustInclude(hierarchy, 'Owner identity.manage permission cannot be denied', 'owner identity administration protection');
  mustInclude(hierarchy, 'pg_advisory_xact_lock', 'organization concurrency lock');
  mustInclude(hierarchy, 'The organization must retain at least one active owner', 'concurrent last-owner protection');
  mustInclude(hierarchy, 'commit;', 'identity hierarchy transaction');
}

if (memberIndexes) {
  balancedSql(memberIndexes, 'identity member index migration');
  mustInclude(memberIndexes, 'organization_members_user_id_idx', 'user-to-organization identity context index');
  mustInclude(memberIndexes, 'organization_members_org_role_status_idx', 'owner hierarchy lookup index');
  mustInclude(memberIndexes, 'commit;', 'identity member index transaction');
}

if (client) {
  mustInclude(client, 'window.ATLAS_IDENTITY', 'browser identity API');
  mustInclude(client, 'function connect(supabaseClient)', 'pre-session identity connection');
  mustInclude(client, 'function clear()', 'logout context clearing');
  mustInclude(client, "client.rpc('get_identity_context')", 'identity context client');
  mustInclude(client, "client.rpc('set_identity_role_permission'", 'audited permission client');
  mustInclude(client, "client.rpc('list_identity_members'", 'member listing client');
  mustInclude(client, "client.rpc('set_identity_member_role'", 'member role client');
  mustInclude(client, "client.rpc('set_identity_member_status'", 'member status client');
  mustInclude(client, 'getAuthenticatorAssuranceLevel', 'MFA assurance surface');
  mustInclude(client, 'listFactors', 'MFA factor discovery');
  mustInclude(client, 'enrollTotp', 'TOTP enrollment surface');
  mustInclude(client, 'challengeAndVerifyFactor', 'MFA challenge verification surface');
  mustInclude(client, 'unenrollFactor', 'MFA factor removal surface');
  mustInclude(client, 'requireAal2', 'client-side AAL2 gate');
  mustInclude(client, 'await requireAal2();', 'sensitive mutation step-up gate');
  mustInclude(client, 'signInWithProvider', 'federated sign-in surface');
}

if (authHtml) {
  mustInclude(authHtml, '<script src="atlas-identity.js"></script>', 'cloud-auth identity loader');
  mustInclude(authHtml, 'id="federated-signin"', 'federated sign-in control');
  mustInclude(authHtml, 'id="mfa-section"', 'MFA account security panel');
  mustInclude(authHtml, 'id="mfa-enroll-button"', 'MFA enrollment control');
  mustInclude(authHtml, 'id="mfa-stepup-panel"', 'MFA step-up panel');
  mustInclude(authHtml, 'id="member-admin-section"', 'member administration panel');
  mustInclude(authHtml, 'id="member-list"', 'member list surface');
}

if (authClient) {
  mustInclude(authClient, 'identity.connect(state.client)', 'single Supabase client binding');
  mustInclude(authClient, 'identity.signInWithProvider', 'federated redirect wiring');
  mustInclude(authClient, 'identity.getMfaState()', 'MFA state rendering');
  mustInclude(authClient, 'identity.enrollTotp', 'MFA enrollment wiring');
  mustInclude(authClient, 'identity.challengeAndVerifyFactor', 'MFA verification wiring');
  mustInclude(authClient, 'identity.listMembers', 'member list wiring');
  mustInclude(authClient, 'identity.setMemberRole', 'member role wiring');
  mustInclude(authClient, 'identity.setMemberStatus', 'member status wiring');
  mustInclude(authClient, 'data-org-select', 'active organization selector');
  mustInclude(authClient, 'identity?.clear()', 'session context cleanup');
}

if (config) {
  mustInclude(config, "provider: 'custom:authentik'", 'Authentik custom provider identifier');
  mustInclude(config, 'enabled: false', 'safe default federation switch');
  mustInclude(config, "scopes: 'openid profile email'", 'OIDC scopes');

  const forbiddenBrowserSecret = /(clientSecret|client_secret|AUTHENTIK_CLIENT_SECRET)\s*[:=]\s*['\"][^'\"]+['\"]/i;
  if (forbiddenBrowserSecret.test(config)) fail('Browser configuration appears to contain a federated provider client secret');
}

if (!process.exitCode) console.log('ATLAS Identity structural validation: PASS');
