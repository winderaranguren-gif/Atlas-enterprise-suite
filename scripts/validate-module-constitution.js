'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const root = path.resolve(__dirname, '..');
const controlsPath = path.join(root, 'governance', 'atlas-module-constitutional-controls.json');
const productionMode = process.argv.includes('--production');

const MANDATORY_HIGH_IMPACT_PROFILES = [
  'employment', 'finance', 'identity', 'health', 'public_safety', 'education',
  'security_access', 'democracy', 'autonomous_robotics', 'housing',
  'child_protection', 'critical_infrastructure', 'ai_high_impact'
];

const MANDATORY_HIGH_IMPACT_PATTERNS = [
  'health', 'medical', 'clinical', 'hr', 'employment', 'payroll', 'finance',
  'bank', 'wallet', 'identity', 'background', 'credit', 'insurance',
  'education', 'student', 'security', 'safety', 'police', 'surveillance',
  'biometric', 'democracy', 'election', 'voting', 'robot', 'robotics',
  'autonomous', 'housing', 'children', 'child', 'critical-infrastructure',
  'ai', 'artificial-intelligence'
];

const ROOT_EXECUTABLE_ASSET_EXTENSIONS = new Set(['.html', '.js', '.mjs']);

function fail(message) {
  console.error(`ATLAS module constitutional gate failed: ${message}`);
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

function segmentBetween(text, startToken, endToken, label) {
  const start = text.indexOf(startToken);
  if (start < 0) fail(`${label}: start token not found`);
  const end = text.indexOf(endToken, start + startToken.length);
  if (end < 0) fail(`${label}: end token not found`);
  return text.slice(start + startToken.length, end);
}

function parseAtlasOsModules(text) {
  const segment = segmentBetween(text, 'const MODULES=[', '];', 'atlas-os-operational.js module registry');
  const found = [];
  const regex = /\[\s*['"]([^'"]+)['"]\s*,\s*['"][^'"]*['"]\s*,\s*['"]([^'"]+)['"]/g;
  let match;
  while ((match = regex.exec(segment))) found.push({ id: match[1], name: match[2] });
  return found;
}

function parseAtlasSuiteModules(text) {
  const segment = segmentBetween(text, 'const modules={', '};', 'atlas-suite.js module registry');
  const found = [];
  const regex = /(?:^|,)\s*(?:(['"])([^'"]+)\1|([A-Za-z_$][A-Za-z0-9_$-]*))\s*:\s*\[\s*['"]([^'"]+)['"]/g;
  let match;
  while ((match = regex.exec(segment))) {
    found.push({ id: match[2] || match[3], name: match[4] });
  }
  return found;
}

function parseModules(text, parser, source) {
  if (parser === 'atlas-os-modules-array') return parseAtlasOsModules(text);
  if (parser === 'atlas-suite-modules-object') return parseAtlasSuiteModules(text);
  fail(`${source}: unsupported module parser ${parser}`);
}

function normalizeRiskText(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function matchesRiskPattern(value, pattern) {
  const text = normalizeRiskText(value);
  const risk = normalizeRiskText(pattern);
  if (!text || !risk) return false;
  if (risk.length <= 3 && !risk.includes(' ')) {
    return text.split(/\s+/).includes(risk);
  }
  return text.includes(risk);
}

function findRiskPatterns(value, patterns) {
  return patterns.filter(pattern => matchesRiskPattern(value, pattern));
}

function resolveRegularFile(relativePath, label) {
  const absolute = path.resolve(root, relativePath);
  if (!absolute.startsWith(root + path.sep)) fail(`${label}: path escapes repository: ${relativePath}`);
  if (!fs.existsSync(absolute)) fail(`${label}: file does not exist: ${relativePath}`);
  if (!fs.statSync(absolute).isFile()) fail(`${label}: evidence must be a regular file: ${relativePath}`);
  return absolute;
}

function computeReviewDigest(source, evidenceFiles) {
  const files = [...new Set([source, ...evidenceFiles])].sort();
  const hash = crypto.createHash('sha256');
  for (const relativePath of files) {
    const absolute = resolveRegularFile(relativePath, 'review digest');
    hash.update(relativePath.replace(/\\/g, '/'));
    hash.update('\0');
    hash.update(fs.readFileSync(absolute));
    hash.update('\0');
  }
  return hash.digest('hex');
}

function validateApproval(source, moduleId, classification, profile) {
  const approval = classification.approval;
  if (!approval || typeof approval !== 'object') fail(`${moduleId}: approved high-impact target is missing approval evidence`);

  const requiredFields = controls.approvalEvidenceSchema?.requiredForApprovedHighImpactModule || [];
  for (const field of requiredFields) {
    if (!(field in approval)) fail(`${moduleId}: approval evidence missing ${field}`);
  }

  const controlClaims = approval.controls || {};
  for (const control of profile.requiredControls || []) {
    if (controlClaims[control] !== true) fail(`${moduleId}: required constitutional control not attested: ${control}`);
  }

  if (!Array.isArray(approval.evidenceFiles) || approval.evidenceFiles.length === 0) {
    fail(`${moduleId}: approved target requires repository evidence files`);
  }
  for (const evidenceFile of approval.evidenceFiles) resolveRegularFile(evidenceFile, moduleId);

  if (!Array.isArray(approval.testCommands) || approval.testCommands.length === 0) {
    fail(`${moduleId}: approved target requires at least one test command`);
  }
  if (typeof approval.reviewedBy !== 'string' || approval.reviewedBy.trim().length < 2) {
    fail(`${moduleId}: approved target requires an independent reviewer identity/function`);
  }
  if (typeof approval.humanApprover !== 'string' || approval.humanApprover.trim().length < 2) {
    fail(`${moduleId}: approved target requires an identified humanApprover`);
  }
  if (approval.humanApprover.trim() === approval.reviewedBy.trim()) {
    fail(`${moduleId}: human approval and independent review must be distinct controls`);
  }
  if (typeof approval.reviewDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(approval.reviewDate)) {
    fail(`${moduleId}: approved target requires reviewDate in YYYY-MM-DD format`);
  }
  if (typeof approval.rollbackPlan !== 'string' || approval.rollbackPlan.trim().length < 8) {
    fail(`${moduleId}: approved target requires a concrete rollback plan`);
  }
  if (typeof approval.reviewedDigest !== 'string' || !/^[0-9a-f]{64}$/i.test(approval.reviewedDigest)) {
    fail(`${moduleId}: approved target requires reviewedDigest as a SHA-256 hex digest`);
  }

  const currentDigest = computeReviewDigest(source, approval.evidenceFiles);
  if (currentDigest.toLowerCase() !== approval.reviewedDigest.toLowerCase()) {
    fail(`${moduleId}: source or evidence changed after review; reviewedDigest no longer matches released content`);
  }
}

const controls = readJson(controlsPath, 'module constitutional controls');
const profiles = controls.profiles || {};
const registries = controls.registries || {};
const protectedAssets = controls.protectedAssets || {};
const releaseStatuses = new Set(controls.approvalEvidenceSchema?.releaseStatuses || ['blocked', 'approved']);
const policyPatterns = (controls.reservedHighImpactPatterns || []).map(value => String(value).toLowerCase());
const reservedPatterns = [...new Set([...MANDATORY_HIGH_IMPACT_PATTERNS, ...policyPatterns])];

if (controls.defaultPolicy !== 'explicit-classification-required') fail('default policy must require explicit classification for every registered module');
if (controls.productionRule !== 'high-impact-modules-require-approved-evidence') fail('production rule was weakened or removed');
if (!profiles.standard || profiles.standard.highImpact !== false) fail('standard profile is missing or invalid');

for (const profileId of MANDATORY_HIGH_IMPACT_PROFILES) {
  const profile = profiles[profileId];
  if (!profile) fail(`mandatory high-impact profile is missing: ${profileId}`);
  if (profile.highImpact !== true) fail(`mandatory high-impact profile was downgraded: ${profileId}`);
  if (!Array.isArray(profile.requiredControls) || profile.requiredControls.length === 0) fail(`mandatory high-impact profile lost its control set: ${profileId}`);
}

for (const [profileId, profile] of Object.entries(profiles)) {
  if (typeof profile.highImpact !== 'boolean') fail(`${profileId}: highImpact flag is required`);
  if (!Array.isArray(profile.requiredControls)) fail(`${profileId}: requiredControls must be an array`);
  if (profile.highImpact && profile.requiredControls.length === 0) fail(`${profileId}: high-impact profile cannot have an empty control set`);
  if (new Set(profile.requiredControls).size !== profile.requiredControls.length) fail(`${profileId}: duplicate required controls detected`);
}

const productionBlocks = [];
let discoveredCount = 0;
let highImpactCount = 0;

function evaluateTarget(source, target, classification) {
  const profile = profiles[classification.profile];
  if (!profile) fail(`${target}: unknown constitutional profile ${classification.profile}`);

  const hits = findRiskPatterns(target, reservedPatterns);
  if (hits.length && profile.highImpact !== true) {
    fail(`${target}: target matches mandatory high-impact pattern "${hits[0]}" but is classified as standard`);
  }

  if (profile.highImpact) {
    highImpactCount += 1;
    if (!releaseStatuses.has(classification.releaseStatus)) fail(`${target}: high-impact target must have releaseStatus blocked or approved`);
    if (typeof classification.reason !== 'string' || classification.reason.trim().length < 12) fail(`${target}: high-impact classification requires a reason`);
    if (classification.releaseStatus === 'approved') {
      validateApproval(source, target, classification, profile);
    } else if (productionMode) {
      productionBlocks.push(`${target} [${classification.profile}] — ${classification.reason}`);
    }
  } else if (classification.releaseStatus === 'approved') {
    fail(`${target}: standard targets must not use high-impact approval state`);
  }
}

for (const [source, registry] of Object.entries(registries)) {
  const sourcePath = path.join(root, source);
  if (!fs.existsSync(sourcePath)) fail(`registered module source missing: ${source}`);
  const text = fs.readFileSync(sourcePath, 'utf8');
  const discovered = parseModules(text, registry.parser, source);
  if (discovered.length === 0) fail(`${source}: no modules discovered; parser or registry changed`);

  const byId = new Map(discovered.map(module => [module.id, module]));
  const classifications = registry.classifications || {};
  discoveredCount += discovered.length;

  for (const module of discovered) {
    const classification = classifications[module.id];
    if (!classification) fail(`${source}: new or unclassified module detected: ${module.id} (${module.name})`);
    evaluateTarget(source, `${source}/${module.id} ${module.name}`, classification);
  }

  for (const classifiedId of Object.keys(classifications)) {
    if (!byId.has(classifiedId)) fail(`${source}: stale classification has no matching registered module: ${classifiedId}`);
  }
}

const discoveredSensitiveAssets = fs.readdirSync(root, { withFileTypes: true })
  .filter(entry => entry.isFile() && ROOT_EXECUTABLE_ASSET_EXTENSIONS.has(path.extname(entry.name).toLowerCase()))
  .map(entry => entry.name)
  .filter(name => findRiskPatterns(name, reservedPatterns).length > 0);

discoveredCount += discoveredSensitiveAssets.length;
for (const asset of discoveredSensitiveAssets) {
  const classification = protectedAssets[asset];
  if (!classification) fail(`production asset matches a protected domain but is unclassified: ${asset}`);
  evaluateTarget(asset, `asset/${asset}`, classification);
}

for (const asset of Object.keys(protectedAssets)) {
  const absolute = path.join(root, asset);
  if (!fs.existsSync(absolute) || !fs.statSync(absolute).isFile()) fail(`stale protected asset classification has no matching file: ${asset}`);
}

if (productionMode && productionBlocks.length > 0) {
  fail(`production release blocked by ${productionBlocks.length} high-impact target(s):\n- ${productionBlocks.join('\n- ')}`);
}

if (productionMode) {
  console.log(`ATLAS production constitutional release gate passed: ${discoveredCount} targets classified, ${highImpactCount} high-impact targets approved with content-addressed evidence.`);
} else {
  console.log(`ATLAS constitutional structure passed: ${discoveredCount} targets classified, ${highImpactCount} high-impact targets governed. Production approval is checked separately.`);
}
