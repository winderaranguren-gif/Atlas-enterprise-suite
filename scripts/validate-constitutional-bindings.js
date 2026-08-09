const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const policyPath = path.join(root, 'governance', 'atlas-module-constitutional-controls.json');

function fail(message) {
  console.error(`ATLAS constitutional binding lock failed: ${message}`);
  process.exit(1);
}

if (!fs.existsSync(policyPath)) fail('module constitutional policy is missing');

let policy;
try {
  policy = JSON.parse(fs.readFileSync(policyPath, 'utf8'));
} catch (error) {
  fail(`policy JSON is invalid: ${error.message}`);
}

const mandatoryProfiles = [
  'employment',
  'finance',
  'identity',
  'health',
  'public_safety',
  'education',
  'security_access',
  'democracy',
  'autonomous_robotics'
];

const mandatoryBindings = {
  'atlas-os-operational.js': {
    finance: 'finance',
    hr: 'employment',
    payroll: 'finance',
    health: 'health',
    education: 'education',
    security: 'security_access'
  },
  'atlas-suite.js': {
    invoices: 'finance',
    expenses: 'finance',
    accounting: 'finance',
    employees: 'employment',
    wallet: 'identity',
    documents: 'identity',
    health: 'health',
    safety: 'public_safety'
  }
};

for (const profileId of mandatoryProfiles) {
  const profile = policy.profiles?.[profileId];
  if (!profile) fail(`mandatory high-impact profile missing: ${profileId}`);
  if (profile.highImpact !== true) fail(`mandatory profile was downgraded: ${profileId}`);
  if (!Array.isArray(profile.requiredControls) || profile.requiredControls.length === 0) {
    fail(`mandatory profile has no required controls: ${profileId}`);
  }
}

for (const [source, expected] of Object.entries(mandatoryBindings)) {
  const classifications = policy.registries?.[source]?.classifications;
  if (!classifications) fail(`protected registry missing: ${source}`);

  for (const [moduleId, expectedProfile] of Object.entries(expected)) {
    const classification = classifications[moduleId];
    if (!classification) fail(`${source}/${moduleId}: protected high-impact binding missing`);
    if (classification.profile !== expectedProfile) {
      fail(`${source}/${moduleId}: protected profile changed from ${expectedProfile} to ${classification.profile}`);
    }
  }
}

for (const [source, registry] of Object.entries(policy.registries || {})) {
  for (const [moduleId, classification] of Object.entries(registry.classifications || {})) {
    const profile = policy.profiles?.[classification.profile];
    if (!profile?.highImpact || classification.releaseStatus !== 'approved') continue;

    const approval = classification.approval || {};
    if (typeof approval.humanApprover !== 'string' || approval.humanApprover.trim().length < 2) {
      fail(`${source}/${moduleId}: approved high-impact module requires an identified humanApprover`);
    }
    if (typeof approval.reviewedCommit !== 'string' || !/^[0-9a-f]{7,40}$/i.test(approval.reviewedCommit)) {
      fail(`${source}/${moduleId}: approved high-impact module requires reviewedCommit`);
    }
    if (approval.humanApprover.trim() === approval.reviewedBy?.trim()) {
      fail(`${source}/${moduleId}: human approval and independent review must not be represented as the same control`);
    }
  }
}

console.log('ATLAS constitutional binding lock passed: protected high-impact profiles and module bindings remain intact.');
