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
const routerScript = readText('scripts/cloudflare-build-router.js');
const iosWorkflow = readText('.github/workflows/atlas-ios-v2.yml');
const coreWorkflow = readText('.github/workflows/atlas-ci-v2.yml');

if (wrangler.assets?.directory !== 'dist') fail('Cloudflare assets.directory must remain "dist"');
if (wrangler.build?.command !== 'node scripts/cloudflare-build-router.js') fail('Wrangler custom build must remain bound to the ATLAS build router');
if (!/(^|\n)dist\/(\n|$)/.test(gitignore)) fail('dist/ must remain ignored');
if (!buildScript.includes("const output = path.join(root, 'dist')")) fail('Cloudflare build script must continue generating dist');

const requiredRouterMarkers = [
  'WORKERS_CI_BRANCH',
  'WRANGLER_COMMAND',
  'branch === productionBranch',
  "command === 'deploy' || command === 'versions deploy'",
  "command === 'versions upload' || command === 'dev' || command === 'types'",
  "run('build:prod')",
  "run('build:dev')"
];
for (const marker of requiredRouterMarkers) {
  if (!routerScript.includes(marker)) fail(`Cloudflare build router lost required safeguard: ${marker}`);
}

const scripts = packageJson.scripts || {};
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
if (typeof scripts['precloudflare:deploy'] !== 'string' || !scripts['precloudflare:deploy'].includes('check:constitutional-release')) fail('cloudflare deploy must fail early on the production gate');
if (typeof scripts['mobile:release:check'] !== 'string' || !scripts['mobile:release:check'].includes('check:constitutional-release')) fail('mobile release check must retain the production gate');
if (typeof scripts['mobile:release:build'] !== 'string' || !scripts['mobile:release:build'].includes('build:prod')) fail('mobile release build must use build:prod');
if (!String(scripts['check:js'] || '').includes('scripts/cloudflare-build-router.js')) fail('Cloudflare build router must remain syntax-checked');

if (!iosWorkflow.includes('run: npm run build:dev')) fail('iOS simulator workflow must use build:dev');
if (/run:\s*npm run build:prod\s*(\n|$)/.test(iosWorkflow)) fail('iOS simulator workflow must not use build:prod');
for (const packagedPath of ["- '*.html'", "- '*.css'", "- '*.js'", "- '*.webmanifest'", "- 'assets/**'", "- 'icons/**'", "- 'images/**'", "- 'fonts/**'", "- 'media/**'", "- 'scripts/build-cloudflare.js'"]) {
  if (!iosWorkflow.includes(packagedPath)) fail(`iOS workflow path filters must include packaged web input: ${packagedPath}`);
}

if (!coreWorkflow.includes("name: ATLAS CI v2")) fail('ATLAS CI v2 workflow identity is missing');
if (!coreWorkflow.includes("if: github.event_name == 'push' && github.ref == 'refs/heads/main'")) fail('production deployment must remain restricted to pushes on main');
if (!coreWorkflow.includes('run: npm run build:prod')) fail('production job must create its package through build:prod');
if (!coreWorkflow.includes('run: npx wrangler@4 deploy')) fail('production job must retain the expected Cloudflare deploy step');
if (!coreWorkflow.includes('needs: validate')) fail('production deployment must depend on repository validation');
if (!coreWorkflow.includes('needs: deploy-production')) fail('production verification must depend on a successful deployment');
if (/pages\/deploy-pages|actions\/upload-pages-artifact|github-pages/i.test(coreWorkflow)) fail('ATLAS CI v2 must not reintroduce a GitHub Pages production fallback');

console.log('ATLAS deployment boundary gate passed: Actions v2, iOS packaging, preview builds and production deployment remain separated and constitutionally gated.');