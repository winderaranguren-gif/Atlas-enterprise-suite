'use strict';

const TRACKS = [
  {
    id: 'first-light',
    title: 'First Light',
    collection: 'ATLAS Origin',
    type: 'audio-video',
    mood: 'Ambient identity',
    energy: 'Medium',
    duration: 228,
    art: 'origin',
    bpm: 82,
    root: 48,
    scale: [0, 4, 7, 11, 14],
    rights: { playback: true, video: true, production: true, commercial: true, territory: 'Worldwide', expiry: 'None', owner: 'ATLAS', editable: true }
  },
  {
    id: 'horizon-rise',
    title: 'Horizon Rise',
    collection: 'Living Collections',
    type: 'audio-video',
    mood: 'Uplifting · Cinematic',
    energy: 'Medium',
    duration: 246,
    art: 'horizon',
    bpm: 92,
    root: 48,
    scale: [0, 4, 7, 9, 12, 16],
    rights: { playback: true, video: true, production: true, commercial: true, territory: 'Worldwide', expiry: 'None', owner: 'ATLAS', editable: true }
  },
  {
    id: 'pulse-core',
    title: 'Pulse Core',
    collection: 'Living Collections',
    type: 'audio-video',
    mood: 'Rhythmic · Modern',
    energy: 'High',
    duration: 214,
    art: 'pulse',
    bpm: 110,
    root: 45,
    scale: [0, 3, 7, 10, 12, 15],
    rights: { playback: true, video: true, production: true, commercial: true, territory: 'Worldwide', expiry: 'None', owner: 'ATLAS', editable: true }
  },
  {
    id: 'focus-flow',
    title: 'Focus Flow',
    collection: 'Living Collections',
    type: 'audio-video',
    mood: 'Minimal · Immersive',
    energy: 'Low',
    duration: 312,
    art: 'focus',
    bpm: 72,
    root: 50,
    scale: [0, 2, 5, 7, 9, 12],
    rights: { playback: true, video: true, production: true, commercial: true, territory: 'Worldwide', expiry: 'None', owner: 'ATLAS', editable: true }
  },
  {
    id: 'vector-drive',
    title: 'Vector Drive',
    collection: 'Living Collections',
    type: 'audio-video',
    mood: 'Energetic · Futuristic',
    energy: 'High',
    duration: 238,
    art: 'vector',
    bpm: 124,
    root: 40,
    scale: [0, 3, 7, 10, 12, 15, 19],
    rights: { playback: true, video: true, production: true, commercial: true, territory: 'Worldwide', expiry: 'None', owner: 'ATLAS', editable: true }
  },
  {
    id: 'calm-room',
    title: 'Calm Room',
    collection: 'Living Collections',
    type: 'audio-video',
    mood: 'Peaceful · Restorative',
    energy: 'Low',
    duration: 356,
    art: 'calm',
    bpm: 58,
    root: 53,
    scale: [0, 4, 7, 9, 12, 16],
    rights: { playback: true, video: true, production: true, commercial: true, territory: 'Worldwide', expiry: 'None', owner: 'ATLAS', editable: true }
  }
];

const PROVIDERS = [
  { id: 'atlas', name: 'ATLAS Originals', status: 'active', purpose: 'Original audio + visual content owned by ATLAS.' },
  { id: 'apple', name: 'Apple Music / MusicKit', status: 'not-connected', purpose: 'Authorized commercial catalog playback and artwork when configured.' },
  { id: 'youtube', name: 'YouTube Data / Player', status: 'not-connected', purpose: 'Official video discovery/playback subject to provider terms.' }
];

const STORAGE_KEY = 'atlas.music.v1';
const defaultStore = { liked: ['first-light'], folders: [{ id: 'atlas-video', name: 'ATLAS Video' }], folderTracks: { 'atlas-video': ['horizon-rise'] }, metadata: {} };

function readStore() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return structuredClone(defaultStore);
    return { ...structuredClone(defaultStore), ...JSON.parse(raw) };
  } catch (_) {
    return structuredClone(defaultStore);
  }
}

const state = {
  view: 'home',
  query: '',
  currentTrackId: 'first-light',
  playing: false,
  startedAt: 0,
  pausedAt: 0,
  progressTimer: null,
  audio: null,
  sequenceTimer: null,
  store: readStore(),
  visualRaf: null
};

const els = {};

document.addEventListener('DOMContentLoaded', () => {
  Object.assign(els, {
    content: document.getElementById('music-content'),
    nav: document.getElementById('music-nav'),
    title: document.getElementById('view-title'),
    search: document.getElementById('search-input'),
    sidebar: document.getElementById('music-sidebar'),
    folders: document.getElementById('folder-list'),
    playerTitle: document.getElementById('player-title'),
    playerSubtitle: document.getElementById('player-subtitle'),
    playerArt: document.getElementById('player-art'),
    playerLike: document.getElementById('player-like'),
    play: document.getElementById('play-btn'),
    prev: document.getElementById('prev-btn'),
    next: document.getElementById('next-btn'),
    progress: document.getElementById('progress'),
    elapsed: document.getElementById('elapsed'),
    duration: document.getElementById('duration'),
    volume: document.getElementById('volume'),
    modalRoot: document.getElementById('modal-root')
  });

  bindShellEvents();
  renderFolders();
  selectTrack(state.currentTrackId, false);
  render();
});

