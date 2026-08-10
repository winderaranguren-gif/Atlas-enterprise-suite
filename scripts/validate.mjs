import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const required = [
  'package.json',
  'atlas.config.json',
  'wrangler.toml',
  'scripts/build.mjs',
  'scripts/cloudflare-build-router.js',
  'scripts/runtime-test.mjs',
  'public/index.html',
  'public/styles.css',
  'public/core-services.css',
  'public/app.js',
  'public/core-services.js',
  'public/music-core.js',
  'public/atlas.config.json',
  'public/manifest.webmanifest',
  'public/sw.js',
  'public/_headers',
  'public/_redirects'
];

function fail(message) {
  console.error(`ATLAS Core Services v1.1 validation failed: ${message}`);
  process.exit(1);
}

for (const file of required) {
  if (!fs.existsSync(path.join(root, file))) fail(`Missing required file: ${file}`);
}

const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');
const pkg = JSON.parse(read('package.json'));
const cfg = JSON.parse(read('atlas.config.json'));
const publicCfg = JSON.parse(read('public/atlas.config.json'));
const html = read('public/index.html');
const app = read('public/app.js');
const core = read('public/core-services.js');
const music = read('public/music-core.js');
const sw = read('public/sw.js');
const headers = read('public/_headers');
const redirects = read('public/_redirects');
const wrangler = read('wrangler.toml');
const build = read('scripts/build.mjs');
const buildRouter = read('scripts/cloudflare-build-router.js');

if (pkg.version !== cfg.version) fail('Version mismatch between package.json and atlas.config.json');
if (cfg.version !== '1.1.0') fail('Core Services release must be v1.1.0');
if (JSON.stringify(cfg) !== JSON.stringify(publicCfg)) fail('Root and public ATLAS runtime configuration must remain identical');
if (cfg.contact !== 'atlashealthfrontiers@gmail.com') fail('Operational contact mismatch');
if (!Array.isArray(cfg.modules) || cfg.modules.length < 25) fail('Module registry is incomplete for v1.1');
if (!Array.isArray(cfg.regions) || !cfg.regions.includes(cfg.defaultRegion) || cfg.regions.length < 10) fail('Regional registry is incomplete');
if (!pkg.scripts?.validate?.includes('scripts/validate.mjs') || !pkg.scripts?.validate?.includes('test:core')) fail('Validation contract must run structural and behavioral gates');
if (pkg.scripts?.['test:core'] !== 'node scripts/runtime-test.mjs') fail('Core behavior-test script is not wired correctly');
if (!pkg.scripts?.build?.includes('scripts/build.mjs')) fail('package.json must retain the deterministic local build script');
if (pkg.scripts?.['build:cloudflare'] !== 'node scripts/build.mjs') fail('Legacy Cloudflare build alias must route to the clean build only');
if (pkg.scripts?.['build:dev'] !== 'npm run validate && npm run build') fail('build:dev must remain a clean validate+build alias');
if (pkg.scripts?.['build:prod'] !== 'npm run validate && npm run build') fail('build:prod must remain a clean validate+build alias');
if (pkg.scripts?.deploy !== 'npx wrangler@4 deploy') fail('Deployment must use the connected Cloudflare Workers service through Wrangler deploy');
if (pkg.scripts?.['cloudflare:deploy'] !== 'npx wrangler@4 deploy') fail('Cloudflare deploy compatibility alias is missing');
if (pkg.scripts?.['cloudflare:preview'] !== 'npx wrangler@4 versions upload') fail('Cloudflare preview compatibility alias is missing');
if (!buildRouter.includes("run('scripts/validate.mjs')") || !buildRouter.includes("run('scripts/build.mjs')")) {
  fail('Cloudflare build-router compatibility shim must execute only clean validation and build scripts');
}

