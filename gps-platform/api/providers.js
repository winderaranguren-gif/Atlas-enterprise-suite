'use strict';

const MODES = Object.freeze({
  car: { costing: 'auto', surface: 'road' },
  truck: { costing: 'truck', surface: 'road' },
  transit: { costing: 'multimodal', surface: 'transit' },
  bicycle: { costing: 'bicycle', surface: 'road' },
  walking: { costing: 'pedestrian', surface: 'path' },
  emergency: { costing: 'auto', surface: 'road', emergency: true },
  maritime: { costing: 'maritime', surface: 'water', external: true },
  aviation: { costing: 'aviation', surface: 'air', external: true }
});

function number(value, fallback = null) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function assertCoordinate(lat, lon) {
  const latitude = number(lat);
  const longitude = number(lon);
  if (latitude === null || latitude < -90 || latitude > 90) throw new Error('Invalid latitude');
  if (longitude === null || longitude < -180 || longitude > 180) throw new Error('Invalid longitude');
  return { lat: latitude, lon: longitude };
}

async function fetchJson(url, options = {}, timeoutMs = 10000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    if (!response.ok) throw new Error(`Upstream ${response.status}`);
    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('json')) throw new Error('Upstream did not return JSON');
    return await response.json();
  } finally {
    clearTimeout(timeout);
  }
}

async function searchPlaces({ baseUrl, query, limit = 8, language = 'en' }) {
  if (!baseUrl) throw new Error('ATLAS search service is not configured');
  const url = new URL('/search', baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`);
  url.searchParams.set('q', query);
  url.searchParams.set('format', 'jsonv2');
  url.searchParams.set('addressdetails', '1');
  url.searchParams.set('limit', String(Math.min(Math.max(limit, 1), 20)));
  url.searchParams.set('accept-language', language);
  const results = await fetchJson(url);
  return (Array.isArray(results) ? results : []).map((item) => ({
    id: String(item.place_id || item.osm_id || `${item.lat}:${item.lon}`),
    label: item.display_name || item.name || 'Destination',
    name: item.name || item.display_name || 'Destination',
    latitude: number(item.lat),
    longitude: number(item.lon),
    category: item.type || item.category || null,
    address: item.address || null,
    boundingBox: Array.isArray(item.boundingbox) ? item.boundingbox.map(Number) : null,
    source: 'atlas-search'
  })).filter((item) => item.latitude !== null && item.longitude !== null);
}

function normalizeManeuver(maneuver, index) {
  const lanes = Array.isArray(maneuver.lanes)
    ? maneuver.lanes.map((lane) => ({
        active: Boolean(lane.active || lane.valid),
        directions: Array.isArray(lane.directions) ? lane.directions : [],
        indication: lane.indication || null
      }))
    : [];
  return {
    index,
    instruction: maneuver.instruction || maneuver.verbal_pre_transition_instruction || maneuver.verbal_transition_alert_instruction || 'Continue',
    type: maneuver.type ?? null,
    beginShapeIndex: maneuver.begin_shape_index ?? null,
    endShapeIndex: maneuver.end_shape_index ?? null,
    distanceKm: number(maneuver.length, 0),
    timeSeconds: number(maneuver.time, 0),
    streetNames: Array.isArray(maneuver.street_names) ? maneuver.street_names : [],
    sign: maneuver.sign || null,
    lanes,
    speedLimit: number(maneuver.speed_limit),
    roundaboutExitCount: number(maneuver.roundabout_exit_count),
    toll: Boolean(maneuver.toll),
    rough: Boolean(maneuver.rough),
    unpaved: Boolean(maneuver.unpaved)
  };
}

async function routeValhalla({ baseUrl, origin, destination, mode = 'car', language = 'en-US', options = {} }) {
  if (!baseUrl) throw new Error('ATLAS routing service is not configured');
  const profile = MODES[mode];
  if (!profile) throw new Error('Unsupported routing mode');
  if (profile.external) throw new Error(`${mode} routing requires its licensed ATLAS provider`);
  const start = assertCoordinate(origin.lat, origin.lon);
  const end = assertCoordinate(destination.lat, destination.lon);
  const request = {
    locations: [
      { lat: start.lat, lon: start.lon, type: 'break' },
      { lat: end.lat, lon: end.lon, type: 'break' }
    ],
    costing: profile.costing,
    units: 'kilometers',
    directions_options: { units: 'kilometers', language },
    shape_format: 'geojson',
    costing_options: {
      auto: {
        use_highways: options.avoidHighways ? 0 : 1,
        use_tolls: options.avoidTolls ? 0 : 1,
        use_ferry: options.avoidFerries ? 0 : 1
      },
      truck: {
        height: number(options.heightMeters, 4.1),
        width: number(options.widthMeters, 2.6),
        length: number(options.lengthMeters, 18),
        weight: number(options.weightMetricTons, 36),
        axle_load: number(options.axleLoadMetricTons, 10),
        hazardous: Boolean(options.hazardousCargo)
      }
    }
  };
  const url = new URL('/route', baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`);
  url.searchParams.set('json', JSON.stringify(request));
  const raw = await fetchJson(url, {}, 25000);
  const trip = raw.trip || {};
  const legs = Array.isArray(trip.legs) ? trip.legs : [];
  const coordinates = legs.flatMap((leg) => {
    if (leg.shape && leg.shape.type === 'LineString') return leg.shape.coordinates || [];
    if (Array.isArray(leg.shape)) return leg.shape;
    return [];
  });
  const maneuvers = legs.flatMap((leg) => (leg.maneuvers || [])).map(normalizeManeuver);
  return {
    id: crypto.randomUUID(),
    mode,
    provider: 'atlas-router',
    generatedAt: new Date().toISOString(),
    summary: {
      distanceMeters: number(trip.summary?.length, 0) * 1000,
      durationSeconds: number(trip.summary?.time, 0),
      hasToll: Boolean(trip.summary?.has_toll),
      hasFerry: Boolean(trip.summary?.has_ferry),
      hasHighway: Boolean(trip.summary?.has_highway)
    },
    geometry: { type: 'LineString', coordinates },
    maneuvers,
    laneGuidanceAvailable: maneuvers.some((step) => step.lanes.length > 0),
    speedLimitCoverage: maneuvers.filter((step) => step.speedLimit !== null).length,
    rawStatus: trip.status ?? 0
  };
}

