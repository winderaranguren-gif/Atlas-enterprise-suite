'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const output = path.join(root, 'dist');
const cloudflareOutput = path.join(root, 'cloudflare-assets');
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

function resetDirectory(directory) {
  fs.rmSync(directory, { recursive: true, force: true });
  fs.mkdirSync(directory, { recursive: true });
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
  const redirects = `/* /index.html 200\n`;
  fs.writeFileSync(path.join(output, '_headers'), headers, 'utf8');
  fs.writeFileSync(path.join(output, '_redirects'), redirects, 'utf8');
}

function verifyRequiredFiles(directory, label) {
  const required = ['index.html', 'styles.css', 'app.js', 'manifest.webmanifest', 'service-worker.js'];
  const missing = required.filter((name) => !fs.existsSync(path.join(directory, name)));
  if (missing.length) throw new Error(`${label} is missing required assets: ${missing.join(', ')}`);
}

resetDirectory(output);
copyPublicRootFiles();
for (const directory of publicDirectories) copyDirectory(path.join(root, directory), path.join(output, directory));
writePagesCompatibilityFiles();
verifyRequiredFiles(output, 'ATLAS build');

resetDirectory(cloudflareOutput);
copyDirectory(output, cloudflareOutput);
verifyRequiredFiles(cloudflareOutput, 'Cloudflare asset mirror');

console.log(`ATLAS web build created at ${output}`);
console.log(`ATLAS Cloudflare asset mirror created at ${cloudflareOutput}`);
