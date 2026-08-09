'use strict';

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
  'employment', 'finance', 'identity', 'health', 'public_safety', 'education',
  'security_access', 'democracy', 'autonomous_robotics', 'housing',
  'child_protection', 'critical_infrastructure', 'ai_high_impact'
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

const mandatoryAssetBindings = {
  'atlas-health-frontiers.html': 'health',
  'atlas-holographic-health-twin.html': 'health'
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

for (const [asset, expectedProfile] of Object.entries(mandatoryAssetBindings)) {
  const classification = policy.protectedAssets?.[asset];
  if (!classification) fail(`${asset}: protected production asset binding missing`);
  if (classification.profile !== expectedProfile) {
    fail(`${asset}: protected asset profile changed from ${expectedProfile} to ${classification.profile}`);
  }
}

function validateApprovalShape(target, classification) {
  const profile = policy.profiles?.[classification.profile];
  if (!profile?.highImpact || classification.releaseStatus !== 'approved') return;

  const approval = classification.approval || {};
  if (typeof approval.humanApprover !== 'string' || approval.humanApprover.trim().length < 2) {
    fail(`${target}: approved high-impact target requires an identified humanApprover`);
  }
  if (typeof approval.reviewedBy !== 'string' || approval.reviewedBy.trim().length < 2) {
    fail(`${target}: approved high-impact target requires an independent reviewer`);
  }
  if (approval.humanApprover.trim() === approval.reviewedBy.trim()) {
    fail(`${target}: human approval and independent review must not be represented as the same control`);
  }
  if (typeof approval.reviewedDigest !== 'string' || !/^[0-9a-f]{64}$/i.test(approval.reviewedDigest)) {
    fail(`${target}: approved high-impact target requires a SHA-256 reviewedDigest`);
  }
}

for (const [source, registry] of Object.entries(policy.registries || {})) {
  for (const [moduleId, classification] of Object.entries(registry.classifications || {})) {
    validateApprovalShape(`${source}/${moduleId}`, classification);
  }
}
for (const [asset, classification] of Object.entries(policy.protectedAssets || {})) {
  validateApprovalShape(`asset/${asset}`, classification);
}

console.log('ATLAS constitutional binding lock passed: protected profiles, module bindings, production assets and approval shape remain intact.');
