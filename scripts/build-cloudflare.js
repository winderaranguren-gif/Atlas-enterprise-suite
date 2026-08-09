'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const output = path.join(root, 'dist');
const publicExtensions = new Set([
  '.html', '.css', '.js', '.mjs', '.webmanifest', '.png', '.jpg', '.jpeg',
  '.webp', '.svg', '.ico', '.gif', '.woff', '.woff2', '.ttf', '.mp3', '.mp4'
]);
const excludedRootFiles = new Set([
  'server.js',
  'vercel.json',
  'capacitor.config.json',
  'capacitor.config.ts'
]);
const publicDirectories = ['assets', 'icons', 'images', 'fonts', 'media'];
const accessibilityScript = '<script src="/atlas-accessibility.js?v=4" data-atlas-wu="0300"></script>';
const accessibilityDesignStyle = '<link rel="stylesheet" href="/atlas-accessibility-open-design.css?v=1" data-atlas-wu="0300-design">';

function resetOutput() {
  fs.rmSync(output, { recursive: true, force: true });
  fs.mkdirSync(output, { recursive: true });
}

function copyFile(source, destination) {
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.copyFileSync(source, destination);
}

function copyDirectory(source, destination) {
  if (!fs.existsSync(source)) return;
  fs.cpSync(source, destination, { recursive: true });
}

function copyPublicRootFiles() {
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    if (!entry.isFile()) continue;
    if (excludedRootFiles.has(entry.name)) continue;
    if (!publicExtensions.has(path.extname(entry.name).toLowerCase())) continue;
    copyFile(path.join(root, entry.name), path.join(output, entry.name));
  }
}

function walkHtml(directory, files = []) {
  if (!fs.existsSync(directory)) return files;
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) walkHtml(fullPath, files);
    else if (entry.isFile() && path.extname(entry.name).toLowerCase() === '.html') files.push(fullPath);
  }
  return files;
}

function injectAccessibilityShell() {
  const htmlFiles = walkHtml(output);
  for (const filePath of htmlFiles) {
    let html = fs.readFileSync(filePath, 'utf8');

    if (!/atlas-accessibility-open-design\.css/i.test(html)) {
      if (/<\/head>/i.test(html)) html = html.replace(/<\/head>/i, `  ${accessibilityDesignStyle}\n</head>`);
      else html = `${accessibilityDesignStyle}\n${html}`;
    }

    if (!/atlas-accessibility\.js/i.test(html)) {
      if (/<\/body>/i.test(html)) html = html.replace(/<\/body>/i, `  ${accessibilityScript}\n</body>`);
      else html += `\n${accessibilityScript}\n`;
    }

    fs.writeFileSync(filePath, html, 'utf8');
  }
  return htmlFiles;
}

function writePagesCompatibilityFiles() {
  const headers = `/*
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  X-Frame-Options: DENY
  Cross-Origin-Opener-Policy: same-origin
  Permissions-Policy: camera=(self), microphone=(self), geolocation=(self)
  Content-Security-Policy: default-src 'self'; script-src 'self' https://cdn.jsdelivr.net; connect-src 'self' https://*.supabase.co wss://*.supabase.co; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; media-src 'self' blob:; worker-src 'self' blob:; frame-ancestors 'none'; base-uri 'self'; form-action 'self'

/*.html
  Cache-Control: no-store, max-age=0

/service-worker.js
  Cache-Control: public, max-age=0, must-revalidate
`;
  const redirects = `/atlas-pallet-spatial-countll /atlas-pallet-spatial-count.html 302
/atlas-pallet-spatial-count /atlas-pallet-spatial-count.html 302
/* /index.html 200\n`;
  fs.writeFileSync(path.join(output, '_headers'), headers, 'utf8');
  fs.writeFileSync(path.join(output, '_redirects'), redirects, 'utf8');
}

function verifyRequiredFiles(htmlFiles) {
  const required = [
    'index.html',
    'styles.css',
    'app.js',
    'manifest.webmanifest',
    'service-worker.js',
    'atlas-accessibility.js',
    'atlas-accessibility.css',
    'atlas-accessibility-open-design.css'
  ];
  const missing = required.filter((name) => !fs.existsSync(path.join(output, name)));
  if (missing.length) throw new Error(`Cloudflare build is missing required assets: ${missing.join(', ')}`);

  const withoutRuntime = htmlFiles.filter((filePath) => !/atlas-accessibility\.js/i.test(fs.readFileSync(filePath, 'utf8')));
  if (withoutRuntime.length) {
    throw new Error(`ATLAS-WU-0300 accessibility runtime missing from: ${withoutRuntime.map((filePath) => path.relative(output, filePath)).join(', ')}`);
  }

  const withoutDesign = htmlFiles.filter((filePath) => !/atlas-accessibility-open-design\.css/i.test(fs.readFileSync(filePath, 'utf8')));
  if (withoutDesign.length) {
    throw new Error(`ATLAS-WU-0300 Open Design layer missing from: ${withoutDesign.map((filePath) => path.relative(output, filePath)).join(', ')}`);
  }
}

resetOutput();
copyPublicRootFiles();
for (const directory of publicDirectories) copyDirectory(path.join(root, directory), path.join(output, directory));
const htmlFiles = injectAccessibilityShell();
writePagesCompatibilityFiles();
verifyRequiredFiles(htmlFiles);

console.log(`ATLAS Cloudflare build created at ${output} with ATLAS-WU-0300 accessibility and Open Design on ${htmlFiles.length} HTML surfaces.`);
