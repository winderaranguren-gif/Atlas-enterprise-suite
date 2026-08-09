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
  'atlas-device-identity-server.js',
  'vercel.json',
  'capacitor.config.json',
  'capacitor.config.ts'
]);
const publicDirectories = ['assets', 'icons', 'images', 'fonts', 'media'];

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

function deploymentRelativeUrl(htmlFile, assetName) {
  const assetPath = path.join(output, assetName);
  let relative = path.relative(path.dirname(htmlFile), assetPath).split(path.sep).join('/');
  if (!relative.startsWith('.')) relative = `./${relative}`;
  return relative;
}

function replaceOrInjectHeadAsset(html, matcher, tag) {
  if (matcher.test(html)) return html.replace(matcher, tag);
  if (/<\/head>/i.test(html)) return html.replace(/<\/head>/i, `  ${tag}\n</head>`);
  return `${tag}\n${html}`;
}

function replaceOrInjectBodyScript(html, matcher, tag) {
  if (matcher.test(html)) return html.replace(matcher, tag);
  if (/<\/body>/i.test(html)) return html.replace(/<\/body>/i, `  ${tag}\n</body>`);
  return `${html}\n${tag}\n`;
}

function injectAtlasRuntimeShell() {
  const htmlFiles = walkHtml(output);
  for (const filePath of htmlFiles) {
    let html = fs.readFileSync(filePath, 'utf8');
    const runtimeUrl = `${deploymentRelativeUrl(filePath, 'atlas-accessibility.js')}?v=4`;
    const baseStyleUrl = `${deploymentRelativeUrl(filePath, 'atlas-accessibility.css')}?v=4`;
    const designStyleUrl = `${deploymentRelativeUrl(filePath, 'atlas-accessibility-open-design.css')}?v=1`;
    const ownedCoreUrl = `${deploymentRelativeUrl(filePath, 'atlas-owned-core.js')}?v=1`;
    const localInferenceUrl = `${deploymentRelativeUrl(filePath, 'atlas-local-inference-provider.js')}?v=1`;

    const runtimeTag = `<script src="${runtimeUrl}" data-atlas-wu="0300"></script>`;
    const baseStyleTag = `<link rel="stylesheet" href="${baseStyleUrl}" data-atlas-wu="0300-base">`;
    const designStyleTag = `<link rel="stylesheet" href="${designStyleUrl}" data-atlas-wu="0300-design">`;
    const ownedCoreTag = `<script src="${ownedCoreUrl}" data-atlas-owned-core="1"></script>`;
    const localInferenceTag = `<script src="${localInferenceUrl}" data-atlas-self-hosted-ai="1"></script>`;

    html = replaceOrInjectHeadAsset(
      html,
      /<link\b[^>]*href=["'][^"']*atlas-accessibility\.css(?:\?[^"']*)?["'][^>]*>/i,
      baseStyleTag
    );
    html = replaceOrInjectHeadAsset(
      html,
      /<link\b[^>]*href=["'][^"']*atlas-accessibility-open-design\.css(?:\?[^"']*)?["'][^>]*>/i,
      designStyleTag
    );
    html = replaceOrInjectBodyScript(
      html,
      /<script\b[^>]*src=["'][^"']*atlas-owned-core\.js(?:\?[^"']*)?["'][^>]*>\s*<\/script>/i,
      ownedCoreTag
    );
    html = replaceOrInjectBodyScript(
      html,
      /<script\b[^>]*src=["'][^"']*atlas-local-inference-provider\.js(?:\?[^"']*)?["'][^>]*>\s*<\/script>/i,
      localInferenceTag
    );
    html = replaceOrInjectBodyScript(
      html,
      /<script\b[^>]*src=["'][^"']*atlas-accessibility\.js(?:\?[^"']*)?["'][^>]*>\s*<\/script>/i,
      runtimeTag
    );

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
    'atlas-owned-core.js',
    'atlas-local-inference-provider.js',
    'atlas-accessibility.js',
    'atlas-accessibility.css',
    'atlas-accessibility-open-design.css'
  ];
  const missing = required.filter((name) => !fs.existsSync(path.join(output, name)));
  if (missing.length) throw new Error(`Cloudflare build is missing required assets: ${missing.join(', ')}`);

  const invalidOwnedCore = [];
  const invalidLocalInference = [];
  const invalidRuntime = [];
  const invalidBaseStyle = [];
  const invalidDesign = [];
  for (const filePath of htmlFiles) {
    const html = fs.readFileSync(filePath, 'utf8');
    if (!/atlas-owned-core\.js\?v=1/i.test(html)) invalidOwnedCore.push(filePath);
    if (!/atlas-local-inference-provider\.js\?v=1/i.test(html)) invalidLocalInference.push(filePath);
    if (!/atlas-accessibility\.js\?v=4/i.test(html)) invalidRuntime.push(filePath);
    if (!/atlas-accessibility\.css\?v=4/i.test(html)) invalidBaseStyle.push(filePath);
    if (!/atlas-accessibility-open-design\.css\?v=1/i.test(html)) invalidDesign.push(filePath);
  }

  if (invalidOwnedCore.length) {
    throw new Error(`ATLAS Owned Core missing from: ${invalidOwnedCore.map((filePath) => path.relative(output, filePath)).join(', ')}`);
  }
  if (invalidLocalInference.length) {
    throw new Error(`ATLAS self-hosted inference adapter missing from: ${invalidLocalInference.map((filePath) => path.relative(output, filePath)).join(', ')}`);
  }
  if (invalidRuntime.length) {
    throw new Error(`ATLAS-WU-0300 v4 runtime missing from: ${invalidRuntime.map((filePath) => path.relative(output, filePath)).join(', ')}`);
  }
  if (invalidBaseStyle.length) {
    throw new Error(`ATLAS-WU-0300 base style missing from: ${invalidBaseStyle.map((filePath) => path.relative(output, filePath)).join(', ')}`);
  }
  if (invalidDesign.length) {
    throw new Error(`ATLAS-WU-0300 Open Design layer missing from: ${invalidDesign.map((filePath) => path.relative(output, filePath)).join(', ')}`);
  }
}

resetOutput();
copyPublicRootFiles();
for (const directory of publicDirectories) copyDirectory(path.join(root, directory), path.join(output, directory));
const htmlFiles = injectAtlasRuntimeShell();
writePagesCompatibilityFiles();
verifyRequiredFiles(htmlFiles);

console.log(`ATLAS Cloudflare build created at ${output} with ATLAS Owned Core, self-hosted inference adapter, and versioned ATLAS-WU-0300 accessibility on ${htmlFiles.length} HTML surfaces.`);