function bindShellEvents() {
  els.nav.addEventListener('click', (event) => {
    const button = event.target.closest('[data-view]');
    if (!button) return;
    state.view = button.dataset.view;
    state.query = '';
    els.search.value = '';
    document.querySelectorAll('.music-nav-item').forEach(item => item.classList.toggle('active', item === button));
    render();
    if (window.innerWidth < 900) els.sidebar.classList.remove('open');
  });

  els.search.addEventListener('input', () => {
    state.query = els.search.value.trim().toLowerCase();
    if (state.query && !['discover', 'library', 'creator'].includes(state.view)) state.view = 'discover';
    syncNav();
    render();
  });

  document.getElementById('menu-toggle').addEventListener('click', () => els.sidebar.classList.toggle('open'));
  document.getElementById('theme-toggle').addEventListener('click', () => document.body.classList.toggle('light'));
  document.getElementById('new-folder-btn').addEventListener('click', openNewFolderModal);
  document.getElementById('provider-btn').addEventListener('click', openProviderModal);
  document.getElementById('now-playing-btn').addEventListener('click', () => openNowPlaying(currentTrack()));
  document.getElementById('visual-btn').addEventListener('click', () => openVisual(currentTrack()));
  document.getElementById('queue-btn').addEventListener('click', openQueueModal);
  document.getElementById('shuffle-btn').addEventListener('click', () => selectTrack(TRACKS[Math.floor(Math.random() * TRACKS.length)].id, true));

  els.play.addEventListener('click', togglePlay);
  els.prev.addEventListener('click', () => stepTrack(-1));
  els.next.addEventListener('click', () => stepTrack(1));
  els.playerLike.addEventListener('click', () => toggleLike(state.currentTrackId));
  els.progress.addEventListener('input', () => seekTo(Number(els.progress.value)));
  els.volume.addEventListener('input', () => {
    if (state.audio?.master) state.audio.master.gain.setTargetAtTime(Number(els.volume.value) * 0.25, state.audio.ctx.currentTime, 0.03);
  });

  els.content.addEventListener('click', handleContentClick);
  els.folders.addEventListener('click', (event) => {
    const item = event.target.closest('[data-folder]');
    if (!item) return;
    openFolder(item.dataset.folder);
  });
}

function syncNav() {
  document.querySelectorAll('.music-nav-item').forEach(item => item.classList.toggle('active', item.dataset.view === state.view));
}

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.store));
}

function currentTrack() {
  return TRACKS.find(track => track.id === state.currentTrackId) || TRACKS[0];
}

function displayTrack(track) {
  const override = state.store.metadata?.[track.id] || {};
  return { ...track, ...override };
}

