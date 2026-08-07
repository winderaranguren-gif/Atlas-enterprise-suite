'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const matrixPath = path.join(root, 'gps-platform/activation/production-resources.json');
const evidencePath = process.env.ATLAS_GPS_EVIDENCE_FILE
  ? path.resolve(process.env.ATLAS_GPS_EVIDENCE_FILE)
  : path.join(root, 'gps-platform/activation/evidence.local.json');
const asJson = process.argv.includes('--json');

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

const matrix = readJson(matrixPath);
const evidence = fs.existsSync(evidencePath) ? readJson(evidencePath) : { resources: {} };
const envRequirements = {
  'infra.compute': ['ATLAS_GPS_CLUSTER_CONTEXT'],
  'infra.storage': ['ATLAS_GPS_BACKUP_BUCKET'],
  'maps.planet': ['ATLAS_OSM_PBF_URL', 'ATLAS_OSM_PBF_SHA256'],
  'domain.production': ['CLOUDFLARE_ZONE_ID', 'ATLAS_GPS_DOMAIN'],
  'feeds.live': ['ATLAS_TRAFFIC_URL', 'ATLAS_WEATHER_URL'],
  'data.maritime': ['ATLAS_MARITIME_URL'],
  'data.aviation': ['ATLAS_AVIATION_URL'],
  'approval.carplay': ['ATLAS_CARPLAY_APPROVAL_ID'],
  'approval.android_cars': ['ATLAS_ANDROID_CARS_APPROVAL_ID'],
  'models.vision': ['ATLAS_VISION_MODEL_REGISTRY'],
  'tests.field': ['ATLAS_FIELD_TEST_RELEASE_ID']
};

const report = matrix.resources.map((resource) => {
  const requiredEnv = envRequirements[resource.id] || [];
  const missingEnv = requiredEnv.filter((name) => !process.env[name]);
  const record = evidence.resources?.[resource.id] || {};
  const submittedEvidence = Array.isArray(record.evidence) ? record.evidence : [];
  const missingEvidence = resource.evidence.filter((item) => !submittedEvidence.includes(item));
  const approved = record.approved === true;
  return {
    id: resource.id,
    name: resource.name,
    approved,
    missingEnv,
    missingEvidence,
    ready: approved && missingEnv.length === 0 && missingEvidence.length === 0
  };
});

const ready = report.every((item) => item.ready);
const output = {
  product: matrix.product,
  releasePolicy: matrix.releasePolicy,
  generatedAt: new Date().toISOString(),
  ready,
  passed: report.filter((item) => item.ready).length,
  total: report.length,
  resources: report
};

if (asJson) {
  console.log(JSON.stringify(output, null, 2));
} else {
  console.log(`${output.product} production readiness: ${output.passed}/${output.total}`);
  for (const item of report) {
    console.log(`${item.ready ? 'PASS' : 'BLOCK'} ${item.id} — ${item.name}`);
    if (item.missingEnv.length) console.log(`  missing environment: ${item.missingEnv.join(', ')}`);
    if (item.missingEvidence.length) console.log(`  missing evidence: ${item.missingEvidence.join('; ')}`);
    if (!item.approved) console.log('  approval: not recorded');
  }
}

if (!ready) process.exitCode = 2;
