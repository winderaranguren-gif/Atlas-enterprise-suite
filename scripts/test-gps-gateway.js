'use strict';

const http = require('http');
const path = require('path');
const { spawn } = require('child_process');
const assert = require('assert/strict');

function send(res, status, payload) {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(payload));
}

function createMockProvider() {
  return http.createServer((req, res) => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    if (url.pathname === '/search') {
      return send(res, 200, [{
        place_id: 1,
        display_name: 'ATLAS Test Destination',
        name: 'Test Destination',
        lat: '28.5383',
        lon: '-81.3792',
        type: 'city',
        address: { city: 'Orlando', country_code: 'us' },
        boundingbox: ['28.4', '28.7', '-81.6', '-81.2']
      }]);
    }
    if (url.pathname === '/route') {
      return send(res, 200, {
        trip: {
          status: 0,
          summary: { length: 12.5, time: 900, has_toll: true, has_ferry: false, has_highway: true },
          legs: [{
            shape: {
              type: 'LineString',
              coordinates: [[-81.4, 28.5], [-81.39, 28.52], [-81.3792, 28.5383]]
            },
            maneuvers: [{
              type: 10,
              instruction: 'Keep right toward ATLAS Way',
              length: 1.2,
              time: 90,
              begin_shape_index: 0,
              end_shape_index: 1,
              street_names: ['ATLAS Way'],
              speed_limit: 105,
              lanes: [
                { active: false, directions: ['straight'] },
                { active: true, directions: ['right'] }
              ],
              sign: { exit_number_elements: [{ text: '4' }] }
            }, {
              type: 24,
              instruction: 'You have arrived',
              length: 0,
              time: 0,
              begin_shape_index: 2,
              end_shape_index: 2
            }]
          }]
        }
      });
    }
    if (['/traffic', '/weather', '/incidents'].includes(url.pathname)) {
      return send(res, 200, {
        type: 'FeatureCollection',
        features: [{
          type: 'Feature',
          id: `${url.pathname.slice(1)}-1`,
          geometry: { type: 'Point', coordinates: [-81.39, 28.52] },
          properties: { severity: 'moderate' }
        }],
        meta: { provider: 'mock' }
      });
    }
    return send(res, 404, { error: 'not found' });
  });
}

async function listen(server) {
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  return server.address().port;
}

async function waitFor(url, timeoutMs = 10000) {
  const started = Date.now();
  let lastError;
  while (Date.now() - started < timeoutMs) {
    try {
      const response = await fetch(url);
      if (response.ok) return response;
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 120));
  }
  throw lastError || new Error(`Timed out waiting for ${url}`);
}

async function requestJson(url, options = {}) {
  const response = await fetch(url, options);
  const payload = await response.json();
  return { response, payload };
}

async function run() {
  const mock = createMockProvider();
  const mockPort = await listen(mock);
  const gatewayPort = 44000 + (process.pid % 1000);
  const gatewayUrl = `http://127.0.0.1:${gatewayPort}`;
  const root = path.resolve(__dirname, '..');
  const gateway = spawn(process.execPath, ['gps-platform/api/server.js'], {
    cwd: root,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: {
      ...process.env,
      ATLAS_GPS_HOST: '127.0.0.1',
      ATLAS_GPS_PORT: String(gatewayPort),
      ATLAS_GPS_ALLOWED_ORIGINS: 'http://127.0.0.1:4173',
      ATLAS_GPS_ADMIN_TOKEN: 'test-admin-token',
      ATLAS_GPS_LOCATION_RETENTION_SECONDS: '0',
      ATLAS_TILE_STYLE_URL: 'https://maps.atlas.test/style.json',
      ATLAS_SEARCH_URL: `http://127.0.0.1:${mockPort}`,
      ATLAS_ROUTER_URL: `http://127.0.0.1:${mockPort}`,
      ATLAS_OFFLINE_BASE_URL: 'https://offline.atlas.test',
      ATLAS_TRAFFIC_URL: `http://127.0.0.1:${mockPort}/traffic`,
      ATLAS_WEATHER_URL: `http://127.0.0.1:${mockPort}/weather`,
      ATLAS_INCIDENTS_URL: `http://127.0.0.1:${mockPort}/incidents`
    }
  });
  let gatewayErrors = '';
  gateway.stderr.on('data', (chunk) => { gatewayErrors += chunk.toString(); });

  try {
    await waitFor(`${gatewayUrl}/health`);

    const health = await requestJson(`${gatewayUrl}/health`);
    assert.equal(health.response.status, 200);
    assert.equal(health.payload.status, 'ok');
    assert.equal(health.payload.services.routing, true);

    const config = await requestJson(`${gatewayUrl}/v1/config`);
    assert.equal(config.response.status, 200);
    assert.equal(config.payload.privacy.locationHistoryEnabled, false);
    assert.equal(config.payload.modes.truck.costing, 'truck');

    const search = await requestJson(`${gatewayUrl}/v1/search?q=Orlando&language=en`);
    assert.equal(search.response.status, 200);
    assert.equal(search.payload.results.length, 1);
    assert.equal(search.payload.results[0].name, 'Test Destination');

    const route = await requestJson(`${gatewayUrl}/v1/route`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-atlas-client-id': 'contract-test' },
      body: JSON.stringify({
        mode: 'car',
        origin: { lat: 28.5, lon: -81.4 },
        destination: { lat: 28.5383, lon: -81.3792 },
        options: { avoidFerries: true }
      })
    });
    assert.equal(route.response.status, 200);
    assert.equal(route.payload.summary.distanceMeters, 12500);
    assert.equal(route.payload.laneGuidanceAvailable, true);
    assert.equal(route.payload.maneuvers[0].lanes[1].active, true);
    assert.equal(route.payload.maneuvers[0].speedLimit, 105);

    const live = await requestJson(`${gatewayUrl}/v1/live?lat=28.53&lon=-81.38&radius_m=5000&mode=car`);
    assert.equal(live.response.status, 200);
    assert.equal(live.payload.layers.traffic.available, true);
    assert.equal(live.payload.layers.weather.features.length, 1);
    assert.equal(live.payload.layers.closures.configured, false);

    const offline = await requestJson(`${gatewayUrl}/v1/offline/manifest`);
    assert.equal(offline.response.status, 200);
    assert.equal(offline.payload.coverage, 'planetary');
    assert.equal(offline.payload.regions.filter((region) => region.type === 'continent').length, 7);

    const telemetry = await requestJson(`${gatewayUrl}/v1/telemetry/location`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-atlas-client-id': 'contract-test' },
      body: JSON.stringify({ latitude: 28.53, longitude: -81.38 })
    });
    assert.equal(telemetry.response.status, 403);

    const invalidOrigin = await requestJson(`${gatewayUrl}/health`, {
      headers: { origin: 'https://not-authorized.example' }
    });
    assert.equal(invalidOrigin.response.status, 403);

    console.log('ATLAS GPS gateway contract tests passed.');
  } finally {
    gateway.kill('SIGTERM');
    await new Promise((resolve) => mock.close(resolve));
  }

  if (gatewayErrors) process.stderr.write(gatewayErrors);
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