function formatTime(totalSeconds) {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

function render() {
  const titles = { home: 'Music', discover: 'Descubrir', videos: 'Videos', library: 'Mi biblioteca', creator: 'Creator Library', rights: 'Rights Intelligence' };
  els.title.textContent = titles[state.view] || 'Music';
  if (state.view === 'home') renderHome();
  if (state.view === 'discover') renderDiscover();
  if (state.view === 'videos') renderVideos();
  if (state.view === 'library') renderLibrary();
  if (state.view === 'creator') renderCreator();
  if (state.view === 'rights') renderRights();
}

function renderHome() {
  els.content.innerHTML = `
    <div class="section-stack">
      <section class="hero-grid">
        <article class="hero-player">
          <div class="hero-copy">
            <span class="hero-kicker">NOW PLAYING · ATLAS ORIGINAL</span>
            <h2>First<br>Light</h2>
            <p>El primer núcleo sonoro de ATLAS: música original, visuales, biblioteca, video y permisos de uso en una sola experiencia.</p>
            <div class="hero-actions">
              <button class="primary-btn" data-play="first-light" type="button">▶ Reproducir</button>
              <button class="ghost-btn" data-visual="first-light" type="button">◉ Ver visual</button>
              <button class="ghost-btn" data-rights="first-light" type="button">✓ Derechos</button>
            </div>
          </div>
          <div class="hero-orb" aria-hidden="true"></div>
        </article>
        <div class="hero-side">
          <article class="metric-tile"><small>ATLAS Originals</small><div class="metric-value">${TRACKS.length}</div><p>Composiciones generativas locales disponibles para prototipado y video.</p></article>
          <article class="metric-tile"><small>Living Collections</small><div class="metric-value">5</div><p>Horizon, Pulse, Focus, Vector y Calm.</p></article>
          <article class="metric-tile"><small>Catálogos comerciales</small><div class="metric-value">0</div><p>No se muestra música de terceros hasta conectar una fuente autorizada.</p></article>
        </div>
      </section>

      <section>
        <div class="section-head"><div><h2>Living Collections</h2><p>Fondos musicales originales listos para el ecosistema ATLAS.</p></div><button data-view-jump="creator" type="button">Ver Creator Library →</button></div>
        <div class="media-grid">${TRACKS.slice(1).map(trackCardHTML).join('')}</div>
      </section>

      <section class="catalog-banner">
        <div>
          <h3>Global Catalog preparado, pero sin contenido pirateado</h3>
          <p>La arquitectura separa reproducción comercial, video oficial y licencias de producción. ATLAS no descarga música de YouTube ni almacena catálogos comerciales sin autorización. Cuando conectemos proveedores, sus artistas, portadas y videos aparecerán aquí con la procedencia y los permisos correspondientes.</p>
          <div class="status-chips"><span class="chip good">● ATLAS Originals activo</span><span class="chip warn">○ Apple Music pendiente</span><span class="chip warn">○ YouTube oficial pendiente</span></div>
        </div>
        <button class="soft-btn" data-open-providers type="button">Administrar proveedores</button>
      </section>

      <section class="feature-strip">
        <article class="feature-item"><span>▻</span><strong>Para Videos</strong><small>Selecciona únicamente pistas cuyo derecho de sincronización esté permitido.</small></article>
        <article class="feature-item"><span>♡</span><strong>Health Spaces</strong><small>Ambientes de baja energía y transiciones suaves para espacios tranquilos.</small></article>
        <article class="feature-item"><span>⌁</span><strong>Motion</strong><small>Sonido de mayor energía para Cars, navegación y contenido dinámico.</small></article>
        <article class="feature-item"><span>◎</span><strong>Focus</strong><small>Capas minimalistas para trabajo, estudio y ATLAS Knowledge.</small></article>
      </section>
    </div>`;
}

function filteredTracks() {
  if (!state.query) return TRACKS;
  return TRACKS.filter(track => {
    const item = displayTrack(track);
    return [item.title, item.collection, item.mood, item.energy].join(' ').toLowerCase().includes(state.query);
  });
}

function renderDiscover() {
  const results = filteredTracks();
  els.content.innerHTML = `
    <div class="section-stack">
      <section class="catalog-banner">
        <div><h3>Buscar en ATLAS Music</h3><p>Ahora mismo la búsqueda opera sobre ATLAS Originals. Los adaptadores de catálogo comercial están aislados hasta disponer de credenciales y derechos válidos.</p></div>
        <button class="soft-btn" data-open-providers type="button">Proveedores</button>
      </section>
      <section>
        <div class="section-head"><div><h2>${state.query ? `Resultados para “${escapeHTML(state.query)}”` : 'Catálogo local'}</h2><p>${results.length} resultado(s) disponibles.</p></div></div>
        ${results.length ? `<div class="media-grid">${results.map(trackCardHTML).join('')}</div>` : `<div class="empty-state"><strong>No encontramos coincidencias.</strong>Conecta un proveedor autorizado para ampliar el catálogo.</div>`}
      </section>
    </div>`;
}

function renderVideos() {
  els.content.innerHTML = `
    <div class="section-stack">
      <section>
        <div class="section-head"><div><h2>ATLAS Visuals</h2><p>Visuales originales procedurales vinculados a cada pista.</p></div></div>
        <div class="video-grid">${TRACKS.map(track => {
          const item = displayTrack(track);
          return `<article class="video-card"><button class="video-thumb" data-visual="${track.id}" type="button" aria-label="Ver visual de ${escapeHTML(item.title)}"></button><div class="video-info"><strong>${escapeHTML(item.title)}</strong><small>ATLAS Visual · ${escapeHTML(item.mood)}</small><div class="status-chips"><span class="chip good">Video ✓</span><span class="chip good">Commercial ✓</span></div></div></article>`;
        }).join('')}</div>
      </section>
      <section class="catalog-banner"><div><h3>Videos oficiales de artistas</h3><p>La superficie está lista para integrarlos, pero ATLAS mostrará únicamente video entregado por un proveedor autorizado. No se crean miniaturas falsas ni copias locales de videos comerciales.</p></div><button class="soft-btn" data-open-providers type="button">Conectar fuente</button></section>
    </div>`;
}

function renderLibrary() {
  const liked = TRACKS.filter(track => state.store.liked.includes(track.id));
  els.content.innerHTML = `
    <div class="library-layout">
      <section class="panel">
        <div class="section-head"><div><h2>Me gusta</h2><p>${liked.length} elemento(s) guardados.</p></div></div>
        ${liked.length ? `<div class="table-like">${liked.map(rowHTML).join('')}</div>` : `<div class="empty-state"><strong>Tu biblioteca está vacía.</strong>Marca ♡ en una pista para guardarla.</div>`}
      </section>
      <aside class="panel">
        <div class="section-head"><div><h2>Carpetas</h2><p>Música y video pueden convivir en una misma carpeta.</p></div><button data-new-folder type="button">＋ Nueva</button></div>
        <div class="folder-list">${state.store.folders.map(folder => `<button class="folder-item" data-folder-open="${folder.id}" type="button"><span>▱</span><span>${escapeHTML(folder.name)} <small>(${(state.store.folderTracks[folder.id] || []).length})</small></span></button>`).join('')}</div>
      </aside>
    </div>`;
}

function renderCreator() {
  const rows = filteredTracks();
  els.content.innerHTML = `
    <div class="section-stack">
      <section class="catalog-banner"><div><h3>Creator Library</h3><p>Esta vista está diseñada específicamente para ATLAS Video. Solo muestra material cuyo uso de producción y uso comercial están autorizados.</p><div class="status-chips"><span class="chip good">Production ✓</span><span class="chip good">Commercial ✓</span><span class="chip good">Worldwide</span></div></div><button class="soft-btn" data-send-current type="button">Enviar pista actual a ATLAS Video</button></section>
      <section class="panel"><div class="section-head"><div><h2>Contenido autorizado</h2><p>${rows.length} pistas locales listas para prototipado.</p></div></div><div class="table-like">${rows.map(rowHTML).join('')}</div></section>
    </div>`;
}

function renderRights() {
  const track = displayTrack(currentTrack());
  els.content.innerHTML = `
    <div class="section-stack">
      <section>
        <div class="section-head"><div><h2>Rights Intelligence</h2><p>Los permisos forman parte del objeto multimedia, no son una nota separada.</p></div></div>
        <div class="rights-grid">
          ${rightsCard('Playback', 'Reproducir dentro de ATLAS', true)}
          ${rightsCard('Video', 'Mostrar visual o video asociado', true)}
          ${rightsCard('Production', 'Sincronizar con producciones ATLAS', true)}
          ${rightsCard('Commercial', 'Uso comercial autorizado', true)}
        </div>
      </section>
      <section class="library-layout">
        <article class="panel"><div class="section-head"><div><h2>${escapeHTML(track.title)}</h2><p>Registro actual de derechos.</p></div><button data-rights="${track.id}" type="button">Abrir ficha →</button></div><div class="rights-code">PLAYBACK: ${yesNo(track.rights.playback)}<br>VIDEO: ${yesNo(track.rights.video)}<br>PRODUCTION: ${yesNo(track.rights.production)}<br>COMMERCIAL: ${yesNo(track.rights.commercial)}<br>TERRITORY: ${escapeHTML(track.rights.territory)}<br>EXPIRATION: ${escapeHTML(track.rights.expiry)}<br>RIGHTS HOLDER: ${escapeHTML(track.rights.owner)}<br>EDITABLE: ${yesNo(track.rights.editable)}</div></article>
        <aside class="panel"><h2 style="font-size:16px;margin-top:0">Regla de seguridad</h2><p style="color:var(--muted);font-size:12px;line-height:1.7">Si ATLAS no puede demostrar el permiso requerido, la acción se bloquea. Escuchar una canción y sincronizarla con un video son permisos diferentes.</p><div class="status-chips"><span class="chip good">Known rights → permit</span><span class="chip bad">Unknown rights → block</span></div></aside>
      </section>
    </div>`;
}

function rightsCard(title, copy, allowed) {
  return `<article class="rights-card"><span class="rights-badge ${allowed ? 'creator' : ''}">${allowed ? 'ALLOWED' : 'BLOCKED'}</span><strong style="display:block;margin-top:10px">${title}</strong><p>${copy}</p></article>`;
}

function trackCardHTML(track) {
  const item = displayTrack(track);
  return `<article class="media-card" data-track-card="${track.id}">
    <button class="media-art art-${track.art}" data-play="${track.id}" type="button" aria-label="Reproducir ${escapeHTML(item.title)}"><span class="art-symbol"></span><span class="play-overlay">▶</span></button>
    <div class="media-card-copy"><strong>${escapeHTML(item.title)}</strong><small>${escapeHTML(item.mood)}</small></div>
    <button class="more-btn" data-more="${track.id}" type="button" aria-label="Más opciones">•••</button>
  </article>`;
}

function rowHTML(track) {
  const item = displayTrack(track);
  return `<div class="row-item"><div class="row-main"><button class="row-art art-${track.art}" data-play="${track.id}" type="button" aria-label="Reproducir ${escapeHTML(item.title)}">▶</button><div class="row-copy"><strong>${escapeHTML(item.title)}</strong><small>${escapeHTML(item.collection)} · ${escapeHTML(item.mood)}</small></div></div><small>${formatTime(track.duration)}</small><small>${escapeHTML(track.rights.territory)}</small><div style="display:flex;gap:7px;align-items:center"><span class="rights-badge creator">CREATOR ✓</span><button class="more-btn" style="position:static" data-more="${track.id}" type="button">•••</button></div></div>`;
}

function handleContentClick(event) {
  const play = event.target.closest('[data-play]');
  if (play) return selectTrack(play.dataset.play, true);
  const more = event.target.closest('[data-more]');
  if (more) return openActions(more.dataset.more);
  const visual = event.target.closest('[data-visual]');
  if (visual) return openVisual(TRACKS.find(track => track.id === visual.dataset.visual));
  const rights = event.target.closest('[data-rights]');
  if (rights) return openRightsModal(TRACKS.find(track => track.id === rights.dataset.rights));
  const viewJump = event.target.closest('[data-view-jump]');
  if (viewJump) { state.view = viewJump.dataset.viewJump; syncNav(); render(); return; }
  if (event.target.closest('[data-open-providers]')) return openProviderModal();
  if (event.target.closest('[data-new-folder]')) return openNewFolderModal();
  if (event.target.closest('[data-send-current]')) return sendToAtlasVideo(currentTrack());
  const folder = event.target.closest('[data-folder-open]');
  if (folder) return openFolder(folder.dataset.folderOpen);
}

function selectTrack(id, autoPlay) {
  const track = TRACKS.find(item => item.id === id);
  if (!track) return;
  if (state.currentTrackId !== id) {
    stopSynth();
    state.pausedAt = 0;
  }
  state.currentTrackId = id;
  const item = displayTrack(track);
  els.playerTitle.textContent = item.title;
  els.playerSubtitle.textContent = `ATLAS Original · ${item.mood}`;
  els.playerArt.className = `mini-art art-${track.art}`;
  els.duration.textContent = formatTime(track.duration);
  updateLikeButton();
  updateProgressUI();
  if (autoPlay) playTrack();
}

function togglePlay() {
  state.playing ? pauseTrack() : playTrack();
}

async function playTrack() {
  const track = currentTrack();
  if (state.playing) return;
  state.playing = true;
  els.play.textContent = 'Ⅱ';
  const offset = state.pausedAt || 0;
  state.startedAt = performance.now() - offset * 1000;
  startSynth(track);
  clearInterval(state.progressTimer);
  state.progressTimer = setInterval(() => {
    const elapsed = (performance.now() - state.startedAt) / 1000;
    if (elapsed >= track.duration) { stepTrack(1); return; }
    state.pausedAt = elapsed;
    updateProgressUI();
  }, 250);
}

function pauseTrack() {
  if (!state.playing) return;
  state.playing = false;
  els.play.textContent = '▶';
  state.pausedAt = (performance.now() - state.startedAt) / 1000;
  clearInterval(state.progressTimer);
  stopSynth();
  updateProgressUI();
}

function seekTo(percent) {
  const track = currentTrack();
  state.pausedAt = track.duration * (percent / 100);
  if (state.playing) state.startedAt = performance.now() - state.pausedAt * 1000;
  updateProgressUI();
}

function stepTrack(delta) {
  const index = TRACKS.findIndex(item => item.id === state.currentTrackId);
  const next = TRACKS[(index + delta + TRACKS.length) % TRACKS.length];
  selectTrack(next.id, state.playing || true);
}

function updateProgressUI() {
  const track = currentTrack();
  const elapsed = Math.min(state.pausedAt || 0, track.duration);
  els.elapsed.textContent = formatTime(elapsed);
  els.duration.textContent = formatTime(track.duration);
  els.progress.value = track.duration ? (elapsed / track.duration) * 100 : 0;
}

function midiToHz(midi) {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

function startSynth(track) {
  stopSynth();
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) { toast('Audio no disponible', 'Este navegador no ofrece Web Audio.'); return; }
  const ctx = new AudioContext();
  const master = ctx.createGain();
  master.gain.value = Number(els.volume.value) * 0.25;
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = track.energy === 'High' ? 1800 : track.energy === 'Low' ? 900 : 1300;
  filter.Q.value = 0.45;
  filter.connect(master);
  master.connect(ctx.destination);
  state.audio = { ctx, master, filter, active: [] };

  const beatMs = (60 / track.bpm) * 1000;
  let tick = 0;
  const chordRoots = [0, -3, -7, -5];

  const scheduleTone = (midi, length, gainValue, wave = 'sine', detune = 0) => {
    if (!state.audio || ctx.state === 'closed') return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = wave;
    osc.frequency.value = midiToHz(midi);
    osc.detune.value = detune;
    const now = ctx.currentTime;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, gainValue), now + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + length);
    osc.connect(gain);
    gain.connect(filter);
    osc.start(now);
    osc.stop(now + length + 0.05);
  };

  const pulse = () => {
    if (!state.playing || state.currentTrackId !== track.id || !state.audio) return;
    const bar = Math.floor(tick / 8) % chordRoots.length;
    const root = track.root + chordRoots[bar];
    const scaleIndex = tick % track.scale.length;
    const note = root + 12 + track.scale[scaleIndex];
    if (tick % 4 === 0) {
      scheduleTone(root, Math.max(1.4, beatMs / 1000 * 3.8), track.energy === 'Low' ? 0.13 : 0.1, 'sine');
      scheduleTone(root + 7, Math.max(1.2, beatMs / 1000 * 3), 0.045, 'triangle', 4);
    }
    scheduleTone(note, track.energy === 'Low' ? 1.1 : 0.45, track.energy === 'High' ? 0.065 : 0.04, track.energy === 'High' ? 'triangle' : 'sine');
    if (track.energy === 'High' && tick % 2 === 0) scheduleTone(root - 12, 0.16, 0.11, 'sine');
    tick += 1;
  };

  pulse();
  state.sequenceTimer = setInterval(pulse, beatMs / 2);
}

