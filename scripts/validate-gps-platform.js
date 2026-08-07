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
  'gps-platform/.env.example',
  'gps-platform/api/Dockerfile',
  'gps-platform/api/server.js',
  'gps-platform/api/providers.js',
  'gps-platform/config/modes.json',
  'gps-platform/database/001_lane_intelligence.sql',
  'gps-platform/import/import-region.sh',
  'gps-platform/offline/manifest.json',
  'gps-platform/offline/build-region.sh',
  'gps-platform/security/policy.json',
  'gps-platform/native/README.md',
  'gps-platform/native/ios/AtlasNavigationPlugin.swift',
  'gps-platform/native/ios/AtlasCarPlaySceneDelegate.swift',
  'gps-platform/native/ios/Info.plist.fragment.xml',
  'gps-platform/native/android/AtlasNavigationPlugin.kt',
  'gps-platform/native/android/AtlasNavigationService.kt',
  'gps-platform/native/android/AtlasCarAppService.kt',
  'gps-platform/native/android/AtlasCarSession.kt',
  'gps-platform/native/android/AtlasNavigationScreen.kt',
  'gps-platform/native/android/AndroidManifest.fragment.xml',
  'gps-platform/native/android/res/xml/automotive_app_desc.xml',
  'gps-platform/native/android/res/values/atlas_car_hosts.xml',
  'gps-platform/activation/README.md',
  'gps-platform/activation/production-resources.json',
  'gps-platform/infrastructure/cloudflare/provision-dns.mjs',
  'gps-platform/infrastructure/kubernetes/atlas-gps-production.yaml',
  'gps-platform/data/official-sources.json',
  'gps-platform/approvals/carplay-entitlement-package.md',
  'gps-platform/approvals/android-for-cars-release-package.md',
  'gps-platform/ar/model-pipeline.md',
  'gps-platform/field-tests/global-road-test-protocol.md',
  'scripts/gps-production-readiness.js',
  'scripts/test-gps-gateway.js',
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
  const activation = json('gps-platform/activation/production-resources.json');
  const officialSources = json('gps-platform/data/official-sources.json');
  const html = read('atlas-gps-4d.html');
  const gateway = read('gps-platform/api/server.js');
  const providers = read('gps-platform/api/providers.js');
  const laneSchema = read('gps-platform/database/001_lane_intelligence.sql');
  const compose = read('gps-platform/docker-compose.yml');
  const offlineBuilder = read('gps-platform/offline/build-region.sh');
  const carPlay = read('gps-platform/native/ios/AtlasCarPlaySceneDelegate.swift');
  const androidAuto = read('gps-platform/native/android/AtlasNavigationScreen.kt');
  const androidManifest = read('gps-platform/native/android/AndroidManifest.fragment.xml');
  const cloudflare = read('gps-platform/infrastructure/cloudflare/provision-dns.mjs');
  const kubernetes = read('gps-platform/infrastructure/kubernetes/atlas-gps-production.yaml');
  const carPlayPackage = read('gps-platform/approvals/carplay-entitlement-package.md');
  const androidPackage = read('gps-platform/approvals/android-for-cars-release-package.md');
  const modelPipeline = read('gps-platform/ar/model-pipeline.md');
  const fieldProtocol = read('gps-platform/field-tests/global-road-test-protocol.md');

  const requiredModes = ['car', 'truck', 'transit', 'bicycle', 'walking', 'emergency', 'maritime', 'aviation'];
  for (const mode of requiredModes) pass(Boolean(modes.modes?.[mode]), `Missing routing mode: ${mode}`);

  const continentIds = new Set((manifest.regions || []).filter((region) => region.type === 'continent').map((region) => region.id));
  for (const continent of ['africa', 'antarctica', 'asia', 'europe', 'north-america', 'oceania', 'south-america']) {
    pass(continentIds.has(continent), `Offline manifest missing continent: ${continent}`);
  }
  pass(manifest.coverage === 'planetary', 'Offline manifest must declare planetary coverage');
  pass(manifest.signatureAlgorithm === 'Ed25519', 'Offline packages must use Ed25519 signatures');
  pass(offlineBuilder.includes('openssl pkeyutl -sign'), 'Offline package builder must sign packages');
  pass(offlineBuilder.includes('sha256sum'), 'Offline package builder must calculate a checksum');

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

  for (const table of ['road_segments', 'lanes', 'lane_connectivity', 'traffic_signs', 'speed_limits', 'interchanges', 'dynamic_road_events']) {
    pass(laneSchema.includes(`atlas_gps.${table}`), `Lane intelligence schema missing table: ${table}`);
  }
  for (const service of ['gps-gateway:', 'postgis:', 'redis:', 'minio:', 'martin:', 'valhalla:', 'nominatim:']) {
    pass(compose.includes(service), `Global Map Cloud compose missing service: ${service.replace(':', '')}`);
  }

  pass(carPlay.includes('CPMapTemplate'), 'CarPlay implementation must use CPMapTemplate');
  pass(carPlay.includes('startNavigationSession'), 'CarPlay implementation must start a navigation session');
  pass(androidAuto.includes('NavigationTemplate'), 'Android Auto implementation must use NavigationTemplate');
  pass(androidManifest.includes('androidx.car.app.category.NAVIGATION'), 'Android manifest must declare the navigation car-app category');

  pass(Array.isArray(activation.resources) && activation.resources.length >= 11, 'Production activation matrix is incomplete');
  for (const id of ['infra.compute', 'infra.storage', 'maps.planet', 'domain.production', 'feeds.live', 'data.maritime', 'data.aviation', 'approval.carplay', 'approval.android_cars', 'models.vision', 'tests.field']) {
    pass(activation.resources.some((item) => item.id === id), `Activation matrix missing resource: ${id}`);
  }
  pass((officialSources.sources || []).some((item) => item.id === 'osm-planet'), 'Official source registry missing OSM planet');
  pass((officialSources.sources || []).some((item) => item.id === 'noaa-enc-us'), 'Official source registry missing NOAA ENC');
  pass((officialSources.sources || []).some((item) => item.id === 'faa-aeronautical-data-us'), 'Official source registry missing FAA aeronautical data');

  pass(cloudflare.includes('/dns_records'), 'Cloudflare provisioning must manage DNS records');
  pass(cloudflare.includes('/dnssec'), 'Cloudflare provisioning must request DNSSEC');
  pass(cloudflare.includes("setZoneSetting('ssl', 'strict')"), 'Cloudflare provisioning must enforce strict TLS');
  pass(kubernetes.includes('kind: StatefulSet'), 'Kubernetes production topology must include stateful workloads');
  pass(kubernetes.includes('kind: HorizontalPodAutoscaler'), 'Kubernetes production topology must include autoscaling');
  pass(kubernetes.includes('kind: PodDisruptionBudget'), 'Kubernetes production topology must include disruption controls');

  pass(carPlayPackage.includes('CarPlay Entitlement Addendum'), 'CarPlay package must cover the entitlement addendum');
  pass(carPlayPackage.includes('Managed capability'), 'CarPlay package must require managed capability evidence');
  pass(androidPackage.includes('Desktop Head Unit'), 'Android for Cars package must include DHU testing');
  pass(androidPackage.includes('Android Automotive OS'), 'Android for Cars package must include AAOS testing');
  pass(modelPipeline.includes('signature.ed25519'), 'Model pipeline must require signed model artifacts');
  pass(modelPipeline.includes('independent safety review'), 'Model pipeline must require independent safety review');
  pass(fieldProtocol.includes('stop-work'), 'Field-test protocol must include stop-work authority');
  pass(fieldProtocol.includes('Zero unresolved critical safety defects'), 'Field-test protocol must block unresolved critical safety defects');
}

if (failures.length) {
  console.error('ATLAS GPS platform validation failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`ATLAS GPS platform validation passed (${requiredFiles.length} required files, 9 production layers, activation controls included).`);
