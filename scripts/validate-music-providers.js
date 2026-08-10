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
const fixes = read('atlas-music-fixes.js');
const gateway = read('cloudflare/music-gateway.js');
const entry = read('cloudflare/worker-entry.js');
const wrangler = read('wrangler.jsonc');
const sw = read('service-worker.js');

requirePattern(html, /atlas-config\.js/, 'ATLAS Music must load the configured ATLAS auth project before provider calls.');
requirePattern(html, /atlas-music-providers\.js/, 'ATLAS Music HTML must load the authorized provider client.');
requirePattern(html, /atlas-music-fixes\.js/, 'ATLAS Music HTML must load the post-review fixes layer.');
requirePattern(html, /strict-origin-when-cross-origin/, 'ATLAS Music must preserve a provider-compatible referrer policy.');
requirePattern(entry, /handleMusicApi/, 'Cloudflare worker entry must import the ATLAS Music provider gateway.');
requirePattern(entry, /url\.pathname\.startsWith\('\/api\/music\/'\)/, 'Cloudflare worker entry must route /api/music/ requests.');
requirePattern(entry, /authorizeProtectedApi/, 'ATLAS Music provider API must pass the Worker authentication boundary.');
requirePattern(entry, /validateSupabaseUser/, 'ATLAS Music provider API must validate the Supabase session server-side.');
requirePattern(entry, /ATLAS_API_RATE_LIMITER/, 'ATLAS Music provider API must be rate limited.');
requirePattern(wrangler, /"workers_dev"\s*:\s*false/, 'Production Music must not reopen a workers.dev surface.');
requirePattern(wrangler, /"ATLAS_API_RATE_LIMITER"/, 'Wrangler must bind the API rate limiter used by Music.');
requirePattern(gateway, /api\.music\.apple\.com\/v1\/catalog/, 'Apple Music catalog requests must use the official Apple Music API origin.');
requirePattern(gateway, /www\.googleapis\.com\/youtube\/v3\/search/, 'YouTube discovery must use the official YouTube Data API search endpoint.');
requirePattern(gateway, /videoEmbeddable/, 'YouTube search must request embeddable videos.');
requirePattern(gateway, /atlasVideoSync:\s*'not-granted'/, 'Third-party provider results must default ATLAS Video synchronization rights to not granted.');
requirePattern(client, /Usar en ATLAS Video/, 'Provider results must expose the ATLAS Video action boundary.');
requirePattern(client, /disabled = true/, 'ATLAS Video action must stay disabled for provider content without synchronization rights.');
requirePattern(fixes, /sb-\$\{ref\}-auth-token/, 'Music provider calls must use only the configured ATLAS Supabase session key.');
requirePattern(fixes, /Authorization.*Bearer/, 'Music provider requests must attach the authenticated bearer session.');
requirePattern(fixes, /fixedSelectTrack/, 'Track selection regression fix is missing.');
requirePattern(fixes, /fixedStepTrack/, 'Paused previous\/next regression fix is missing.');
requirePattern(fixes, /restartSynthAtOffset/, 'Seek must resynchronize audible synthesis.');
requirePattern(fixes, /data-new-folder-from-track/, 'Create-folder-from-track flow must preserve the pending track.');
requirePattern(fixes, /fixedRenderLibrary/, 'Library search regression fix is missing.');
requirePattern(fixes, /ATLASMusicProviders\?\.runSearch\?\.\(''\)/, 'Navigation must invalidate provider searches.');
requirePattern(fixes, /refreshStatus/, 'Provider modal must refresh live provider status.');
requirePattern(sw, /atlas-music-providers\.js/, 'ATLAS Music provider client must be in the PWA shell.');
requirePattern(sw, /atlas-music-fixes\.js/, 'ATLAS Music post-review fixes must be in the PWA shell.');
requirePattern(sw, /pathname\.startsWith\('\/api\/'\)/, 'Authenticated API responses must remain outside PWA caches.');

forbidPattern(client, /APPLE_MUSIC_DEVELOPER_TOKEN|YOUTUBE_API_KEY/, 'Provider secrets must never be referenced by the browser client.');
forbidPattern(html, /APPLE_MUSIC_DEVELOPER_TOKEN|YOUTUBE_API_KEY/, 'Provider secrets must never be embedded in ATLAS Music HTML.');
forbidPattern(client, /youtube.*download|download.*youtube/i, 'ATLAS Music must not implement YouTube downloading.');

console.log('ATLAS Music provider/security/post-review validation passed.');