function stopSynth() {
  clearInterval(state.sequenceTimer);
  state.sequenceTimer = null;
  if (state.audio?.ctx && state.audio.ctx.state !== 'closed') state.audio.ctx.close().catch(() => {});
  state.audio = null;
}

function toggleLike(id) {
  const liked = state.store.liked;
  const index = liked.indexOf(id);
  if (index >= 0) liked.splice(index, 1); else liked.push(id);
  persist();
  updateLikeButton();
  if (state.view === 'library') render();
  toast(index >= 0 ? 'Eliminado de Me gusta' : 'Guardado en Me gusta', displayTrack(TRACKS.find(track => track.id === id)).title);
}

function updateLikeButton() {
  els.playerLike.textContent = state.store.liked.includes(state.currentTrackId) ? '♥' : '♡';
}

function renderFolders() {
  els.folders.innerHTML = state.store.folders.map(folder => `<button class="folder-item" data-folder="${folder.id}" type="button"><span>▱</span><span>${escapeHTML(folder.name)}</span></button>`).join('');
}

function openActions(id) {
  const track = TRACKS.find(item => item.id === id);
  if (!track) return;
  const item = displayTrack(track);
  const liked = state.store.liked.includes(id);
  openModal(`
    <div class="modal-head"><div><p class="eyebrow">ATLAS MUSIC</p><h2>${escapeHTML(item.title)}</h2></div><button class="modal-close" data-close-modal type="button">✕</button></div>
    <div class="action-list">
      <button data-modal-action="like" data-track="${id}" type="button">${liked ? '♥ Quitar de Me gusta' : '♡ Me gusta'}</button>
      <button data-modal-action="folder" data-track="${id}" type="button">＋ Agregar a carpeta</button>
      <button data-modal-action="visual" data-track="${id}" type="button">▻ Ver video / ATLAS Visual</button>
      <button data-modal-action="edit" data-track="${id}" type="button">✎ Editar metadata</button>
      <button data-modal-action="video" data-track="${id}" type="button">✦ Usar en ATLAS Video</button>
      <button data-modal-action="rights" data-track="${id}" type="button">✓ Ver derechos y licencia</button>
    </div>`);
}

