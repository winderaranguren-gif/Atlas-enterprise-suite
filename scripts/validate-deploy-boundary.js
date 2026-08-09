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
const iosWorkflow = readText('.github/workflows/atlas-ios-build.yml');

if (wrangler.assets?.directory !== 'dist') {
  fail('Cloudflare assets.directory must remain "dist"; publishing the repository root bypasses the validated build boundary');
}

if (!/(^|\n)dist\/(\n|$)/.test(gitignore)) {
  fail('dist/ must remain ignored so deployable assets cannot be committed as an unvalidated bypass');
}

if (!buildScript.includes("const output = path.join(root, 'dist')")) {
  fail('Cloudflare build script must continue generating the dist directory');
}

const scripts = packageJson.scripts || {};
if (typeof scripts['check:constitutional-release'] !== 'string') {
  fail('check:constitutional-release script is missing');
}
if (typeof scripts.build !== 'string' || !scripts.build.includes('check:constitutional-release')) {
  fail('production build must run check:constitutional-release');
}
if (typeof scripts['build:dev'] !== 'string') {
  fail('build:dev is required to keep development separate from production release approval');
}
if (scripts['build:dev'].includes('check:constitutional-release')) {
  fail('build:dev must remain a development-only path, not an alias for production release approval');
}
if (typeof scripts.predeploy !== 'string' || !scripts.predeploy.includes('npm run build')) {
  fail('predeploy must route through the production build');
}
if (typeof scripts['precloudflare:deploy'] !== 'string' || !scripts['precloudflare:deploy'].includes('npm run build')) {
  fail('Cloudflare deploy must route through the production build');
}
if (typeof scripts['mobile:release:check'] !== 'string' || !scripts['mobile:release:check'].includes('check:constitutional-release')) {
  fail('mobile release path must retain the constitutional release gate');
}
if (!iosWorkflow.includes('run: npm run build:dev')) {
  fail('iOS simulator workflow must use build:dev');
}
if (/run:\s*npm run build\s*(\n|$)/.test(iosWorkflow)) {
  fail('iOS simulator workflow must not use the production build command');
}

console.log('ATLAS deployment boundary gate passed: Cloudflare, production build, development build and iOS simulator paths remain separated.');
