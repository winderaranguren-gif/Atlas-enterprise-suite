const ITERATIONS = 310000;
const SESSION_HOURS = 12;
const MAX_FAILED_LOGINS = 5;
const LOCK_MINUTES = 15;

function json(body, status = 200, extraHeaders = {}) {
  return Response.json(body, {
    status,
    headers: { 'cache-control': 'no-store', ...extraHeaders }
  });
}

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

function cleanDisplayName(value) {
  return String(value || '').trim().slice(0, 120);
}

function validEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254;
}

function validPassword(password) {
  return typeof password === 'string' && password.length >= 12 && password.length <= 256;
}

function bytesToHex(bytes) {
  return [...bytes].map(byte => byte.toString(16).padStart(2, '0')).join('');
}

function hexToBytes(hex) {
  if (!/^[0-9a-f]+$/i.test(hex) || hex.length % 2) throw new Error('invalid_hex');
  return new Uint8Array(hex.match(/.{2}/g).map(part => Number.parseInt(part, 16)));
}

function randomHex(length = 32) {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return bytesToHex(bytes);
}

async function sha256Hex(value) {
  const data = typeof value === 'string' ? new TextEncoder().encode(value) : value;
  const digest = await crypto.subtle.digest('SHA-256', data);
  return bytesToHex(new Uint8Array(digest));
}

async function derivePasswordHash(password, saltHex, iterations = ITERATIONS) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  );
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: hexToBytes(saltHex), iterations },
    key,
    256
  );
  return bytesToHex(new Uint8Array(bits));
}

function constantTimeHexEqual(left, right) {
  if (typeof left !== 'string' || typeof right !== 'string' || left.length !== right.length) return false;
  let mismatch = 0;
  for (let i = 0; i < left.length; i += 1) mismatch |= left.charCodeAt(i) ^ right.charCodeAt(i);
  return mismatch === 0;
}

function bearerToken(request) {
  const auth = request.headers.get('authorization') || '';
  return auth.startsWith('Bearer ') ? auth.slice(7).trim() : null;
}

async function audit(env, { userId = null, action, decision, metadata = null }) {
  if (!env.DB) return;
  await env.DB.prepare(
    'INSERT INTO auth_audit_events(id,user_id,action,decision,metadata_json) VALUES(?,?,?,?,?)'
  ).bind(crypto.randomUUID(), userId, action, decision, metadata ? JSON.stringify(metadata) : null).run();
}

function databaseRequired(env) {
  return env.DB ? null : json({ ok: false, error: 'identity_database_unavailable' }, 503);
}

async function bootstrap(request, env) {
  const unavailable = databaseRequired(env);
  if (unavailable) return unavailable;
  if (!env.ATLAS_BOOTSTRAP_TOKEN) return json({ ok: false, error: 'bootstrap_not_configured' }, 503);

  const token = bearerToken(request);
  if (!token || !constantTimeHexEqual(await sha256Hex(token), await sha256Hex(env.ATLAS_BOOTSTRAP_TOKEN))) {
    await audit(env, { action: 'auth.bootstrap', decision: 'deny', metadata: { reason: 'invalid_bootstrap_token' } });
    return json({ ok: false, error: 'unauthorized' }, 401);
  }

  const countRow = await env.DB.prepare('SELECT COUNT(*) AS count FROM users').first();
  if (Number(countRow?.count || 0) !== 0) return json({ ok: false, error: 'bootstrap_already_completed' }, 409);

  const body = await request.json().catch(() => null);
  const email = normalizeEmail(body?.email);
  const displayName = cleanDisplayName(body?.displayName);
  const password = body?.password;
  if (!validEmail(email)) return json({ ok: false, error: 'valid_email_required' }, 400);
  if (displayName.length < 2) return json({ ok: false, error: 'display_name_required' }, 400);
  if (!validPassword(password)) return json({ ok: false, error: 'password_must_be_12_to_256_characters' }, 400);

  const id = crypto.randomUUID();
  const salt = randomHex(16);
  const passwordHash = await derivePasswordHash(password, salt);
  await env.DB.prepare(
    'INSERT INTO users(id,email,display_name,password_hash,password_salt,password_iterations) VALUES(?,?,?,?,?,?)'
  ).bind(id, email, displayName, passwordHash, salt, ITERATIONS).run();
  await audit(env, { userId: id, action: 'auth.bootstrap', decision: 'allow' });
  return json({ ok: true, user: { id, email, displayName } }, 201);
}

