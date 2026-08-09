'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');

function fail(message) {
  console.error(`ATLAS Device Continuity gate failed: ${message}`);
  process.exit(1);
}

function read(relativePath) {
  const absolute = path.join(root, relativePath);
  if (!fs.existsSync(absolute)) fail(`missing required file: ${relativePath}`);
  return fs.readFileSync(absolute, 'utf8');
}

function requireText(text, expected, label) {
  if (!text.includes(expected)) fail(`${label} is missing required control: ${expected}`);
}

const server = read('atlas-device-identity-server.js');
const client = read('atlas-device-identity.js');
const build = read('scripts/build-cloudflare.js');
const controls = read('governance/atlas-module-constitutional-controls.json');
const packageJson = JSON.parse(read('package.json'));

for (const control of [
  'ATLAS_IDENTITY_PUBLIC_ORIGIN',
  'ATLAS_LOCAL_FACE_VERIFY_URL',
  'ATLAS_LOCAL_FACE_VERIFY_SECRET',
  'normalizeSubjectId',
  'subjectId: item.subjectId',
  'verifier_subject_mismatch',
  "#token=${encodeURIComponent(phoneToken)}",
  'crypto.timingSafeEqual',
  'item.phoneTokenHash = null',
  "if (req.method === 'DELETE' && stateMatch)",
  'tokenMatches(bearerToken(req), item.pollTokenHash)',
  'public_origin_must_use_https',
  'MAX_ACTIVE_PER_SUBJECT'
]) requireText(server, control, 'identity relay');

for (const control of [
  "const subjectId = params.get('subject')",
  'JSON.stringify({ subjectId })',
  'No se permite seleccionar manualmente la identidad',
  "new URLSearchParams(location.hash.slice(1))",
  'history.replaceState',
  'window.isSecureContext',
  "Authorization: `Bearer ${current.pollToken}`"
]) requireText(client, control, 'identity browser client');

requireText(build, "'atlas-device-identity-server.js'", 'Cloudflare build boundary');
for (const asset of ['atlas-device-identity.html', 'atlas-device-identity.js', 'atlas-device-identity-server.js']) {
  requireText(controls, `\"${asset}\"`, 'constitutional identity classification');
}

const checkJs = packageJson.scripts?.['check:js'] || '';
requireText(checkJs, 'node --check atlas-device-identity.js', 'check:js');
requireText(checkJs, 'node --check atlas-device-identity-server.js', 'check:js');

console.log('ATLAS Device Continuity gate passed: subject binding, verifier authentication, liveness, token isolation, cancellation, build boundary and constitutional controls are present.');
