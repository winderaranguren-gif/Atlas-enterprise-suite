'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const {
  MODES,
  assertCoordinate,
  searchPlaces,
  routeValhalla,
  routeExternal,
  queryLiveProvider
} = require('./providers');

const PORT = Number(process.env.ATLAS_GPS_PORT || 4280);
const HOST = process.env.ATLAS_GPS_HOST || '127.0.0.1';
const STARTED_AT = Date.now();
const MAX_BODY_BYTES = 1024 * 1024;
const allowedOrigins = new Set((process.env.ATLAS_GPS_ALLOWED_ORIGINS || 'http://127.0.0.1:4173').split(',').map((value) => value.trim()).filter(Boolean));
const adminToken = process.env.ATLAS_GPS_ADMIN_TOKEN || '';
const locationRetentionSeconds = Math.max(0, Number(process.env.ATLAS_GPS_LOCATION_RETENTION_SECONDS || 0));
const rateBuckets = new Map();
const encryptedLocationStore = new Map();

const config = Object.freeze({
  tileStyleUrl: process.env.ATLAS_TILE_STYLE_URL || '',
  tileServerUrl: process.env.ATLAS_TILE_SERVER_URL || '',
  searchUrl: process.env.ATLAS_SEARCH_URL || '',
  routerUrl: process.env.ATLAS_ROUTER_URL || '',
  offlineBaseUrl: process.env.ATLAS_OFFLINE_BASE_URL || '',
  maritimeUrl: process.env.ATLAS_MARITIME_URL || '',
  maritimeToken: process.env.ATLAS_MARITIME_TOKEN || '',
  aviationUrl: process.env.ATLAS_AVIATION_URL || '',
  aviationToken: process.env.ATLAS_AVIATION_TOKEN || ''
});

const liveProviders = Object.freeze([
  ['traffic', 'ATLAS_TRAFFIC_URL', 'ATLAS_TRAFFIC_TOKEN'],
  ['incidents', 'ATLAS_INCIDENTS_URL', 'ATLAS_INCIDENTS_TOKEN'],
  ['closures', 'ATLAS_CLOSURES_URL', 'ATLAS_CLOSURES_TOKEN'],
  ['construction', 'ATLAS_CONSTRUCTION_URL', 'ATLAS_CONSTRUCTION_TOKEN'],
  ['floods', 'ATLAS_FLOODS_URL', 'ATLAS_FLOODS_TOKEN'],
  ['weather', 'ATLAS_WEATHER_URL', 'ATLAS_WEATHER_TOKEN'],
  ['road-status', 'ATLAS_ROAD_STATUS_URL', 'ATLAS_ROAD_STATUS_TOKEN'],
  ['transit', 'ATLAS_TRANSIT_URL', 'ATLAS_TRANSIT_TOKEN']
]);

function requestOrigin(req) {
  return req.headers.origin || '';
}

function corsHeaders(req) {
  const origin = requestOrigin(req);
  const allowed = allowedOrigins.has(origin) ? origin : '';
  return {
    ...(allowed ? { 'access-control-allow-origin': allowed } : {}),
    'access-control-allow-methods': 'GET,POST,DELETE,OPTIONS',
    'access-control-allow-headers': 'content-type,authorization,x-atlas-admin-token,x-atlas-client-id',
    'access-control-max-age': '600',
    vary: 'Origin'
  };
}

function baseHeaders(req, requestId) {
  return {
    ...corsHeaders(req),
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'x-content-type-options': 'nosniff',
    'referrer-policy': 'no-referrer',
    'permissions-policy': 'camera=(), microphone=(), geolocation=()',
    'x-atlas-request-id': requestId
  };
}

function sendJson(req, res, status, payload, requestId) {
  res.writeHead(status, baseHeaders(req, requestId));
  res.end(JSON.stringify(payload));
}

function sendError(req, res, status, message, requestId, details = null) {
  sendJson(req, res, status, { error: message, requestId, details }, requestId);
}

function clientKey(req) {
  return req.headers['x-atlas-client-id'] || req.socket.remoteAddress || 'unknown';
}

function enforceRateLimit(req, limit = 120, windowMs = 60000) {
  const key = `${clientKey(req)}:${req.url.split('?')[0]}`;
  const now = Date.now();
  const bucket = rateBuckets.get(key);
  if (!bucket || now - bucket.startedAt >= windowMs) {
    rateBuckets.set(key, { startedAt: now, count: 1 });
    return true;
  }
  bucket.count += 1;
  return bucket.count <= limit;
}

async function readJson(req) {
  let bytes = 0;
  const chunks = [];
  for await (const chunk of req) {
    bytes += chunk.length;
    if (bytes > MAX_BODY_BYTES) throw new Error('Request body is too large');
    chunks.push(chunk);
  }
  if (!chunks.length) return {};
  const text = Buffer.concat(chunks).toString('utf8');
  return JSON.parse(text);
}