async function login(request, env) {
  const unavailable = databaseRequired(env);
  if (unavailable) return unavailable;
  const body = await request.json().catch(() => null);
  const email = normalizeEmail(body?.email);
  const password = body?.password;
  if (!validEmail(email) || typeof password !== 'string') return json({ ok: false, error: 'invalid_credentials' }, 401);

  const user = await env.DB.prepare(
    'SELECT id,email,display_name,password_hash,password_salt,password_iterations,status,failed_login_count,locked_until FROM users WHERE email=?'
  ).bind(email).first();
  if (!user) {
    await audit(env, { action: 'auth.login', decision: 'deny', metadata: { reason: 'invalid_credentials' } });
    return json({ ok: false, error: 'invalid_credentials' }, 401);
  }
  if (user.status !== 'active') {
    await audit(env, { userId: user.id, action: 'auth.login', decision: 'deny', metadata: { reason: 'user_inactive' } });
    return json({ ok: false, error: 'account_unavailable' }, 403);
  }
  if (user.locked_until && Date.parse(user.locked_until) > Date.now()) {
    await audit(env, { userId: user.id, action: 'auth.login', decision: 'deny', metadata: { reason: 'temporarily_locked' } });
    return json({ ok: false, error: 'account_temporarily_locked' }, 429);
  }

  const candidateHash = await derivePasswordHash(password, user.password_salt, Number(user.password_iterations));
  if (!constantTimeHexEqual(candidateHash, user.password_hash)) {
    const failures = Number(user.failed_login_count || 0) + 1;
    const lockUntil = failures >= MAX_FAILED_LOGINS
      ? new Date(Date.now() + LOCK_MINUTES * 60_000).toISOString()
      : null;
    await env.DB.prepare(
      'UPDATE users SET failed_login_count=?,locked_until=?,updated_at=CURRENT_TIMESTAMP WHERE id=?'
    ).bind(failures >= MAX_FAILED_LOGINS ? 0 : failures, lockUntil, user.id).run();
    await audit(env, { userId: user.id, action: 'auth.login', decision: 'deny', metadata: { reason: 'invalid_credentials' } });
    return json({ ok: false, error: 'invalid_credentials' }, 401);
  }

  await env.DB.prepare(
    'UPDATE users SET failed_login_count=0,locked_until=NULL,updated_at=CURRENT_TIMESTAMP WHERE id=?'
  ).bind(user.id).run();

  const sessionToken = randomHex(32);
  const tokenHash = await sha256Hex(sessionToken);
  const sessionId = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + SESSION_HOURS * 60 * 60_000).toISOString();
  await env.DB.prepare(
    'INSERT INTO sessions(id,user_id,token_hash,expires_at) VALUES(?,?,?,?)'
  ).bind(sessionId, user.id, tokenHash, expiresAt).run();
  await audit(env, { userId: user.id, action: 'auth.login', decision: 'allow' });

  return json({
    ok: true,
    sessionToken,
    expiresAt,
    user: { id: user.id, email: user.email, displayName: user.display_name }
  });
}

export async function requireSession(request, env) {
  if (!env.DB) return { ok: false, status: 503, error: 'identity_database_unavailable' };
  const token = bearerToken(request);
  if (!token) return { ok: false, status: 401, error: 'authentication_required' };
  const tokenHash = await sha256Hex(token);
  const session = await env.DB.prepare(`
    SELECT s.id AS session_id,s.user_id,s.expires_at,u.email,u.display_name,u.status
    FROM sessions s JOIN users u ON u.id=s.user_id
    WHERE s.token_hash=? AND s.revoked_at IS NULL AND s.expires_at>CURRENT_TIMESTAMP
  `).bind(tokenHash).first();
  if (!session || session.status !== 'active') return { ok: false, status: 401, error: 'invalid_session' };
  await env.DB.prepare('UPDATE sessions SET last_seen_at=CURRENT_TIMESTAMP WHERE id=?').bind(session.session_id).run();
  return { ok: true, session };
}

async function me(request, env) {
  const auth = await requireSession(request, env);
  if (!auth.ok) return json({ ok: false, error: auth.error }, auth.status);
  return json({
    ok: true,
    user: {
      id: auth.session.user_id,
      email: auth.session.email,
      displayName: auth.session.display_name
    },
    session: { id: auth.session.session_id, expiresAt: auth.session.expires_at }
  });
}

async function logout(request, env) {
  const auth = await requireSession(request, env);
  if (!auth.ok) return json({ ok: false, error: auth.error }, auth.status);
  await env.DB.prepare('UPDATE sessions SET revoked_at=CURRENT_TIMESTAMP WHERE id=?').bind(auth.session.session_id).run();
  await audit(env, { userId: auth.session.user_id, action: 'auth.logout', decision: 'allow' });
  return json({ ok: true });
}

export async function authRoutes(request, env, url = new URL(request.url)) {
  if (url.pathname === '/api/auth/bootstrap' && request.method === 'POST') return bootstrap(request, env);
  if (url.pathname === '/api/auth/login' && request.method === 'POST') return login(request, env);
  if (url.pathname === '/api/auth/me' && request.method === 'GET') return me(request, env);
  if (url.pathname === '/api/auth/logout' && request.method === 'POST') return logout(request, env);
  return null;
}
