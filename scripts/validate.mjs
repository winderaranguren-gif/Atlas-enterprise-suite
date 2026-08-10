import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const required = [
  'package.json',
  'atlas.config.json',
  'wrangler.toml',
  'scripts/build.mjs',
  'public/index.html',
  'public/styles.css',
  'public/app.js',
  'public/atlas.config.json',
  'public/manifest.webmanifest',
  'public/sw.js',
  'public/_headers',
  'public/_redirects'
];

function fail(message) {
  console.error(`ATLAS clean-foundation validation failed: ${message}`);
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
const sw = read('public/sw.js');
const headers = read('public/_headers');
const redirects = read('public/_redirects');
const wrangler = read('wrangler.toml');
const build = read('scripts/build.mjs');

if (pkg.version !== cfg.version) fail('Version mismatch between package.json and atlas.config.json');
if (JSON.stringify(cfg) !== JSON.stringify(publicCfg)) fail('Root and public ATLAS runtime configuration must remain identical');
if (cfg.contact !== 'atlashealthfrontiers@gmail.com') fail('Operational contact mismatch');
if (!Array.isArray(cfg.modules) || cfg.modules.length < 20) fail('Module registry is incomplete');
if (!Array.isArray(cfg.regions) || !cfg.regions.includes(cfg.defaultRegion)) fail('Default region is not registered');
if (!pkg.scripts?.validate?.includes('scripts/validate.mjs')) fail('package.json must retain the clean-foundation validation gate');
if (!pkg.scripts?.build?.includes('scripts/build.mjs')) fail('package.json must retain the deterministic local build script');
if (pkg.scripts?.deploy !== 'npx wrangler@4 deploy') fail('Deployment must use the connected Cloudflare Workers service through Wrangler deploy');

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

if (!/<script\s+src=["']\/app\.js["']\s+defer><\/script>/.test(html)) fail('index.html must load app.js as an external deferred script');
if (/<script(?![^>]*\bsrc=)[^>]*>/i.test(html)) fail('Inline scripts are not allowed in the clean foundation');
if (/https?:\/\//i.test(app)) fail('Client application must not hard-code remote HTTP endpoints');

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
  'cacheableStatic(url)'
]) {
  if (!sw.includes(marker)) fail(`Service Worker cache boundary missing: ${marker}`);
}
if (/c\.put\(e\.request/i.test(sw) || /cache\.put\(request,copy\)/i.test(sw)) {
  fail('Service Worker must not blindly cache every GET response');
}
if (redirects.trim() !== '/* /index.html 200') fail('SPA redirect contract changed unexpectedly');

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

console.log(`ATLAS clean-foundation validation passed: v${cfg.version}, ${cfg.modules.length} modules, ${cfg.regions.length} regions; Workers Static Assets, security and cache boundaries verified.`);
