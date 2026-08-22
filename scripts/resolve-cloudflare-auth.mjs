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

// Recover credentials accidentally saved as colon-delimited pairs such as
// label:token, account-id:token, or Authorization:Bearer token. Each segment
// is tested independently without ever printing its value.
const colonSegments = cleaned
  .split(':')
  .map((segment) => segment.trim())
  .filter(Boolean);
if (colonSegments.length > 1 && colonSegments.length <= 4) {
  for (const segment of colonSegments) add(segment);
}

async function cloudflareTokenActive(candidate) {
  // Cloudflare documents both endpoints for testing whether an API token is
  // active. Prefer the configured account-scoped endpoint, then fall back to
  // the user-token endpoint for user-issued scoped tokens. This avoids
  // requiring `wrangler whoami` to enumerate account metadata just to prove
  // token validity.
  const endpoints = [
    `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(accountId)}/tokens/verify`,
    'https://api.cloudflare.com/client/v4/user/tokens/verify',
  ];

  for (const endpoint of endpoints) {
    try {
      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${candidate}`,
          'Content-Type': 'application/json',
        },
      });
      if (!response.ok) continue;
      const payload = await response.json();
      if (payload?.success === true && payload?.result?.status === 'active') return true;
    } catch {}
  }
  return false;
}

for (const candidate of candidates) {
  console.log(`::add-mask::${candidate}`);
  if (await cloudflareTokenActive(candidate)) {
    appendFileSync(githubEnv, `CLOUDFLARE_API_TOKEN=${candidate}\n`, 'utf8');
    console.log('Cloudflare authentication resolved as active API token.');
    process.exit(0);
  }
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

fail('Stored Cloudflare credential is not an active API token for the configured ATLAS Cloudflare account.', {
  rawLength: [...raw].length,
  candidates: candidates.length,
  prefixedCandidates: candidates.filter((v) => /^cf(?:at|ut)_/.test(v)).length,
  rawContainsWhitespace: /\s/.test(raw),
  rawContainsColon: /:/.test(raw),
  colonSegments: colonSegments.length,
  colonSegmentLengths: colonSegments.map((v) => [...v].length),
  legacyPairShapeDetected: Boolean(legacy),
});
