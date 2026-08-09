#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');

const paths = {
  foundation: 'supabase/migrations/202608082250_atlas_identity_foundation.sql',
  auditHardening: 'supabase/migrations/202608082251_atlas_identity_audit_hardening.sql',
  invokerHardening: 'supabase/migrations/202608082252_atlas_identity_invoker_hardening.sql',
  indexes: 'supabase/migrations/202608082253_atlas_identity_indexes.sql',
  mfaStepup: 'supabase/migrations/202608082254_atlas_identity_mfa_stepup.sql',
  memberAdmin: 'supabase/migrations/202608082255_atlas_identity_member_admin.sql',
  hierarchy: 'supabase/migrations/202608082256_atlas_identity_hierarchy_locking.sql',
  memberIndexes: 'supabase/migrations/202608082257_atlas_identity_member_indexes.sql',
  invitations: 'supabase/migrations/202608082258_atlas_identity_invitations.sql',
  invitationConfirmation: 'supabase/migrations/202608082259_atlas_identity_invitation_confirmation.sql',
  client: 'atlas-identity.js',
  invitationClient: 'atlas-identity-invitations.js',
  authHtml: 'cloud-auth.html',
  authClient: 'cloud-auth.js',
  config: 'atlas-config.js',
  package: 'package.json'
};

function fail(message) {
  console.error(`IDENTITY VALIDATION FAILED: ${message}`);
  process.exitCode = 1;
}

function read(relativePath) {
  const filePath = path.join(root, relativePath);
  if (!fs.existsSync(filePath)) {
    fail(`Missing ${relativePath}`);
    return '';
  }
  return fs.readFileSync(filePath, 'utf8');
}

function mustInclude(text, needle, label) {
  if (!text.includes(needle)) fail(`${label} is missing: ${needle}`);
}

function mustNotInclude(text, needle, label) {
  if (text.includes(needle)) fail(`${label} must not contain: ${needle}`);
}

