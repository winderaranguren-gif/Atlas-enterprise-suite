'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');

function fail(message) {
  console.error(`ATLAS deployment boundary gate failed: ${message}`);
  process.exit(1);
}

function readText(relativePath) {
  const filePath = path.join(root, relativePath);
  if (!fs.existsSync(filePath)) fail(`required file missing: ${relativePath}`);
  return fs.readFileSync(filePath, 'utf8');
}

function readJson(relativePath) {
  const text = readText(relativePath);
  try {
    return JSON.parse(text);
  } catch (error) {
    fail(`${relativePath} is not valid JSON: ${error.message}`);
  }
}

const wrangler = readJson('wrangler.jsonc');
const packageJson = readJson('package.json');
const gitignore = readText('.gitignore');
const buildScript = readText('scripts/build-cloudflare.js');
const bootstrapScript = readText('scripts/cloudflare-ci-bootstrap.js');
const routerScript = readText('scripts/cloudflare-build-router.js');
const iosWorkflow = readText('.github/workflows/atlas-ios-build.yml');
const productionWorkflow = readText('.github/workflows/deploy-production.yml');

if (wrangler.assets?.directory !== 'dist') fail('Cloudflare assets.directory must remain "dist"');
if (wrangler.build?.command !== 'node scripts/cloudflare-build-router.js') fail('Wrangler custom build must remain bound to the ATLAS build router for manual Wrangler execution');
if (!/(^|\n)dist\/(\n|$)/.test(gitignore)) fail('dist/ must remain ignored');
if (!buildScript.includes("const output = path.join(root, 'dist')")) fail('Cloudflare build script must continue generating dist');

const requiredBootstrapMarkers = [
  'WORKERS_CI',
  'WORKERS_CI_BRANCH',
  "branch === productionBranch ? 'build:prod' : 'build:dev'",
  "spawnSync(npm, ['run', target]"
];
for (const marker of requiredBootstrapMarkers) {
  if (!bootstrapScript.includes(marker)) fail(`Cloudflare install bootstrap lost required safeguard: ${marker}`);
}

const requiredRouterMarkers = [
  'WORKERS_CI_BRANCH',
  'WORKERS_CI',
  'WRANGLER_COMMAND',
  'workersCi && branch && !command',
  "branch === productionBranch ? 'build:prod' : 'build:dev'",
  'branch === productionBranch',
  "command === 'deploy' || command === 'versions deploy'",
  "command === 'versions upload' || command === 'dev' || command === 'types'",
  "run('build:prod')",
  "run('build:dev')",
  'Non-production branch deploy command',
  'npx wrangler versions upload'
];
for (const marker of requiredRouterMarkers) {
  if (!routerScript.includes(marker)) fail(`Cloudflare build router lost required safeguard: ${marker}`);
}

const scripts = packageJson.scripts || {};
if (scripts.postinstall !== 'node scripts/cloudflare-ci-bootstrap.js') {
  fail('postinstall must preserve the Workers Builds bootstrap fallback');
}
if (typeof scripts['check:constitutional-release'] !== 'string') fail('check:constitutional-release script is missing');
if (typeof scripts['build:prod'] !== 'string' || !scripts['build:prod'].includes('check:constitutional-release')) {
  fail('build:prod must run check:constitutional-release');
}
if (typeof scripts.build !== 'string' || scripts.build.includes('check:constitutional-release')) {
  fail('generic build must remain preview/CI-safe and must not impersonate a production approval path');
}
if (!scripts.build.includes('build:dev')) fail('generic build must route to build:dev');
if (typeof scripts['build:dev'] !== 'string' || scripts['build:dev'].includes('check:constitutional-release')) {
  fail('build:dev must remain separate from production release approval');
}
if (typeof scripts.predeploy !== 'string' || !scripts.predeploy.includes('check:constitutional-release')) fail('predeploy must fail early on the production gate');
if (typeof scripts['cloudflare:preview'] !== 'string' || !scripts['cloudflare:preview'].includes('wrangler@4 versions upload')) {
  fail('cloudflare:preview must remain an explicit Wrangler preview upload command');
}
if (typeof scripts['precloudflare:deploy'] !== 'string' || !scripts['precloudflare:deploy'].includes('check:constitutional-release')) fail('cloudflare deploy must fail early on the production gate');
if (typeof scripts['mobile:release:check'] !== 'string' || !scripts['mobile:release:check'].includes('check:constitutional-release')) fail('mobile release check must retain the production gate');
if (typeof scripts['mobile:release:build'] !== 'string' || !scripts['mobile:release:build'].includes('build:prod')) fail('mobile release build must use build:prod');
if (!String(scripts['check:js'] || '').includes('scripts/cloudflare-ci-bootstrap.js')) fail('Cloudflare CI bootstrap must remain syntax-checked');
if (!String(scripts['check:js'] || '').includes('scripts/cloudflare-build-router.js')) fail('Cloudflare build router must remain syntax-checked');

if (!iosWorkflow.includes('run: npm run build:dev')) fail('iOS simulator workflow must use build:dev');
if (/run:\s*npm run build:prod\s*(\n|$)/.test(iosWorkflow)) fail('iOS simulator workflow must not use build:prod');

if (!productionWorkflow.includes('run: npm run build:prod')) fail('production GitHub workflow must create its package through build:prod');
if (/run:\s*npm run (?:build|build:dev|build:cloudflare)\s*(\n|$)/.test(productionWorkflow)) fail('production workflow must not use a preview or direct asset build path');
if (!productionWorkflow.includes('run: npx wrangler@4 deploy')) fail('production workflow must retain the expected Cloudflare deploy step');
if (!productionWorkflow.includes('path: dist')) fail('GitHub Pages fallback must publish only dist');

console.log('ATLAS deployment boundary gate passed: Workers Builds install fallback, direct branch routing, Wrangler preview uploads, and explicit production deployments remain separated and constitutionally gated.');
