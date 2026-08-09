(() => {
  'use strict';

  const STORE_KEY = 'atlas.accessibility.preferences.v2';
  const LEGACY_STORE_KEY = 'atlas.accessibility.preferences.v1';
  const LEGACY_HISTORY_KEY = 'atlas.accessibility.history.v1';
  const HISTORY_PREFIX = 'atlas.accessibility.history.v2.';
  const MAX_HISTORY = 40;
  const FRAME_COUNT = 5;
  const FRAME_INTERVAL_MS = 220;
  const TOKEN_REFRESH_SKEW_SECONDS = 90;

  const defaults = {
    signLanguage: 'LSV',
    locale: 'es-VE',
    voiceOutput: true,
    saveHistory: false,
    largeText: false,
    highContrast: false,
    reducedMotion: false,
    visualAlerts: true
  };

  const state = {
    open: false,
    stream: null,
    recognition: null,
    recognizing: false,
    interpreting: false,
    interpretController: null,
    preferences: loadPreferences(),
    lastInterpretation: null,
    sessionHistory: [],
    historyOwner: null,
    toastObserver: null
  };

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

  function loadPreferences() {
    try {
      const current = JSON.parse(localStorage.getItem(STORE_KEY) || '{}');
      if (Object.keys(current).length) return { ...defaults, ...current };
      const legacy = JSON.parse(localStorage.getItem(LEGACY_STORE_KEY) || '{}');
      return { ...defaults, ...legacy, saveHistory: false };
    } catch (_) {
      return { ...defaults };
    }
  }

  function savePreferences() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(state.preferences)); } catch (_) {}
    applyPreferences();
  }

  function applyPreferences() {
    const root = document.documentElement;
    root.classList.toggle('atlas-a11y-large-text', Boolean(state.preferences.largeText));
    root.classList.toggle('atlas-a11y-high-contrast', Boolean(state.preferences.highContrast));
    root.classList.toggle('atlas-a11y-reduced-motion', Boolean(state.preferences.reducedMotion));
  }

  function emit(name, detail = {}) {
    window.dispatchEvent(new CustomEvent(name, { detail }));
  }

  function announce(text) {
    const live = $('#atlas-a11y-live');
    if (!live) return;
    live.textContent = '';
    requestAnimationFrame(() => { live.textContent = String(text || ''); });
  }

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, (character) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[character]));
  }

  function setStatus(message, tone = 'neutral') {
    const node = $('#atlas-a11y-status');
    if (node) {
      node.textContent = message;
      node.dataset.tone = tone;
    }
    announce(message);
  }

  function projectRefFromUrl(url) {
    try { return new URL(url).hostname.split('.')[0]; } catch (_) { return ''; }
  }

  function decodeJwtPayload(token) {
    try {
      const part = String(token || '').split('.')[1];
      if (!part) return null;
      const normalized = part.replace(/-/g, '+').replace(/_/g, '/');
      const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
      return JSON.parse(decodeURIComponent(Array.from(atob(padded), (char) => `%${char.charCodeAt(0).toString(16).padStart(2, '0')}`).join('')));
    } catch (_) {
      return null;
    }
  }

  function candidateSessionRecords() {
    const config = window.ATLAS_CONFIG || {};
    const ref = projectRefFromUrl(config.supabaseUrl || '');
    const keys = [];
    if (ref) keys.push(`sb-${ref}-auth-token`);
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index);
      if (key?.startsWith('sb-') && key.endsWith('-auth-token') && !keys.includes(key)) keys.push(key);
    }
    return keys.map((key) => {
      try {
        const parsed = JSON.parse(localStorage.getItem(key) || '{}');
        const session = parsed?.access_token ? parsed : (parsed?.currentSession || parsed?.session || null);
        return session?.access_token ? { key, parsed, session } : null;
      } catch (_) {
        return null;
      }
    }).filter(Boolean);
  }

  function preferredSessionRecord() {
    return candidateSessionRecords()[0] || null;
  }

  function currentUserId() {
    const record = preferredSessionRecord();
    const payload = decodeJwtPayload(record?.session?.access_token || '');
    return typeof payload?.sub === 'string' ? payload.sub : null;
  }

  function scopedHistoryKey(userId) {
    return userId ? `${HISTORY_PREFIX}${userId}` : null;
  }

  function syncHistoryIdentity() {
    const userId = currentUserId();
    if (state.historyOwner === userId) return userId;
    state.historyOwner = userId;
    state.sessionHistory = [];
    if (userId && state.preferences.saveHistory) {
      try {
        const persisted = JSON.parse(localStorage.getItem(scopedHistoryKey(userId)) || '[]');
        if (Array.isArray(persisted)) state.sessionHistory = persisted.slice(0, MAX_HISTORY);
      } catch (_) {}
    }
    return userId;
  }

  function persistHistoryIfAllowed() {
    if (!state.preferences.saveHistory) return;
    const userId = syncHistoryIdentity();
    const key = scopedHistoryKey(userId);
    if (!key) return;
    try { localStorage.setItem(key, JSON.stringify(state.sessionHistory.slice(0, MAX_HISTORY))); } catch (_) {}
  }

  function remember(entry) {
    if (!entry?.text) return;
    syncHistoryIdentity();
    state.sessionHistory.unshift({ ...entry, at: new Date().toISOString() });
    state.sessionHistory = state.sessionHistory.slice(0, MAX_HISTORY);
    persistHistoryIfAllowed();
  }

  function clearHistory({ includePersistent = false, silent = false } = {}) {
    const userId = currentUserId() || state.historyOwner;
    state.sessionHistory = [];
    if (includePersistent && userId) {
      try { localStorage.removeItem(scopedHistoryKey(userId)); } catch (_) {}
    }
    renderHistory();
    if (!silent) setStatus('Historial de comunicación eliminado.', 'success');
  }

  function renderHistory() {
    const target = $('#atlas-a11y-history');
    if (!target) return;
    syncHistoryIdentity();
    const rows = state.sessionHistory;
    target.innerHTML = rows.length
      ? rows.slice(0, 8).map((row) => `<div class="atlas-a11y-history-row"><span>${escapeHtml(row.kind || 'Comunicación')}</span><strong>${escapeHtml(row.text)}</strong></div>`).join('')
      : '<p class="atlas-a11y-muted">No hay comunicaciones guardadas en esta sesión.</p>';
  }

  function speak(text) {
    const content = String(text || '').trim();
    if (!content || !('speechSynthesis' in window) || !('SpeechSynthesisUtterance' in window)) return false;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(content);
    utterance.lang = state.preferences.locale || 'es-VE';
    utterance.rate = 1;
    window.speechSynthesis.speak(utterance);
    emit('atlas:accessibility-speech', { text: content });
    return true;
  }

  function stopSpeech() {
    try { window.speechSynthesis?.cancel(); } catch (_) {}
  }

  function getRecognitionCtor() {
    return window.SpeechRecognition || window.webkitSpeechRecognition || null;
  }

  function startCaptions() {
    if (state.recognizing) return true;
    const Recognition = getRecognitionCtor();
    if (!Recognition) {
      setStatus('Este navegador no ofrece reconocimiento de voz en tiempo real.', 'warning');
      return false;
    }

    const recognition = new Recognition();
    recognition.lang = state.preferences.locale || 'es-VE';
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event) => {
      let interim = '';
      let finalText = '';
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const result = event.results[index];
        const text = result?.[0]?.transcript || '';
        if (result.isFinal) finalText += `${text} `;
        else interim += text;
      }
      const output = $('#atlas-a11y-captions-output');
      if (output) output.textContent = (finalText || interim || 'Escuchando…').trim();
      if (finalText.trim()) {
        remember({ kind: 'Voz → texto', text: finalText.trim() });
        renderHistory();
        emit('atlas:accessibility-caption', { text: finalText.trim() });
      }
    };

    recognition.onerror = (event) => {
      if (event.error !== 'no-speech' && state.recognizing) {
        setStatus(`Subtítulos: ${event.error || 'error de reconocimiento'}.`, 'warning');
      }
    };

    recognition.onend = () => {
      if (state.recognizing && state.open && document.visibilityState !== 'hidden') {
        try { recognition.start(); } catch (_) {}
      } else {
        state.recognizing = false;
        if (state.recognition === recognition) state.recognition = null;
        syncControls();
      }
    };

    try {
      state.recognition = recognition;
      state.recognizing = true;
      recognition.start();
      syncControls();
      setStatus('Subtítulos de voz activos. El micrófono se detendrá al cerrar el panel.', 'success');
      emit('atlas:accessibility-captions', { active: true });
      return true;
    } catch (error) {
      state.recognizing = false;
      state.recognition = null;
      syncControls();
      setStatus(error?.message || 'No se pudieron iniciar los subtítulos.', 'warning');
      return false;
    }
  }

  function stopCaptions({ silent = false } = {}) {
    const wasActive = state.recognizing || Boolean(state.recognition);
    state.recognizing = false;
    const recognition = state.recognition;
    state.recognition = null;
    try { recognition?.abort?.(); } catch (_) {
      try { recognition?.stop?.(); } catch (_) {}
    }
    syncControls();
    if (wasActive) emit('atlas:accessibility-captions', { active: false });
    if (!silent && wasActive) setStatus('Subtítulos detenidos.');
  }

  async function startCamera() {
    if (state.stream) return state.stream;
    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus('La cámara no está disponible en este navegador.', 'warning');
      return null;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 960 }, height: { ideal: 540 } },
        audio: false
      });
      state.stream = stream;
      const video = $('#atlas-a11y-video');
      if (video) {
        video.srcObject = stream;
        await video.play().catch(() => {});
      }
      document.documentElement.classList.add('atlas-a11y-camera-active');
      syncControls();
      setStatus('Cámara activa. El video no se almacena por defecto.', 'success');
      emit('atlas:accessibility-camera', { active: true });
      return stream;
    } catch (error) {
      setStatus(error?.name === 'NotAllowedError' ? 'Permiso de cámara denegado.' : 'No se pudo iniciar la cámara.', 'warning');
      return null;
    }
  }

  function stopCamera({ silent = false } = {}) {
    const wasActive = Boolean(state.stream);
    if (state.stream) {
      state.stream.getTracks().forEach((track) => track.stop());
      state.stream = null;
    }
    const video = $('#atlas-a11y-video');
    if (video) video.srcObject = null;
    document.documentElement.classList.remove('atlas-a11y-camera-active');
    syncControls();
    if (wasActive) emit('atlas:accessibility-camera', { active: false });
    if (!silent && wasActive) setStatus('Cámara apagada.');
  }

  function captureFrame() {
    const video = $('#atlas-a11y-video');
    if (!video || !video.videoWidth || !video.videoHeight) return null;
    const canvas = document.createElement('canvas');
    const maxWidth = 720;
    const scale = Math.min(1, maxWidth / video.videoWidth);
    canvas.width = Math.max(1, Math.round(video.videoWidth * scale));
    canvas.height = Math.max(1, Math.round(video.videoHeight * scale));
    const context = canvas.getContext('2d', { alpha: false });
    if (!context) return null;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.72);
  }

  function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async function captureBurst() {
    const frames = [];
    for (let index = 0; index < FRAME_COUNT; index += 1) {
      const frame = captureFrame();
      if (frame) frames.push(frame);
      if (index < FRAME_COUNT - 1) await delay(FRAME_INTERVAL_MS);
    }
    return frames;
  }

  function sessionExpirySeconds(session) {
    const explicit = Number(session?.expires_at || 0);
    if (explicit) return explicit;
    return Number(decodeJwtPayload(session?.access_token || '')?.exp || 0);
  }

  function saveRefreshedSession(record, refreshed) {
    if (!record?.key || !refreshed?.access_token) return;
    let next;
    if (record.parsed?.access_token) next = refreshed;
    else if (record.parsed?.currentSession) next = { ...record.parsed, currentSession: refreshed };
    else if (record.parsed?.session) next = { ...record.parsed, session: refreshed };
    else next = refreshed;
    try { localStorage.setItem(record.key, JSON.stringify(next)); } catch (_) {}
  }

  async function ensureSupabaseAccessToken({ forceRefresh = false } = {}) {
    const config = window.ATLAS_CONFIG || {};
    const record = preferredSessionRecord();
    if (!record?.session?.access_token) return '';

    const now = Math.floor(Date.now() / 1000);
    const expiresAt = sessionExpirySeconds(record.session);
    const tokenUsable = !forceRefresh && (!expiresAt || expiresAt > now + TOKEN_REFRESH_SKEW_SECONDS);
    if (tokenUsable) return record.session.access_token;

    const refreshToken = record.session.refresh_token;
    if (!refreshToken || !config.supabaseUrl || !config.supabasePublishableKey) return '';

    const response = await fetch(`${config.supabaseUrl}/auth/v1/token?grant_type=refresh_token`, {
      method: 'POST',
      headers: {
        apikey: config.supabasePublishableKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ refresh_token: refreshToken })
    });
    const refreshed = await response.json().catch(() => ({}));
    if (!response.ok || !refreshed?.access_token) return '';
    saveRefreshedSession(record, refreshed);
    return refreshed.access_token;
  }

  async function postSignInterpretation(frames, accessToken, signal) {
    const config = window.ATLAS_CONFIG || {};
    const response = await fetch(`${config.supabaseUrl}/functions/v1/atlas-sign-interpret`, {
      method: 'POST',
      signal,
      headers: {
        apikey: config.supabasePublishableKey,
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        frames,
        signed_language: state.preferences.signLanguage,
        locale: state.preferences.locale
      })
    });
    return { response, body: await response.json().catch(() => ({})) };
  }

  async function callSignInterpreter(frames, signal) {
    const config = window.ATLAS_CONFIG || {};
    if (!config.supabaseUrl || !config.supabasePublishableKey) throw new Error('ATLAS Cloud no está configurado.');

    let accessToken = await ensureSupabaseAccessToken();
    if (!accessToken) throw new Error('Inicia sesión segura en ATLAS Cloud para usar la interpretación de señas con IA.');

    let result = await postSignInterpretation(frames, accessToken, signal);
    if (result.response.status === 401 && !signal?.aborted) {
      accessToken = await ensureSupabaseAccessToken({ forceRefresh: true });
      if (accessToken) result = await postSignInterpretation(frames, accessToken, signal);
    }

    if (!result.response.ok) {
      if (result.response.status === 401) throw new Error('No se pudo renovar tu sesión segura. Inicia sesión nuevamente.');
      throw new Error(result.body?.message || result.body?.error || 'No se pudo interpretar la seña.');
    }
    return result.body;
  }

  async function interpretSign() {
    if (state.interpreting) return;
    if (!state.stream && !(await startCamera())) return;

    state.interpreting = true;
    state.interpretController = new AbortController();
    syncControls();
    setStatus('Analizando una secuencia breve de señas…');
    const output = $('#atlas-a11y-sign-output');
    if (output) output.textContent = 'Analizando…';

    try {
      const frames = await captureBurst();
      if (!frames.length) throw new Error('La cámara aún no está lista.');
      if (state.interpretController.signal.aborted) return;
      const result = await callSignInterpreter(frames, state.interpretController.signal);
      const text = String(result?.text || '').trim();
      const confidence = Number(result?.confidence || 0);
      state.lastInterpretation = result;

      if (!text || result?.needs_clarification) {
        const clarification = result?.clarification || 'No pude interpretar la seña con suficiente certeza. Repite el gesto frente a la cámara.';
        if (output) output.textContent = clarification;
        setStatus('Interpretación incierta; ATLAS solicita repetir la seña.', 'warning');
        return;
      }

      if (output) output.textContent = text;
      remember({ kind: `${result?.signed_language || state.preferences.signLanguage} → texto`, text });
      renderHistory();
      const voicePlayed = !state.preferences.voiceOutput || speak(text);
      setStatus(
        `Seña interpretada${confidence ? ` · confianza ${Math.round(confidence * 100)}%` : ''}${voicePlayed ? '' : ' · voz no disponible en este navegador'}.`,
        voicePlayed ? 'success' : 'warning'
      );
      emit('atlas:accessibility-sign', { ...result, text });
    } catch (error) {
      if (error?.name === 'AbortError') return;
      const message = error?.message || 'No se pudo completar la interpretación.';
      if (output) output.textContent = message;
      setStatus(message, 'warning');
    } finally {
      state.interpreting = false;
      state.interpretController = null;
      syncControls();
    }
  }

  function visualAlert(detail = {}) {
    if (!state.preferences.visualAlerts) return;
    const banner = $('#atlas-a11y-alert');
    if (!banner) return;
    const message = String(detail.message || detail.title || 'Nueva alerta de ATLAS').trim();
    if (!message) return;
    banner.textContent = message;
    banner.classList.add('show');
    window.clearTimeout(visualAlert.timer);
    visualAlert.timer = window.setTimeout(() => banner.classList.remove('show'), 4200);
  }

  function installVisualAlertBridge() {
    if (state.toastObserver || !document.body) return;
    const mirrored = new WeakSet();
    const selectors = '.toast, .atlas-toast, .notification-toast, [data-atlas-alert]';
    const mirror = (candidate) => {
      if (!(candidate instanceof Element) || mirrored.has(candidate) || candidate.closest('#atlas-a11y-root')) return;
      if (!candidate.matches(selectors)) return;
      const text = String(candidate.textContent || '').replace(/\s+/g, ' ').trim();
      if (!text) return;
      mirrored.add(candidate);
      visualAlert({ message: text });
    };
    state.toastObserver = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (!(node instanceof Element)) continue;
          mirror(node);
          $$(selectors, node).forEach(mirror);
        }
      }
    });
    state.toastObserver.observe(document.body, { childList: true, subtree: true });
  }

  function syncControls() {
    const cameraButton = $('#atlas-a11y-camera-toggle');
    if (cameraButton) cameraButton.textContent = state.stream ? 'Apagar cámara' : 'Activar cámara';

    const captionsButton = $('#atlas-a11y-caption-toggle');
    if (captionsButton) captionsButton.textContent = state.recognizing ? 'Detener subtítulos' : 'Activar subtítulos';

    const interpretButton = $('#atlas-a11y-interpret');
    if (interpretButton) {
      interpretButton.disabled = state.interpreting;
      interpretButton.textContent = state.interpreting ? 'Interpretando…' : 'Interpretar seña';
    }

    const cameraBadge = $('#atlas-a11y-camera-badge');
    if (cameraBadge) {
      cameraBadge.textContent = state.stream ? 'CÁMARA ACTIVA' : 'CÁMARA APAGADA';
      cameraBadge.dataset.active = state.stream ? 'true' : 'false';
    }

    const launcher = $('#atlas-a11y-launcher');
    if (launcher) launcher.setAttribute('aria-label', state.open ? 'Cerrar herramientas de accesibilidad' : 'Abrir herramientas de accesibilidad');
  }

  function syncCapabilities() {
    const captionsButton = $('#atlas-a11y-caption-toggle');
    if (captionsButton && !getRecognitionCtor()) {
      captionsButton.disabled = true;
      captionsButton.title = 'Reconocimiento de voz no disponible en este navegador';
    }
    const speakButton = $('#atlas-a11y-speak');
    const autoVoice = $('#atlas-a11y-auto-voice');
    const speechAvailable = 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
    if (speakButton && !speechAvailable) {
      speakButton.disabled = true;
      speakButton.title = 'Texto a voz no disponible en este navegador';
    }
    if (autoVoice && !speechAvailable) autoVoice.disabled = true;
  }

  function openPanel() {
    state.open = true;
    const panel = $('#atlas-a11y-panel');
    const launcher = $('#atlas-a11y-launcher');
    if (panel) {
      panel.inert = false;
      panel.classList.add('open');
      panel.setAttribute('aria-hidden', 'false');
    }
    launcher?.setAttribute('aria-expanded', 'true');
    syncControls();
    syncHistoryIdentity();
    renderHistory();
    $('#atlas-a11y-close')?.focus();
  }

  function closePanel() {
    if (!state.open) return;
    state.open = false;
    const panel = $('#atlas-a11y-panel');
    const launcher = $('#atlas-a11y-launcher');

    state.interpretController?.abort();
    stopCaptions({ silent: true });
    stopCamera({ silent: true });
    stopSpeech();

    if (panel) {
      panel.classList.remove('open');
      panel.setAttribute('aria-hidden', 'true');
      panel.inert = true;
    }
    launcher?.setAttribute('aria-expanded', 'false');
    syncControls();
    launcher?.focus();
  }

  function handleLogout() {
    state.interpretController?.abort();
    stopCaptions({ silent: true });
    stopCamera({ silent: true });
    stopSpeech();
    clearHistory({ includePersistent: true, silent: true });
    state.historyOwner = null;
  }

  function render() {
    if ($('#atlas-a11y-launcher')) return;
    const root = document.createElement('div');
    root.id = 'atlas-a11y-root';
    root.innerHTML = `
      <div id="atlas-a11y-live" class="atlas-a11y-sr-only" aria-live="polite"></div>
      <div id="atlas-a11y-alert" class="atlas-a11y-alert" role="alert"></div>
      <button id="atlas-a11y-launcher" class="atlas-a11y-launcher" type="button" aria-label="Abrir herramientas de accesibilidad" aria-haspopup="dialog" aria-expanded="false" aria-controls="atlas-a11y-panel">
        <span aria-hidden="true">◉</span><span>Accesibilidad</span>
      </button>
      <aside id="atlas-a11y-panel" class="atlas-a11y-panel" role="dialog" aria-modal="false" aria-hidden="true" aria-labelledby="atlas-a11y-title" inert>
        <div class="atlas-a11y-head">
          <div><p>ATLAS ACCESS</p><h2 id="atlas-a11y-title">Comunicación inclusiva</h2></div>
          <button id="atlas-a11y-close" class="atlas-a11y-icon-button" type="button" aria-label="Cerrar accesibilidad">×</button>
        </div>
        <p class="atlas-a11y-lead">Señas, voz, texto y alertas visuales dentro del mismo ATLAS.</p>
        <div id="atlas-a11y-status" class="atlas-a11y-status" data-tone="neutral">Listo.</div>

        <section class="atlas-a11y-section" aria-labelledby="atlas-sign-title">
          <div class="atlas-a11y-section-head"><div><span>SEÑAS → TEXTO / VOZ</span><h3 id="atlas-sign-title">ATLAS Sign</h3></div><span id="atlas-a11y-camera-badge" class="atlas-a11y-camera-badge" data-active="false">CÁMARA APAGADA</span></div>
          <div class="atlas-a11y-video-wrap"><video id="atlas-a11y-video" playsinline muted aria-label="Vista previa de cámara para interpretación de señas"></video><div class="atlas-a11y-video-guide">Mantén manos y rostro dentro del encuadre</div></div>
          <div class="atlas-a11y-row">
            <label>Lengua de señas<select id="atlas-a11y-sign-language"><option value="LSV">LSV · Lengua de Señas Venezolana</option><option value="ASL">ASL · American Sign Language</option><option value="AUTO">Detección asistida</option></select></label>
            <label>Idioma de salida<select id="atlas-a11y-locale"><option value="es-VE">Español · Venezuela</option><option value="es-US">Español · EE. UU.</option><option value="en-US">English · US</option></select></label>
          </div>
          <div class="atlas-a11y-actions"><button id="atlas-a11y-camera-toggle" type="button">Activar cámara</button><button id="atlas-a11y-interpret" class="primary" type="button">Interpretar seña</button></div>
          <div id="atlas-a11y-sign-output" class="atlas-a11y-output" aria-live="polite">La interpretación aparecerá aquí.</div>
          <p class="atlas-a11y-privacy">La cámara se activa solo con permiso. ATLAS envía una secuencia breve únicamente cuando eliges “Interpretar seña”; no guarda el video por defecto.</p>
          <a class="atlas-a11y-cloud-link" href="cloud-auth.html">Iniciar sesión segura para interpretación con IA →</a>
        </section>

        <section class="atlas-a11y-section" aria-labelledby="atlas-caption-title">
          <div class="atlas-a11y-section-head"><div><span>VOZ → TEXTO</span><h3 id="atlas-caption-title">Subtítulos en tiempo real</h3></div></div>
          <div id="atlas-a11y-captions-output" class="atlas-a11y-output captions" aria-live="polite">Los subtítulos aparecerán aquí.</div>
          <div class="atlas-a11y-actions"><button id="atlas-a11y-caption-toggle" class="primary" type="button">Activar subtítulos</button></div>
          <p class="atlas-a11y-privacy">El micrófono se usa solo mientras los subtítulos están activos y se detiene al cerrar este panel.</p>
        </section>

        <section class="atlas-a11y-section" aria-labelledby="atlas-speech-title">
          <div class="atlas-a11y-section-head"><div><span>TEXTO → VOZ</span><h3 id="atlas-speech-title">Hablar por mí</h3></div></div>
          <textarea id="atlas-a11y-speech-text" rows="3" placeholder="Escribe lo que quieres que ATLAS diga…"></textarea>
          <div class="atlas-a11y-actions"><button id="atlas-a11y-speak" class="primary" type="button">Reproducir voz</button><label class="atlas-a11y-switch"><input id="atlas-a11y-auto-voice" type="checkbox">Voz automática al interpretar señas</label></div>
        </section>

        <section class="atlas-a11y-section" aria-labelledby="atlas-display-title">
          <div class="atlas-a11y-section-head"><div><span>VISUAL</span><h3 id="atlas-display-title">Lectura y alertas</h3></div></div>
          <div class="atlas-a11y-check-grid">
            <label><input id="atlas-a11y-large-text" type="checkbox">Texto ampliado</label>
            <label><input id="atlas-a11y-high-contrast" type="checkbox">Alto contraste</label>
            <label><input id="atlas-a11y-reduced-motion" type="checkbox">Reducir movimiento</label>
            <label><input id="atlas-a11y-visual-alerts" type="checkbox">Alertas visuales</label>
          </div>
        </section>

        <section class="atlas-a11y-section" aria-labelledby="atlas-history-title">
          <div class="atlas-a11y-section-head"><div><span>PRIVACIDAD</span><h3 id="atlas-history-title">Historial de comunicación</h3></div><button id="atlas-a11y-clear-history" class="atlas-a11y-text-button" type="button">Limpiar</button></div>
          <label class="atlas-a11y-switch"><input id="atlas-a11y-save-history" type="checkbox">Guardar historial local durante esta cuenta</label>
          <p class="atlas-a11y-privacy">Desactivado por defecto. Si lo activas, el historial se separa por cuenta autenticada y se elimina al cerrar sesión.</p>
          <div id="atlas-a11y-history"></div>
        </section>
      </aside>
    `;
    document.body.append(root);

    $('#atlas-a11y-launcher').addEventListener('click', () => state.open ? closePanel() : openPanel());
    $('#atlas-a11y-close').addEventListener('click', closePanel);
    $('#atlas-a11y-camera-toggle').addEventListener('click', () => state.stream ? stopCamera() : startCamera());
    $('#atlas-a11y-interpret').addEventListener('click', interpretSign);
    $('#atlas-a11y-caption-toggle').addEventListener('click', () => state.recognizing ? stopCaptions() : startCaptions());
    $('#atlas-a11y-speak').addEventListener('click', () => {
      const text = $('#atlas-a11y-speech-text').value.trim();
      if (!text) return setStatus('Escribe un mensaje antes de reproducirlo.', 'warning');
      if (!speak(text)) return setStatus('La reproducción de voz no está disponible en este navegador.', 'warning');
      remember({ kind: 'Texto → voz', text });
      renderHistory();
      setStatus('Mensaje reproducido por voz.', 'success');
    });
    $('#atlas-a11y-clear-history').addEventListener('click', () => clearHistory({ includePersistent: true }));

    const bindPreference = (selector, key) => {
      const input = $(selector);
      input.checked = Boolean(state.preferences[key]);
      input.addEventListener('change', () => {
        state.preferences[key] = input.checked;
        savePreferences();
      });
    };
    bindPreference('#atlas-a11y-auto-voice', 'voiceOutput');
    bindPreference('#atlas-a11y-large-text', 'largeText');
    bindPreference('#atlas-a11y-high-contrast', 'highContrast');
    bindPreference('#atlas-a11y-reduced-motion', 'reducedMotion');
    bindPreference('#atlas-a11y-visual-alerts', 'visualAlerts');

    const historyToggle = $('#atlas-a11y-save-history');
    historyToggle.checked = Boolean(state.preferences.saveHistory);
    historyToggle.addEventListener('change', () => {
      if (historyToggle.checked && !currentUserId()) {
        historyToggle.checked = false;
        state.preferences.saveHistory = false;
        savePreferences();
        setStatus('Inicia sesión segura antes de activar el historial persistente.', 'warning');
        return;
      }
      state.preferences.saveHistory = historyToggle.checked;
      savePreferences();
      if (historyToggle.checked) persistHistoryIfAllowed();
      else {
        const userId = currentUserId() || state.historyOwner;
        if (userId) {
          try { localStorage.removeItem(scopedHistoryKey(userId)); } catch (_) {}
        }
      }
      renderHistory();
      setStatus(historyToggle.checked ? 'Historial local activado para esta cuenta.' : 'Historial local desactivado.', 'success');
    });

    $('#atlas-a11y-sign-language').value = state.preferences.signLanguage;
    $('#atlas-a11y-sign-language').addEventListener('change', (event) => {
      state.preferences.signLanguage = event.target.value;
      savePreferences();
    });
    $('#atlas-a11y-locale').value = state.preferences.locale;
    $('#atlas-a11y-locale').addEventListener('change', (event) => {
      state.preferences.locale = event.target.value;
      savePreferences();
      if (state.recognizing) {
        stopCaptions({ silent: true });
        startCaptions();
      }
    });

    syncControls();
    syncCapabilities();
    renderHistory();
  }

  function install() {
    try {
      localStorage.removeItem(LEGACY_HISTORY_KEY);
      if (!localStorage.getItem(STORE_KEY)) localStorage.removeItem(LEGACY_STORE_KEY);
    } catch (_) {}

    applyPreferences();
    render();
    installVisualAlertBridge();

    document.addEventListener('keydown', (event) => {
      if (event.altKey && event.key.toLowerCase() === 'a') {
        event.preventDefault();
        state.open ? closePanel() : openPanel();
      }
      if (event.key === 'Escape' && state.open) closePanel();
    });

    document.addEventListener('click', (event) => {
      if (event.target.closest?.('#logout-btn, #signout-button, [data-atlas-logout]')) handleLogout();
    }, true);

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        stopCaptions({ silent: true });
        stopCamera({ silent: true });
      }
    });

    window.addEventListener('pagehide', () => {
      state.interpretController?.abort();
      stopCamera({ silent: true });
      stopCaptions({ silent: true });
      stopSpeech();
    });

    window.addEventListener('storage', (event) => {
      if (event.key?.startsWith('sb-') && event.key.endsWith('-auth-token')) {
        const before = state.historyOwner;
        const after = currentUserId();
        if (before !== after) {
          state.sessionHistory = [];
          state.historyOwner = null;
          renderHistory();
        }
      }
    });

    window.addEventListener('atlas:alert', (event) => visualAlert(event.detail || {}));

    window.ATLASAccessibility = Object.freeze({
      version: '1.1.0',
      open: openPanel,
      close: closePanel,
      startCamera,
      stopCamera,
      interpretSign,
      startCaptions,
      stopCaptions,
      speak,
      visualAlert,
      clearHistory,
      getState: () => ({
        open: state.open,
        cameraActive: Boolean(state.stream),
        captionsActive: state.recognizing,
        interpreting: state.interpreting,
        historyPersistent: Boolean(state.preferences.saveHistory),
        preferences: { ...state.preferences },
        lastInterpretation: state.lastInterpretation ? { ...state.lastInterpretation } : null
      })
    });

    emit('atlas:accessibility-ready', { version: window.ATLASAccessibility.version });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install, { once: true });
  else install();
})();
