/* ATLAS Universal Access — multimodal communication foundation
 * Voice + captions + translation-ready text + camera gesture/sign observation.
 * Privacy rule: no identity inference. Participants are session-local Person 1/2/3.
 */
(() => {
  const state = {
    active: false,
    camera: false,
    captions: true,
    signObservation: false,
    participantCounter: 0,
    stream: null,
    recognition: null,
  };

  const supportsSpeech = () => Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);

  function ensurePanel() {
    let panel = document.getElementById('atlasUniversalAccess');
    if (panel) return panel;
    panel = document.createElement('section');
    panel.id = 'atlasUniversalAccess';
    panel.className = 'atlas-universal-access';
    panel.setAttribute('aria-label', 'ATLAS Universal Access');
    panel.innerHTML = `
      <header><div><strong>ATLAS Universal Access</strong><small>Communication that adapts to people</small></div><button data-ua="close" aria-label="Close">×</button></header>
      <div class="ua-stage">
        <video id="uaVideo" playsinline muted></video>
        <div class="ua-person" id="uaPerson">Person 1</div>
        <div class="ua-caption" id="uaCaption" aria-live="polite">Ready for voice, text or visual communication.</div>
      </div>
      <div class="ua-controls">
        <button data-ua="captions">CC Captions</button>
        <button data-ua="camera">Camera</button>
        <button data-ua="sign">Sign / Gesture</button>
        <button data-ua="listen">Live Voice</button>
      </div>
      <p class="ua-privacy">ATLAS labels participants only within this session. It does not infer identity or disability from appearance. Camera and microphone require explicit device permission.</p>`;
    document.body.appendChild(panel);
    panel.addEventListener('click', onAction);
    return panel;
  }

  function caption(text) {
    const el = document.getElementById('uaCaption');
    if (el) el.textContent = text;
    window.dispatchEvent(new CustomEvent('atlas:universal-access:caption', { detail: { text } }));
  }

  async function toggleCamera() {
    const video = document.getElementById('uaVideo');
    if (!state.camera) {
      try {
        state.stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false });
        video.srcObject = state.stream;
        await video.play();
        state.camera = true;
        state.participantCounter = Math.max(1, state.participantCounter);
        caption('Camera active. Visual communication is ready.');
      } catch (e) { caption('Camera permission was not granted.'); }
    } else {
      state.stream?.getTracks().forEach(t => t.stop());
      video.srcObject = null;
      state.stream = null;
      state.camera = false;
      caption('Camera off.');
    }
  }

  function toggleSignObservation() {
    state.signObservation = !state.signObservation;
    caption(state.signObservation
      ? 'Sign / gesture observation enabled. Recognition models can attach here without identifying the person.'
      : 'Sign / gesture observation paused.');
  }

  function toggleVoice() {
    if (!supportsSpeech()) return caption('Live speech recognition is not available in this browser.');
    if (state.recognition) { state.recognition.stop(); state.recognition = null; return caption('Live voice paused.'); }
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    const r = new SR();
    r.continuous = true; r.interimResults = true; r.lang = document.documentElement.lang || 'en-US';
    r.onresult = e => {
      let text = '';
      for (let i = e.resultIndex; i < e.results.length; i++) text += e.results[i][0].transcript;
      if (text.trim()) caption(text.trim());
    };
    r.onend = () => { if (state.recognition === r) state.recognition = null; };
    r.onerror = e => caption(`Voice unavailable: ${e.error}`);
    r.start(); state.recognition = r; caption('Listening…');
  }

  function onAction(e) {
    const action = e.target.closest('[data-ua]')?.dataset.ua;
    if (!action) return;
    if (action === 'close') close();
    if (action === 'camera') toggleCamera();
    if (action === 'sign') toggleSignObservation();
    if (action === 'listen') toggleVoice();
    if (action === 'captions') { state.captions = !state.captions; caption(state.captions ? 'Captions on.' : 'Captions off.'); }
  }

  function open() { state.active = true; ensurePanel().classList.add('open'); }
  function close() { state.active = false; ensurePanel().classList.remove('open'); }

  window.ATLASUniversalAccess = { open, close, caption, state };
  window.addEventListener('atlas:universal-access:open', open);
})();
