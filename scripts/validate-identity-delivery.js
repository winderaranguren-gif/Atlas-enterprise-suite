#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');

function fail(message) {
  console.error(`IDENTITY DELIVERY VALIDATION FAILED: ${message}`);
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

function requireAll(text, label, needles) {
  needles.forEach((needle) => {
    if (!text.includes(needle)) fail(`${label} is missing: ${needle}`);
  });
}

const invitationIndexes = read('supabase/migrations/202608082300_atlas_identity_invitation_indexes.sql');
const invitationRls = read('supabase/migrations/202608082301_atlas_identity_invitation_rls.sql');
const invitationClient = read('atlas-identity-invitations.js');
const authHtml = read('cloud-auth.html');
const serviceWorker = read('service-worker.js');
const cloudflareBuild = read('scripts/build-cloudflare.js');
const packageJson = read('package.json');

requireAll(invitationIndexes, 'invitation actor indexes', [
  'identity_invitations_invited_by_idx',
  'identity_invitations_accepted_by_idx',
  'commit;'
]);

requireAll(invitationRls, 'invitation deny-all RLS', [
  'create policy identity_invitations_deny_direct',
  'to anon, authenticated',
  'using (false)',
  'with check (false)',
  'Intentional SECURITY DEFINER boundary',
  'commit;'
]);

requireAll(invitationClient, 'invitation browser workflow', [
  "const PENDING_INVITE_KEY = 'atlas.identity.pendingInvitation'",
  'window.sessionStorage.setItem(PENDING_INVITE_KEY',
  'window.history.replaceState',
  'identity.createInvitation',
  'identity.revokeInvitation',
  'identity.acceptInvitation'
]);

if (invitationClient.includes('localStorage.setItem(PENDING_INVITE_KEY')) {
  fail('Invitation tokens must not be persisted in localStorage');
}

requireAll(authHtml, 'cloud-auth delivery', [
  '<script src="atlas-identity.js"></script>',
  '<script src="cloud-auth.js"></script>',
  '<script src="atlas-identity-invitations.js"></script>'
]);

requireAll(serviceWorker, 'service worker Identity boundary', [
  "const VERSION = 'atlas-core-v15-identity-hardening'",
  'const IDENTITY_NETWORK_ONLY = new Set([',
  "'/cloud-auth.html'",
  "'/cloud-auth.js'",
  "'/atlas-config.js'",
  "'/atlas-identity.js'",
  "'/atlas-identity-invitations.js'",
  "fetch(request, { cache: 'no-store' })"
]);

requireAll(cloudflareBuild, 'Cloudflare Identity delivery', [
  '/cloud-auth.js',
  '/atlas-config.js',
  '/atlas-identity.js',
  '/atlas-identity-invitations.js',
  'Cache-Control: no-store, max-age=0',
  "'cloud-auth.html'",
  "'atlas-identity-invitations.js'"
]);

requireAll(packageJson, 'package validation wiring', [
  'node --check atlas-identity-invitations.js',
  'node --check scripts/validate-identity-delivery.js',
  'node scripts/validate-identity-delivery.js'
]);

if (!process.exitCode) console.log('ATLAS Identity delivery validation: PASS');
