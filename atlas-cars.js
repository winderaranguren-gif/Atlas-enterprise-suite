(() => {
  'use strict';

  const ARCHITECTURE_VERSION = '1.0.1';

  const copy = {
    es: {
      meta: 'ATLAS Cars — arquitectura de vehículo eléctrico, IA, seguridad y gemelo digital.',
      back: 'Volver a ATLAS Enterprise Suite',
      mode: 'SIMULACIÓN · SIN ACTUACIÓN FÍSICA',
      langLabel: 'Cambiar idioma a inglés',
      themeLabel: 'Cambiar tema claro u oscuro',
      heroTitle: 'Arquitectura eléctrica, IA, seguridad y nube en un solo núcleo.',
      heroLede: 'Prototipo funcional de software para validar telemetría, fusión de sensores, supervisión de seguridad, energía, cockpit y gemelo digital antes de cualquier integración con hardware real.',
      start: 'Iniciar simulación', pause: 'Pausar simulación', fault: 'Simular fallo de sensor', restore: 'Restaurar sensor', reset: 'Restablecer', clear: 'Limpiar',
      state: 'Estado', battery: 'Batería', ai: 'Cómputo IA', sensors: 'Sensores', metricsAria: 'Telemetría simulada',
      architecture: 'Arquitectura ATLAS Cars', architectureLoaded: 'Arquitectura cargada', safety: 'Supervisor independiente', perception: 'Salud de percepción', twin: 'Gemelo digital del vehículo', event: 'Telemetría de prueba',
      powertrain: 'Tren motriz', chassis: 'Chasis', connectivity: 'Conectividad', identity: 'Identidad', signedRollback: 'FIRMADO + ROLLBACK',
      footer: 'El prototipo no emite comandos de aceleración, frenado, dirección ni control de alto voltaje.',
      range: km => `Autonomía estimada ${km} km`, latency: ms => `Latencia ${ms} ms`, objects: n => `${n} objetos fusionados`,
      nominalDetail: 'Todos los dominios nominales', sensorDetail: 'Fallo aislado; redundancia activa', energyDetail: 'SOC bajo; dominio de energía en modo seguro', bothDetail: 'Fallo de sensor y SOC bajo; redundancia activa',
      ready: 'READY', active: 'SIM ACTIVE', degraded: 'DEGRADED SAFE', lowEnergy: 'LOW ENERGY SAFE', combined: 'DEGRADED + LOW SOC', nominal: 'NOMINAL', lowSoc: 'LOW SOC', degradedSensor: 'DEGRADED',
      events: {
        frameFused: 'Cuadro de percepción fusionado',
        twinSynced: 'Estado del gemelo digital sincronizado localmente',
        paused: 'Simulación pausada',
        started: 'Simulación iniciada',
        sensorRestored: 'Sensor restaurado',
        sensorDegraded: 'Degradación sintética de sensor detectada; redundancia activa',
        reset: 'ATLAS Cars Architecture Lab restablecido',
        languageChanged: language => `Idioma cambiado a ${language}`,
        architectureLoaded: 'Arquitectura cargada'
      }
    },
    en: {
      meta: 'ATLAS Cars — electric vehicle, AI, safety and digital-twin architecture.',
      back: 'Back to ATLAS Enterprise Suite',
      mode: 'SIMULATION · NO PHYSICAL ACTUATION',
      langLabel: 'Switch language to Spanish',
      themeLabel: 'Toggle light or dark theme',
      heroTitle: 'Electrical architecture, AI, safety and cloud in one core.',
      heroLede: 'Functional software prototype for validating telemetry, sensor fusion, safety supervision, energy, cockpit and the digital twin before any integration with real hardware.',
      start: 'Start simulation', pause: 'Pause simulation', fault: 'Simulate sensor fault', restore: 'Restore sensor', reset: 'Reset', clear: 'Clear',
      state: 'State', battery: 'Battery', ai: 'AI compute', sensors: 'Sensors', metricsAria: 'Simulated telemetry',
      architecture: 'ATLAS Cars Architecture', architectureLoaded: 'Architecture loaded', safety: 'Independent supervisor', perception: 'Perception health', twin: 'Vehicle digital twin', event: 'Test telemetry',
      powertrain: 'Powertrain', chassis: 'Chassis', connectivity: 'Connectivity', identity: 'Identity', signedRollback: 'SIGNED + ROLLBACK',
      footer: 'This prototype does not issue acceleration, braking, steering or high-voltage control commands.',
      range: km => `Estimated range ${km} km`, latency: ms => `Latency ${ms} ms`, objects: n => `${n} fused objects`,
      nominalDetail: 'All domains nominal', sensorDetail: 'Isolated fault; redundancy active', energyDetail: 'Low SOC; energy domain in safe mode', bothDetail: 'Sensor fault and low SOC; redundancy active',
      ready: 'READY', active: 'SIM ACTIVE', degraded: 'DEGRADED SAFE', lowEnergy: 'LOW ENERGY SAFE', combined: 'DEGRADED + LOW SOC', nominal: 'NOMINAL', lowSoc: 'LOW SOC', degradedSensor: 'DEGRADED',
      events: {
        frameFused: 'Perception frame fused',
        twinSynced: 'Digital twin state synchronized locally',
        paused: 'Simulation paused',
        started: 'Simulation started',
        sensorRestored: 'Sensor restored',
        sensorDegraded: 'Synthetic sensor degradation detected; redundancy path active',
        reset: 'ATLAS Cars Architecture Lab reset',
        languageChanged: language => `Language changed to ${language}`,
        architectureLoaded: 'Architecture loaded'
      }
    }
  };

  const domains = [
    { name: ['Sensor Fusion 360','Sensor Fusion 360'], desc: ['LiDAR · radar 4D · cámaras · ultrasonido','LiDAR · 4D radar · cameras · ultrasonic'], kind: 'compute' },
    { name: ['ATLAS AI Drive','ATLAS AI Drive'], desc: ['Percepción · predicción · planificación','Perception · prediction · planning'], kind: 'compute' },
    { name: ['Safety Supervisor','Safety Supervisor'], desc: ['Supervisión independiente · degradación segura','Independent supervision · safe degradation'], kind: 'safety' },
    { name: ['Vehicle Control Gateway','Vehicle Control Gateway'], desc: ['Interfaz lógica aislada; sin actuadores en este prototipo','Isolated logical interface; no actuators in this prototype'], kind: 'safety' },
    { name: ['800V+ Energy Core','800V+ Energy Core'], desc: ['BMS · inversores · carga · térmico','BMS · inverters · charging · thermal'], kind: 'energy' },
    { name: ['Smart Chassis','Smart Chassis'], desc: ['Estado de dirección · frenos · suspensión','Steering · brakes · suspension state'], kind: 'energy' },
    { name: ['AI Cabin','AI Cabin'], desc: ['Cockpit · voz · perfiles · navegación','Cockpit · voice · profiles · navigation'], kind: 'compute' },
    { name: ['Vehicle Cloud','Vehicle Cloud'], desc: ['OTA firmado · telemetría · API · gemelo digital','Signed OTA · telemetry · API · digital twin'], kind: 'compute' },
    { name: ['Cybersecurity','Cybersecurity'], desc: ['Secure boot · identidad ECU · segmentación','Secure boot · ECU identity · segmentation'], kind: 'safety' },
    { name: ['Digital Twin','Digital Twin'], desc: ['Batería · tren motriz · sensores · mantenimiento','Battery · powertrain · sensors · maintenance'], kind: 'compute' },
    { name: ['Phone / Home / Infrastructure','Phone / Home / Infrastructure'], desc: ['ATLAS app · hogar · cargadores · estacionamientos','ATLAS app · home · chargers · parking'], kind: 'compute' },
    { name: ['Data Plane','Data Plane'], desc: ['Event bus local · schemas · observabilidad','Local event bus · schemas · observability'], kind: 'compute' }
  ];

  const sensors = {
    lidar: { label: ['LiDAR','LiDAR'], health: 100 },
    radar4d: { label: ['Radar 4D','4D Radar'], health: 100 },
    cameras: { label: ['Cámaras HD','HD Cameras'], health: 100 },
    ultrasonic: { label: ['Ultrasonido','Ultrasonic'], health: 100 }
  };

  const safetyChecks = [
    [['Computadora de conducción aislada','Isolated driving computer'],'OK'],
    [['Supervisor de seguridad','Safety supervisor'],'OK'],
    [['OTA firmado + rollback','Signed OTA + rollback'],'OK'],
    [['Red crítica segmentada','Segmented critical network'],'OK'],
    [['Procesamiento crítico local','Local critical processing'],'OK'],
    [['Modo degradado disponible','Degraded mode available'],'READY']
  ];

  const state = { running: false, tick: 0, soc: 82, objects: 0, aiLoad: 18, latency: 19, faultedSensor: null, timer: null, language: localStorage.getItem('atlas-cars-language') === 'en' ? 'en' : 'es' };
  const $ = id => document.getElementById(id);
  const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
  const stamp = () => new Date().toLocaleTimeString([], { hour12: false });
  const c = () => copy[state.language];
  const langIndex = () => state.language === 'es' ? 0 : 1;

  function log(type, message, data) {
    const line = `[${stamp()}] ${type.padEnd(8)} ${message}${data ? ` ${JSON.stringify(data)}` : ''}`;
    const output = $('event-log');
    output.textContent = `${line}\n${output.textContent}`.slice(0, 14000);
  }

  function renderArchitecture() {
    const i = langIndex();
    $('architecture-map').innerHTML = domains.map(domain => `<div class="domain ${domain.kind}"><strong>${domain.name[i]}</strong><span>${domain.desc[i]}</span></div>`).join('');
  }

  function renderSafety() {
    const i = langIndex();
    $('safety-list').innerHTML = safetyChecks.map(([name, status]) => `<li><span>${name[i]}</span><b>${status}</b></li>`).join('');
  }

  function renderSensors() {
    const i = langIndex();
    $('sensor-grid').innerHTML = Object.entries(sensors).map(([id, sensor]) => `<div class="sensor ${sensor.health < 80 ? 'degraded' : ''}" data-sensor="${id}"><span>${sensor.label[i]}</span><strong>${sensor.health}% · ${sensor.health >= 80 ? c().nominal : c().degradedSensor}</strong></div>`).join('');
  }

  function overallSensorHealth() {
    const values = Object.values(sensors).map(s => s.health);
    return Math.round(values.reduce((a, b) => a + b, 0) / values.length);
  }

  function updateSafetyState() {
    const health = overallSensorHealth();
    const sensorDegraded = health < 95;
    const energyLow = state.soc <= 15;
    if (sensorDegraded && energyLow) {
      $('vehicle-state').textContent = c().combined;
      $('safety-detail').textContent = c().bothDetail;
    } else if (sensorDegraded) {
      $('vehicle-state').textContent = c().degraded;
      $('safety-detail').textContent = c().sensorDetail;
    } else if (energyLow) {
      $('vehicle-state').textContent = c().lowEnergy;
      $('safety-detail').textContent = c().energyDetail;
    } else {
      $('vehicle-state').textContent = state.running ? c().active : c().ready;
      $('safety-detail').textContent = c().nominalDetail;
    }
    $('sensor-health').textContent = `${health}%`;
    $('powertrain').textContent = c().nominal;
    $('bms').textContent = energyLow ? c().lowSoc : c().nominal;
    $('chassis').textContent = c().nominal;
  }

  function updateMetrics() {
    $('soc').textContent = `${state.soc.toFixed(1)}%`;
    $('range').textContent = c().range(Math.round(state.soc * 6.07));
    $('ai-load').textContent = `${Math.round(state.aiLoad)}%`;
    $('latency').textContent = c().latency(Math.round(state.latency));
    $('objects').textContent = c().objects(state.objects);
    updateSafetyState();
  }

  function applyLanguage() {
    const t = c();
    document.documentElement.lang = state.language;
    $('meta-description').setAttribute('content', t.meta);
    $('brand-link').setAttribute('aria-label', t.back);
    $('mode-pill').textContent = t.mode;
    $('language-btn').textContent = state.language === 'es' ? 'EN' : 'ES';
    $('language-btn').setAttribute('aria-label', t.langLabel);
    $('theme-btn').setAttribute('aria-label', t.themeLabel);
    $('theme-btn').setAttribute('title', t.themeLabel);
    $('hero-title').textContent = t.heroTitle;
    $('hero-lede').textContent = t.heroLede;
    $('run-btn').textContent = state.running ? t.pause : t.start;
    $('fault-btn').textContent = state.faultedSensor ? t.restore : t.fault;
    $('reset-btn').textContent = t.reset;
    $('clear-log').textContent = t.clear;
    $('label-state').textContent = t.state;
    $('label-battery').textContent = t.battery;
    $('label-ai').textContent = t.ai;
    $('label-sensors').textContent = t.sensors;
    $('metrics-section').setAttribute('aria-label', t.metricsAria);
    $('architecture-title').textContent = t.architecture;
    $('architecture-status').setAttribute('title', t.architectureLoaded);
    $('safety-title').textContent = t.safety;
    $('sensor-title').textContent = t.perception;
    $('twin-title').textContent = t.twin;
    $('event-title').textContent = t.event;
    $('label-powertrain').textContent = t.powertrain;
    $('label-chassis').textContent = t.chassis;
    $('label-connectivity').textContent = t.connectivity;
    $('label-identity').textContent = t.identity;
    $('ota-status').textContent = t.signedRollback;
    $('footer-note').textContent = t.footer;
    renderArchitecture();
    renderSafety();
    renderSensors();
    updateMetrics();
  }

  function tick() {
    state.tick += 1;
    state.soc = clamp(state.soc - 0.02, 0, 100);
    state.objects = Math.max(0, Math.round(8 + Math.sin(state.tick / 2) * 6 + Math.random() * 7));
    state.aiLoad = clamp(26 + state.objects * 1.8 + Math.random() * 8, 10, 88);
    state.latency = clamp(16 + state.objects * 0.32 + Math.random() * 4, 12, 45);
    updateMetrics();
    if (state.tick % 4 === 0) log('FUSION', c().events.frameFused, { objects: state.objects, latency_ms: Math.round(state.latency), sensor_health: overallSensorHealth() });
    if (state.tick % 9 === 0) log('TWIN', c().events.twinSynced, { soc: Number(state.soc.toFixed(1)), ai_load: Math.round(state.aiLoad) });
  }

  function startSimulation() {
    if (state.running) {
      state.running = false;
      clearInterval(state.timer);
      state.timer = null;
      $('run-btn').textContent = c().start;
      log('SYSTEM', c().events.paused);
      updateMetrics();
      return;
    }
    state.running = true;
    state.timer = setInterval(tick, 1000);
    $('run-btn').textContent = c().pause;
    log('SYSTEM', c().events.started, { physical_actuation: false, mode: 'software-only' });
    updateMetrics();
  }

  function simulateFault() {
    const keys = Object.keys(sensors);
    if (state.faultedSensor) {
      sensors[state.faultedSensor].health = 100;
      log('SAFETY', c().events.sensorRestored, { sensor: state.faultedSensor });
      state.faultedSensor = null;
      $('fault-btn').textContent = c().fault;
    } else {
      const id = keys[Math.floor(Math.random() * keys.length)];
      sensors[id].health = 42;
      state.faultedSensor = id;
      $('fault-btn').textContent = c().restore;
      log('SAFETY', c().events.sensorDegraded, { sensor: id, physical_actuation: false });
    }
    renderSensors();
    updateMetrics();
  }

  function reset() {
    clearInterval(state.timer);
    state.running = false;
    state.tick = 0;
    state.soc = 82;
    state.objects = 0;
    state.aiLoad = 18;
    state.latency = 19;
    state.faultedSensor = null;
    Object.values(sensors).forEach(sensor => { sensor.health = 100; });
    $('event-log').textContent = '';
    applyLanguage();
    log('SYSTEM', c().events.reset);
  }

  function toggleTheme() {
    document.body.classList.toggle('light');
    localStorage.setItem('atlas-cars-theme', document.body.classList.contains('light') ? 'light' : 'dark');
  }

  function toggleLanguage() {
    state.language = state.language === 'es' ? 'en' : 'es';
    localStorage.setItem('atlas-cars-language', state.language);
    applyLanguage();
    log('UI', c().events.languageChanged(state.language.toUpperCase()));
  }

  $('run-btn').addEventListener('click', startSimulation);
  $('fault-btn').addEventListener('click', simulateFault);
  $('reset-btn').addEventListener('click', reset);
  $('clear-log').addEventListener('click', () => { $('event-log').textContent = ''; });
  $('theme-btn').addEventListener('click', toggleTheme);
  $('language-btn').addEventListener('click', toggleLanguage);

  if (localStorage.getItem('atlas-cars-theme') === 'light') document.body.classList.add('light');
  applyLanguage();
  log('SYSTEM', c().events.architectureLoaded, { version: ARCHITECTURE_VERSION, actuation: 'disabled' });
})();
