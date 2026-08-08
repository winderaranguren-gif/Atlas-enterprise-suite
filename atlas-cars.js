(() => {
  'use strict';

  const domains = [
    ['Sensor Fusion 360','LiDAR · radar 4D · cámaras · ultrasonido','compute'],
    ['ATLAS AI Drive','Percepción · predicción · planificación','compute'],
    ['Safety Supervisor','Supervisión independiente · degradación segura','safety'],
    ['Vehicle Control Gateway','Interfaz lógica aislada; sin actuadores en este prototipo','safety'],
    ['800V+ Energy Core','BMS · inversores · carga · térmico','energy'],
    ['Smart Chassis','Estado de dirección · frenos · suspensión','energy'],
    ['AI Cabin','Cockpit · voz · perfiles · navegación','compute'],
    ['Vehicle Cloud','OTA firmado · telemetría · API · gemelo digital','compute'],
    ['Cybersecurity','Secure boot · identidad ECU · segmentación','safety'],
    ['Digital Twin','Batería · tren motriz · sensores · mantenimiento','compute'],
    ['Phone / Home / Infrastructure','ATLAS app · hogar · cargadores · estacionamientos','compute'],
    ['Data Plane','Event bus local · schemas · observabilidad','compute']
  ];

  const sensors = {
    lidar: { label: 'LiDAR', health: 100 },
    radar4d: { label: 'Radar 4D', health: 100 },
    cameras: { label: 'Cámaras HD', health: 100 },
    ultrasonic: { label: 'Ultrasonido', health: 100 }
  };

  const safetyChecks = [
    ['Computadora de conducción aislada','OK'],
    ['Supervisor de seguridad','OK'],
    ['OTA firmado + rollback','OK'],
    ['Red crítica segmentada','OK'],
    ['Procesamiento crítico local','OK'],
    ['Modo degradado disponible','READY']
  ];

  const state = {
    running: false,
    tick: 0,
    soc: 82,
    objects: 0,
    aiLoad: 18,
    latency: 19,
    faultedSensor: null,
    timer: null,
    language: 'es'
  };

  const $ = id => document.getElementById(id);
  const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
  const stamp = () => new Date().toLocaleTimeString([], { hour12: false });

  function log(type, message, data) {
    const line = `[${stamp()}] ${type.padEnd(8)} ${message}${data ? ` ${JSON.stringify(data)}` : ''}`;
    const output = $('event-log');
    output.textContent = `${line}\n${output.textContent}`.slice(0, 14000);
  }

  function renderArchitecture() {
    $('architecture-map').innerHTML = domains.map(([name, description, kind]) => `
      <div class="domain ${kind}">
        <strong>${name}</strong>
        <span>${description}</span>
      </div>`).join('');
  }

  function renderSafety() {
    $('safety-list').innerHTML = safetyChecks.map(([name, status]) => `
      <li><span>${name}</span><b>${status}</b></li>`).join('');
  }

  function renderSensors() {
    $('sensor-grid').innerHTML = Object.entries(sensors).map(([id, sensor]) => `
      <div class="sensor ${sensor.health < 80 ? 'degraded' : ''}" data-sensor="${id}">
        <span>${sensor.label}</span>
        <strong>${sensor.health}% · ${sensor.health >= 80 ? 'NOMINAL' : 'DEGRADED'}</strong>
      </div>`).join('');
  }

  function overallSensorHealth() {
    const values = Object.values(sensors).map(s => s.health);
    return Math.round(values.reduce((a, b) => a + b, 0) / values.length);
  }

  function updateSafetyState() {
    const health = overallSensorHealth();
    const degraded = health < 95;
    $('vehicle-state').textContent = degraded ? 'DEGRADED SAFE' : state.running ? 'SIM ACTIVE' : 'READY';
    $('safety-detail').textContent = degraded ? 'Fallo aislado; redundancia activa' : 'Todos los dominios nominales';
    $('sensor-health').textContent = `${health}%`;
    $('powertrain').textContent = 'NOMINAL';
    $('bms').textContent = state.soc > 15 ? 'NOMINAL' : 'LOW SOC';
    $('chassis').textContent = 'NOMINAL';
  }

  function updateMetrics() {
    $('soc').textContent = `${state.soc.toFixed(1)}%`;
    $('range').textContent = `Autonomía estimada ${Math.round(state.soc * 6.07)} km`;
    $('ai-load').textContent = `${Math.round(state.aiLoad)}%`;
    $('latency').textContent = `Latencia ${Math.round(state.latency)} ms`;
    $('objects').textContent = `${state.objects} objetos fusionados`;
    updateSafetyState();
  }

  function tick() {
    state.tick += 1;
    state.soc = clamp(state.soc - 0.02, 0, 100);
    state.objects = Math.max(0, Math.round(8 + Math.sin(state.tick / 2) * 6 + Math.random() * 7));
    state.aiLoad = clamp(26 + state.objects * 1.8 + Math.random() * 8, 10, 88);
    state.latency = clamp(16 + state.objects * 0.32 + Math.random() * 4, 12, 45);
    updateMetrics();
    if (state.tick % 4 === 0) {
      log('FUSION', 'Perception frame fused', { objects: state.objects, latency_ms: Math.round(state.latency), sensor_health: overallSensorHealth() });
    }
    if (state.tick % 9 === 0) {
      log('TWIN', 'Digital twin state synchronized locally', { soc: Number(state.soc.toFixed(1)), ai_load: Math.round(state.aiLoad) });
    }
  }

  function startSimulation() {
    if (state.running) {
      state.running = false;
      clearInterval(state.timer);
      state.timer = null;
      $('run-btn').textContent = 'Iniciar simulación';
      log('SYSTEM', 'Simulation paused');
      updateMetrics();
      return;
    }
    state.running = true;
    state.timer = setInterval(tick, 1000);
    $('run-btn').textContent = 'Pausar simulación';
    log('SYSTEM', 'Simulation started', { physical_actuation: false, mode: 'software-only' });
    updateMetrics();
  }

  function simulateFault() {
    const keys = Object.keys(sensors);
    if (state.faultedSensor) {
      sensors[state.faultedSensor].health = 100;
      log('SAFETY', 'Sensor restored', { sensor: state.faultedSensor });
      state.faultedSensor = null;
      $('fault-btn').textContent = 'Simular fallo de sensor';
    } else {
      const id = keys[Math.floor(Math.random() * keys.length)];
      sensors[id].health = 42;
      state.faultedSensor = id;
      $('fault-btn').textContent = 'Restaurar sensor';
      log('SAFETY', 'Synthetic sensor degradation detected; redundancy path active', { sensor: id, physical_actuation: false });
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
    $('run-btn').textContent = 'Iniciar simulación';
    $('fault-btn').textContent = 'Simular fallo de sensor';
    $('event-log').textContent = '';
    renderSensors();
    updateMetrics();
    log('SYSTEM', 'ATLAS Cars Architecture Lab reset');
  }

  function toggleTheme() {
    document.body.classList.toggle('light');
    localStorage.setItem('atlas-cars-theme', document.body.classList.contains('light') ? 'light' : 'dark');
  }

  function toggleLanguage() {
    state.language = state.language === 'es' ? 'en' : 'es';
    $('language-btn').textContent = state.language === 'es' ? 'EN' : 'ES';
    log('UI', `Language preference changed to ${state.language.toUpperCase()}`);
  }

  $('run-btn').addEventListener('click', startSimulation);
  $('fault-btn').addEventListener('click', simulateFault);
  $('reset-btn').addEventListener('click', reset);
  $('clear-log').addEventListener('click', () => { $('event-log').textContent = ''; });
  $('theme-btn').addEventListener('click', toggleTheme);
  $('language-btn').addEventListener('click', toggleLanguage);

  if (localStorage.getItem('atlas-cars-theme') === 'light') document.body.classList.add('light');
  renderArchitecture();
  renderSafety();
  renderSensors();
  updateMetrics();
  log('SYSTEM', 'Architecture loaded', { version: '1.0.0', actuation: 'disabled' });
})();
