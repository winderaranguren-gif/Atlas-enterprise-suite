(() => {
  'use strict';

  const MILES_PER_METER = 0.000621371;
  const MPH_PER_MPS = 2.236936;
  const DEFAULT_CENTER = [-81.3792, 28.5383];
  const DEFAULT_POSITION = { longitude: DEFAULT_CENTER[0], latitude: DEFAULT_CENTER[1], accuracy: 0, speed: 0, heading: 0 };
  const ROUTE_RECALC_THRESHOLD_METERS = 85;
  const ROUTE_RECALC_COOLDOWN_MS = 25000;

  const $ = (id) => document.getElementById(id);
  const dom = {
    map: $('map'),
    permissionSheet: $('permission-sheet'),
    startButton: $('start-navigation-button'),
    demoButton: $('demo-navigation-button'),
    camera: $('road-camera'),
    cameraFallback: $('camera-fallback'),
    cameraButton: $('camera-button'),
    networkStatus: $('network-status'),
    languageButton: $('language-button'),
    fullscreenButton: $('fullscreen-button'),
    destinationForm: $('destination-form'),
    destinationInput: $('destination-input'),
    searchResults: $('search-results'),
    clearSearch: $('clear-search'),
    routeCard: $('route-card'),
    routeStatus: $('route-status'),
    nextDistance: $('next-distance'),
    nextInstruction: $('next-instruction'),
    remainingDistance: $('remaining-distance'),
    remainingTime: $('remaining-time'),
    arrivalTime: $('arrival-time'),
    maneuverIcon: $('maneuver-icon'),
    voiceButton: $('voice-button'),
    recalculateButton: $('recalculate-button'),
    stopRouteButton: $('stop-route-button'),
    laneGuidance: $('lane-guidance'),
    timelineSlider: $('timeline-slider'),
    timelineLabel: $('timeline-label'),
    locateButton: $('locate-button'),
    followButton: $('follow-button'),
    globeButton: $('globe-button'),
    buildingsButton: $('buildings-button'),
    atlasOrb: $('atlas-orb'),
    speedValue: $('speed-value'),
    headingValue: $('heading-value'),
    headingLabel: $('heading-label'),
    accuracyPill: $('accuracy-pill'),
    signDirection: $('sign-direction'),
    signPrimary: $('sign-primary'),
    signSecondary: $('sign-secondary'),
    signExit: $('sign-exit'),
    signDistance: $('sign-distance'),
    toastRegion: $('toast-region')
  };

  const copy = {
    es: {
      destinationPlaceholder: 'Busca cualquier destino del planeta',
      ready: 'Listo',
      selectDestination: 'Selecciona un destino',
      defaultInstruction: 'ATLAS calculará una ruta global desde tu ubicación actual.',
      locating: 'Buscando ubicación…',
      locationActive: 'Ubicación activa',
      locationDenied: 'No se pudo obtener la ubicación. Se mantiene el modo demostración.',
      routeCalculating: 'Calculando ruta 4D…',
      routeActive: 'Navegación activa',
      routeError: 'No se pudo calcular una ruta para ese destino.',
      searchError: 'No se pudo buscar el destino.',
      noResults: 'No se encontraron resultados.',
      cameraEnabled: 'Cámara activa',
      cameraEnable: 'Activar cámara vial',
      cameraError: 'La cámara no está disponible o no tiene permiso.',
      voiceOn: '🔊 Voz',
      voiceOff: '🔇 Voz',
      recalculate: 'Ruta recalculada',
      routeStopped: 'Ruta finalizada',
      globe: 'Vista global activada',
      map: 'Vista de navegación activada',
      hazardMode: 'Modo de reporte: toca el mapa para registrar un peligro local.',
      hazardSaved: 'Peligro guardado localmente.',
      trafficNeedsProvider: 'El tráfico en vivo requiere un proveedor de datos autorizado.',
      speechUnavailable: 'El reconocimiento de voz no está disponible en este dispositivo.',
      listening: 'Escuchando destino…',
      routeTo: 'Ruta hacia',
      proceed: 'Continúa',
      turn: 'Gira',
      slight: 'ligeramente',
      sharp: 'pronunciadamente',
      left: 'a la izquierda',
      right: 'a la derecha',
      straight: 'recto',
      arrive: 'Has llegado a tu destino',
      keep: 'Mantente',
      merge: 'Incorpórate',
      ramp: 'Toma la rampa',
      roundabout: 'Entra en la rotonda',
      exitRoundabout: 'Sal de la rotonda',
      uturn: 'Haz un retorno',
      on: 'en'
    },
    en: {
      destinationPlaceholder: 'Search any destination on Earth',
      ready: 'Ready',
      selectDestination: 'Select a destination',
      defaultInstruction: 'ATLAS will calculate a global route from your current position.',
      locating: 'Locating…',
      locationActive: 'Location active',
      locationDenied: 'Location is unavailable. Demo mode remains active.',
      routeCalculating: 'Calculating 4D route…',
      routeActive: 'Navigation active',
      routeError: 'A route could not be calculated for that destination.',
      searchError: 'The destination search failed.',
      noResults: 'No results found.',
      cameraEnabled: 'Camera active',
      cameraEnable: 'Enable road camera',
      cameraError: 'Camera is unavailable or permission was not granted.',
      voiceOn: '🔊 Voice',
      voiceOff: '🔇 Voice',
      recalculate: 'Route recalculated',
      routeStopped: 'Route stopped',
      globe: 'Global view enabled',
      map: 'Navigation view enabled',
      hazardMode: 'Report mode: tap the map to record a local hazard.',
      hazardSaved: 'Hazard saved locally.',
      trafficNeedsProvider: 'Live traffic requires an authorized data provider.',
      speechUnavailable: 'Speech recognition is not available on this device.',
      listening: 'Listening for a destination…',
      routeTo: 'Route to',
      proceed: 'Continue',
      turn: 'Turn',
      slight: 'slightly',
      sharp: 'sharply',
      left: 'left',
      right: 'right',
      straight: 'straight',
      arrive: 'You have arrived at your destination',
      keep: 'Keep',
      merge: 'Merge',
      ramp: 'Take the ramp',
      roundabout: 'Enter the roundabout',
      exitRoundabout: 'Exit the roundabout',
      uturn: 'Make a U-turn',
      on: 'onto'
    }
  };

  const state = {
    language: 'es',
    map: null,
    mapLoaded: false,
    current: { ...DEFAULT_POSITION },
    previousFix: null,
    watchId: null,
    following: true,
    globe: false,
    buildings: true,
    cameraStream: null,
    voiceEnabled: true,
    destination: null,
    route: null,
    routeCoordinates: [],
    routeCumulative: [],
    routeSteps: [],
    progressFraction: 0,
    lastSpokenStep: -1,
    lastRecalculateAt: 0,
    searchTimer: null,
    searchAbort: null,
    selectedSearchResult: null,
    hazardMode: false,
    hazards: loadHazards(),
    recognition: null
  };

  function t(key) {
    return copy[state.language][key] || copy.en[key] || key;
  }

  function toast(message, type = 'info', duration = 3200) {
    const node = document.createElement('div');
    node.className = `toast ${type}`;
    node.textContent = message;
    dom.toastRegion.appendChild(node);
    window.setTimeout(() => node.remove(), duration);
  }

  function safeText(value, fallback = '—') {
    return value === undefined || value === null || value === '' ? fallback : String(value);
  }

  function formatDistance(meters) {
    if (!Number.isFinite(meters)) return '—';
    const miles = meters * MILES_PER_METER;
    if (miles >= 0.1) return `${miles.toFixed(miles >= 10 ? 0 : 1)} mi`;
    const feet = meters * 3.28084;
    return `${Math.max(10, Math.round(feet / 10) * 10)} ft`;
  }

  function formatDuration(seconds) {
    if (!Number.isFinite(seconds)) return '—';
    const totalMinutes = Math.max(1, Math.round(seconds / 60));
    if (totalMinutes < 60) return `${totalMinutes} min`;
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${hours}h ${minutes}m`;
  }

  function formatArrival(seconds) {
    if (!Number.isFinite(seconds)) return '—';
    const arrival = new Date(Date.now() + seconds * 1000);
    return arrival.toLocaleTimeString(state.language === 'es' ? 'es-US' : 'en-US', { hour: 'numeric', minute: '2-digit' });
  }

  function haversineMeters(a, b) {
    const toRadians = (degrees) => degrees * Math.PI / 180;
    const lat1 = toRadians(a[1]);
    const lat2 = toRadians(b[1]);
    const deltaLat = lat2 - lat1;
    const deltaLon = toRadians(b[0] - a[0]);
    const sinLat = Math.sin(deltaLat / 2);
    const sinLon = Math.sin(deltaLon / 2);
    const h = sinLat * sinLat + Math.cos(lat1) * Math.cos(lat2) * sinLon * sinLon;
    return 6371000 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  }

  function bearingBetween(a, b) {
    const toRadians = (degrees) => degrees * Math.PI / 180;
    const toDegrees = (radians) => radians * 180 / Math.PI;
    const lat1 = toRadians(a[1]);
    const lat2 = toRadians(b[1]);
    const deltaLon = toRadians(b[0] - a[0]);
    const y = Math.sin(deltaLon) * Math.cos(lat2);
    const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(deltaLon);
    return (toDegrees(Math.atan2(y, x)) + 360) % 360;
  }

  function interpolateCoordinate(a, b, fraction) {
    return [a[0] + (b[0] - a[0]) * fraction, a[1] + (b[1] - a[1]) * fraction];
  }

  function buildCumulativeDistances(coordinates) {
    const cumulative = [0];
    for (let index = 1; index < coordinates.length; index += 1) {
      cumulative.push(cumulative[index - 1] + haversineMeters(coordinates[index - 1], coordinates[index]));
    }
    return cumulative;
  }

  function coordinateAtFraction(fraction) {
    if (!state.routeCoordinates.length) return null;
    const total = state.routeCumulative.at(-1) || 0;
    const target = Math.max(0, Math.min(1, fraction)) * total;
    let index = state.routeCumulative.findIndex((distance) => distance >= target);
    if (index <= 0) return state.routeCoordinates[0];
    if (index === -1) return state.routeCoordinates.at(-1);
    const segmentStart = state.routeCumulative[index - 1];
    const segmentEnd = state.routeCumulative[index];
    const segmentFraction = segmentEnd === segmentStart ? 0 : (target - segmentStart) / (segmentEnd - segmentStart);
    return interpolateCoordinate(state.routeCoordinates[index - 1], state.routeCoordinates[index], segmentFraction);
  }

  function nearestRoutePoint(position) {
    if (!state.routeCoordinates.length) return { index: 0, distance: Infinity, fraction: 0 };
    let nearestIndex = 0;
    let nearestDistance = Infinity;
    const stride = state.routeCoordinates.length > 3000 ? 4 : state.routeCoordinates.length > 1200 ? 2 : 1;
    for (let index = 0; index < state.routeCoordinates.length; index += stride) {
      const distance = haversineMeters(position, state.routeCoordinates[index]);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestIndex = index;
      }
    }
    const total = state.routeCumulative.at(-1) || 1;
    return { index: nearestIndex, distance: nearestDistance, fraction: (state.routeCumulative[nearestIndex] || 0) / total };
  }

  function initMap() {
    if (!window.maplibregl) {
      toast('MapLibre failed to load.', 'error', 6000);
      return;
    }

    state.map = new maplibregl.Map({
      container: 'map',
      style: 'https://tiles.openfreemap.org/styles/liberty',
      center: DEFAULT_CENTER,
      zoom: 11.8,
      pitch: 62,
      bearing: -18,
      antialias: true,
      attributionControl: true,
      maxPitch: 85
    });

    state.map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'bottom-right');
    state.map.on('load', () => {
      state.mapLoaded = true;
      addCoreSourcesAndLayers();
      add3DBuildings();
      renderHazards();
      updateVehicleSource();
    });

    state.map.on('click', (event) => {
      if (!state.hazardMode) return;
      const hazard = { id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()), coordinates: [event.lngLat.lng, event.lngLat.lat], createdAt: new Date().toISOString() };
      state.hazards.push(hazard);
      persistHazards();
      renderHazards();
      toast(t('hazardSaved'));
    });

    state.map.on('dragstart', () => {
      if (state.following) setFollowing(false);
    });
  }

  function addCoreSourcesAndLayers() {
    const emptyLine = { type: 'Feature', geometry: { type: 'LineString', coordinates: [] }, properties: {} };
    const emptyPoint = { type: 'FeatureCollection', features: [] };

    state.map.addSource('atlas-route', { type: 'geojson', data: emptyLine });
    state.map.addSource('atlas-route-progress', { type: 'geojson', data: emptyLine });
    state.map.addSource('atlas-vehicle', { type: 'geojson', data: emptyPoint });
    state.map.addSource('atlas-destination', { type: 'geojson', data: emptyPoint });
    state.map.addSource('atlas-forecast', { type: 'geojson', data: emptyPoint });
    state.map.addSource('atlas-hazards', { type: 'geojson', data: emptyPoint });

    const firstSymbolId = state.map.getStyle().layers.find((layer) => layer.type === 'symbol')?.id;

    state.map.addLayer({
      id: 'atlas-route-glow', type: 'line', source: 'atlas-route',
      layout: { 'line-join': 'round', 'line-cap': 'round' },
      paint: { 'line-color': '#0b85ff', 'line-width': ['interpolate', ['linear'], ['zoom'], 5, 3, 16, 20], 'line-opacity': .34, 'line-blur': 11 }
    }, firstSymbolId);

    state.map.addLayer({
      id: 'atlas-route-line', type: 'line', source: 'atlas-route',
      layout: { 'line-join': 'round', 'line-cap': 'round' },
      paint: { 'line-color': '#29d7ff', 'line-width': ['interpolate', ['linear'], ['zoom'], 5, 1.8, 16, 7], 'line-opacity': .96 }
    }, firstSymbolId);

    state.map.addLayer({
      id: 'atlas-route-progress-line', type: 'line', source: 'atlas-route-progress',
      layout: { 'line-join': 'round', 'line-cap': 'round' },
      paint: { 'line-color': '#e9fdff', 'line-width': ['interpolate', ['linear'], ['zoom'], 5, 2.2, 16, 8], 'line-opacity': .95 }
    }, firstSymbolId);

    state.map.addLayer({
      id: 'atlas-hazards-layer', type: 'circle', source: 'atlas-hazards',
      paint: { 'circle-radius': ['interpolate', ['linear'], ['zoom'], 5, 4, 16, 10], 'circle-color': '#ff6075', 'circle-stroke-color': '#fff0f3', 'circle-stroke-width': 2, 'circle-opacity': .9 }
    });

    state.map.addLayer({
      id: 'atlas-destination-layer', type: 'circle', source: 'atlas-destination',
      paint: { 'circle-radius': 9, 'circle-color': '#ffffff', 'circle-stroke-color': '#22d0ff', 'circle-stroke-width': 4 }
    });

    state.map.addLayer({
      id: 'atlas-forecast-layer', type: 'circle', source: 'atlas-forecast',
      paint: { 'circle-radius': 8, 'circle-color': '#eaff60', 'circle-stroke-color': '#07131f', 'circle-stroke-width': 3 }
    });

    state.map.addLayer({
      id: 'atlas-vehicle-pulse', type: 'circle', source: 'atlas-vehicle',
      paint: { 'circle-radius': 18, 'circle-color': '#22d0ff', 'circle-opacity': .16, 'circle-blur': .35 }
    });

    state.map.addLayer({
      id: 'atlas-vehicle-layer', type: 'symbol', source: 'atlas-vehicle',
      layout: {
        'text-field': '▲',
        'text-size': 28,
        'text-rotate': ['get', 'heading'],
        'text-rotation-alignment': 'map',
        'text-allow-overlap': true
      },
      paint: { 'text-color': '#f4fdff', 'text-halo-color': '#0874ad', 'text-halo-width': 3 }
    });
  }

  function add3DBuildings() {
    if (!state.mapLoaded || state.map.getLayer('atlas-3d-buildings')) return;
    const style = state.map.getStyle();
    const buildingLayer = style.layers.find((layer) => layer['source-layer'] === 'building');
    if (!buildingLayer?.source) return;
    const firstSymbolId = style.layers.find((layer) => layer.type === 'symbol')?.id;
    try {
      state.map.addLayer({
        id: 'atlas-3d-buildings',
        source: buildingLayer.source,
        'source-layer': 'building',
        type: 'fill-extrusion',
        minzoom: 14,
        paint: {
          'fill-extrusion-color': ['interpolate', ['linear'], ['zoom'], 14, '#173d52', 17, '#2d718a'],
          'fill-extrusion-height': ['coalesce', ['to-number', ['get', 'render_height']], ['*', ['to-number', ['get', 'levels'], 2], 3], 6],
          'fill-extrusion-base': ['coalesce', ['to-number', ['get', 'render_min_height']], 0],
          'fill-extrusion-opacity': .7,
          'fill-extrusion-vertical-gradient': true
        }
      }, firstSymbolId);
    } catch (error) {
      console.warn('ATLAS 3D buildings unavailable for this style.', error);
    }
  }

  function updateVehicleSource() {
    if (!state.mapLoaded) return;
    const source = state.map.getSource('atlas-vehicle');
    if (!source) return;
    source.setData({
      type: 'FeatureCollection',
      features: [{
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [state.current.longitude, state.current.latitude] },
        properties: { heading: Number.isFinite(state.current.heading) ? state.current.heading : 0 }
      }]
    });
  }

  function updateDestinationSource() {
    if (!state.mapLoaded) return;
    const source = state.map.getSource('atlas-destination');
    source.setData(state.destination ? {
      type: 'FeatureCollection', features: [{ type: 'Feature', geometry: { type: 'Point', coordinates: state.destination.coordinates }, properties: {} }]
    } : { type: 'FeatureCollection', features: [] });
  }

  async function startNavigation({ demo = false } = {}) {
    dom.permissionSheet.classList.add('hidden');
    if (demo) {
      toast('ATLAS demo mode active.');
      flyToCurrent();
      return;
    }
    requestLocation();
    requestOrientationPermission();
  }

  function requestLocation() {
    if (!navigator.geolocation) {
      toast(t('locationDenied'), 'error');
      return;
    }
    dom.routeStatus.textContent = t('locating');
    state.watchId = navigator.geolocation.watchPosition(handlePosition, handlePositionError, {
      enableHighAccuracy: true,
      maximumAge: 1500,
      timeout: 12000
    });
  }

  function handlePosition(position) {
    const coords = position.coords;
    const now = position.timestamp || Date.now();
    let speed = Number.isFinite(coords.speed) ? coords.speed * MPH_PER_MPS : 0;
    let heading = Number.isFinite(coords.heading) ? coords.heading : state.current.heading;

    if (!speed && state.previousFix) {
      const elapsedSeconds = Math.max(.1, (now - state.previousFix.timestamp) / 1000);
      const distance = haversineMeters([state.previousFix.longitude, state.previousFix.latitude], [coords.longitude, coords.latitude]);
      if (distance > Math.max(3, coords.accuracy || 0) && elapsedSeconds < 20) speed = (distance / elapsedSeconds) * MPH_PER_MPS;
      if (!Number.isFinite(coords.heading) && distance > 5) heading = bearingBetween([state.previousFix.longitude, state.previousFix.latitude], [coords.longitude, coords.latitude]);
    }

    state.current = {
      longitude: coords.longitude,
      latitude: coords.latitude,
      accuracy: coords.accuracy || 0,
      speed: Math.max(0, speed || 0),
      heading: Number.isFinite(heading) ? heading : 0
    };
    state.previousFix = { longitude: coords.longitude, latitude: coords.latitude, timestamp: now };

    dom.speedValue.textContent = Math.round(state.current.speed);
    dom.headingValue.textContent = `${Math.round(state.current.heading)}°`;
    dom.accuracyPill.textContent = `ACCURACY ±${Math.round(state.current.accuracy)}m`;
    dom.routeStatus.textContent = state.route ? t('routeActive') : t('locationActive');

    updateVehicleSource();
    if (state.following) followCurrentPosition();
    if (state.route) updateRouteProgress();
  }

  function handlePositionError(error) {
    console.warn('Geolocation error', error);
    dom.routeStatus.textContent = t('selectDestination');
    toast(t('locationDenied'), 'error', 5200);
    updateVehicleSource();
  }

  async function requestOrientationPermission() {
    try {
      if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
        const permission = await DeviceOrientationEvent.requestPermission();
        if (permission !== 'granted') return;
      }
      window.addEventListener('deviceorientationabsolute', handleOrientation, true);
      window.addEventListener('deviceorientation', handleOrientation, true);
    } catch (error) {
      console.warn('Orientation permission error', error);
    }
  }

  function handleOrientation(event) {
    let heading = Number.isFinite(event.webkitCompassHeading) ? event.webkitCompassHeading : null;
    if (heading === null && Number.isFinite(event.alpha)) heading = (360 - event.alpha) % 360;
    if (!Number.isFinite(heading)) return;
    state.current.heading = heading;
    dom.headingValue.textContent = `${Math.round(heading)}°`;
    updateVehicleSource();
    if (state.following && state.mapLoaded && !state.globe) state.map.easeTo({ bearing: heading, duration: 250 });
  }

  function followCurrentPosition() {
    if (!state.mapLoaded) return;
    state.map.easeTo({
      center: [state.current.longitude, state.current.latitude],
      zoom: state.route ? 16.2 : 15,
      pitch: state.globe ? 0 : 68,
      bearing: state.globe ? 0 : state.current.heading,
      duration: 650,
      essential: true
    });
  }

  function flyToCurrent() {
    if (!state.mapLoaded) return;
    state.map.flyTo({ center: [state.current.longitude, state.current.latitude], zoom: 15, pitch: 62, bearing: state.current.heading, essential: true });
  }

  function setFollowing(enabled) {
    state.following = enabled;
    dom.followButton.classList.toggle('active', enabled);
    dom.followButton.setAttribute('aria-pressed', String(enabled));
    if (enabled) followCurrentPosition();
  }

  async function enableCamera() {
    if (state.cameraStream) {
      stopCamera();
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      toast(t('cameraError'), 'error');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false
      });
      state.cameraStream = stream;
      dom.camera.srcObject = stream;
      await dom.camera.play();
      dom.camera.classList.add('active');
      dom.cameraButton.classList.add('active');
      dom.cameraButton.textContent = t('cameraEnabled');
    } catch (error) {
      console.warn('Camera error', error);
      toast(t('cameraError'), 'error', 5200);
    }
  }

  function stopCamera() {
    if (state.cameraStream) state.cameraStream.getTracks().forEach((track) => track.stop());
    state.cameraStream = null;
    dom.camera.srcObject = null;
    dom.camera.classList.remove('active');
    dom.cameraButton.classList.remove('active');
    dom.cameraButton.textContent = t('cameraEnable');
  }

  async function searchDestinations(query, { autoSelect = false } = {}) {
    const normalized = query.trim();
    if (normalized.length < 3) {
      closeSearchResults();
      return [];
    }

    if (state.searchAbort) state.searchAbort.abort();
    state.searchAbort = new AbortController();

    try {
      const params = new URLSearchParams({ q: normalized, format: 'jsonv2', limit: '6', addressdetails: '1', 'accept-language': state.language });
      const response = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`, {
        signal: state.searchAbort.signal,
        headers: { Accept: 'application/json' }
      });
      if (!response.ok) throw new Error(`Search HTTP ${response.status}`);
      const results = await response.json();
      renderSearchResults(results);
      if (autoSelect && results[0]) {
        selectSearchResult(results[0]);
        await calculateRoute();
      }
      if (autoSelect && !results.length) toast(t('noResults'), 'error');
      return results;
    } catch (error) {
      if (error.name === 'AbortError') return [];
      console.warn('Search error', error);
      toast(t('searchError'), 'error');
      return [];
    }
  }

  function renderSearchResults(results) {
    dom.searchResults.innerHTML = '';
    if (!results.length) {
      const empty = document.createElement('div');
      empty.className = 'search-result';
      empty.textContent = t('noResults');
      dom.searchResults.appendChild(empty);
    } else {
      results.forEach((result) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'search-result';
        button.setAttribute('role', 'option');
        const title = document.createElement('strong');
        title.textContent = result.name || result.display_name.split(',')[0];
        const detail = document.createElement('small');
        detail.textContent = result.display_name;
        button.append(title, detail);
        button.addEventListener('click', async () => {
          selectSearchResult(result);
          await calculateRoute();
        });
        dom.searchResults.appendChild(button);
      });
    }
    dom.searchResults.classList.add('open');
    dom.destinationInput.setAttribute('aria-expanded', 'true');
  }

  function selectSearchResult(result) {
    const longitude = Number(result.lon);
    const latitude = Number(result.lat);
    if (!Number.isFinite(longitude) || !Number.isFinite(latitude)) return;
    state.selectedSearchResult = result;
    state.destination = {
      coordinates: [longitude, latitude],
      name: result.name || result.display_name.split(',')[0],
      displayName: result.display_name
    };
    dom.destinationInput.value = state.destination.displayName;
    updateDestinationSource();
    closeSearchResults();
  }

  function closeSearchResults() {
    dom.searchResults.classList.remove('open');
    dom.destinationInput.setAttribute('aria-expanded', 'false');
  }

  async function calculateRoute({ silent = false } = {}) {
    if (!state.destination) {
      await searchDestinations(dom.destinationInput.value, { autoSelect: true });
      return;
    }

    const origin = [state.current.longitude, state.current.latitude];
    const destination = state.destination.coordinates;
    dom.routeStatus.textContent = t('routeCalculating');
    dom.routeCard.classList.remove('inactive');

    try {
      const coordinates = `${origin[0]},${origin[1]};${destination[0]},${destination[1]}`;
      const params = new URLSearchParams({ alternatives: 'false', steps: 'true', overview: 'full', geometries: 'geojson' });
      const response = await fetch(`https://router.project-osrm.org/route/v1/driving/${coordinates}?${params.toString()}`);
      if (!response.ok) throw new Error(`Route HTTP ${response.status}`);
      const data = await response.json();
      if (data.code !== 'Ok' || !data.routes?.[0]) throw new Error(data.message || 'No route');
      applyRoute(data.routes[0]);
      if (!silent) toast(`${t('routeTo')} ${state.destination.name}`);
    } catch (error) {
      console.warn('Route error', error);
      dom.routeStatus.textContent = t('routeError');
      toast(t('routeError'), 'error', 5200);
    }
  }

  function applyRoute(route) {
    state.route = route;
    state.routeCoordinates = route.geometry.coordinates;
    state.routeCumulative = buildCumulativeDistances(state.routeCoordinates);
    state.routeSteps = route.legs.flatMap((leg) => leg.steps || []);
    state.progressFraction = 0;
    state.lastSpokenStep = -1;
    dom.timelineSlider.value = '0';

    state.map.getSource('atlas-route').setData({ type: 'Feature', geometry: route.geometry, properties: {} });
    state.map.getSource('atlas-route-progress').setData({ type: 'Feature', geometry: { type: 'LineString', coordinates: [state.routeCoordinates[0], state.routeCoordinates[0]] }, properties: {} });

    const bounds = state.routeCoordinates.reduce((box, coordinate) => box.extend(coordinate), new maplibregl.LngLatBounds(state.routeCoordinates[0], state.routeCoordinates[0]));
    state.map.fitBounds(bounds, { padding: { top: 95, right: 80, bottom: 115, left: 390 }, maxZoom: 16, pitch: 56, duration: 1200 });

    updateRouteMetrics(route.distance, route.duration);
    updateInstructionForStep(0);
    updateTimelineForecast();
    dom.routeStatus.textContent = t('routeActive');
    dom.signPrimary.textContent = state.destination.name;
    dom.signSecondary.textContent = t('routeActive');
    dom.signDirection.textContent = 'ATLAS ROUTE';
    dom.routeCard.classList.remove('inactive');
  }

  function updateRouteMetrics(distance, duration) {
    dom.remainingDistance.textContent = formatDistance(distance);
    dom.remainingTime.textContent = formatDuration(duration);
    dom.arrivalTime.textContent = formatArrival(duration);
  }

  function updateRouteProgress() {
    const currentCoordinate = [state.current.longitude, state.current.latitude];
    const nearest = nearestRoutePoint(currentCoordinate);
    state.progressFraction = Math.max(state.progressFraction, nearest.fraction);

    const progressCoordinates = state.routeCoordinates.slice(0, nearest.index + 1);
    if (progressCoordinates.length === 1) progressCoordinates.push(progressCoordinates[0]);
    state.map.getSource('atlas-route-progress').setData({ type: 'Feature', geometry: { type: 'LineString', coordinates: progressCoordinates }, properties: {} });

    const remainingFraction = Math.max(0, 1 - state.progressFraction);
    updateRouteMetrics(state.route.distance * remainingFraction, state.route.duration * remainingFraction);
    updateActiveStep();
    updateTimelineForecast();

    if (nearest.distance > ROUTE_RECALC_THRESHOLD_METERS && Date.now() - state.lastRecalculateAt > ROUTE_RECALC_COOLDOWN_MS) {
      state.lastRecalculateAt = Date.now();
      calculateRoute({ silent: true }).then(() => toast(t('recalculate')));
    }

    if (remainingFraction < .003 || haversineMeters(currentCoordinate, state.destination.coordinates) < 35) {
      updateInstructionForStep(state.routeSteps.length - 1, true);
    }
  }

  function updateActiveStep() {
    if (!state.routeSteps.length) return;
    const traveledMeters = (state.routeCumulative.at(-1) || 0) * state.progressFraction;
    let cumulative = 0;
    let activeIndex = 0;
    for (let index = 0; index < state.routeSteps.length; index += 1) {
      cumulative += state.routeSteps[index].distance || 0;
      activeIndex = index;
      if (cumulative >= traveledMeters) break;
    }
    updateInstructionForStep(activeIndex);
  }

  function updateInstructionForStep(index, arrived = false) {
    const step = state.routeSteps[index];
    if (!step && !arrived) return;
    const instruction = arrived ? t('arrive') : instructionFromStep(step);
    const distance = arrived ? 0 : step.distance;
    const modifier = arrived ? 'arrive' : step.maneuver?.modifier || step.maneuver?.type;

    dom.nextInstruction.textContent = instruction;
    dom.nextDistance.textContent = arrived ? t('arrive') : formatDistance(distance);
    dom.maneuverIcon.textContent = maneuverArrow(modifier);
    dom.laneGuidance.textContent = laneText(modifier);
    dom.signExit.textContent = safeText(step?.maneuver?.type, 'NEXT').toUpperCase();
    dom.signDistance.textContent = arrived ? '0' : formatDistance(distance);

    if (state.voiceEnabled && index !== state.lastSpokenStep && (index === 0 || distance < 500)) {
      state.lastSpokenStep = index;
      speak(instruction);
    }
  }

  function instructionFromStep(step) {
    const maneuver = step.maneuver || {};
    const type = maneuver.type || 'continue';
    const modifier = maneuver.modifier || 'straight';
    const roadName = step.name ? ` ${t('on')} ${step.name}` : '';

    if (type === 'arrive') return t('arrive');
    if (type === 'merge') return `${t('merge')} ${directionText(modifier)}${roadName}`;
    if (type === 'on ramp' || type === 'off ramp') return `${t('ramp')} ${directionText(modifier)}${roadName}`;
    if (type === 'roundabout' || type === 'rotary') return `${t('roundabout')}${roadName}`;
    if (type === 'exit roundabout' || type === 'exit rotary') return `${t('exitRoundabout')}${roadName}`;
    if (type === 'turn') return `${t('turn')} ${directionText(modifier)}${roadName}`;
    if (type === 'fork' || type === 'continue' || type === 'new name' || type === 'end of road') return `${type === 'fork' ? t('keep') : t('proceed')} ${directionText(modifier)}${roadName}`;
    return `${t('proceed')} ${directionText(modifier)}${roadName}`;
  }

  function directionText(modifier) {
    const value = String(modifier || '').toLowerCase();
    if (value === 'uturn') return t('uturn');
    const side = value.includes('left') ? t('left') : value.includes('right') ? t('right') : t('straight');
    const intensity = value.includes('slight') ? `${t('slight')} ` : value.includes('sharp') ? `${t('sharp')} ` : '';
    return `${intensity}${side}`;
  }

  function maneuverArrow(modifier) {
    const value = String(modifier || '').toLowerCase();
    if (value.includes('uturn')) return '↶';
    if (value.includes('sharp left')) return '↙';
    if (value.includes('sharp right')) return '↘';
    if (value.includes('left')) return '↖';
    if (value.includes('right')) return '↗';
    if (value.includes('arrive')) return '◆';
    return '↑';
  }

  function laneText(modifier) {
    const value = String(modifier || '').toLowerCase();
    if (value.includes('left')) return state.language === 'es' ? 'Usa carriles izquierdos' : 'Use left lanes';
    if (value.includes('right')) return state.language === 'es' ? 'Usa carriles derechos' : 'Use right lanes';
    return state.language === 'es' ? 'Mantén el carril central' : 'Keep centered';
  }

  function updateTimelineForecast() {
    if (!state.route) {
      state.map?.getSource('atlas-forecast')?.setData({ type: 'FeatureCollection', features: [] });
      return;
    }
    const sliderFraction = Number(dom.timelineSlider.value) / 100;
    const forecastFraction = state.progressFraction + sliderFraction * (1 - state.progressFraction);
    const coordinate = coordinateAtFraction(forecastFraction);
    if (!coordinate) return;
    state.map.getSource('atlas-forecast').setData({
      type: 'FeatureCollection', features: [{ type: 'Feature', geometry: { type: 'Point', coordinates: coordinate }, properties: {} }]
    });
    const secondsAhead = state.route.duration * Math.max(0, forecastFraction - state.progressFraction);
    dom.timelineLabel.textContent = sliderFraction === 0 ? 'NOW' : `+${formatDuration(secondsAhead)}`;
  }

  function stopRoute() {
    state.route = null;
    state.routeCoordinates = [];
    state.routeCumulative = [];
    state.routeSteps = [];
    state.destination = null;
    state.progressFraction = 0;
    dom.destinationInput.value = '';
    dom.routeStatus.textContent = t('selectDestination');
    dom.nextDistance.textContent = t('ready');
    dom.nextInstruction.textContent = t('defaultInstruction');
    dom.remainingDistance.textContent = '—';
    dom.remainingTime.textContent = '—';
    dom.arrivalTime.textContent = '—';
    dom.maneuverIcon.textContent = '↑';
    dom.signPrimary.textContent = 'Route active';
    dom.signSecondary.textContent = 'ATLAS guidance';
    dom.signDistance.textContent = '—';
    dom.routeCard.classList.add('inactive');
    dom.timelineSlider.value = '0';
    dom.timelineLabel.textContent = 'NOW';
    if (state.mapLoaded) {
      const emptyLine = { type: 'Feature', geometry: { type: 'LineString', coordinates: [] }, properties: {} };
      state.map.getSource('atlas-route').setData(emptyLine);
      state.map.getSource('atlas-route-progress').setData(emptyLine);
      state.map.getSource('atlas-forecast').setData({ type: 'FeatureCollection', features: [] });
      updateDestinationSource();
    }
    toast(t('routeStopped'));
  }

  function speak(text) {
    if (!state.voiceEnabled || !window.speechSynthesis || !text) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = state.language === 'es' ? 'es-US' : 'en-US';
    utterance.rate = 1;
    window.speechSynthesis.speak(utterance);
  }

  function toggleVoice() {
    state.voiceEnabled = !state.voiceEnabled;
    dom.voiceButton.setAttribute('aria-pressed', String(state.voiceEnabled));
    dom.voiceButton.textContent = state.voiceEnabled ? t('voiceOn') : t('voiceOff');
    if (!state.voiceEnabled) window.speechSynthesis?.cancel();
  }

  function toggleGlobe() {
    if (!state.mapLoaded) return;
    state.globe = !state.globe;
    state.map.setProjection({ type: state.globe ? 'globe' : 'mercator' });
    dom.globeButton.classList.toggle('active', state.globe);
    dom.globeButton.setAttribute('aria-pressed', String(state.globe));
    if (state.globe) {
      setFollowing(false);
      state.map.flyTo({ center: [state.current.longitude, state.current.latitude], zoom: 1.4, pitch: 0, bearing: 0, duration: 1600, essential: true });
      toast(t('globe'));
    } else {
      state.map.flyTo({ center: [state.current.longitude, state.current.latitude], zoom: 15, pitch: 62, bearing: state.current.heading, duration: 1200, essential: true });
      toast(t('map'));
    }
  }

  function toggleBuildings() {
    state.buildings = !state.buildings;
    const layer = state.map?.getLayer('atlas-3d-buildings');
    if (layer) state.map.setLayoutProperty('atlas-3d-buildings', 'visibility', state.buildings ? 'visible' : 'none');
    dom.buildingsButton.classList.toggle('active', state.buildings);
    dom.buildingsButton.setAttribute('aria-pressed', String(state.buildings));
  }

  function updateNetworkStatus() {
    const online = navigator.onLine;
    dom.networkStatus.classList.toggle('offline', !online);
    dom.networkStatus.lastChild.textContent = online ? ' ONLINE' : ' OFFLINE';
  }

  function toggleLanguage() {
    state.language = state.language === 'es' ? 'en' : 'es';
    dom.languageButton.textContent = state.language.toUpperCase();
    document.documentElement.lang = state.language;
    dom.destinationInput.placeholder = t('destinationPlaceholder');
    dom.cameraButton.textContent = state.cameraStream ? t('cameraEnabled') : t('cameraEnable');
    dom.voiceButton.textContent = state.voiceEnabled ? t('voiceOn') : t('voiceOff');
    if (!state.route) {
      dom.nextDistance.textContent = t('ready');
      dom.routeStatus.textContent = t('selectDestination');
      dom.nextInstruction.textContent = t('defaultInstruction');
    } else {
      updateActiveStep();
    }
  }

  function toggleFullscreen() {
    const target = document.documentElement;
    if (!document.fullscreenElement) target.requestFullscreen?.().catch(() => toast('Fullscreen is not available.', 'error'));
    else document.exitFullscreen?.();
  }

  function loadHazards() {
    try {
      const value = JSON.parse(localStorage.getItem('atlas-gps-hazards') || '[]');
      return Array.isArray(value) ? value : [];
    } catch {
      return [];
    }
  }

  function persistHazards() {
    localStorage.setItem('atlas-gps-hazards', JSON.stringify(state.hazards.slice(-250)));
  }

  function renderHazards() {
    if (!state.mapLoaded) return;
    state.map.getSource('atlas-hazards').setData({
      type: 'FeatureCollection',
      features: state.hazards.map((hazard) => ({
        type: 'Feature', geometry: { type: 'Point', coordinates: hazard.coordinates }, properties: { id: hazard.id, createdAt: hazard.createdAt }
      }))
    });
  }

  function toggleHazardMode() {
    state.hazardMode = !state.hazardMode;
    state.map.getCanvas().style.cursor = state.hazardMode ? 'crosshair' : '';
    if (state.hazardMode) toast(t('hazardMode'), 'info', 5200);
  }

  function startVoiceRecognition() {
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Recognition) {
      toast(t('speechUnavailable'), 'error');
      return;
    }
    if (state.recognition) {
      state.recognition.stop();
      return;
    }
    const recognition = new Recognition();
    state.recognition = recognition;
    recognition.lang = state.language === 'es' ? 'es-US' : 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    dom.atlasOrb.classList.add('listening');
    toast(t('listening'));
    recognition.onresult = async (event) => {
      const transcript = event.results[0][0].transcript.trim();
      const destination = transcript.replace(/^(navega|navegar|llévame|llevarme|ir|go|navigate|take me)\s+(a|to)?\s*/i, '').trim();
      if (destination) {
        dom.destinationInput.value = destination;
        await searchDestinations(destination, { autoSelect: true });
      }
    };
    recognition.onerror = (event) => toast(event.error || t('speechUnavailable'), 'error');
    recognition.onend = () => {
      dom.atlasOrb.classList.remove('listening');
      state.recognition = null;
    };
    recognition.start();
  }

  function handleDockMode(event) {
    const button = event.currentTarget;
    document.querySelectorAll('.dock-button').forEach((item) => item.classList.toggle('active', item === button));
    const mode = button.dataset.mode;
    if (mode === 'overview') {
      if (state.route?.geometry?.coordinates?.length) {
        const coordinates = state.route.geometry.coordinates;
        const bounds = coordinates.reduce((box, coordinate) => box.extend(coordinate), new maplibregl.LngLatBounds(coordinates[0], coordinates[0]));
        state.map.fitBounds(bounds, { padding: 90, maxZoom: 15, duration: 900 });
      } else flyToCurrent();
    }
    if (mode === 'traffic') toast(t('trafficNeedsProvider'), 'info', 5200);
    if (mode === 'hazards') toggleHazardMode();
    if (mode === 'settings') dom.permissionSheet.classList.remove('hidden');
  }

  function bindEvents() {
    dom.startButton.addEventListener('click', () => startNavigation({ demo: false }));
    dom.demoButton.addEventListener('click', () => startNavigation({ demo: true }));
    dom.cameraButton.addEventListener('click', enableCamera);
    dom.languageButton.addEventListener('click', toggleLanguage);
    dom.fullscreenButton.addEventListener('click', toggleFullscreen);
    dom.locateButton.addEventListener('click', () => { setFollowing(true); flyToCurrent(); });
    dom.followButton.addEventListener('click', () => setFollowing(!state.following));
    dom.globeButton.addEventListener('click', toggleGlobe);
    dom.buildingsButton.addEventListener('click', toggleBuildings);
    dom.voiceButton.addEventListener('click', toggleVoice);
    dom.recalculateButton.addEventListener('click', () => calculateRoute().then(() => toast(t('recalculate'))));
    dom.stopRouteButton.addEventListener('click', stopRoute);
    dom.timelineSlider.addEventListener('input', updateTimelineForecast);
    dom.atlasOrb.addEventListener('click', startVoiceRecognition);
    dom.clearSearch.addEventListener('click', () => {
      dom.destinationInput.value = '';
      state.selectedSearchResult = null;
      closeSearchResults();
      dom.destinationInput.focus();
    });

    dom.destinationInput.addEventListener('input', () => {
      state.selectedSearchResult = null;
      window.clearTimeout(state.searchTimer);
      state.searchTimer = window.setTimeout(() => searchDestinations(dom.destinationInput.value), 380);
    });

    dom.destinationInput.addEventListener('focus', () => {
      if (dom.searchResults.childElementCount) dom.searchResults.classList.add('open');
    });

    dom.destinationForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      if (state.selectedSearchResult && state.destination) await calculateRoute();
      else await searchDestinations(dom.destinationInput.value, { autoSelect: true });
    });

    document.addEventListener('click', (event) => {
      if (!dom.destinationForm.contains(event.target)) closeSearchResults();
    });

    document.querySelectorAll('.dock-button').forEach((button) => button.addEventListener('click', handleDockMode));
    window.addEventListener('online', updateNetworkStatus);
    window.addEventListener('offline', updateNetworkStatus);
    window.addEventListener('beforeunload', () => {
      if (state.watchId !== null) navigator.geolocation?.clearWatch(state.watchId);
      stopCamera();
    });
  }

  function initialize() {
    initMap();
    bindEvents();
    updateNetworkStatus();
    dom.routeCard.classList.add('inactive');
    dom.destinationInput.placeholder = t('destinationPlaceholder');
    updateVehicleSource();
  }

  initialize();
})();
