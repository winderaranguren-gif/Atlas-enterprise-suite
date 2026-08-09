(() => {
  'use strict';

  const STORE_KEY = 'atlas.accessibility.preferences.v1';
  const HISTORY_KEY = 'atlas.accessibility.history.v1';
  const MAX_HISTORY = 40;
  const FRAME_COUNT = 4;
  const FRAME_INTERVAL_MS = 220;

  const defaults = {
    signLanguage: 'LSV',
    locale: 'es-VE',
    voiceOutput: true,
    captions: false,
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
    preferences: loadPreferences(),
    lastInterpretation: null
  };

  const $ = (selector, root = document) => root.querySelector(selector);

  function loadPreferences() {
    try {
      return { ...defaults, ...(JSON.parse(localStorage.getItem(STORE_KEY) || '{}')) };
    } catch (_) {
      return { ...defaults };
    }
  }

  function savePreferences() {
    localStorage.setItem(STORE_KEY, JSON.stringify(state.preferences));
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
    requestAnimationFrame(() => { live.textContent = text; });
  }

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, (character) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[character]));
  }

  function setStatus(message, tone = 'neutral') {
    const node = $('#atlas-a11y-status');
    if (!node) return;
    node.textContent = message;
    node.dataset.tone = tone;
    announce(message);
  }

  function remember(entry) {
    if (!entry?.text) return;
    try {
      const list = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
      list.unshift({ ...entry, at: new Date().toISOString() });
      localStorage.setItem(HISTORY_KEY, JSON.stringify(list.slice(0, MAX_HISTORY)));
    } catch (_) {}
  }

  function renderHistory() {
    const target = $('#atlas-a11y-history');
    if (!target) return;
    let rows = [];
    try { rows = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]'); } catch (_) {}
    target.innerHTML = rows.length
      ? rows.slice(0, 8).map((row) => `<div class="atlas-a11y-history-row"><span>${escapeHtml(row.kind || 'Comunicación')}</span><strong>${escapeHtml(row.text)}</strong></div>`).join('')
      : '<p class="atlas-a11y-muted">El historial local opcional está vacío.</p>';
  }

  function speak(text) {
    const content = String(text || '').trim();
    if (!content || !('speechSynthesis' in window)) return false;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(content);
    utterance.lang = state.preferences.locale || 'es-VE';
    utterance.rate = 1;
    window.speechSynthesis.speak(utterance);
    emit('atlas:accessibility-speech', { text: content });
    return true;
  }

  function getRecognitionCtor() {
    return window.SpeechRecognition || window.webkitSpeechRecognition || null;
  }

  function startCaptions() {
    if (state.recognizing) return;
    const Recognition = getRecognitionCtor();
    if (!Recognition) {
      setStatus('Este navegador no ofrece reconocimiento de voz en tiempo real.', 'warning');
      return;
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
      if (event.error !== 'no-speech') setStatus(`Subtítulos: ${event.error || 'error de reconocimiento'}.`, 'warning');
    };

    recognition.onend = () => {
      if (state.recognizing) {
        try { recognition.start(); } catch (_) {}
      }
    };

    try {
      recognition.start();
      state.recognition = recognition;
      state.recognizing = true;
      state.preferences.captions = true;
      savePreferences();
      syncControls();
      setStatus('Subtítulos de voz activos.', 'success');
    } catch (error) {
      setStatus(error?.message || 'No se pudieron iniciar los subtítulos.', 'warning');
    }
  }

  function stopCaptions() {
    state.recognizing = false;
    state.preferences.captions = false;
    savePreferences();
    try { state.recognition?.stop(); } catch (_) {}
    state.recognition = null;
    syncControls();
    setStatus('Subtítulos detenidos.');
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

  function stopCamera() {
    if (state.stream) {
      state.stream.getTracks().forEach((track) => track.stop());
      state.stream = null;
    }
    const video = $('#atlas-a11y-video');
    if (video) video.srcObject = null;
    document.documentElement.classList.remove('atlas-a11y-camera-active');
    syncControls();
    setStatus('Cámara apagada.');
    emit('atlas:accessibility-camera', { active: false });
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

  function projectRefFromUrl(url) {
    try { return new URL(url).hostname.split('.')[0]; } catch (_) { return ''; }
  }

  function getSupabaseAccessToken() {
    const config = window.ATLAS_CONFIG || {};
    const ref = projectRefFromUrl(config.supabaseUrl || '');
    const candidates = [];
    if (ref) candidates.push(`sb-${ref}-auth-token`);
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index);
      if (key?.startsWith('sb-') && key.endsWith('-auth-token') && !candidates.includes(key)) candidates.push(key);
    }
    for (const key of candidates) {
      try {
        const parsed = JSON.parse(localStorage.getItem(key) || '{}');
        const token = parsed?.access_token || parsed?.currentSession?.access_token || parsed?.session?.access_token;
        if (token) return token;
      } catch (_) {}
    }
    return '';
  }

  async function callSignInterpreter(frames) {
    const config = window.ATLAS_CONFIG || {};
    if (!config.supabaseUrl || !config.supabasePublishableKey) throw new Error('ATLAS Cloud no está configurado.');
    const accessToken = getSupabaseAccessToken();
    if (!accessToken) throw new Error('Inicia sesión segura en ATLAS Cloud para usar la interpretación de señas con IA.');

    const response = await fetch(`${config.supabaseUrl}/functions/v1/atlas-sign-interpret`, {
      method: 'POST',
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

    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      if (response.status === 401) throw new Error('Tu sesión segura expiró. Vuelve a iniciar sesión.');
      throw new Error(body?.message || body?.error || 'No se pudo interpretar la seña.');
    }
    return body;
  }

  async function interpretSign() {
    if (state.interpreting) return;
    if (!state.stream && !(await startCamera())) return;
    state.interpreting = true;
    syncControls();
    setStatus('Analizando una secuencia breve de señas…');
    const output = $('#atlas-a11y-sign-output');
    if (output) output.textContent = 'Analizando…';

    try {
      const frames = await captureBurst();
      if (!frames.length) throw new Error('La cámara aún no está lista.');
      const result = await callSignInterpreter(frames);
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
      setStatus(`Seña interpretada${confidence ? ` · confianza ${Math.round(confidence * 100)}%` : ''}.`, 'success');
      if (state.preferences.voiceOutput) speak(text);
      emit('atlas:accessibility-sign', { ...result, text });
    } catch (error) {
      const message = error?.message || 'No se pudo completar la interpretación.';
      if (output) output.textContent = message;
      setStatus(message, 'warning');
    } finally {
      state.interpreting = false;
      syncControls();
    }
  }

  function visualAlert(detail = {}) {
    if (!state.preferences.visualAlerts) return;
    const banner = $('#atlas-a11y-alert');
    if (!banner) return;
    banner.textContent = detail.message || detail.title || 'Nueva alerta de ATLAS';
    banner.classList.add('show');
    window.setTimeout(() => banner.classList.remove('show'), 4200);
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
  }

  function openPanel() {
    state.open = true;
    const panel = $('#atlas-a11y-panel');
    const launcher = $('#atlas-a11y-launcher');
    panel?.classList.add('open');
    panel?.setAttribute('aria-hidden', 'false');
    launcher?.setAttribute('aria-expanded', 'true');
    $('#atlas-a11y-close')?.focus();
    renderHistory();
  }

  function closePanel() {
    state.open = false;
    const panel = $('#atlas-a11y-panel');
    const launcher = $('#atlas-a11y-launcher');
    panel?.classList.remove('open');
    panel?.setAttribute('aria-hidden', 'true');
    launcher?.setAttribute('aria-expanded', 'false');
    stopCamera();
    launcher?.focus();
  }

  function render() {
    if ($('#atlas-a11y-launcher')) return;
    const root = document.createElement('div');
    root.id = 'atlas-a11y-root';
    root.innerHTML = `
      <div id="atlas-a11y-live" class="atlas-a11y-sr-only" aria-live="polite"></div>
      <div id="atlas-a11y-alert" class="atlas-a11y-alert" role="alert"></div>
      <button id="atlas-a11y-launcher" class="atlas-a11y-launcher" type="button" aria-haspopup="dialog" aria-expanded="false" aria-controls="atlas-a11y-panel">
        <span aria-hidden="true">◉</span><span>Accesibilidad</span>
      </button>
      <aside id="atlas-a11y-panel" class="atlas-a11y-panel" role="dialog" aria-modal="false" aria-hidden="true" aria-labelledby="atlas-a11y-title">
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
          <div class="atlas-a11y-section-head"><div><span>LOCAL</span><h3 id="atlas-history-title">Historial opcional</h3></div><button id="atlas-a11y-clear-history" class="atlas-a11y-text-button" type="button">Limpiar</button></div>
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
      speak(text);
      remember({ kind: 'Texto → voz', text });
      renderHistory();
      setStatus('Mensaje reproducido por voz.', 'success');
    });
    $('#atlas-a11y-clear-history').addEventListener('click', () => {
      localStorage.removeItem(HISTORY_KEY);
      renderHistory();
      setStatus('Historial local eliminado.', 'success');
    });

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

    $('#atlas-a11y-sign-language').value = state.preferences.signLanguage;
    $('#atlas-a11y-sign-language').addEventListener('change', (event) => {
      state.preferences.signLanguage = event.target.value;
      savePreferences();
    });
    $('#atlas-a11y-locale').value = state.preferences.locale;
    $('#atlas-a11y-locale').addEventListener('change', (event) => {
      state.preferences.locale = event.target.value;
      savePreferences();
      if (state.recognizing) { stopCaptions(); startCaptions(); }
    });

    syncControls();
    renderHistory();
  }

  function install() {
    applyPreferences();
    render();

    document.addEventListener('keydown', (event) => {
      if (event.altKey && event.key.toLowerCase() === 'a') {
        event.preventDefault();
        state.open ? closePanel() : openPanel();
      }
      if (event.key === 'Escape' && state.open) closePanel();
    });

    window.addEventListener('pagehide', () => {
      stopCamera();
      stopCaptions();
    });
    window.addEventListener('atlas:alert', (event) => visualAlert(event.detail || {}));

    window.ATLASAccessibility = Object.freeze({
      version: '1.0.0',
      open: openPanel,
      close: closePanel,
      startCamera,
      stopCamera,
      interpretSign,
      startCaptions,
      stopCaptions,
      speak,
      visualAlert,
      getState: () => ({
        open: state.open,
        cameraActive: Boolean(state.stream),
        captionsActive: state.recognizing,
        interpreting: state.interpreting,
        preferences: { ...state.preferences },
        lastInterpretation: state.lastInterpretation ? { ...state.lastInterpretation } : null
      })
    });

    emit('atlas:accessibility-ready', { version: window.ATLASAccessibility.version });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install, { once: true });
  else install();
})();
