'use strict';

(() => {
  const nativeFetch = window.fetch.bind(window);
  let pendingFolderTrack = null;

  function projectRef() {
    try { return new URL(window.ATLAS_CONFIG?.supabaseUrl || '').hostname.split('.')[0] || ''; }
    catch { return ''; }
  }

  function sessionToken() {
    const ref = projectRef();
    if (!ref) return null;
    try {
      const raw = JSON.parse(localStorage.getItem(`sb-${ref}-auth-token`) || '{}');
      const session = raw?.access_token ? raw : (raw?.currentSession || raw?.session || null);
      return typeof session?.access_token === 'string' ? session.access_token : null;
    } catch { return null; }
  }

  // Provider credentials remain server-only, and every provider request now
  // proves the browser has an authenticated ATLAS session before the Worker
  // can spend Apple/YouTube quota.
  window.fetch = function atlasMusicAuthenticatedFetch(input, init = {}) {
    let url;
    try { url = new URL(typeof input === 'string' ? input : input.url, location.href); }
    catch { return nativeFetch(input, init); }
    if (url.origin !== location.origin || !url.pathname.startsWith('/api/music/')) return nativeFetch(input, init);
    const token = sessionToken();
    const headers = new Headers(init.headers || (input instanceof Request ? input.headers : undefined));
    if (token) headers.set('Authorization', `Bearer ${token}`);
    headers.set('Accept', 'application/json');
    return nativeFetch(input, { ...init, headers, cache: 'no-store', credentials: 'same-origin' });
  };

  function restartSynthAtOffset(track, offsetSeconds = 0) {
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
    const halfBeatSeconds = (beatMs / 2) / 1000;
    let tick = Math.max(0, Math.floor(Number(offsetSeconds || 0) / halfBeatSeconds));
    const chordRoots = [0, -3, -7, -5];

    const scheduleTone = (midi, length, gainValue, wave = 'sine', detune = 0) => {
      if (!state.audio || ctx.state === 'closed') return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = wave;
      osc.frequency.value = midiToHz(midi);
      osc.detune.value = detune;
      const at = ctx.currentTime;
      gain.gain.setValueAtTime(0.0001, at);
      gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, gainValue), at + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.0001, at + length);
      osc.connect(gain);
      gain.connect(filter);
      osc.start(at);
      osc.stop(at + length + 0.05);
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

  const originalSelectTrack = selectTrack;
  selectTrack = function fixedSelectTrack(id, autoPlay) {
    const changing = state.currentTrackId !== id;
    if (changing) {
      clearInterval(state.progressTimer);
      state.progressTimer = null;
      state.playing = false;
      stopSynth();
      state.pausedAt = 0;
      state.startedAt = 0;
      if (els.play) els.play.textContent = '▶';
    }
    return originalSelectTrack(id, Boolean(autoPlay));
  };

  stepTrack = function fixedStepTrack(delta) {
    const wasPlaying = Boolean(state.playing);
    const index = TRACKS.findIndex(item => item.id === state.currentTrackId);
    const next = TRACKS[(index + delta + TRACKS.length) % TRACKS.length];
    selectTrack(next.id, wasPlaying);
  };

  seekTo = function fixedSeekTo(percent) {
    const track = currentTrack();
    state.pausedAt = track.duration * (Number(percent) / 100);
    if (state.playing) {
      state.startedAt = performance.now() - state.pausedAt * 1000;
      restartSynthAtOffset(track, state.pausedAt);
    }
    updateProgressUI();
  };

  const originalRenderLibrary = renderLibrary;
  renderLibrary = function fixedRenderLibrary() {
    if (!state.query) return originalRenderLibrary();
    const liked = TRACKS.filter(track => state.store.liked.includes(track.id)).filter(track => {
      const item = displayTrack(track);
      return [item.title, item.collection, item.mood, item.energy].join(' ').toLowerCase().includes(state.query);
    });
    els.content.innerHTML = `
      <div class="library-layout">
        <section class="panel">
          <div class="section-head"><div><h2>Me gusta</h2><p>${liked.length} coincidencia(s) guardada(s).</p></div></div>
          ${liked.length ? `<div class="table-like">${liked.map(rowHTML).join('')}</div>` : `<div class="empty-state"><strong>No hay coincidencias en tu biblioteca.</strong>Prueba otra búsqueda.</div>`}
        </section>
        <aside class="panel">
          <div class="section-head"><div><h2>Carpetas</h2><p>Música y video pueden convivir en una misma carpeta.</p></div><button data-new-folder type="button">＋ Nueva</button></div>
          <div class="folder-list">${state.store.folders.map(folder => `<button class="folder-item" data-folder-open="${folder.id}" type="button"><span>▱</span><span>${escapeHTML(folder.name)} <small>(${(state.store.folderTracks[folder.id] || []).length})</small></span></button>`).join('')}</div>
        </aside>
      </div>`;
  };

  openProviderModal = async function fixedProviderModal() {
    const status = await window.ATLASMusicProviders?.refreshStatus?.().catch(() => null);
    const providers = status?.providers || {};
    const rows = [
      { name: 'ATLAS Originals', purpose: 'Original audio + visual content owned by ATLAS.', active: true },
      { name: 'Apple Music / MusicKit', purpose: 'Authorized commercial catalog discovery when configured.', active: Boolean(providers.appleMusic?.configured) },
      { name: 'YouTube Data / Player', purpose: 'Official video discovery/playback when configured.', active: Boolean(providers.youtube?.configured) }
    ];
    openModal(`
      <div class="modal-head"><div><p class="eyebrow">CATALOG GATEWAY</p><h2>Proveedores</h2></div><button class="modal-close" data-close-modal type="button">✕</button></div>
      <p style="color:var(--muted);font-size:12px;line-height:1.7">Estado consultado en vivo. Las credenciales permanecen únicamente en backend y el gateway exige una sesión ATLAS autenticada.</p>
      <div class="action-list">${rows.map(provider => `<button type="button" ${provider.active ? 'data-provider-active' : 'data-provider-planned'}><strong>${escapeHTML(provider.name)}</strong><small style="display:block;color:var(--muted);margin-top:5px">${escapeHTML(provider.purpose)}</small><span class="chip ${provider.active ? 'good' : 'warn'}" style="margin-top:8px">${provider.active ? 'ACTIVE' : 'NOT CONNECTED'}</span></button>`).join('')}</div>`);
  };

  function createFolderWithPendingTrack() {
    const input = document.getElementById('folder-name');
    const name = input?.value.trim();
    if (!name) return;
    const id = `folder-${Date.now()}`;
    state.store.folders.push({ id, name });
    state.store.folderTracks[id] = pendingFolderTrack ? [pendingFolderTrack] : [];
    pendingFolderTrack = null;
    persist();
    renderFolders();
    closeModal();
    if (state.view === 'library') render();
    toast('Carpeta creada', name);
  }

  document.addEventListener('click', event => {
    const nav = event.target.closest?.('#music-nav [data-view]');
    if (nav) void window.ATLASMusicProviders?.runSearch?.('');
  }, true);

  document.getElementById('modal-root')?.addEventListener('click', event => {
    const rowPlay = event.target.closest?.('[data-play]');
    if (rowPlay) {
      event.preventDefault();
      event.stopImmediatePropagation();
      closeModal();
      selectTrack(rowPlay.dataset.play, true);
      return;
    }
    const newFromTrack = event.target.closest?.('[data-new-folder-from-track]');
    if (newFromTrack) {
      event.preventDefault();
      event.stopImmediatePropagation();
      pendingFolderTrack = newFromTrack.dataset.newFolderFromTrack;
      openNewFolderModal();
      return;
    }
    if (pendingFolderTrack && event.target.closest?.('[data-create-folder]')) {
      event.preventDefault();
      event.stopImmediatePropagation();
      createFolderWithPendingTrack();
    }
  }, true);
})();