function openNewFolderModal() {
  openModal(`
    <div class="modal-head"><h2>Nueva carpeta</h2><button class="modal-close" data-close-modal type="button">✕</button></div>
    <div class="modal-field"><label for="folder-name">Nombre</label><input id="folder-name" maxlength="60" placeholder="Ej. Launch 2026" /></div>
    <div class="modal-actions"><button class="ghost-btn" data-close-modal type="button">Cancelar</button><button class="primary-btn" data-create-folder type="button">Crear carpeta</button></div>`);
  requestAnimationFrame(() => document.getElementById('folder-name')?.focus());
}

function createFolder() {
  const input = document.getElementById('folder-name');
  const name = input?.value.trim();
  if (!name) return;
  const id = `folder-${Date.now()}`;
  state.store.folders.push({ id, name });
  state.store.folderTracks[id] = [];
  persist();
  renderFolders();
  closeModal();
  if (state.view === 'library') render();
  toast('Carpeta creada', name);
}

function openFolder(id) {
  const folder = state.store.folders.find(item => item.id === id);
  if (!folder) return;
  const ids = state.store.folderTracks[id] || [];
  const tracks = TRACKS.filter(track => ids.includes(track.id));
  openModal(`
    <div class="modal-head"><div><p class="eyebrow">CARPETA</p><h2>${escapeHTML(folder.name)}</h2></div><button class="modal-close" data-close-modal type="button">✕</button></div>
    <div class="table-like" style="margin-top:14px">${tracks.length ? tracks.map(rowHTML).join('') : '<div class="empty-state"><strong>Carpeta vacía.</strong>Agrega música o video desde el menú •••.</div>'}</div>`);
}

