'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');

function read(relativePath) {
  const filePath = path.join(root, relativePath);
  if (!fs.existsSync(filePath)) throw new Error(`Missing required ATLAS Music provider file: ${relativePath}`);
  return fs.readFileSync(filePath, 'utf8');
}

function requirePattern(text, pattern, message) {
  if (!pattern.test(text)) throw new Error(message);
}

function forbidPattern(text, pattern, message) {
  if (pattern.test(text)) throw new Error(message);
}

const html = read('atlas-music.html');
const client = read('atlas-music-providers.js');
const gateway = read('cloudflare/music-gateway.js');
const entry = read('cloudflare/worker-entry.js');
const sw = read('service-worker.js');

requirePattern(html, /atlas-music-providers\.js/, 'ATLAS Music HTML must load the authorized provider client.');
requirePattern(html, /strict-origin-when-cross-origin/, 'ATLAS Music must preserve a provider-compatible referrer policy.');
requirePattern(entry, /handleMusicApi/, 'Cloudflare worker entry must import the ATLAS Music provider gateway.');
requirePattern(entry, /\/api\/music\//, 'Cloudflare worker entry must route /api/music/ requests.');
requirePattern(gateway, /api\.music\.apple\.com\/v1\/catalog/, 'Apple Music catalog requests must use the official Apple Music API origin.');
requirePattern(gateway, /www\.googleapis\.com\/youtube\/v3\/search/, 'YouTube discovery must use the official YouTube Data API search endpoint.');
requirePattern(gateway, /videoEmbeddable/, 'YouTube search must request embeddable videos.');
requirePattern(gateway, /atlasVideoSync:\s*'not-granted'/, 'Third-party provider results must default ATLAS Video synchronization rights to not granted.');
requirePattern(client, /Usar en ATLAS Video/, 'Provider results must expose the ATLAS Video action boundary.');
requirePattern(client, /disabled = true/, 'ATLAS Video action must stay disabled for provider content without synchronization rights.');
requirePattern(sw, /atlas-music-providers\.js/, 'ATLAS Music provider client must be in the PWA shell.');

forbidPattern(client, /APPLE_MUSIC_DEVELOPER_TOKEN|YOUTUBE_API_KEY/, 'Provider secrets must never be referenced by the browser client.');
forbidPattern(html, /APPLE_MUSIC_DEVELOPER_TOKEN|YOUTUBE_API_KEY/, 'Provider secrets must never be embedded in ATLAS Music HTML.');
forbidPattern(client, /youtube.*download|download.*youtube/i, 'ATLAS Music must not implement YouTube downloading.');

console.log('ATLAS Music provider boundary validation passed.');
