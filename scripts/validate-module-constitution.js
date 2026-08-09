const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const controlsPath = path.join(root, 'governance', 'atlas-module-constitutional-controls.json');
const productionMode = process.argv.includes('--production');

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
  while ((match = regex.exec(segment))) {
    found.push({ id: match[1], name: match[2] });
  }
  return found;
}

function parseAtlasSuiteModules(text) {
  const segment = segmentBetween(text, 'const modules={', '};', 'atlas-suite.js module registry');
  const found = [];
  const regex = /(?:^|,)\s*([A-Za-z][A-Za-z0-9_-]*)\s*:\s*\[\s*['"]([^'"]+)['"]/g;
  let match;
  while ((match = regex.exec(segment))) {
    found.push({ id: match[1], name: match[2] });
  }
  return found;
}

function parseModules(text, parser, source) {
  if (parser === 'atlas-os-modules-array') return parseAtlasOsModules(text);
  if (parser === 'atlas-suite-modules-object') return parseAtlasSuiteModules(text);
  fail(`${source}: unsupported module parser ${parser}`);
}

function validateApproval(moduleId, classification, profile) {
  const approval = classification.approval;
  if (!approval || typeof approval !== 'object') {
    fail(`${moduleId}: approved high-impact module is missing approval evidence`);
  }

  const requiredFields = controls.approvalEvidenceSchema?.requiredForApprovedHighImpactModule || [];
  for (const field of requiredFields) {
    if (!(field in approval)) fail(`${moduleId}: approval evidence missing ${field}`);
  }

  const controlClaims = approval.controls || {};
  for (const control of profile.requiredControls || []) {
    if (controlClaims[control] !== true) {
      fail(`${moduleId}: required constitutional control not attested: ${control}`);
    }
  }

  if (!Array.isArray(approval.evidenceFiles) || approval.evidenceFiles.length === 0) {
    fail(`${moduleId}: approved module requires repository evidence files`);
  }
  for (const evidenceFile of approval.evidenceFiles) {
    const evidencePath = path.resolve(root, evidenceFile);
    if (!evidencePath.startsWith(root + path.sep) || !fs.existsSync(evidencePath)) {
      fail(`${moduleId}: evidence file does not exist inside repository: ${evidenceFile}`);
    }
  }

  if (!Array.isArray(approval.testCommands) || approval.testCommands.length === 0) {
    fail(`${moduleId}: approved module requires at least one test command`);
  }
  if (typeof approval.reviewedBy !== 'string' || approval.reviewedBy.trim().length < 2) {
    fail(`${moduleId}: approved module requires an independent reviewer identity/function`);
  }
  if (typeof approval.reviewDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(approval.reviewDate)) {
    fail(`${moduleId}: approved module requires reviewDate in YYYY-MM-DD format`);
  }
  if (typeof approval.rollbackPlan !== 'string' || approval.rollbackPlan.trim().length < 8) {
    fail(`${moduleId}: approved module requires a concrete rollback plan`);
  }
}

const controls = readJson(controlsPath, 'module constitutional controls');
const profiles = controls.profiles || {};
const registries = controls.registries || {};
const releaseStatuses = new Set(controls.approvalEvidenceSchema?.releaseStatuses || ['blocked', 'approved']);
const reservedPatterns = (controls.reservedHighImpactPatterns || []).map(value => String(value).toLowerCase());

if (controls.defaultPolicy !== 'explicit-classification-required') {
  fail('default policy must require explicit classification for every registered module');
}
if (controls.productionRule !== 'high-impact-modules-require-approved-evidence') {
  fail('production rule was weakened or removed');
}
if (!profiles.standard || profiles.standard.highImpact !== false) {
  fail('standard profile is missing or invalid');
}

for (const [profileId, profile] of Object.entries(profiles)) {
  if (typeof profile.highImpact !== 'boolean') fail(`${profileId}: highImpact flag is required`);
  if (!Array.isArray(profile.requiredControls)) fail(`${profileId}: requiredControls must be an array`);
  if (profile.highImpact && profile.requiredControls.length === 0) {
    fail(`${profileId}: high-impact profile cannot have an empty control set`);
  }
  const unique = new Set(profile.requiredControls);
  if (unique.size !== profile.requiredControls.length) fail(`${profileId}: duplicate required controls detected`);
}

const productionBlocks = [];
let discoveredCount = 0;
let highImpactCount = 0;

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
    if (!classification) {
      fail(`${source}: new or unclassified module detected: ${module.id} (${module.name})`);
    }

    const profile = profiles[classification.profile];
    if (!profile) fail(`${source}/${module.id}: unknown constitutional profile ${classification.profile}`);

    const searchable = `${module.id} ${module.name}`.toLowerCase();
    const reservedHit = reservedPatterns.find(pattern => searchable.includes(pattern));
    if (reservedHit && profile.highImpact !== true) {
      fail(`${source}/${module.id}: module matches reserved high-impact pattern "${reservedHit}" but is classified as standard`);
    }

    if (profile.highImpact) {
      highImpactCount += 1;
      if (!releaseStatuses.has(classification.releaseStatus)) {
        fail(`${source}/${module.id}: high-impact module must have releaseStatus blocked or approved`);
      }
      if (typeof classification.reason !== 'string' || classification.reason.trim().length < 12) {
        fail(`${source}/${module.id}: high-impact classification requires a reason`);
      }
      if (classification.releaseStatus === 'approved') {
        validateApproval(`${source}/${module.id}`, classification, profile);
      } else if (productionMode) {
        productionBlocks.push(`${source}/${module.id} [${classification.profile}] — ${classification.reason}`);
      }
    } else if (classification.releaseStatus === 'approved') {
      fail(`${source}/${module.id}: standard modules must not use high-impact approval state`);
    }
  }

  for (const classifiedId of Object.keys(classifications)) {
    if (!byId.has(classifiedId)) {
      fail(`${source}: stale classification has no matching registered module: ${classifiedId}`);
    }
  }
}

if (productionMode && productionBlocks.length > 0) {
  fail(`production release blocked by ${productionBlocks.length} high-impact module(s):\n- ${productionBlocks.join('\n- ')}`);
}

if (productionMode) {
  console.log(`ATLAS production constitutional release gate passed: ${discoveredCount} modules classified, ${highImpactCount} high-impact modules approved with evidence.`);
} else {
  console.log(`ATLAS module constitutional structure passed: ${discoveredCount} modules classified, ${highImpactCount} high-impact modules governed. Production approval is checked separately.`);
}