async function routeExternal({ baseUrl, token, origin, destination, mode, options = {} }) {
  if (!baseUrl) throw new Error(`${mode} provider is not configured`);
  const start = assertCoordinate(origin.lat, origin.lon);
  const end = assertCoordinate(destination.lat, destination.lon);
  const url = new URL(baseUrl);
  url.searchParams.set('origin', `${start.lat},${start.lon}`);
  url.searchParams.set('destination', `${end.lat},${end.lon}`);
  url.searchParams.set('mode', mode);
  for (const [key, value] of Object.entries(options)) {
    if (value !== undefined && value !== null) url.searchParams.set(key, String(value));
  }
  const headers = token ? { authorization: `Bearer ${token}` } : {};
  return fetchJson(url, { headers }, 25000);
}

async function queryLiveProvider({ name, baseUrl, token, lat, lon, radiusMeters = 25000, mode = 'car' }) {
  if (!baseUrl) return { name, configured: false, available: false, features: [], error: null };
  const point = assertCoordinate(lat, lon);
  const url = new URL(baseUrl);
  url.searchParams.set('lat', String(point.lat));
  url.searchParams.set('lon', String(point.lon));
  url.searchParams.set('radius_m', String(Math.min(Math.max(number(radiusMeters, 25000), 100), 250000)));
  url.searchParams.set('mode', mode);
  const headers = token ? { authorization: `Bearer ${token}` } : {};
  try {
    const raw = await fetchJson(url, { headers }, 9000);
    const features = Array.isArray(raw?.features) ? raw.features : Array.isArray(raw) ? raw : [];
    return {
      name,
      configured: true,
      available: true,
      fetchedAt: new Date().toISOString(),
      features: features.slice(0, 1000),
      sourceMeta: raw?.meta || null,
      error: null
    };
  } catch (error) {
    return { name, configured: true, available: false, features: [], error: error.message };
  }
}

module.exports = {
  MODES,
  assertCoordinate,
  fetchJson,
  searchPlaces,
  routeValhalla,
  routeExternal,
  queryLiveProvider
};