function openAddToFolder(id) {
  openModal(`
    <div class="modal-head"><h2>Agregar a carpeta</h2><button class="modal-close" data-close-modal type="button">✕</button></div>
    <div class="action-list">${state.store.folders.map(folder => `<button data-add-folder="${folder.id}" data-track="${id}" type="button">▱ ${escapeHTML(folder.name)}</button>`).join('') || '<p class="muted">No hay carpetas.</p>'}</div>
    <div class="modal-actions"><button class="ghost-btn" data-new-folder-from-track="${id}" type="button">＋ Crear carpeta</button></div>`);
}

function addTrackToFolder(trackId, folderId) {
  const list = state.store.folderTracks[folderId] || (state.store.folderTracks[folderId] = []);
  if (!list.includes(trackId)) list.push(trackId);
  persist();
  closeModal();
  if (state.view === 'library') render();
  const folder = state.store.folders.find(item => item.id === folderId);
  toast('Agregado a carpeta', folder?.name || 'Carpeta');
}

function openEditModal(track) {
  const item = displayTrack(track);
  if (!track.rights.editable) { toast('Edición bloqueada', 'El titular de derechos no permite editar este contenido.'); return; }
  openModal(`
    <div class="modal-head"><div><p class="eyebrow">EDITABLE · ATLAS OWNED</p><h2>Editar metadata</h2></div><button class="modal-close" data-close-modal type="button">✕</button></div>
    <div class="modal-field"><label for="edit-title">Título</label><input id="edit-title" value="${escapeAttribute(item.title)}" /></div>
    <div class="modal-field"><label for="edit-mood">Descripción / mood</label><input id="edit-mood" value="${escapeAttribute(item.mood)}" /></div>
    <div class="modal-actions"><button class="ghost-btn" data-close-modal type="button">Cancelar</button><button class="primary-btn" data-save-edit="${track.id}" type="button">Guardar</button></div>`);
}