function requireAdmin(req) {
  if (!adminToken) return false;
  const supplied = req.headers['x-atlas-admin-token'] || '';
  const a = Buffer.from(String(supplied));
  const b = Buffer.from(String(adminToken));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function manifestPath() {
  const candidates = [
    '/app/offline/manifest.json',
    path.resolve(__dirname, '../offline/manifest.json')
  ];
  return candidates.find((candidate) => fs.existsSync(candidate)) || null;
}

function readManifest() {
  const file = manifestPath();
  if (!file) return { version: 1, generatedAt: null, regions: [] };
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function parseEncryptionKey() {
  const encoded = process.env.ATLAS_GPS_LOCATION_ENCRYPTION_KEY_B64 || '';
  if (!encoded) return null;
  const key = Buffer.from(encoded, 'base64');
  return key.length === 32 ? key : null;
}

function encryptLocation(payload) {
  const key = parseEncryptionKey();
  if (!key) throw new Error('Location encryption key is not configured');
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const ciphertext = Buffer.concat([cipher.update(JSON.stringify(payload), 'utf8'), cipher.final()]);
  return {
    iv: iv.toString('base64'),
    tag: cipher.getAuthTag().toString('base64'),
    ciphertext: ciphertext.toString('base64')
  };
}

function purgeExpiredLocations() {
  if (locationRetentionSeconds <= 0) {
    encryptedLocationStore.clear();
    return;
  }
  const cutoff = Date.now() - locationRetentionSeconds * 1000;
  for (const [clientId, records] of encryptedLocationStore.entries()) {
    const retained = records.filter((record) => record.createdAt >= cutoff);
    if (retained.length) encryptedLocationStore.set(clientId, retained);
    else encryptedLocationStore.delete(clientId);
  }
}

function providerStatus() {
  return liveProviders.map(([name, urlKey]) => ({
    name,
    configured: Boolean(process.env[urlKey])
  }));
}

async function handleHealth(req, res, requestId) {
  sendJson(req, res, 200, {
    service: 'atlas-gps-gateway',
    status: 'ok',
    uptimeSeconds: Math.round((Date.now() - STARTED_AT) / 1000),
    now: new Date().toISOString(),
    services: {
      tiles: Boolean(config.tileStyleUrl || config.tileServerUrl),
      search: Boolean(config.searchUrl),
      routing: Boolean(config.routerUrl),
      offline: Boolean(config.offlineBaseUrl),
      live: providerStatus()
    }
  }, requestId);
}

async function handlePublicConfig(req, res, requestId) {
  sendJson(req, res, 200, {
    apiVersion: '1.0',
    tileStyleUrl: config.tileStyleUrl || null,
    modes: MODES,
    offlineManifest: '/v1/offline/manifest',
    privacy: {
      locationHistoryEnabled: locationRetentionSeconds > 0,
      locationRetentionSeconds,
      rawCameraUploadEnabled: false,
      purgeEndpoint: '/v1/privacy/purge'
    },
    liveProviders: providerStatus()
  }, requestId);
}

async function handleSearch(req, res, url, requestId) {
  const query = (url.searchParams.get('q') || '').trim();
  if (query.length < 2 || query.length > 200) return sendError(req, res, 400, 'Search query must contain 2 to 200 characters', requestId);
  const limit = Number(url.searchParams.get('limit') || 8);
  const language = url.searchParams.get('language') || 'en';
  const results = await searchPlaces({ baseUrl: config.searchUrl, query, limit, language });
  sendJson(req, res, 200, { query, results }, requestId);
}

async function handleRoute(req, res, requestId) {
  const body = await readJson(req);
  const mode = body.mode || 'car';
  if (!MODES[mode]) return sendError(req, res, 400, 'Unsupported routing mode', requestId);
  if (!body.origin || !body.destination) return sendError(req, res, 400, 'Origin and destination are required', requestId);
  let route;
  if (mode === 'maritime') {
    route = await routeExternal({ baseUrl: config.maritimeUrl, token: config.maritimeToken, origin: body.origin, destination: body.destination, mode, options: body.options });
  } else if (mode === 'aviation') {
    route = await routeExternal({ baseUrl: config.aviationUrl, token: config.aviationToken, origin: body.origin, destination: body.destination, mode, options: body.options });
  } else {
    route = await routeValhalla({ baseUrl: config.routerUrl, origin: body.origin, destination: body.destination, mode, language: body.language || 'en-US', options: body.options || {} });
  }
  sendJson(req, res, 200, route, requestId);
}

async function handleLive(req, res, url, requestId) {
  const point = assertCoordinate(url.searchParams.get('lat'), url.searchParams.get('lon'));
  const radiusMeters = Number(url.searchParams.get('radius_m') || 25000);
  const mode = url.searchParams.get('mode') || 'car';
  const results = await Promise.all(liveProviders.map(([name, urlKey, tokenKey]) => queryLiveProvider({
    name,
    baseUrl: process.env[urlKey] || '',
    token: process.env[tokenKey] || '',
    lat: point.lat,
    lon: point.lon,
    radiusMeters,
    mode
  })));
  const layers = Object.fromEntries(results.map((result) => [result.name, result]));
  sendJson(req, res, 200, {
    center: point,
    radiusMeters,
    mode,
    fetchedAt: new Date().toISOString(),
    layers,
    degraded: results.some((result) => result.configured && !result.available)
  }, requestId);
}

async function handleOfflineManifest(req, res, requestId) {
  const manifest = readManifest();
  sendJson(req, res, 200, {
    ...manifest,
    baseUrl: config.offlineBaseUrl || manifest.baseUrl || null
  }, requestId);
}

async function handleLocationTelemetry(req, res, requestId) {
  if (locationRetentionSeconds <= 0) return sendError(req, res, 403, 'Server-side location history is disabled', requestId);
  const clientId = String(req.headers['x-atlas-client-id'] || '').trim();
  if (!clientId || clientId.length > 128) return sendError(req, res, 400, 'A valid x-atlas-client-id is required', requestId);
  const body = await readJson(req);
  const point = assertCoordinate(body.latitude, body.longitude);
  const record = {
    latitude: point.lat,
    longitude: point.lon,
    accuracy: Number(body.accuracy || 0),
    speed: Number(body.speed || 0),
    heading: Number(body.heading || 0),
    recordedAt: body.recordedAt || new Date().toISOString()
  };
  const encrypted = encryptLocation(record);
  const records = encryptedLocationStore.get(clientId) || [];
  records.push({ createdAt: Date.now(), encrypted });
  encryptedLocationStore.set(clientId, records.slice(-10000));
  sendJson(req, res, 202, { accepted: true, encrypted: true, retainedUntilSeconds: locationRetentionSeconds }, requestId);
}

async function handlePurge(req, res, requestId) {
  if (!requireAdmin(req)) return sendError(req, res, 401, 'Administrator authorization is required', requestId);
  const body = await readJson(req);
  const clientId = String(body.clientId || req.headers['x-atlas-client-id'] || '').trim();
  if (!clientId) return sendError(req, res, 400, 'clientId is required', requestId);
  const existed = encryptedLocationStore.delete(clientId);
  sendJson(req, res, 200, { purged: true, clientId, hadServerRecords: existed, completedAt: new Date().toISOString() }, requestId);
}

async function routeRequest(req, res) {
  const requestId = crypto.randomUUID();
  if (req.method === 'OPTIONS') {
    res.writeHead(204, corsHeaders(req));
    return res.end();
  }
  const origin = requestOrigin(req);
  if (origin && !allowedOrigins.has(origin)) return sendError(req, res, 403, 'Origin is not allowed', requestId);
  if (!enforceRateLimit(req)) return sendError(req, res, 429, 'Rate limit exceeded', requestId);

  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  try {
    if (req.method === 'GET' && url.pathname === '/health') return await handleHealth(req, res, requestId);
    if (req.method === 'GET' && url.pathname === '/v1/config') return await handlePublicConfig(req, res, requestId);
    if (req.method === 'GET' && url.pathname === '/v1/search') return await handleSearch(req, res, url, requestId);
    if (req.method === 'POST' && url.pathname === '/v1/route') return await handleRoute(req, res, requestId);
    if (req.method === 'GET' && url.pathname === '/v1/live') return await handleLive(req, res, url, requestId);
    if (req.method === 'GET' && url.pathname === '/v1/offline/manifest') return await handleOfflineManifest(req, res, requestId);
    if (req.method === 'POST' && url.pathname === '/v1/telemetry/location') return await handleLocationTelemetry(req, res, requestId);
    if (req.method === 'POST' && url.pathname === '/v1/privacy/purge') return await handlePurge(req, res, requestId);
    return sendError(req, res, 404, 'Endpoint not found', requestId);
  } catch (error) {
    const status = /Invalid|Unsupported|required|too large|JSON/.test(error.message) ? 400 : 502;
    return sendError(req, res, status, error.message || 'Gateway failure', requestId);
  }
}

setInterval(() => {
  purgeExpiredLocations();
  const cutoff = Date.now() - 5 * 60 * 1000;
  for (const [key, bucket] of rateBuckets.entries()) if (bucket.startedAt < cutoff) rateBuckets.delete(key);
}, 60000).unref();

http.createServer(routeRequest).listen(PORT, HOST, () => {
  console.log(`ATLAS GPS gateway listening on http://${HOST}:${PORT}`);
});
