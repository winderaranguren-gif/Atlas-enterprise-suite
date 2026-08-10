const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const root = path.resolve(__dirname, '..');
const policyPath = path.join(root, 'governance', 'atlas-constitutional-policy.json');
const baselinePath = path.join(root, 'governance', 'atlas-constitutional-baseline-v1.1.json');
const amendmentsPath = path.join(root, 'governance', 'atlas-constitutional-amendments.json');
const EXPECTED_BASELINE_SHA256 = '23a9982ed02dcca2383fc38ad31dbf17c32466a4c0307b502a9ae5bf2c18a893';

function fail(message) {
  console.error(`ATLAS constitutional gate failed: ${message}`);
  process.exit(1);
}

function readJson(filePath, label) {
  if (!fs.existsSync(filePath)) fail(`${label} is missing`);
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    fail(`${label} JSON is invalid: ${error.message}`);
  }
}

function same(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

const policy = readJson(policyPath, 'machine-readable policy');
const baselineBytes = fs.existsSync(baselinePath) ? fs.readFileSync(baselinePath) : null;
if (!baselineBytes) fail('pinned constitutional baseline is missing');
const baselineHash = crypto.createHash('sha256').update(baselineBytes).digest('hex');
if (baselineHash !== EXPECTED_BASELINE_SHA256) {
  fail('pinned constitutional baseline hash changed; create a reviewed amendment instead of silently replacing the baseline');
}
const baseline = readJson(baselinePath, 'pinned constitutional baseline');
const amendments = readJson(amendmentsPath, 'constitutional amendment ledger');

if (policy.status !== 'canonical') fail('policy status must remain canonical');
if (policy.changePolicy !== 'no-silent-amendments') fail('no-silent-amendments policy is missing');
if (policy.version !== baseline.version) fail('policy version must match the pinned constitutional baseline');

for (const field of [
  'protectedDomains',
  'requiredSections',
  'immutableRules',
  'christianInterpretationSafeguards',
  'autonomousSystemRules'
]) {
  if (!same(policy[field], baseline[field])) {
    fail(`${field} differs from the pinned constitutional baseline`);
  }
}

const requiredAmendmentFields = [
  'version',
  'initiator',
  'reason',
  'date',
  'diff',
  'impact-assessment',
  'rollback-record',
  'independent-review-for-high-impact-changes'
];
for (const field of requiredAmendmentFields) {
  if (!(policy.amendmentRequirements || []).includes(field)) {
    fail(`amendment safeguard missing from policy: ${field}`);
  }
}

const matchingAmendment = (amendments.amendments || []).find(entry => entry.version === policy.version);
if (!matchingAmendment) fail(`no amendment/adoption ledger entry exists for constitutional version ${policy.version}`);

for (const field of requiredAmendmentFields) {
  const value = matchingAmendment[field];
  if (typeof value !== 'string' || !value.trim()) {
    fail(`constitutional ledger entry ${policy.version} is missing field: ${field}`);
  }

  if (field === 'version') {
    if (!/^\d+\.\d+(?:\.\d+)?$/.test(value.trim())) {
      fail(`constitutional ledger entry ${policy.version} has an invalid semantic version`);
    }
    continue;
  }

  if (field === 'date') continue;

  if (value.trim().length < 4) {
    fail(`constitutional ledger entry ${policy.version} is missing substantive field: ${field}`);
  }
}

if (!/^\d{4}-\d{2}-\d{2}$/.test(matchingAmendment.date)) {
  fail('constitutional amendment date must use YYYY-MM-DD');
}

const documentPath = path.join(root, policy.canonicalDocument || '');
if (!policy.canonicalDocument || !fs.existsSync(documentPath)) {
  fail('canonical constitutional document is missing');
}
const documentText = fs.readFileSync(documentPath, 'utf8');

for (const section of baseline.requiredSections) {
  if (!documentText.includes(section)) fail(`required section missing: ${section}`);
}

const ids = new Set();
for (const rule of baseline.immutableRules) {
  if (!rule.id || !rule.requiredText) fail('immutable baseline rule entry is incomplete');
  if (ids.has(rule.id)) fail(`duplicate immutable baseline rule id: ${rule.id}`);
  ids.add(rule.id);
  if (!documentText.includes(rule.requiredText)) {
    fail(`constitutional invariant missing or altered in canonical document: ${rule.id}`);
  }
}

console.log(
  `ATLAS constitutional gate passed: v${policy.version}, pinned baseline ${baselineHash.slice(0, 12)}, ${baseline.immutableRules.length} immutable rules.`
);