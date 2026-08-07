(() => {
  'use strict';

  const GATEWAY_STORAGE_KEY = 'atlas-gps-gateway-url';
  const MODE_STORAGE_KEY = 'atlas-gps-mode';
  const CLIENT_STORAGE_KEY = 'atlas-gps-client-id';
  const OFFLINE_CACHE = 'atlas-gps-offline-v1';
  const nativeFetch = window.fetch.bind(window);
  const state = {
    apiBase: localStorage.getItem(GATEWAY_STORAGE_KEY) || (['localhost', '127.0.0.1'].includes(location.hostname) ? 'http://127.0.0.1:4280' : '/gps-api'),
    clientId: localStorage.getItem(CLIENT_STORAGE_KEY) || (crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`),
    mode: localStorage.getItem(MODE_STORAGE_KEY) || 'car',
    config: null,
    gatewayOnline: false,
    liveTimer: null,
    wakeLock: null,
    navigationActive: false,
    nativeBridge: null,
    lastLocation: null,
    manifest: null
  };
  localStorage.setItem(CLIENT_STORAGE_KEY, state.clientId);

  function api(path) {
    return `${state.apiBase.replace(/\/$/, '')}${path}`;
  }

  function jsonResponse(payload, status = 200) {
    return new Response(JSON.stringify(payload), {
      status,
      headers: { 'content-type': 'application/json; charset=utf-8' }
    });
  }

  function parseCoordinatePair(value) {
    const [lon, lat] = String(value).split(',').map(Number);
    return Number.isFinite(lat) && Number.isFinite(lon) ? { lat, lon } : null;
  }

  function valhallaTypeToOsrm(type) {
    const number = Number(type);
    if ([4, 5, 6, 7, 8, 9].includes(number)) return 'turn';
    if ([10, 11, 12].includes(number)) return 'merge';
    if ([15, 16, 17, 18].includes(number)) return 'roundabout';
    if ([24, 25, 26].includes(number)) return 'arrive';
    return 'continue';
  }

  function routeToOsrm(route) {
    const steps = (route.maneuvers || []).map((maneuver) => ({
      distance: Number(maneuver.distanceKm || 0) * 1000,
      duration: Number(maneuver.timeSeconds || 0),
      name: maneuver.streetNames?.[0] || '',
      instruction: maneuver.instruction || 'Continue',
      maneuver: {
        type: valhallaTypeToOsrm(maneuver.type),
        modifier: '',
        location: route.geometry?.coordinates?.[maneuver.beginShapeIndex || 0] || route.geometry?.coordinates?.[0] || [0, 0]
      },
      intersections: maneuver.lanes?.length ? [{
        lanes: maneuver.lanes.map((lane) => ({
          valid: Boolean(lane.active),
          active: Boolean(lane.active),
          indications: lane.directions?.length ? lane.directions : [lane.indication || 'straight']
        }))
      }] : [],
      atlas: {
        sign: maneuver.sign,
        speedLimit: maneuver.speedLimit,
        toll: maneuver.toll,
        rough: maneuver.rough,
        unpaved: maneuver.unpaved
      }
    }));
    return {
      code: 'Ok',
      routes: [{
        geometry: route.geometry,
        distance: Number(route.summary?.distanceMeters || 0),
        duration: Number(route.summary?.durationSeconds || 0),
        legs: [{
          distance: Number(route.summary?.distanceMeters || 0),
          duration: Number(route.summary?.durationSeconds || 0),
          steps
        }],
        atlas: route
      }],
      waypoints: []
    };
  }

  async function proxySearch(url) {
    const query = url.searchParams.get('q') || '';
    const language = url.searchParams.get('accept-language') || document.documentElement.lang || 'en';
    const response = await nativeFetch(api(`/v1/search?q=${encodeURIComponent(query)}&language=${encodeURIComponent(language)}&limit=8`), {
      headers: { 'x-atlas-client-id': state.clientId }
    });
    if (!response.ok) return response;
    const payload = await response.json();
    return jsonResponse((payload.results || []).map((item) => ({
      place_id: item.id,
      display_name: item.label,
      name: item.name,
      lat: String(item.latitude),
      lon: String(item.longitude),
      type: item.category,
      address: item.address,
      boundingbox: item.boundingBox
    })));
  }

  async function proxyRoute(url) {
    const match = url.pathname.match(/\/route\/v1\/[^/]+\/([^;]+);([^/]+)$/);
    if (!match) return nativeFetch(url);
    const origin = parseCoordinatePair(decodeURIComponent(match[1]));
    const destination = parseCoordinatePair(decodeURIComponent(match[2]));
    if (!origin || !destination) return nativeFetch(url);
    const body = {
      origin,
      destination,
      mode: state.mode,
      language: document.documentElement.lang?.startsWith('es') ? 'es-US' : 'en-US',
      options: JSON.parse(localStorage.getItem('atlas-gps-route-options') || '{}')
    };
    const response = await nativeFetch(api('/v1/route'), {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-atlas-client-id': state.clientId },
      body: JSON.stringify(body)
    });
    if (!response.ok) return response;
    return jsonResponse(routeToOsrm(await response.json()));
  }

  window.fetch = async (input, init = {}) => {
    const requestUrl = new URL(typeof input === 'string' ? input : input.url, location.href);
    if (state.gatewayOnline && requestUrl.hostname.includes('nominatim') && requestUrl.pathname.includes('/search')) {
      try { return await proxySearch(requestUrl); } catch { return nativeFetch(input, init); }
    }
    if (state.gatewayOnline && requestUrl.hostname.includes('project-osrm') && requestUrl.pathname.includes('/route/v1/')) {
      try { return await proxyRoute(requestUrl); } catch { return nativeFetch(input, init); }
    }
    return nativeFetch(input, init);
  };

  async function loadGateway() {
    try {
      const [healthResponse, configResponse] = await Promise.all([
        nativeFetch(api('/health'), { headers: { 'x-atlas-client-id': state.clientId } }),
        nativeFetch(api('/v1/config'), { headers: { 'x-atlas-client-id': state.clientId } })
      ]);
      if (!healthResponse.ok || !configResponse.ok) throw new Error('Gateway unavailable');
      state.gatewayOnline = true;
      state.config = await configResponse.json();
      updateGatewayIndicator('online');
      window.dispatchEvent(new CustomEvent('atlas-gps-gateway-ready', { detail: state.config }));
    } catch {
      state.gatewayOnline = false;
      updateGatewayIndicator('degraded');
    }
  }

  function updateGatewayIndicator(status) {
    const dot = document.querySelector('.atlas-enterprise-toolbar .live-dot');
    if (!dot) return;
    dot.className = `live-dot ${status}`;
    dot.title = status === 'online' ? 'ATLAS Global Map Cloud connected' : 'ATLAS cloud not connected';
  }

  function createToolbar(stage) {
    const toolbar = document.createElement('div');
    toolbar.className = 'atlas-enterprise-toolbar glass';
    toolbar.innerHTML = `
      <span class="live-dot" title="Checking ATLAS cloud"></span>
      <select id="atlas-mode" aria-label="Navigation mode">
        <option value="car">CAR</option>
        <option value="truck">TRUCK</option>
        <option value="transit">TRANSIT</option>
        <option value="bicycle">BICYCLE</option>
        <option value="walking">WALK</option>
        <option value="emergency">EMERGENCY</option>
        <option value="maritime">MARITIME</option>
        <option value="aviation">AVIATION</option>
      </select>
      <button id="atlas-live-button" type="button">LIVE DATA</button>
      <button id="atlas-offline-button" type="button">OFFLINE</button>
      <button id="atlas-privacy-button" type="button">PRIVACY</button>
    `;
    stage.appendChild(toolbar);
    const mode = toolbar.querySelector('#atlas-mode');
    mode.value = state.mode;
    mode.addEventListener('change', () => {
      state.mode = mode.value;
      localStorage.setItem(MODE_STORAGE_KEY, state.mode);
      const guidance = document.getElementById('lane-guidance');
      if (guidance) guidance.textContent = `${state.mode.toUpperCase()} profile ready`;
    });
    toolbar.querySelector('#atlas-live-button').addEventListener('click', () => refreshLiveData(true));
    toolbar.querySelector('#atlas-offline-button').addEventListener('click', openOfflineSheet);
    toolbar.querySelector('#atlas-privacy-button').addEventListener('click', openPrivacySheet);
  }

  function createLiveSummary(stage) {
    const summary = document.createElement('aside');
    summary.className = 'atlas-live-summary glass hidden';
    summary.id = 'atlas-live-summary';
    stage.appendChild(summary);
  }

  async function getCurrentLocation() {
    if (state.lastLocation) return state.lastLocation;
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) return reject(new Error('Geolocation unavailable'));
      navigator.geolocation.getCurrentPosition((position) => {
        state.lastLocation = {
          lat: position.coords.latitude,
          lon: position.coords.longitude,
          accuracy: position.coords.accuracy
        };
        resolve(state.lastLocation);
      }, reject, { enableHighAccuracy: true, timeout: 10000, maximumAge: 10000 });
    });
  }

  function countFeatures(layer) {
    return Array.isArray(layer?.features) ? layer.features.length : 0;
  }

  async function refreshLiveData(showPanel = false) {
    const panel = document.getElementById('atlas-live-summary');
    if (!state.gatewayOnline) {
      if (panel && showPanel) {
        panel.classList.remove('hidden');
        panel.innerHTML = '<strong>LIVE DATA</strong><span>Connect the ATLAS GPS gateway and licensed feeds to activate live layers.</span>';
      }
      return;
    }
    try {
      const location = await getCurrentLocation();
      const response = await nativeFetch(api(`/v1/live?lat=${location.lat}&lon=${location.lon}&radius_m=25000&mode=${encodeURIComponent(state.mode)}`), {
        headers: { 'x-atlas-client-id': state.clientId }
      });
      if (!response.ok) throw new Error('Live data unavailable');
      const payload = await response.json();
      const layers = payload.layers || {};
      const configured = Object.values(layers).filter((layer) => layer.configured).length;
      const available = Object.values(layers).filter((layer) => layer.available).length;
      const incidents = countFeatures(layers.incidents) + countFeatures(layers.closures) + countFeatures(layers.construction);
      const hazards = countFeatures(layers.floods) + countFeatures(layers['road-status']);
      if (panel) {
        panel.classList.toggle('hidden', !showPanel && configured === 0);
        panel.innerHTML = `<strong>ATLAS LIVE · ${available}/${configured || 0} FEEDS</strong><span>${incidents} traffic events · ${hazards} road hazards · updated ${new Date(payload.fetchedAt).toLocaleTimeString()}</span>`;
      }
      updateGatewayIndicator(payload.degraded ? 'degraded' : 'online');
      window.dispatchEvent(new CustomEvent('atlas-live-data', { detail: payload }));
    } catch (error) {
      if (panel && showPanel) {
        panel.classList.remove('hidden');
        panel.innerHTML = `<strong>LIVE DATA</strong><span>${error.message}</span>`;
      }
      updateGatewayIndicator('degraded');
    }
  }

  function sheet(title, body) {
    let backdrop = document.getElementById('atlas-enterprise-sheet');
    if (!backdrop) {
      backdrop = document.createElement('div');
      backdrop.id = 'atlas-enterprise-sheet';
      backdrop.className = 'atlas-sheet-backdrop';
      backdrop.addEventListener('click', (event) => {
        if (event.target === backdrop) backdrop.classList.add('hidden');
      });
      document.body.appendChild(backdrop);
    }
    backdrop.innerHTML = `<section class="atlas-enterprise-sheet glass"><h2>${title}</h2>${body}<div class="sheet-actions"><button type="button" data-close>Close</button></div></section>`;
    backdrop.classList.remove('hidden');
    backdrop.querySelector('[data-close]').addEventListener('click', () => backdrop.classList.add('hidden'));
    return backdrop;
  }

  async function openOfflineSheet() {
    let manifest = state.manifest;
    if (!manifest && state.gatewayOnline) {
      try {
        const response = await nativeFetch(api('/v1/offline/manifest'), { headers: { 'x-atlas-client-id': state.clientId } });
        if (response.ok) manifest = state.manifest = await response.json();
      } catch { /* displayed below */ }
    }
    const regions = manifest?.regions || [];
    const backdrop = sheet('Offline planetary regions', `
      <p>ATLAS packages maps, search indexes, routing graphs, elevation and safety metadata by region. Packages are installed only after their signature and checksum pass.</p>
      <div class="sheet-grid">${regions.map((region) => `
        <article class="atlas-region-card">
          <strong>${region.name}</strong>
          <small>${region.type} · ${region.status || 'unknown'}${region.priorityPilot ? ' · priority pilot' : ''}</small>
          <div class="sheet-actions"><button type="button" data-region="${region.id}" ${region.url && region.sha256 ? '' : 'disabled'}>${region.url ? 'DOWNLOAD' : 'BUILD REQUIRED'}</button></div>
        </article>
      `).join('') || '<article class="atlas-region-card"><strong>No manifest connected</strong><small>Start ATLAS Global Map Cloud to load regional packages.</small></article>'}</div>
    `);
    backdrop.querySelectorAll('[data-region]').forEach((button) => button.addEventListener('click', () => downloadRegion(button.dataset.region, button)));
  }

  async function sha256Hex(buffer) {
    const digest = await crypto.subtle.digest('SHA-256', buffer);
    return [...new Uint8Array(digest)].map((value) => value.toString(16).padStart(2, '0')).join('');
  }

  async function downloadRegion(regionId, button) {
    const region = state.manifest?.regions?.find((item) => item.id === regionId);
    if (!region?.url || !region.sha256) return;
    button.disabled = true;
    button.textContent = 'DOWNLOADING…';
    try {
      const url = new URL(region.url, state.manifest.baseUrl || location.href).href;
      const response = await nativeFetch(url);
      if (!response.ok) throw new Error(`Download failed: ${response.status}`);
      const bytes = await response.arrayBuffer();
      const digest = await sha256Hex(bytes);
      if (digest.toLowerCase() !== String(region.sha256).toLowerCase()) throw new Error('Checksum verification failed');
      const cache = await caches.open(OFFLINE_CACHE);
      await cache.put(url, new Response(bytes, { headers: { 'content-type': region.contentType || 'application/octet-stream' } }));
      localStorage.setItem(`atlas-gps-offline:${region.id}`, JSON.stringify({ version: region.version, sha256: digest, installedAt: new Date().toISOString(), url }));
      button.textContent = 'INSTALLED';
    } catch (error) {
      button.disabled = false;
      button.textContent = 'RETRY';
      alert(error.message);
    }
  }

  async function purgeDeviceData() {
    const preserved = new Set([GATEWAY_STORAGE_KEY]);
    for (const key of Object.keys(localStorage)) {
      if (!preserved.has(key) && (key.startsWith('atlas-gps') || key.startsWith('atlas-navigation') || key.includes('hazard'))) localStorage.removeItem(key);
    }
    for (const key of Object.keys(sessionStorage)) {
      if (key.startsWith('atlas-gps') || key.startsWith('atlas-navigation')) sessionStorage.removeItem(key);
    }
    const cacheNames = await caches.keys();
    await Promise.all(cacheNames.filter((name) => name.includes('atlas-gps')).map((name) => caches.delete(name)));
    try { await state.nativeBridge?.purgeLocalNavigationData?.(); } catch { /* native bridge optional */ }
    state.clientId = crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`;
    localStorage.setItem(CLIENT_STORAGE_KEY, state.clientId);
  }

  async function openPrivacySheet() {
    const privacy = state.config?.privacy || { locationHistoryEnabled: false, locationRetentionSeconds: 0, rawCameraUploadEnabled: false };
    const backdrop = sheet('Security and privacy center', `
      <p>ATLAS keeps location history and raw camera upload disabled by default. Navigation processing remains on the device unless an authorized enterprise policy explicitly changes it.</p>
      <div class="sheet-grid">
        <article class="atlas-policy-card"><strong>Location history</strong><small>${privacy.locationHistoryEnabled ? `Enabled · ${privacy.locationRetentionSeconds}s retention` : 'Disabled'}</small></article>
        <article class="atlas-policy-card"><strong>Raw camera upload</strong><small>${privacy.rawCameraUploadEnabled ? 'Enabled by policy' : 'Disabled'}</small></article>
        <article class="atlas-policy-card"><strong>Offline packages</strong><small>Checksum verification required</small></article>
        <article class="atlas-policy-card"><strong>Client identity</strong><small>${state.clientId.slice(0, 12)}…</small></article>
      </div>
      <div class="sheet-actions"><button class="danger" type="button" data-purge>PURGE DEVICE NAVIGATION DATA</button></div>
    `);
    backdrop.querySelector('[data-purge]').addEventListener('click', async (event) => {
      event.currentTarget.disabled = true;
      await purgeDeviceData();
      event.currentTarget.textContent = 'PURGED';
    });
  }

  function resolveNativeBridge() {
    state.nativeBridge = window.Capacitor?.Plugins?.AtlasNavigation || null;
  }

  async function holdWakeLock() {
    try {
      state.wakeLock = await navigator.wakeLock?.request('screen');
    } catch { state.wakeLock = null; }
  }

  async function startNativeNavigation() {
    if (state.navigationActive) return;
    state.navigationActive = true;
    await holdWakeLock();
    try {
      await state.nativeBridge?.startBackgroundNavigation?.({
        routeId: crypto.randomUUID?.() || String(Date.now()),
        destinationName: document.getElementById('destination-input')?.value || 'ATLAS destination',
        locationIntervalMs: 1000
      });
    } catch { /* web runtime remains active */ }
  }

  async function stopNativeNavigation() {
    if (!state.navigationActive) return;
    state.navigationActive = false;
    try { await state.wakeLock?.release(); } catch { /* already released */ }
    state.wakeLock = null;
    try { await state.nativeBridge?.stopBackgroundNavigation?.(); } catch { /* native bridge optional */ }
  }

  function observeNavigationState() {
    const status = document.getElementById('route-status');
    if (!status) return;
    const update = () => {
      const text = status.textContent.toLowerCase();
      const active = text.includes('active') || text.includes('activa') || text.includes('navegación');
      if (active) startNativeNavigation();
      else if (text.includes('select') || text.includes('selecciona') || text.includes('stopped') || text.includes('finalizada')) stopNativeNavigation();
    };
    new MutationObserver(update).observe(status, { childList: true, characterData: true, subtree: true });
    update();
  }

  function connectArEvents() {
    window.addEventListener('atlas-ar-analysis', (event) => {
      const lane = event.detail?.lane;
      const motion = event.detail?.motion;
      const guidance = document.getElementById('lane-guidance');
      if (!guidance || !lane) return;
      if (motion?.obstacleRisk > 0.66) guidance.textContent = 'Check road ahead';
      else if (lane.confidence < 0.25) guidance.textContent = 'Calibrating lane view';
      else if (lane.offsetNormalized > 0.45) guidance.textContent = 'Move toward lane center left';
      else if (lane.offsetNormalized < -0.45) guidance.textContent = 'Move toward lane center right';
      else guidance.textContent = 'Vehicle centered';
    });
  }

  function initialize() {
    const stage = document.querySelector('.map-stage');
    if (!stage) return;
    resolveNativeBridge();
    createToolbar(stage);
    createLiveSummary(stage);
    observeNavigationState();
    connectArEvents();
    loadGateway().then(() => refreshLiveData(false));
    state.liveTimer = window.setInterval(() => refreshLiveData(false), 60000);
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && state.navigationActive && !state.wakeLock) holdWakeLock();
    });
  }

  window.AtlasGPSPlatform = {
    getState: () => ({ ...state, nativeBridge: Boolean(state.nativeBridge), wakeLock: Boolean(state.wakeLock) }),
    setGatewayUrl: (url) => { localStorage.setItem(GATEWAY_STORAGE_KEY, url); location.reload(); },
    refreshLiveData,
    purgeDeviceData
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initialize, { once: true });
  else initialize();
})();
