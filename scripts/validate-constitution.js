const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const policyPath = path.join(root, 'governance', 'atlas-constitutional-policy.json');

function fail(message) {
  console.error(`ATLAS constitutional gate failed: ${message}`);
  process.exit(1);
}

if (!fs.existsSync(policyPath)) {
  fail('machine-readable policy is missing');
}

let policy;
try {
  policy = JSON.parse(fs.readFileSync(policyPath, 'utf8'));
} catch (error) {
  fail(`policy JSON is invalid: ${error.message}`);
}

if (policy.status !== 'canonical') {
  fail('policy status must remain canonical');
}

if (policy.changePolicy !== 'no-silent-amendments') {
  fail('no-silent-amendments policy is missing');
}

const documentPath = path.join(root, policy.canonicalDocument || '');
if (!policy.canonicalDocument || !fs.existsSync(documentPath)) {
  fail('canonical constitutional document is missing');
}

const documentText = fs.readFileSync(documentPath, 'utf8');

for (const section of policy.requiredSections || []) {
  if (!documentText.includes(section)) {
    fail(`required section missing: ${section}`);
  }
}

const immutableRules = policy.immutableRules || [];
if (immutableRules.length < 12) {
  fail('immutable rule set is unexpectedly incomplete');
}

const ids = new Set();
for (const rule of immutableRules) {
  if (!rule.id || !rule.requiredText) {
    fail('immutable rule entry is incomplete');
  }
  if (ids.has(rule.id)) {
    fail(`duplicate immutable rule id: ${rule.id}`);
  }
  ids.add(rule.id);
  if (!documentText.includes(rule.requiredText)) {
    fail(`constitutional invariant missing or altered: ${rule.id}`);
  }
}

const safeguards = policy.christianInterpretationSafeguards || {};
if (
  safeguards.newRevelationClaim !== false ||
  safeguards.prophecyClaim !== false ||
  safeguards.replacementOfScriptureClaim !== false ||
  safeguards.religiousCoercionAllowed !== false ||
  safeguards.equalProtectionRequired !== true
) {
  fail('Christian interpretation safeguards were weakened or removed');
}

const autonomy = policy.autonomousSystemRules || {};
if (
  autonomy.selfGrantCriticalPrivileges !== false ||
  autonomy.removeOwnSafetyLimits !== false ||
  autonomy.unboundedReplication !== false ||
  autonomy.identityRequiredForHighImpactSystems !== true ||
  autonomy.leastPrivilege !== true ||
  autonomy.auditRequired !== true ||
  autonomy.humanOversightForHighImpact !== true
) {
  fail('autonomous-system constitutional controls were weakened or removed');
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
    fail(`amendment safeguard missing: ${field}`);
  }
}

console.log(
  `ATLAS constitutional gate passed: v${policy.version}, ${immutableRules.length} immutable rules, ${policy.requiredSections.length} required sections.`
);
