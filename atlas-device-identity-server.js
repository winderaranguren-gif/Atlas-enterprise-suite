const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = Number(process.env.ATLAS_IDENTITY_PORT || 4180);
const HOST = process.env.HOST || '0.0.0.0';
const TTL_MS = 2 * 60 * 1000;
const MAX_ACTIVE_CHALLENGES = 500;
const challenges = new Map();

function sendJson(res, status, payload) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer',
    'X-Frame-Options': 'DENY'
  });
  res.end(JSON.stringify(payload));
}

function readJson(req, limit = 5_500_000) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    let settled = false;

    req.on('data', chunk => {
      if (settled) return;
      size += chunk.length;
      if (size > limit) {
        settled = true;
        reject(Object.assign(new Error('payload_too_large'), { status: 413 }));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });

    req.on('end', () => {
      if (settled) return;
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}'));
      } catch {
        reject(Object.assign(new Error('invalid_json'), { status: 400 }));
      }
    });
    req.on('error', error => {
      if (!settled) reject(error);
    });
  });
}

function now() { return Date.now(); }
function cleanExpired() {
  for (const [id, item] of challenges) {
    if (item.expiresAt <= now()) challenges.delete(id);
  }
}
setInterval(cleanExpired, 30_000).unref();

function digestToken(token) {
  return crypto.createHash('sha256').update(String(token || '')).digest();
}

function tokenMatches(token, expectedDigest) {
  if (!token || !Buffer.isBuffer(expectedDigest)) return false;
  const actual = digestToken(token);
  return actual.length === expectedDigest.length && crypto.timingSafeEqual(actual, expectedDigest);
}

function isLoopback(hostname) {
  return ['127.0.0.1', 'localhost', '::1', '[::1]'].includes(String(hostname || '').toLowerCase());
}

function configuredPublicOrigin() {
  const raw = String(process.env.ATLAS_IDENTITY_PUBLIC_ORIGIN || '').trim();
  if (!raw) return null;

  let parsed;
  try { parsed = new URL(raw); }
  catch { throw Object.assign(new Error('invalid_public_origin'), { status: 503 }); }

  if (!['https:', 'http:'].includes(parsed.protocol)) {
    throw Object.assign(new Error('invalid_public_origin_protocol'), { status: 503 });
  }
  if (parsed.username || parsed.password) {
    throw Object.assign(new Error('public_origin_must_not_include_credentials'), { status: 503 });
  }
  if (parsed.protocol !== 'https:' && !isLoopback(parsed.hostname)) {
    throw Object.assign(new Error('public_origin_must_use_https'), { status: 503 });
  }
  return parsed.origin;
}

function safeState(item) {
  return {
    challengeId: item.id,
    status: item.status,
    createdAt: new Date(item.createdAt).toISOString(),
    expiresAt: new Date(item.expiresAt).toISOString(),
    verifiedAt: item.verifiedAt ? new Date(item.verifiedAt).toISOString() : null,
    reason: item.reason || null,
    liveness: item.liveness === true,
    faceMatch: item.faceMatch === true
  };
}

function bearerToken(req) {
  return String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
}