for (const [pattern, message] of [
  [/^name\s*=\s*["']atlas-enterprise-suite["']/m, 'Wrangler Worker name must match the connected Cloudflare service'],
  [/^workers_dev\s*=\s*false\s*$/m, 'workers.dev must remain disabled for the clean production foundation'],
  [/^\[assets\]\s*$/m, 'Wrangler static-assets section is missing'],
  [/^directory\s*=\s*["']\.\/public["']\s*$/m, 'Workers Static Assets must deploy only ./public'],
  [/^not_found_handling\s*=\s*["']single-page-application["']\s*$/m, 'Workers Static Assets must preserve SPA fallback']
]) {
  if (!pattern.test(wrangler)) fail(message);
}
if (/pages_build_output_dir/i.test(wrangler)) fail('Pages-only Wrangler configuration must not return to the connected Workers service');

if (!build.includes("fs.cpSync(src,out,{recursive:true})")) fail('Local build must copy the public tree deterministically');
if (!build.includes("atlas.config.json")) fail('Local build must include atlas.config.json');

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });
}
for (const file of walk(path.join(root, 'public')).filter(file => /\.(?:js|mjs)$/i.test(file))) {
  const source = fs.readFileSync(file, 'utf8');
  try { new Function(source); }
  catch (error) { fail(`JavaScript syntax error in ${path.relative(root, file)}: ${error.message}`); }
}

for (const asset of ['/core-services.js', '/music-core.js', '/app.js']) {
  const escaped = asset.replace('.', '\\.');
  const pattern = new RegExp(`<script\\s+src=["']${escaped}["']\\s+defer><\\/script>`);
  if (!pattern.test(html)) fail(`index.html must load ${asset} as an external deferred script`);
}
if (/<script(?![^>]*\bsrc=)[^>]*>/i.test(html)) fail('Inline scripts are not allowed in the secure clean foundation');
const browserSource = [app, core, music].join('\n');
if (/https?:\/\//i.test(browserSource)) fail('Browser runtime must not hard-code remote HTTP endpoints; external providers require same-origin adapters');

const requiredServices = ['dataFabric','eventFabric','identity','intelligence','agentFabric','workGraph','music','integrations'];
for (const name of requiredServices) {
  if (!cfg.services?.[name]) fail(`Missing core service configuration: ${name}`);
  if (!['active','verified','ready'].includes(cfg.services[name].status)) fail(`Core service is not release-ready: ${name}`);
}
for (const name of ['dataFabric','eventFabric','identity','workGraph']) {
  if (cfg.services[name].backendVerified !== true) fail(`Backend verification marker missing: ${name}`);
}
if (cfg.services.dataFabric.mode !== 'same-origin-adapter') fail('Data Fabric client access must use the same-origin adapter boundary');
if (cfg.services.identity.mode !== 'same-origin-adapter') fail('Identity client access must use the same-origin adapter boundary');
if (cfg.services.integrations.mode !== 'verified-same-origin-adapters') fail('External integrations must use verified same-origin adapters');

for (const marker of [
  'ATLASCoreServices','DataFabric','EventFabric','Identity','Intelligence','AgentFabric','WorkGraph','Integrations',
  'Dependency would create a cycle','High-risk execution requires explicit approval','ATLAS Data Fabric adapter is not connected.',
  "status:'disconnected'","typeof adapter.health!=='function'","result?.ok!==true","c.status==='connected'&&c.health?.ok===true"
]) {
  if (!core.includes(marker)) fail(`Core Services invariant missing: ${marker}`);
}
if (core.includes('setStatus(name,status)')) fail('Integrations may not be marked connected by an arbitrary status setter');
if (!core.includes('sessionStorage')) fail('Core execution state must remain bounded to browser session storage');
if (core.includes('localStorage')) fail('Core execution, evidence and audit-preview state must not persist in localStorage');

for (const skill of ['technical-support','deployment','security','knowledge','accounting','hr','iot-digital-twin']) {
  if (!core.includes(`'${skill}'`)) fail(`Agent Fabric skill missing: ${skill}`);
}

for (const title of ['First Light','Horizon Rise','Pulse Core','Focus Flow','Vector Drive','Calm Room']) {
  if (!music.includes(title)) fail(`ATLAS Original missing: ${title}`);
}
for (const marker of ["owner:'ATLAS Originals'","externalProvider:false","providerIndependent:true"]) {
  if (!music.includes(marker)) fail(`ATLAS Music rights/provider boundary missing: ${marker}`);
}
for (const forbidden of ['APPLE_MUSIC_DEVELOPER_TOKEN','YOUTUBE_API_KEY','OPENAI_API_KEY','youtube.com','music.apple.com']) {
  if (music.includes(forbidden)) fail(`ATLAS Music core must not depend on external provider configuration: ${forbidden}`);
}

for (const marker of [
  'X-Content-Type-Options: nosniff',
  'Referrer-Policy: strict-origin-when-cross-origin',
  'X-Frame-Options: DENY',
  'Strict-Transport-Security: max-age=31536000; includeSubDomains',
  'Cross-Origin-Opener-Policy: same-origin',
  'Cross-Origin-Resource-Policy: same-origin',
  "default-src 'self'",
  "connect-src 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  '/atlas.config.json',
  'Cache-Control: no-store, max-age=0',
  '/sw.js',
  'Service-Worker-Allowed: /'
]) {
  if (!headers.includes(marker)) fail(`Security header/config boundary missing: ${marker}`);
}

for (const marker of [
  "url.pathname.startsWith('/api/')",
  "url.pathname === '/atlas.config.json'",
  "fetch(request, { cache: 'no-store' })",
  "response.ok && response.type === 'basic'",
  'sameOrigin(url)',
  'cacheableStatic(url)',
  "'/core-services.css'",
  "'/core-services.js'",
  "'/music-core.js'"
]) {
  if (!sw.includes(marker)) fail(`Service Worker cache boundary missing: ${marker}`);
}
if (!sw.includes("const CACHE = 'atlas-core-services-v1.1.0'")) fail('Service Worker cache version must identify Core Services v1.1.0');
if (/c\.put\(e\.request/i.test(sw) || /cache\.put\(request,copy\)/i.test(sw)) {
  fail('Service Worker must not blindly cache every GET response');
}
const activeRedirects = redirects.split(/\r?\n/).map(line => line.trim()).filter(line => line && !line.startsWith('#'));
if (activeRedirects.length) fail('SPA fallback must be handled by Workers assets.not_found_handling, not a catch-all _redirects proxy');

const ignoredDirs = new Set(['.git', 'node_modules', 'dist']);
function walkRepo(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    if (entry.isDirectory() && ignoredDirs.has(entry.name)) return [];
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? walkRepo(full) : [full];
  });
}
const secretPatterns = [
  [/sb_secret_[A-Za-z0-9_-]{12,}/, 'Supabase secret key'],
  [/SUPABASE_SERVICE_ROLE_KEY\s*[:=]\s*[^\s"']{8,}/, 'Supabase service-role value'],
  [/DATABASE_URL\s*[:=]\s*(?:postgres|postgresql):\/\//i, 'database connection string'],
  [/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/, 'private key'],
  [/github_pat_[A-Za-z0-9_]{20,}/, 'GitHub token'],
  [/ghp_[A-Za-z0-9]{20,}/, 'GitHub personal access token'],
  [/sk-(?:proj-)?[A-Za-z0-9_-]{20,}/, 'API secret key']
];
for (const file of walkRepo(root)) {
  if (fs.statSync(file).size > 2_000_000) continue;
  let text;
  try { text = fs.readFileSync(file, 'utf8'); } catch { continue; }
  for (const [pattern, label] of secretPatterns) {
    if (pattern.test(text)) fail(`${label} pattern detected in ${path.relative(root, file)}`);
  }
}

console.log(`ATLAS Core Services validation passed: v${cfg.version}, ${cfg.modules.length} modules, ${cfg.regions.length} regions, ${requiredServices.length} core services; Workers security, cache, adapter and runtime boundaries verified.`);