function saveEdit(id) {
  const title = document.getElementById('edit-title')?.value.trim();
  const mood = document.getElementById('edit-mood')?.value.trim();
  state.store.metadata[id] = { ...(state.store.metadata[id] || {}), ...(title ? { title } : {}), ...(mood ? { mood } : {}) };
  persist();
  selectTrack(id, false);
  closeModal();
  render();
  toast('Metadata actualizada', title || displayTrack(TRACKS.find(track => track.id === id)).title);
}

function openRightsModal(track) {
  if (!track) return;
  const item = displayTrack(track);
  openModal(`
    <div class="modal-head"><div><p class="eyebrow">RIGHTS INTELLIGENCE</p><h2>${escapeHTML(item.title)}</h2></div><button class="modal-close" data-close-modal type="button">✕</button></div>
    <div class="rights-grid" style="grid-template-columns:repeat(2,1fr);margin-top:16px">
      ${rightsCard('Playback', 'Reproducción dentro de ATLAS', item.rights.playback)}
      ${rightsCard('Video', 'Visual/video asociado', item.rights.video)}
      ${rightsCard('Production', 'Sincronización con video', item.rights.production)}
      ${rightsCard('Commercial', 'Uso comercial', item.rights.commercial)}
    </div>
    <div class="rights-code" style="margin-top:14px">RIGHTS HOLDER: ${escapeHTML(item.rights.owner)}<br>TERRITORY: ${escapeHTML(item.rights.territory)}<br>EXPIRATION: ${escapeHTML(item.rights.expiry)}<br>EDITABLE: ${yesNo(item.rights.editable)}<br>SOURCE: ATLAS ORIGINALS</div>`);
}

function openProviderModal() {
  openModal(`
    <div class="modal-head"><div><p class="eyebrow">CATALOG GATEWAY</p><h2>Proveedores</h2></div><button class="modal-close" data-close-modal type="button">✕</button></div>
    <p style="color:var(--muted);font-size:12px;line-height:1.7">Los proveedores comerciales permanecen desconectados hasta añadir credenciales y validar sus términos. No se insertan claves dentro del cliente.</p>
    <div class="action-list">${PROVIDERS.map(provider => `<button type="button" ${provider.status === 'active' ? 'data-provider-active' : 'data-provider-planned'}><strong>${escapeHTML(provider.name)}</strong><small style="display:block;color:var(--muted);margin-top:5px">${escapeHTML(provider.purpose)}</small><span class="chip ${provider.status === 'active' ? 'good' : 'warn'}" style="margin-top:8px">${provider.status === 'active' ? 'ACTIVE' : 'NOT CONNECTED'}</span></button>`).join('')}</div>`);
}

function sendToAtlasVideo(track) {
  if (!track.rights.production || !track.rights.commercial) {
    toast('Uso bloqueado', 'La licencia no permite sincronización comercial.');
    return;
  }
  const folder = state.store.folders.find(item => item.id === 'atlas-video');
  if (!folder) state.store.folders.push({ id: 'atlas-video', name: 'ATLAS Video' });
  const list = state.store.folderTracks['atlas-video'] || (state.store.folderTracks['atlas-video'] = []);
  if (!list.includes(track.id)) list.push(track.id);
  persist();
  renderFolders();
  toast('Enviado a ATLAS Video', `${displayTrack(track).title} está listo en la carpeta ATLAS Video.`);
}

function openQueueModal() {
  openModal(`<div class="modal-head"><h2>Cola</h2><button class="modal-close" data-close-modal type="button">✕</button></div><div class="table-like" style="margin-top:14px">${TRACKS.map(rowHTML).join('')}</div>`);
}

function openNowPlaying(track) {
  const item = displayTrack(track);
  openModal(`
    <div class="modal-head"><div><p class="eyebrow">NOW PLAYING</p><h2>${escapeHTML(item.title)}</h2></div><button class="modal-close" data-close-modal type="button">✕</button></div>
    <div class="visual-stage"><canvas id="now-canvas" width="960" height="540"></canvas><div class="visual-caption"><strong>${escapeHTML(item.title)}</strong><small>${escapeHTML(item.mood)} · ATLAS Original</small></div></div>
    <div class="status-chips"><span class="chip good">Playback ✓</span><span class="chip good">Video ✓</span><span class="chip good">Production ✓</span><span class="chip good">Commercial ✓</span></div>
    <div class="modal-actions"><button class="ghost-btn" data-modal-action="rights" data-track="${track.id}" type="button">Derechos</button><button class="primary-btn" data-modal-action="video" data-track="${track.id}" type="button">Usar en ATLAS Video</button></div>`);
  startCanvas(document.getElementById('now-canvas'), track);
}

function openVisual(track) {
  if (!track) return;
  const item = displayTrack(track);
  openModal(`
    <div class="modal-head"><div><p class="eyebrow">ATLAS VISUAL · AUDIO ↔ VIDEO</p><h2>${escapeHTML(item.title)}</h2></div><button class="modal-close" data-close-modal type="button">✕</button></div>
    <div class="visual-stage"><canvas id="visual-canvas" width="960" height="540"></canvas><div class="visual-caption"><strong>${escapeHTML(item.title)}</strong><small>${escapeHTML(item.collection)} · ${escapeHTML(item.energy)} energy</small></div></div>
    <div class="modal-actions"><button class="ghost-btn" data-modal-action="rights" data-track="${track.id}" type="button">✓ Derechos</button><button class="primary-btn" data-modal-play="${track.id}" type="button">▶ Reproducir audio</button></div>`);
  startCanvas(document.getElementById('visual-canvas'), track);
}