function requireAll(text, label, needles) {
  needles.forEach((needle) => mustInclude(text, needle, label));
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

const files = Object.fromEntries(Object.entries(paths).map(([key, relativePath]) => [key, read(relativePath)]));

[
  ['foundation', 'identity foundation migration'],
  ['auditHardening', 'identity audit hardening migration'],
  ['invokerHardening', 'identity invoker hardening migration'],
  ['indexes', 'identity index migration'],
  ['mfaStepup', 'identity MFA step-up migration'],
  ['memberAdmin', 'identity member administration migration'],
  ['hierarchy', 'identity hierarchy locking migration'],
  ['memberIndexes', 'identity member index migration'],
  ['invitations', 'identity invitation migration'],
  ['invitationConfirmation', 'identity invitation confirmation migration']
].forEach(([key, label]) => {
  if (files[key]) balancedSql(files[key], label);
});

requireAll(files.foundation, 'identity foundation', [
  'create table if not exists public.identity_permissions',
  'create table if not exists public.organization_role_permissions',
  'create table if not exists public.identity_security_events',
  'create or replace function public.has_identity_permission',
  'create or replace function public.get_identity_context',
  'create or replace function public.set_identity_role_permission',
  'revoke execute on function public.get_identity_context() from public, anon',
  'commit;'
]);

requireAll(files.auditHardening, 'identity audit hardening', [
  'drop policy if exists organization_role_permissions_manage',
  'revoke insert, update, delete on public.organization_role_permissions from authenticated',
  'commit;'
]);

requireAll(files.invokerHardening, 'identity invoker hardening', [
  'alter function public.has_identity_permission(uuid, text) security invoker',
  'alter function public.get_identity_context() security invoker',
  'commit;'
]);

requireAll(files.indexes, 'identity indexes', [
  'identity_role_permissions_permission_code_idx',
  'identity_security_events_org_created_idx',
  'identity_security_events_actor_user_id_idx',
  'organization_role_permissions_permission_code_idx',
  'organization_role_permissions_updated_by_idx',
  'commit;'
]);

requireAll(files.mfaStepup, 'identity MFA step-up', [
  "coalesce(auth.jwt() ->> 'aal', 'aal1') <> 'aal2'",
  'Identity administration permission required',
  "'aal', coalesce(auth.jwt() ->> 'aal', 'aal1')",
  'revoke execute on function public.set_identity_role_permission(uuid,text,text,boolean) from public, anon',
  'grant execute on function public.set_identity_role_permission(uuid,text,text,boolean) to authenticated',
  'commit;'
]);

requireAll(files.memberAdmin, 'identity member administration', [
  'create or replace function public.list_identity_members',
  'create or replace function public.set_identity_member_role',
  'create or replace function public.set_identity_member_status',
  'drop policy if exists member_manage on public.organization_members',
  'revoke insert, update, delete on public.organization_members from authenticated',
  'The organization must retain at least one active owner',
  'commit;'
]);

requireAll(files.hierarchy, 'identity hierarchy hardening', [
  "has_identity_permission(organization_id, 'identity.manage')",
  "has_identity_permission(organization_id, 'members.manage')",
  "actor_role = 'admin' and target_role in ('owner','admin')",
  'Owner identity.manage permission cannot be denied',
  'pg_advisory_xact_lock',
  'The organization must retain at least one active owner',
  'commit;'
]);

requireAll(files.memberIndexes, 'identity membership indexes', [
  'organization_members_user_id_idx',
  'organization_members_org_role_status_idx',
  'commit;'
]);

requireAll(files.invitations, 'identity invitation lifecycle', [
  'create table if not exists public.identity_invitations',
  'token_hash bytea not null unique',
  "role text not null check (role in ('admin','accountant','manager','staff','viewer'))",
  "extensions.gen_random_bytes(32)",
  "extensions.digest(raw_token, 'sha256')",
  "coalesce(auth.jwt() ->> 'aal', 'aal1') <> 'aal2'",
  'Only an owner can invite an admin',
  'This account is already a member of the organization',
  'revoke all on public.identity_invitations from anon, authenticated',
  'create or replace function public.create_identity_invitation',
  'create or replace function public.list_identity_invitations',
  'create or replace function public.revoke_identity_invitation',
  'create or replace function public.accept_identity_invitation',
  'grant execute on function public.accept_identity_invitation(text) to authenticated',
  'commit;'
]);

requireAll(files.invitationConfirmation, 'identity invitation email confirmation', [
  'email_confirmed_at',
  'A confirmed email is required to accept an invitation',
  'Invitation email does not match the authenticated account',
  'Invitation has expired',
  'Membership already exists for this account',
  'revoke execute on function public.accept_identity_invitation(text) from public, anon',
  'grant execute on function public.accept_identity_invitation(text) to authenticated',
  'commit;'
]);

requireAll(files.client, 'ATLAS Identity browser API', [
  'window.ATLAS_IDENTITY',
  'function connect(supabaseClient)',
  'function clear()',
  "client.rpc('get_identity_context')",
  "client.rpc('set_identity_role_permission'",
  "client.rpc('list_identity_members'",
  "client.rpc('set_identity_member_role'",
  "client.rpc('set_identity_member_status'",
  "client.rpc('list_identity_invitations'",
  "client.rpc('create_identity_invitation'",
  "client.rpc('revoke_identity_invitation'",
  "client.rpc('accept_identity_invitation'",
  'getAuthenticatorAssuranceLevel',
  'enrollTotp',
  'challengeAndVerifyFactor',
  'requireAal2',
  'signInWithProvider'
]);

requireAll(files.invitationClient, 'ATLAS Identity invitation browser workflow', [
  "const PENDING_INVITE_KEY = 'atlas.identity.pendingInvitation'",
  'window.sessionStorage.setItem(PENDING_INVITE_KEY',
  'window.sessionStorage.getItem(PENDING_INVITE_KEY)',
  'window.history.replaceState',
  '/^[a-f0-9]{64}$/i',
  'identity.createInvitation',
  'identity.listInvitations',
  'identity.revokeInvitation',
  'identity.acceptInvitation',
  'base.hash = new URLSearchParams({ invite: token }).toString()',
  'atlas:identity-context-cleared'
]);
mustNotInclude(files.invitationClient, 'localStorage.setItem(PENDING_INVITE_KEY', 'invitation token persistence');

requireAll(files.authHtml, 'cloud-auth identity surface', [
  '<script src="atlas-identity.js"></script>',
  '<script src="atlas-identity-invitations.js"></script>',
  'id="federated-signin"',
  'id="mfa-section"',
  'id="member-admin-section"',
  'id="pending-invite-section"',
  'id="invitation-form"',
  'id="invitation-list"'
]);

requireAll(files.authClient, 'cloud-auth controller', [
  'identity.connect(state.client)',
  'identity.signInWithProvider',
  'identity.getMfaState()',
  'identity.enrollTotp',
  'identity.challengeAndVerifyFactor',
  'identity.listMembers',
  'identity.setMemberRole',
  'identity.setMemberStatus',
  'data-org-select',
  'identity?.clear()'
]);

requireAll(files.config, 'ATLAS browser configuration', [
  "provider: 'custom:authentik'",
  'enabled: false',
  "scopes: 'openid profile email'"
]);

mustInclude(files.package, 'node --check atlas-identity-invitations.js', 'package JS validation');

const privilegedSecretPattern = /(sb_secret_[A-Za-z0-9_-]+)|(SUPABASE_SERVICE_ROLE_KEY\s*=\s*[^\s#]+)|(SUPABASE_SECRET_KEY\s*=\s*[^\s#]+)|(AUTHENTIK_CLIENT_SECRET\s*=\s*[^\s#]+)/i;
const browserSurface = [files.config, files.client, files.invitationClient, files.authClient, files.authHtml].join('\n');
if (privilegedSecretPattern.test(browserSurface)) fail('Browser Identity surface appears to contain a privileged credential');

if (!process.exitCode) console.log('ATLAS Identity structural validation: PASS');
