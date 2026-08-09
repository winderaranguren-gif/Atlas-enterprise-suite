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

requireText(server, 'ATLAS_IDENTITY_PUBLIC_ORIGIN', 'identity relay');
requireText(server, 'ATLAS_LOCAL_FACE_VERIFY_URL', 'identity relay');
requireText(server, "#token=${encodeURIComponent(phoneToken)}", 'identity relay');
requireText(server, 'crypto.timingSafeEqual', 'identity relay');
requireText(server, "item.phoneTokenHash = null", 'identity relay');
requireText(server, "if (req.method === 'DELETE' && stateMatch)", 'identity relay');
requireText(server, "tokenMatches(token, item.pollTokenHash)", 'identity relay');
requireText(server, "public_origin_must_use_https", 'identity relay');

requireText(client, "new URLSearchParams(location.hash.slice(1))", 'identity browser client');
requireText(client, "history.replaceState", 'identity browser client');
requireText(client, "Authorization: `Bearer ${current.pollToken}`", 'identity browser client');
requireText(client, 'window.isSecureContext', 'identity browser client');

requireText(build, "'atlas-device-identity-server.js'", 'Cloudflare build boundary');
for (const asset of [
  'atlas-device-identity.html',
  'atlas-device-identity.js',
  'atlas-device-identity-server.js'
]) {
  requireText(controls, `\"${asset}\"`, 'constitutional identity classification');
}

const checkJs = packageJson.scripts?.['check:js'] || '';
requireText(checkJs, 'node --check atlas-device-identity.js', 'check:js');
requireText(checkJs, 'node --check atlas-device-identity-server.js', 'check:js');

console.log('ATLAS Device Continuity gate passed: secure-origin, token, cancellation, build-boundary and constitutional controls are present.');
