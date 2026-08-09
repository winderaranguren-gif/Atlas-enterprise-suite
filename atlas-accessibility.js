(() => {
  'use strict';

  const PREF_KEY = 'atlas.accessibility.preferences.v3';
  const HISTORY_PREFIX = 'atlas.accessibility.history.v3.';
  const LEGACY_HISTORY_KEYS = ['atlas.accessibility.history.v1', 'atlas.accessibility.history.v2'];
  const MAX_HISTORY = 40;
  const FRAME_COUNT = 5;
  const FRAME_INTERVAL_MS = 220;
  const TOKEN_REFRESH_SKEW_SECONDS = 90;
  const MIN_SIGN_CONFIDENCE = 0.55;

  const defaults = Object.freeze({
    signLanguage: 'LSV',
    locale: 'es-VE',
    voiceOutput: true,
    saveHistory: false,
    largeText: false,
    highContrast: false,
    reducedMotion: false,
    visualAlerts: true
  });

  const state = {
    open: false,
    stream: null,
    recognition: null,
    recognizing: false,
    interpreting: false,
    interpretController: null,
    preferences: loadPreferences(),
    historyOwner: null,
    sessionHistory: [],
    lastInterpretation: null,
    toastObserver: null
  };

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

  function loadPreferences() {
    try {
      return { ...defaults, ...(JSON.parse(localStorage.getItem(PREF_KEY) || '{}')) };
    } catch (_) {
      return { ...defaults };
    }
  }

  function savePreferences() {
    try { localStorage.setItem(PREF_KEY, JSON.stringify(state.preferences)); } catch (_) {}
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

  function setStatus(message, tone = 'neutral') {
    const node = $('#atlas-a11y-status');
    if (node) {
      node.textContent = message;
      node.dataset.tone = tone;
    }
    announce(message);
  }

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, (character) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[character]));
  }

  function projectRef() {
    try {
      return new URL(window.ATLAS_CONFIG?.supabaseUrl || '').hostname.split('.')[0] || '';
    } catch (_) {
      return '';
    }
  }

  function sessionStorageKey() {
    const ref = projectRef();
    return ref ? `sb-${ref}-auth-token` : '';
  }

  function readSessionRecord() {
    const key = sessionStorageKey();
    if (!key) return null;
    try {
      const raw = JSON.parse(localStorage.getItem(key) || '{}');
      const session = raw?.access_token ? raw : (raw?.currentSession || raw?.session || null);
      return session?.access_token ? { key, raw, session } : null;
    } catch (_) {
      return null;
    }
  }

  function decodeJwtPayload(token) {
    try {
      const encoded = String(token || '').split('.')[1];
      if (!encoded) return null;
      const normalized = encoded.replace(/-/g, '+').replace(/_/g, '/');
      const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
      const binary = atob(padded);
      const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
      return JSON.parse(new TextDecoder().decode(bytes));
    } catch (_) {
      return null;
    }
  }

  function currentUserId() {
    return decodeJwtPayload(readSessionRecord()?.session?.access_token)?.sub || null;
  }

  function historyKey(userId) {
    return userId ? `${HISTORY_PREFIX}${userId}` : null;
  }

  function syncHistoryIdentity() {
    const userId = currentUserId();
    if (state.historyOwner === userId) return userId;
    state.historyOwner = userId;
    state.sessionHistory = [];
    if (userId && state.preferences.saveHistory) {
      try {
        const stored = JSON.parse(localStorage.getItem(historyKey(userId)) || '[]');
        if (Array.isArray(stored)) state.sessionHistory = stored.slice(0, MAX_HISTORY);
      } catch (_) {}
    }
    return userId;
  }

  function persistHistory() {
    if (!state.preferences.saveHistory) return;
    const userId = syncHistoryIdentity();
    const key = historyKey(userId);
    if (!key) return;
    try { localStorage.setItem(key, JSON.stringify(state.sessionHistory.slice(0, MAX_HISTORY))); } catch (_) {}
  }

  function remember(kind, text) {
    const value = String(text || '').trim();
    if (!value) return;
    syncHistoryIdentity();
    state.sessionHistory.unshift({ kind, text: value, at: new Date().toISOString() });
    state.sessionHistory = state.sessionHistory.slice(0, MAX_HISTORY);
    persistHistory();
  }

  function clearHistory({ persistent = true, silent = false } = {}) {
    const userId = currentUserId() || state.historyOwner;
    state.sessionHistory = [];
    if (persistent && userId) {
      try { localStorage.removeItem(historyKey(userId)); } catch (_) {}
    }
    renderHistory();
    if (!silent) setStatus('Historial de comunicación eliminado.', 'success');
  }

  function renderHistory() {
    const target = $('#atlas-a11y-history');
    if (!target) return;
    syncHistoryIdentity();
    target.innerHTML = state.sessionHistory.length
      ? state.sessionHistory.slice(0, 8).map((row) => `<div class="atlas-a11y-history-row"><span>${escapeHtml(row.kind)}</span><strong>${escapeHtml(row.text)}</strong></div>`).join('')
      : '<p class="atlas-a11y-muted">No hay comunicaciones guardadas en esta sesión.</p>';
  }

  function speechAvailable() {
    return 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
  }

  function speak(text) {
    const value = String(text || '').trim();
    if (!value || !speechAvailable()) return false;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(value);
      utterance.lang = state.preferences.locale;
      utterance.rate = 1;
      window.speechSynthesis.speak(utterance);
      emit('atlas:accessibility-speech', { text: value });
      return true;
    } catch (_) {
      return false;
    }
  }

  function stopSpeech() {
    try { window.speechSynthesis?.cancel(); } catch (_) {}
  }

  function recognitionCtor() {
    return window.SpeechRecognition || window.webkitSpeechRecognition || null;
  }

  function startCaptions() {
    if (state.recognizing) return true;
    const Recognition = recognitionCtor();
    if (!Recognition) {
      setStatus('Este navegador no ofrece subtítulos de voz en tiempo real.', 'warning');
      return false;
    }

    const recognition = new Recognition();
    recognition.lang = state.preferences.locale;
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
        remember('Voz → texto', finalText.trim());
        renderHistory();
        emit('atlas:accessibility-caption', { text: finalText.trim() });
      }
    };

    recognition.onerror = (event) => {
      if (state.recognizing && event.error !== 'no-speech') {
        setStatus(`Subtítulos: ${event.error || 'error de reconocimiento'}.`, 'warning');
      }
    };

    recognition.onend = () => {
      if (state.recognizing && state.open && document.visibilityState === 'visible') {
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
      setStatus('Subtítulos activos. El micrófono se detendrá al cerrar el panel.', 'success');
      emit('atlas:accessibility-captions', { active: true });
      return true;
    } catch (error) {
      state.recognition = null;
      state.recognizing = false;
      syncControls();
      setStatus(error?.message || 'No se pudieron iniciar los subtítulos.', 'warning');
      return false;
    }
  }

  function stopCaptions({ silent = false } = {}) {
    const recognition = state.recognition;
    const wasActive = state.recognizing || Boolean(recognition);
    state.recognizing = false;
    state.recognition = null;
    try {
      if (typeof recognition?.abort === 'function') recognition.abort();
      else if (typeof recognition?.stop === 'function') recognition.stop();
    } catch (_) {}
    syncControls();
    if (wasActive) emit('atlas:accessibility-captions', { active: false });
    if (wasActive && !silent) setStatus('Subtítulos detenidos.');
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
      setStatus('Cámara activa. ATLAS no guarda el video por defecto.', 'success');
      emit('atlas:accessibility-camera', { active: true });
      return stream;
    } catch (error) {
      setStatus(error?.name === 'NotAllowedError' ? 'Permiso de cámara denegado.' : 'No se pudo iniciar la cámara.', 'warning');
      return null;
    }
  }

  function stopCamera({ silent = false } = {}) {
    const wasActive = Boolean(state.stream);
    if (state.stream) state.stream.getTracks().forEach((track) => track.stop());
    state.stream = null;
    const video = $('#atlas-a11y-video');
    if (video) video.srcObject = null;
    document.documentElement.classList.remove('atlas-a11y-camera-active');
    syncControls();
    if (wasActive) emit('atlas:accessibility-camera', { active: false });
    if (wasActive && !silent) setStatus('Cámara apagada.');
  }

  function captureFrame() {
    const video = $('#atlas-a11y-video');
    if (!video?.videoWidth || !video?.videoHeight) return null;
    const canvas = document.createElement('canvas');
    const scale = Math.min(1, 720 / video.videoWidth);
    canvas.width = Math.max(1, Math.round(video.videoWidth * scale));
    canvas.height = Math.max(1, Math.round(video.videoHeight * scale));
    const context = canvas.getContext('2d', { alpha: false });
    if (!context) return null;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.72);
  }

  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  async function captureBurst() {
    const frames = [];
    for (let index = 0; index < FRAME_COUNT; index += 1) {
      const frame = captureFrame();
      if (frame) frames.push(frame);
      if (index < FRAME_COUNT - 1) await wait(FRAME_INTERVAL_MS);
    }
    return frames;
  }

  function sessionExpiresAt(session) {
    return Number(session?.expires_at || decodeJwtPayload(session?.access_token)?.exp || 0);
  }

  function storeRefreshedSession(record, session) {
    if (!record?.key || !session?.access_token) return;
    let next;
    if (record.raw?.access_token) next = session;
    else if (record.raw?.currentSession) next = { ...record.raw, currentSession: session };
    else if (record.raw?.session) next = { ...record.raw, session };
    else next = session;
    try { localStorage.setItem(record.key, JSON.stringify(next)); } catch (_) {}
  }

  async function accessToken({ forceRefresh = false } = {}) {
    const config = window.ATLAS_CONFIG || {};
    const record = readSessionRecord();
    if (!record) return '';
    const expiresAt = sessionExpiresAt(record.session);
    const now = Math.floor(Date.now() / 1000);
    if (!forceRefresh && (!expiresAt || expiresAt > now + TOKEN_REFRESH_SKEW_SECONDS)) return record.session.access_token;

    if (!record.session.refresh_token || !config.supabaseUrl || !config.supabasePublishableKey) return '';
    const response = await fetch(`${config.supabaseUrl}/auth/v1/token?grant_type=refresh_token`, {
      method: 'POST',
      headers: { apikey: config.supabasePublishableKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: record.session.refresh_token })
    });
    const refreshed = await response.json().catch(() => ({}));
    if (!response.ok || !refreshed?.access_token) return '';
    storeRefreshedSession(record, refreshed);
    return refreshed.access_token;
  }

  async function signRequest(frames, token, signal) {
    const config = window.ATLAS_CONFIG || {};
    const response = await fetch(`${config.supabaseUrl}/functions/v1/atlas-sign-interpret`, {
      method: 'POST',
      signal,
      headers: {
        apikey: config.supabasePublishableKey,
        Authorization: `Bearer ${token}`,
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

  async function interpretWithCloud(frames, signal) {
    const config = window.ATLAS_CONFIG || {};
    if (!config.supabaseUrl || !config.supabasePublishableKey) throw new Error('ATLAS Cloud no está configurado.');
    let token = await accessToken();
    if (!token) throw new Error('Inicia sesión segura en ATLAS Cloud para interpretar señas.');

    let result = await signRequest(frames, token, signal);
    if (result.response.status === 401 && !signal.aborted) {
      token = await accessToken({ forceRefresh: true });
      if (token) result = await signRequest(frames, token, signal);
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
    const controller = new AbortController();
    state.interpretController = controller;
    syncControls();
    setStatus('Analizando una secuencia breve de señas…');
    const output = $('#atlas-a11y-sign-output');
    if (output) output.textContent = 'Analizando…';

    try {
      const frames = await captureBurst();
      if (!frames.length) throw new Error('La cámara aún no está lista.');
      if (controller.signal.aborted) return;
      const result = await interpretWithCloud(frames, controller.signal);
      const text = String(result?.text || '').trim();
      const confidence = Number(result?.confidence || 0);
      const uncertain = result?.detected_signing !== true || result?.needs_clarification || !text || confidence < MIN_SIGN_CONFIDENCE;
      state.lastInterpretation = result;

      if (uncertain) {
        const clarification = String(result?.clarification || 'No pude interpretar la seña con suficiente certeza. Repite la seña más despacio y dentro del encuadre.');
        if (output) output.textContent = clarification;
        setStatus('Interpretación incierta. ATLAS no adivinará el mensaje.', 'warning');
        return;
      }

      if (output) output.textContent = text;
      remember(`${result.signed_language || state.preferences.signLanguage} → texto`, text);
      renderHistory();
      const voiceOk = !state.preferences.voiceOutput || speak(text);
      setStatus(`Seña interpretada · confianza ${Math.round(confidence * 100)}%${voiceOk ? '' : ' · voz no disponible'}.`, voiceOk ? 'success' : 'warning');
      emit('atlas:accessibility-sign', { ...result, text });
    } catch (error) {
      if (error?.name === 'AbortError') return;
      const message = error?.message || 'No se pudo completar la interpretación.';
      if (output) output.textContent = message;
      setStatus(message, 'warning');
    } finally {
      state.interpreting = false;
      if (state.interpretController === controller) state.interpretController = null;
      syncControls();
    }
  }

  function visualAlert(detail = {}) {
    if (!state.preferences.visualAlerts) return;
    const banner = $('#atlas-a11y-alert');
    if (!banner) return;
    const message = String(detail.message || detail.title || 'Nueva alerta de ATLAS').replace(/\s+/g, ' ').trim();
    if (!message) return;
    banner.textContent = message;
    banner.classList.add('show');
    clearTimeout(visualAlert.timer);
    visualAlert.timer = setTimeout(() => banner.classList.remove('show'), 4200);
  }

  function installAlertBridge() {
    if (state.toastObserver) return;
    const mirrored = new WeakSet();
    const selector = '.toast,.atlas-toast,.notification-toast,[data-atlas-alert]';
    const mirror = (element) => {
      if (!(element instanceof Element) || mirrored.has(element) || element.closest('#atlas-a11y-root')) return;
      if (!element.matches(selector)) return;
      const message = String(element.textContent || '').replace(/\s+/g, ' ').trim();
      if (!message) return;
      mirrored.add(element);
      visualAlert({ message });
    };
    state.toastObserver = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (!(node instanceof Element)) continue;
          mirror(node);
          $$(selector, node).forEach(mirror);
        }
      }
    });
    state.toastObserver.observe(document.body, { childList: true, subtree: true });
  }

  function setPanelInteractive(panel, active) {
    if (!panel) return;
    if ('inert' in panel) panel.inert = !active;
    const focusables = $$('a,button,input,select,textarea,[tabindex]', panel);
    for (const node of focusables) {
      if (active) {
        if (node.dataset.atlasOldTabindex !== undefined) {
          const old = node.dataset.atlasOldTabindex;
          if (old === '') node.removeAttribute('tabindex');
          else node.setAttribute('tabindex', old);
          delete node.dataset.atlasOldTabindex;
        }
      } else if (!('inert' in panel)) {
        node.dataset.atlasOldTabindex = node.getAttribute('tabindex') || '';
        node.setAttribute('tabindex', '-1');
      }
    }
  }

  function syncControls() {
    const camera = $('#atlas-a11y-camera-toggle');
    if (camera) camera.textContent = state.stream ? 'Apagar cámara' : 'Activar cámara';
    const captions = $('#atlas-a11y-caption-toggle');
    if (captions) captions.textContent = state.recognizing ? 'Detener subtítulos' : 'Activar subtítulos';
    const interpret = $('#atlas-a11y-interpret');
    if (interpret) {
      interpret.disabled = state.interpreting;
      interpret.textContent = state.interpreting ? 'Interpretando…' : 'Interpretar seña';
    }
    const badge = $('#atlas-a11y-camera-badge');
    if (badge) {
      badge.textContent = state.stream ? 'CÁMARA ACTIVA' : 'CÁMARA APAGADA';
      badge.dataset.active = state.stream ? 'true' : 'false';
    }
    const launcher = $('#atlas-a11y-launcher');
    if (launcher) launcher.setAttribute('aria-label', state.open ? 'Cerrar herramientas de accesibilidad' : 'Abrir herramientas de accesibilidad');
  }

  function syncCapabilities() {
    const captions = $('#atlas-a11y-caption-toggle');
    if (captions && !recognitionCtor()) {
      captions.disabled = true;
      captions.title = 'Reconocimiento de voz no disponible en este navegador';
    }
    const speakButton = $('#atlas-a11y-speak');
    const autoVoice = $('#atlas-a11y-auto-voice');
    if (!speechAvailable()) {
      if (speakButton) {
        speakButton.disabled = true;
        speakButton.title = 'Texto a voz no disponible en este navegador';
      }
      if (autoVoice) autoVoice.disabled = true;
    }
  }

  function openPanel() {
    state.open = true;
    const panel = $('#atlas-a11y-panel');
    panel?.classList.add('open');
    panel?.setAttribute('aria-hidden', 'false');
    setPanelInteractive(panel, true);
    $('#atlas-a11y-launcher')?.setAttribute('aria-expanded', 'true');
    syncControls();
    renderHistory();
    $('#atlas-a11y-close')?.focus();
  }

  function closePanel({ restoreFocus = true } = {}) {
    if (!state.open) return;
    state.open = false;
    state.interpretController?.abort();
    stopCaptions({ silent: true });
    stopCamera({ silent: true });
    stopSpeech();
    const panel = $('#atlas-a11y-panel');
    panel?.classList.remove('open');
    panel?.setAttribute('aria-hidden', 'true');
    setPanelInteractive(panel, false);
    const launcher = $('#atlas-a11y-launcher');
    launcher?.setAttribute('aria-expanded', 'false');
    syncControls();
    if (restoreFocus) launcher?.focus();
  }

  function privacyCleanup() {
    state.interpretController?.abort();
    stopCaptions({ silent: true });
    stopCamera({ silent: true });
    stopSpeech();
    clearHistory({ persistent: true, silent: true });
    state.historyOwner = null;
  }

  function render() {
    if ($('#atlas-a11y-root')) return;
    const root = document.createElement('div');
    root.id = 'atlas-a11y-root';
    root.innerHTML = `
      <div id="atlas-a11y-live" class="atlas-a11y-sr-only" aria-live="polite"></div>
      <div id="atlas-a11y-alert" class="atlas-a11y-alert" role="alert"></div>
      <button id="atlas-a11y-launcher" class="atlas-a11y-launcher" type="button" aria-label="Abrir herramientas de accesibilidad" aria-haspopup="dialog" aria-expanded="false" aria-controls="atlas-a11y-panel"><span aria-hidden="true">◉</span><span>Accesibilidad</span></button>
      <aside id="atlas-a11y-panel" class="atlas-a11y-panel" role="dialog" aria-modal="false" aria-hidden="true" aria-labelledby="atlas-a11y-title">
        <div class="atlas-a11y-head"><div><p>ATLAS ACCESS</p><h2 id="atlas-a11y-title">Comunicación inclusiva</h2></div><button id="atlas-a11y-close" class="atlas-a11y-icon-button" type="button" aria-label="Cerrar accesibilidad">×</button></div>
        <p class="atlas-a11y-lead">Señas, voz, texto y alertas visuales dentro del mismo ATLAS.</p>
        <div id="atlas-a11y-status" class="atlas-a11y-status" data-tone="neutral">Listo.</div>

        <section class="atlas-a11y-section" aria-labelledby="atlas-sign-title">
          <div class="atlas-a11y-section-head"><div><span>SEÑAS → TEXTO / VOZ</span><h3 id="atlas-sign-title">ATLAS Sign</h3></div><span id="atlas-a11y-camera-badge" class="atlas-a11y-camera-badge" data-active="false">CÁMARA APAGADA</span></div>
          <div class="atlas-a11y-video-wrap"><video id="atlas-a11y-video" playsinline muted aria-label="Vista previa de cámara para interpretación de señas"></video><div class="atlas-a11y-video-guide">Mantén manos y rostro dentro del encuadre</div></div>
          <div class="atlas-a11y-row"><label>Lengua de señas<select id="atlas-a11y-sign-language"><option value="LSV">LSV · Lengua de Señas Venezolana</option><option value="ASL">ASL · American Sign Language</option><option value="AUTO">Detección asistida</option></select></label><label>Idioma de salida<select id="atlas-a11y-locale"><option value="es-VE">Español · Venezuela</option><option value="es-US">Español · EE. UU.</option><option value="en-US">English · US</option></select></label></div>
          <div class="atlas-a11y-actions"><button id="atlas-a11y-camera-toggle" type="button">Activar cámara</button><button id="atlas-a11y-interpret" class="primary" type="button">Interpretar seña</button></div>
          <div id="atlas-a11y-sign-output" class="atlas-a11y-output" aria-live="polite">La interpretación aparecerá aquí.</div>
          <p class="atlas-a11y-privacy">La cámara requiere permiso explícito. Solo se envía una secuencia breve cuando eliges “Interpretar seña”; ATLAS no guarda el video por defecto.</p>
          <a class="atlas-a11y-cloud-link" href="cloud-auth.html">Iniciar sesión segura para interpretación con IA →</a>
        </section>

        <section class="atlas-a11y-section" aria-labelledby="atlas-caption-title"><div class="atlas-a11y-section-head"><div><span>VOZ → TEXTO</span><h3 id="atlas-caption-title">Subtítulos en tiempo real</h3></div></div><div id="atlas-a11y-captions-output" class="atlas-a11y-output captions" aria-live="polite">Los subtítulos aparecerán aquí.</div><div class="atlas-a11y-actions"><button id="atlas-a11y-caption-toggle" class="primary" type="button">Activar subtítulos</button></div><p class="atlas-a11y-privacy">El micrófono funciona solo mientras los subtítulos estén activos y se detiene al cerrar el panel.</p></section>

        <section class="atlas-a11y-section" aria-labelledby="atlas-speech-title"><div class="atlas-a11y-section-head"><div><span>TEXTO → VOZ</span><h3 id="atlas-speech-title">Hablar por mí</h3></div></div><textarea id="atlas-a11y-speech-text" rows="3" placeholder="Escribe lo que quieres que ATLAS diga…"></textarea><div class="atlas-a11y-actions"><button id="atlas-a11y-speak" class="primary" type="button">Reproducir voz</button><label class="atlas-a11y-switch"><input id="atlas-a11y-auto-voice" type="checkbox">Voz automática al interpretar señas</label></div></section>

        <section class="atlas-a11y-section" aria-labelledby="atlas-display-title"><div class="atlas-a11y-section-head"><div><span>VISUAL</span><h3 id="atlas-display-title">Lectura y alertas</h3></div></div><div class="atlas-a11y-check-grid"><label><input id="atlas-a11y-large-text" type="checkbox">Texto ampliado</label><label><input id="atlas-a11y-high-contrast" type="checkbox">Alto contraste</label><label><input id="atlas-a11y-reduced-motion" type="checkbox">Reducir movimiento</label><label><input id="atlas-a11y-visual-alerts" type="checkbox">Alertas visuales</label></div></section>

        <section class="atlas-a11y-section" aria-labelledby="atlas-history-title"><div class="atlas-a11y-section-head"><div><span>PRIVACIDAD</span><h3 id="atlas-history-title">Historial de comunicación</h3></div><button id="atlas-a11y-clear-history" class="atlas-a11y-text-button" type="button">Limpiar</button></div><label class="atlas-a11y-switch"><input id="atlas-a11y-save-history" type="checkbox">Guardar historial local para esta cuenta</label><p class="atlas-a11y-privacy">Desactivado por defecto. Si lo activas, se separa por cuenta autenticada y se elimina al cerrar sesión.</p><div id="atlas-a11y-history"></div></section>
      </aside>`;
    document.body.append(root);

    const panel = $('#atlas-a11y-panel');
    setPanelInteractive(panel, false);

    $('#atlas-a11y-launcher').addEventListener('click', () => state.open ? closePanel() : openPanel());
    $('#atlas-a11y-close').addEventListener('click', () => closePanel());
    $('#atlas-a11y-camera-toggle').addEventListener('click', () => state.stream ? stopCamera() : startCamera());
    $('#atlas-a11y-interpret').addEventListener('click', interpretSign);
    $('#atlas-a11y-caption-toggle').addEventListener('click', () => state.recognizing ? stopCaptions() : startCaptions());
    $('#atlas-a11y-speak').addEventListener('click', () => {
      const text = $('#atlas-a11y-speech-text').value.trim();
      if (!text) return setStatus('Escribe un mensaje antes de reproducirlo.', 'warning');
      if (!speak(text)) return setStatus('La reproducción de voz no está disponible en este navegador.', 'warning');
      remember('Texto → voz', text);
      renderHistory();
      setStatus('Mensaje reproducido por voz.', 'success');
    });
    $('#atlas-a11y-clear-history').addEventListener('click', () => clearHistory());

    const bindBoolean = (selector, key) => {
      const input = $(selector);
      input.checked = Boolean(state.preferences[key]);
      input.addEventListener('change', () => {
        state.preferences[key] = input.checked;
        savePreferences();
      });
    };
    bindBoolean('#atlas-a11y-auto-voice', 'voiceOutput');
    bindBoolean('#atlas-a11y-large-text', 'largeText');
    bindBoolean('#atlas-a11y-high-contrast', 'highContrast');
    bindBoolean('#atlas-a11y-reduced-motion', 'reducedMotion');
    bindBoolean('#atlas-a11y-visual-alerts', 'visualAlerts');

    const historyToggle = $('#atlas-a11y-save-history');
    historyToggle.checked = Boolean(state.preferences.saveHistory);
    historyToggle.addEventListener('change', () => {
      if (historyToggle.checked && !currentUserId()) {
        historyToggle.checked = false;
        state.preferences.saveHistory = false;
        savePreferences();
        return setStatus('Inicia sesión segura antes de guardar historial persistente.', 'warning');
      }
      state.preferences.saveHistory = historyToggle.checked;
      savePreferences();
      if (historyToggle.checked) persistHistory();
      else {
        const userId = currentUserId() || state.historyOwner;
        if (userId) {
          try { localStorage.removeItem(historyKey(userId)); } catch (_) {}
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
    try { LEGACY_HISTORY_KEYS.forEach((key) => localStorage.removeItem(key)); } catch (_) {}
    applyPreferences();
    render();
    installAlertBridge();

    document.addEventListener('keydown', (event) => {
      if (event.altKey && event.key.toLowerCase() === 'a') {
        event.preventDefault();
        state.open ? closePanel() : openPanel();
      }
      if (event.key === 'Escape' && state.open) closePanel();
    });

    document.addEventListener('click', (event) => {
      if (event.target.closest?.('#logout-btn,#signout-button,[data-atlas-logout]')) privacyCleanup();
    }, true);

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        state.interpretController?.abort();
        stopCaptions({ silent: true });
        stopCamera({ silent: true });
        stopSpeech();
      }
    });

    window.addEventListener('pagehide', privacyCleanup);
    window.addEventListener('atlas:alert', (event) => visualAlert(event.detail || {}));

    window.addEventListener('storage', (event) => {
      if (event.key === sessionStorageKey()) {
        state.sessionHistory = [];
        state.historyOwner = null;
        renderHistory();
      }
    });

    window.ATLASAccessibility = Object.freeze({
      version: '1.2.0',
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
