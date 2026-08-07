'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const requiredFiles = [
  'atlas-gps-4d.html',
  'atlas-gps-4d.css',
  'atlas-gps-4d.js',
  'atlas-gps-enterprise.css',
  'atlas-gps-enterprise.js',
  'atlas-gps-ar.js',
  'atlas-gps-ar-worker.js',
  'gps-platform/README.md',
  'gps-platform/docker-compose.yml',
  'gps-platform/api/Dockerfile',
  'gps-platform/api/server.js',
  'gps-platform/api/providers.js',
  'gps-platform/config/modes.json',
  'gps-platform/offline/manifest.json',
  'gps-platform/security/policy.json',
  'gps-platform/native/ios/AtlasNavigationPlugin.swift',
  'gps-platform/native/android/AtlasNavigationPlugin.kt',
  'gps-platform/native/android/AtlasNavigationService.kt',
  'tests/gps-planetary.matrix.json'
];

const failures = [];
const pass = (condition, message) => {
  if (!condition) failures.push(message);
};
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const json = (file) => JSON.parse(read(file));

for (const file of requiredFiles) pass(fs.existsSync(path.join(root, file)), `Missing required GPS file: ${file}`);

if (!failures.length) {
  const modes = json('gps-platform/config/modes.json');
  const manifest = json('gps-platform/offline/manifest.json');
  const security = json('gps-platform/security/policy.json');
  const matrix = json('tests/gps-planetary.matrix.json');
  const html = read('atlas-gps-4d.html');
  const gateway = read('gps-platform/api/server.js');
  const providers = read('gps-platform/api/providers.js');

  const requiredModes = ['car', 'truck', 'transit', 'bicycle', 'walking', 'emergency', 'maritime', 'aviation'];
  for (const mode of requiredModes) pass(Boolean(modes.modes?.[mode]), `Missing routing mode: ${mode}`);

  const continentIds = new Set((manifest.regions || []).filter((region) => region.type === 'continent').map((region) => region.id));
  for (const continent of ['africa', 'antarctica', 'asia', 'europe', 'north-america', 'oceania', 'south-america']) {
    pass(continentIds.has(continent), `Offline manifest missing continent: ${continent}`);
  }
  pass(manifest.coverage === 'planetary', 'Offline manifest must declare planetary coverage');
  pass(manifest.signatureAlgorithm === 'Ed25519', 'Offline packages must use Ed25519 signatures');

  pass(security.defaults?.locationHistory === false, 'Location history must be disabled by default');
  pass(security.defaults?.rawCameraUpload === false, 'Raw camera upload must be disabled by default');
  pass(security.defaults?.crossTenantSharing === false, 'Cross-tenant sharing must be disabled by default');
  pass(security.encryption?.locationAtRest === 'AES-256-GCM', 'Location encryption policy must require AES-256-GCM');
  pass(Array.isArray(security.requiredReleaseGates) && security.requiredReleaseGates.length >= 8, 'Security release gates are incomplete');

  pass((matrix.dimensions?.continents || []).length === 7, 'Planetary test matrix must cover seven continents');
  pass((matrix.dimensions?.scripts || []).length >= 12, 'Planetary test matrix must cover at least twelve writing systems');
  pass((matrix.cases || []).length >= 30, 'Planetary test matrix must include at least thirty cases');
  pass((matrix.cases || []).filter((item) => item.priority === 'critical').length >= 12, 'Planetary test matrix needs at least twelve critical cases');
  for (const mode of requiredModes) pass((matrix.cases || []).some((item) => item.mode === mode), `Test matrix does not exercise mode: ${mode}`);

  for (const asset of ['atlas-gps-enterprise.css', 'atlas-gps-enterprise.js', 'atlas-gps-ar.js']) {
    pass(html.includes(asset), `GPS HTML does not load ${asset}`);
  }
  pass(html.indexOf('atlas-gps-enterprise.js') < html.indexOf('atlas-gps-4d.js'), 'Enterprise gateway adapter must load before core GPS routing');

  for (const endpoint of ['/v1/search', '/v1/route', '/v1/live', '/v1/offline/manifest', '/v1/privacy/purge']) {
    pass(gateway.includes(endpoint), `GPS gateway missing endpoint: ${endpoint}`);
  }
  for (const mode of requiredModes) pass(providers.includes(`${mode}:`), `Provider adapter missing mode: ${mode}`);
}

if (failures.length) {
  console.error('ATLAS GPS platform validation failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`ATLAS GPS platform validation passed (${requiredFiles.length} required files, 9 production layers).`);
