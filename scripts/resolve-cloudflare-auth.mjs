import { appendFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const raw = String(process.env.RAW_CLOUDFLARE_API_TOKEN || '');
const accountId = String(process.env.CLOUDFLARE_ACCOUNT_ID || '').trim();
const githubEnv = process.env.GITHUB_ENV;

function fail(message, diagnostics = {}) {
  console.error(`::error::${message}`);
  console.error(JSON.stringify(diagnostics));
  process.exit(1);
}

if (!raw.trim()) fail('CLOUDFLARE_API_TOKEN is missing.');
if (!accountId) fail('CLOUDFLARE_ACCOUNT_ID is missing.');
if (!githubEnv) fail('GITHUB_ENV is unavailable; refusing to persist resolved credentials.');

const cleaned = raw
  .replace(/[\u200B-\u200D\u2060\uFEFF]/g, '')
  .replace(/[\r\n\t]/g, '')
  .trim()
  .replace(/^["'`“”‘’]+|["'`“”‘’]+$/g, '')
  .trim();

const candidates = [];
const add = (value) => {
  const v = String(value ?? '')
    .replace(/[\u200B-\u200D\u2060\uFEFF]/g, '')
    .replace(/[\r\n\t]/g, '')
    .trim()
    .replace(/^["'`“”‘’]+|["'`“”‘’]+$/g, '')
    .replace(/^\s*CLOUDFLARE_API_TOKEN\s*=\s*/i, '')
    .replace(/^\s*(?:API\s*TOKEN|TOKEN)\s*[:=]\s*/i, '')
    .replace(/^\s*Authorization\s*:\s*/i, '')
    .replace(/^\s*Bearer\s+/i, '')
    .trim();
  if (v && !/[\s\x00-\x1F\x7F]/.test(v) && !candidates.includes(v)) candidates.push(v);
};

add(cleaned);
try {
  const parsed = JSON.parse(raw);
  const walk = (value) => {
    if (typeof value === 'string') add(value);
    else if (Array.isArray(value)) value.forEach(walk);
    else if (value && typeof value === 'object') Object.values(value).forEach(walk);
  };
  walk(parsed);
} catch {}
for (const match of cleaned.matchAll(/\b(?:cfat|cfut)_[A-Za-z0-9_-]{10,}\b/g)) add(match[0]);
for (const match of cleaned.matchAll(/[A-Za-z0-9_-]{30,}/g)) add(match[0]);

// Recover credentials that were accidentally saved as colon-delimited pairs
// such as label:token, account-id:token, or Authorization:Bearer token.
// Each segment is tested independently without ever printing its value.
const colonSegments = cleaned
  .split(':')
  .map((segment) => segment.trim())
  .filter(Boolean);
if (colonSegments.length > 1 && colonSegments.length <= 4) {
  for (const segment of colonSegments) add(segment);
}

const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx';
function wranglerWhoami(env) {
  const result = spawnSync(npx, ['wrangler', 'whoami'], {
    encoding: 'utf8',
    env: { ...process.env, CLOUDFLARE_ACCOUNT_ID: accountId, ...env },
  });
  const text = `${result.stdout || ''}\n${result.stderr || ''}`;
  return result.status === 0 && text.includes(accountId);
}

for (const candidate of candidates) {
  console.log(`::add-mask::${candidate}`);
  if (wranglerWhoami({ CLOUDFLARE_API_TOKEN: candidate, CLOUDFLARE_API_KEY: '', CLOUDFLARE_EMAIL: '' })) {
    appendFileSync(githubEnv, `CLOUDFLARE_API_TOKEN=${candidate}\n`, 'utf8');
    console.log('Cloudflare authentication resolved as API token.');
    process.exit(0);
  }
}

let legacy = null;
const colon = cleaned.indexOf(':');
if (colon > 0 && colon === cleaned.lastIndexOf(':')) {
  const email = cleaned.slice(0, colon).trim();
  const key = cleaned.slice(colon + 1).trim();
  const emailLike = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const keyLike = key.length >= 20 && !/[\s\x00-\x1F\x7F]/.test(key);
  if (emailLike && keyLike) legacy = { email, key };
}

if (legacy) {
  console.log(`::add-mask::${legacy.email}`);
  console.log(`::add-mask::${legacy.key}`);
  if (wranglerWhoami({ CLOUDFLARE_API_TOKEN: '', CLOUDFLARE_API_KEY: legacy.key, CLOUDFLARE_EMAIL: legacy.email })) {
    appendFileSync(githubEnv, `CLOUDFLARE_API_KEY=${legacy.key}\nCLOUDFLARE_EMAIL=${legacy.email}\n`, 'utf8');
    console.log('Cloudflare authentication resolved as legacy API key + email.');
    process.exit(0);
  }
}

fail('Stored Cloudflare credential does not authenticate the configured ATLAS account.', {
  rawLength: [...raw].length,
  candidates: candidates.length,
  prefixedCandidates: candidates.filter((v) => /^cf(?:at|ut)_/.test(v)).length,
  rawContainsWhitespace: /\s/.test(raw),
  rawContainsColon: /:/.test(raw),
  colonSegments: colonSegments.length,
  colonSegmentLengths: colonSegments.map((v) => [...v].length),
  legacyPairShapeDetected: Boolean(legacy),
});