function startCanvas(canvas, track) {
  if (!canvas) return;
  cancelAnimationFrame(state.visualRaf);
  const ctx = canvas.getContext('2d');
  const seed = TRACKS.findIndex(item => item.id === track.id) + 1;
  const draw = (time) => {
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    const gradient = ctx.createRadialGradient(w * .62, h * .46, 20, w * .62, h * .46, w * .58);
    gradient.addColorStop(0, `rgba(53,191,255,${0.18 + seed * .015})`);
    gradient.addColorStop(.4, 'rgba(14,52,86,.18)');
    gradient.addColorStop(1, 'rgba(2,6,10,1)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);
    ctx.save();
    ctx.translate(w * .62, h * .46);
    for (let ring = 0; ring < 7; ring++) {
      const phase = time * .0002 * (ring % 2 ? 1 : -1) + ring * .8 + seed;
      ctx.beginPath();
      ctx.strokeStyle = `rgba(83,205,255,${.08 + ring * .018})`;
      ctx.lineWidth = ring === 2 ? 2 : 1;
      ctx.ellipse(0, 0, 95 + ring * 23, 36 + ring * 10, phase, 0, Math.PI * 2);
      ctx.stroke();
    }
    const pulse = 74 + Math.sin(time * .002 + seed) * 7;
    const orb = ctx.createRadialGradient(-20, -25, 5, 0, 0, pulse);
    orb.addColorStop(0, '#9cf0ff');
    orb.addColorStop(.07, '#2b9ed5');
    orb.addColorStop(.28, '#0a3552');
    orb.addColorStop(1, '#02070c');
    ctx.fillStyle = orb;
    ctx.beginPath();
    ctx.arc(0, 0, pulse, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    for (let i = 0; i < 42; i++) {
      const x = (i * 137 + seed * 91) % w;
      const y = (i * 83 + seed * 47) % h;
      const alpha = .12 + .2 * Math.max(0, Math.sin(time * .0015 + i));
      ctx.fillStyle = `rgba(170,230,255,${alpha})`;
      ctx.fillRect(x, y, i % 5 === 0 ? 2 : 1, i % 5 === 0 ? 2 : 1);
    }
    state.visualRaf = requestAnimationFrame(draw);
  };
  state.visualRaf = requestAnimationFrame(draw);
}

function openModal(html) {
  cancelAnimationFrame(state.visualRaf);
  els.modalRoot.innerHTML = `<div class="modal-backdrop"><section class="modal-card" role="dialog" aria-modal="true">${html}</section></div>`;
  const backdrop = els.modalRoot.querySelector('.modal-backdrop');
  backdrop.addEventListener('click', handleModalClick);
}

function handleModalClick(event) {
  if (event.target === event.currentTarget || event.target.closest('[data-close-modal]')) return closeModal();
  if (event.target.closest('[data-create-folder]')) return createFolder();
  const action = event.target.closest('[data-modal-action]');
  if (action) {
    const track = TRACKS.find(item => item.id === action.dataset.track);
    if (!track) return;
    const type = action.dataset.modalAction;
    if (type === 'like') { closeModal(); toggleLike(track.id); }
    if (type === 'folder') openAddToFolder(track.id);
    if (type === 'visual') openVisual(track);
    if (type === 'edit') openEditModal(track);
    if (type === 'video') { closeModal(); sendToAtlasVideo(track); }
    if (type === 'rights') openRightsModal(track);
    return;
  }
  const folder = event.target.closest('[data-add-folder]');
  if (folder) return addTrackToFolder(folder.dataset.track, folder.dataset.addFolder);
  const play = event.target.closest('[data-modal-play]');
  if (play) { closeModal(); selectTrack(play.dataset.modalPlay, true); return; }
  const edit = event.target.closest('[data-save-edit]');
  if (edit) return saveEdit(edit.dataset.saveEdit);
  const provider = event.target.closest('[data-provider-planned]');
  if (provider) return toast('Conector preparado', 'Falta configurar credenciales autorizadas en backend antes de activarlo.');
}

function closeModal() {
  cancelAnimationFrame(state.visualRaf);
  state.visualRaf = null;
  els.modalRoot.innerHTML = '';
}

function toast(title, detail = '') {
  document.querySelector('.toast')?.remove();
  const node = document.createElement('div');
  node.className = 'toast';
  node.innerHTML = `<strong>${escapeHTML(title)}</strong>${detail ? `<small>${escapeHTML(detail)}</small>` : ''}`;
  document.body.appendChild(node);
  setTimeout(() => node.remove(), 3000);
}

function yesNo(value) {
  return value ? 'YES' : 'NO';
}

function escapeHTML(value) {
  return String(value ?? '').replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));
}

function escapeAttribute(value) {
  return escapeHTML(value).replace(/`/g, '&#96;');
}