async function verifyWithLocalAdapter(selfieDataUrl, challengeId) {
  const target = process.env.ATLAS_LOCAL_FACE_VERIFY_URL || '';
  if (!target) return { ok: false, reason: 'local_face_verifier_not_configured' };

  let parsed;
  try { parsed = new URL(target); }
  catch { return { ok: false, reason: 'invalid_local_face_verifier_url' }; }

  if (!['127.0.0.1', 'localhost', '::1'].includes(parsed.hostname)) {
    return { ok: false, reason: 'face_verifier_must_be_localhost' };
  }

  const response = await fetch(parsed, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      challengeId,
      selfieDataUrl,
      requireLiveness: true,
      purpose: 'atlas-device-continuity-login'
    }),
    signal: AbortSignal.timeout(15_000)
  });

  if (!response.ok) return { ok: false, reason: `local_verifier_http_${response.status}` };
  const result = await response.json();
  return {
    ok: result.verified === true && result.liveness === true && result.faceMatch === true,
    liveness: result.liveness === true,
    faceMatch: result.faceMatch === true,
    reason: result.reason || null
  };
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
  const pathname = url.pathname;

  if (req.method === 'GET' && pathname === '/healthz') {
    return sendJson(res, 200, {
      ok: true,
      service: 'ATLAS Device Continuity Identity',
      publicOriginConfigured: Boolean(process.env.ATLAS_IDENTITY_PUBLIC_ORIGIN),
      localFaceVerifierConfigured: Boolean(process.env.ATLAS_LOCAL_FACE_VERIFY_URL),
      activeChallenges: challenges.size
    });
  }

  if (req.method === 'POST' && pathname === '/api/identity/challenges') {
    cleanExpired();
    if (challenges.size >= MAX_ACTIVE_CHALLENGES) {
      return sendJson(res, 429, { ok: false, error: 'too_many_active_challenges' });
    }

    let publicOrigin;
    try {
      publicOrigin = configuredPublicOrigin();
    } catch (error) {
      return sendJson(res, error.status || 503, { ok: false, error: error.message });
    }
    if (!publicOrigin) {
      return sendJson(res, 503, {
        ok: false,
        error: 'public_origin_not_configured',
        requirement: 'Set ATLAS_IDENTITY_PUBLIC_ORIGIN to an HTTPS origin reachable by the linked phone.'
      });
    }

    const id = crypto.randomUUID();
    const phoneToken = crypto.randomBytes(32).toString('base64url');
    const pollToken = crypto.randomBytes(32).toString('base64url');
    const createdAt = now();

    challenges.set(id, {
      id,
      phoneTokenHash: digestToken(phoneToken),
      pollTokenHash: digestToken(pollToken),
      createdAt,
      expiresAt: createdAt + TTL_MS,
      status: 'awaiting_phone',
      verifiedAt: null,
      reason: null,
      liveness: false,
      faceMatch: false
    });

    // Keep the one-time phone token in the URL fragment so it is not sent in the HTTP request or server logs.
    const phoneUrl = `${publicOrigin}/atlas-device-identity.html?mode=phone&challenge=${encodeURIComponent(id)}#token=${encodeURIComponent(phoneToken)}`;
    return sendJson(res, 201, {
      ok: true,
      challengeId: id,
      pollToken,
      phoneUrl,
      expiresInSeconds: TTL_MS / 1000
    });
  }

  const stateMatch = pathname.match(/^\/api\/identity\/challenges\/([^/]+)$/);
  if (req.method === 'GET' && stateMatch) {
    const id = stateMatch[1];
    const item = challenges.get(id);
    if (!item || item.expiresAt <= now()) {
      challenges.delete(id);
      return sendJson(res, 404, { ok: false, error: 'challenge_not_found_or_expired' });
    }

    const token = bearerToken(req);
    if (!tokenMatches(token, item.pollTokenHash)) {
      return sendJson(res, 403, { ok: false, error: 'invalid_poll_token' });
    }
    return sendJson(res, 200, { ok: true, ...safeState(item) });
  }

  const captureMatch = pathname.match(/^\/api\/identity\/challenges\/([^/]+)\/capture$/);
  if (req.method === 'POST' && captureMatch) {
    const id = captureMatch[1];
    const item = challenges.get(id);
    if (!item || item.expiresAt <= now()) {
      challenges.delete(id);
      return sendJson(res, 404, { ok: false, error: 'challenge_not_found_or_expired' });
    }
    if (item.status !== 'awaiting_phone') {
      return sendJson(res, 409, { ok: false, error: 'challenge_already_used' });
    }

    try {
      const body = await readJson(req);
      const token = String(body.token || '');
      if (!tokenMatches(token, item.phoneTokenHash)) {
        return sendJson(res, 403, { ok: false, error: 'invalid_phone_token' });
      }
      if (body.consent !== true) {
        return sendJson(res, 400, { ok: false, error: 'consent_required' });
      }
      if (!/^data:image\/(jpeg|png);base64,/i.test(String(body.selfieDataUrl || ''))) {
        return sendJson(res, 400, { ok: false, error: 'valid_selfie_required' });
      }

      item.status = 'verifying';
      item.phoneTokenHash = null;

      let verification;
      try {
        verification = await verifyWithLocalAdapter(body.selfieDataUrl, id);
      } catch (error) {
        verification = {
          ok: false,
          reason: error?.name === 'TimeoutError' ? 'local_verifier_timeout' : 'local_verifier_error'
        };
      }

      item.liveness = verification.liveness === true;
      item.faceMatch = verification.faceMatch === true;
      item.reason = verification.reason || null;
      item.status = verification.ok ? 'verified' : 'rejected';
      if (verification.ok) item.verifiedAt = now();

      // The selfie is intentionally never persisted in the challenge store or filesystem.
      return sendJson(res, verification.ok ? 200 : 422, { ok: verification.ok, ...safeState(item) });
    } catch (error) {
      return sendJson(res, error.status || 400, { ok: false, error: error.message || 'invalid_request' });
    }
  }

  if (req.method === 'DELETE' && stateMatch) {
    const id = stateMatch[1];
    const item = challenges.get(id);
    if (!item || item.expiresAt <= now()) {
      challenges.delete(id);
      return sendJson(res, 404, { ok: false, error: 'challenge_not_found_or_expired' });
    }

    const token = bearerToken(req);
    if (!tokenMatches(token, item.pollTokenHash)) {
      return sendJson(res, 403, { ok: false, error: 'invalid_poll_token' });
    }

    challenges.delete(id);
    return sendJson(res, 200, { ok: true, deleted: true });
  }

  if (req.method === 'GET' && (pathname === '/' || pathname === '/atlas-device-identity.html')) {
    const file = path.join(__dirname, 'atlas-device-identity.html');
    return fs.readFile(file, (error, data) => {
      if (error) return sendJson(res, 500, { ok: false, error: 'identity_ui_missing' });
      res.writeHead(200, {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
        'Referrer-Policy': 'no-referrer',
        'X-Frame-Options': 'DENY',
        'Permissions-Policy': 'camera=(self), microphone=(), geolocation=()',
        'Content-Security-Policy': "default-src 'self'; img-src 'self' data:; media-src 'self' blob:; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'"
      });
      res.end(data);
    });
  }

  if (req.method === 'GET' && pathname === '/atlas-device-identity.js') {
    const file = path.join(__dirname, 'atlas-device-identity.js');
    return fs.readFile(file, (error, data) => {
      if (error) return sendJson(res, 500, { ok: false, error: 'identity_script_missing' });
      res.writeHead(200, {
        'Content-Type': 'text/javascript; charset=utf-8',
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
        'Referrer-Policy': 'no-referrer'
      });
      res.end(data);
    });
  }

  return sendJson(res, 404, { ok: false, error: 'not_found' });
});

server.listen(PORT, HOST, () => {
  console.log(`ATLAS Device Continuity Identity listening on http://127.0.0.1:${PORT}`);
  console.log('Set ATLAS_IDENTITY_PUBLIC_ORIGIN to an HTTPS origin reachable by the linked phone.');
  if (!process.env.ATLAS_LOCAL_FACE_VERIFY_URL) {
    console.log('Face matching is fail-closed until ATLAS_LOCAL_FACE_VERIFY_URL points to a localhost verifier that returns verified + liveness + faceMatch.');
  }
});
