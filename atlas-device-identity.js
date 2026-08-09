(() => {
  'use strict';

  const params = new URLSearchParams(location.search);
  const fragment = new URLSearchParams(location.hash.slice(1));
  const mode = params.get('mode') || 'laptop';
  const challengeId = params.get('challenge');
  const subjectId = params.get('subject');
  const phoneToken = fragment.get('token');

  // Remove the one-time token from the visible address bar immediately after reading it.
  if (mode === 'phone' && phoneToken && location.hash) {
    history.replaceState(null, '', `${location.pathname}${location.search}`);
  }

  const laptopPanel = document.querySelector('#laptop-panel');
  const phonePanel = document.querySelector('#phone-panel');
  const laptopStatus = document.querySelector('#laptop-status');
  const phoneStatus = document.querySelector('#phone-status');
  const startButton = document.querySelector('#start');
  const cancelButton = document.querySelector('#cancel');
  const phoneLinkWrap = document.querySelector('#phone-link-wrap');
  const phoneLink = document.querySelector('#phone-link');
  const phoneUrl = document.querySelector('#phone-url');
  const video = document.querySelector('#video');
  const canvas = document.querySelector('#canvas');
  const cameraButton = document.querySelector('#camera');
  const captureButton = document.querySelector('#capture');
  const consent = document.querySelector('#consent');

  let stream = null;
  let current = null;
  let pollTimer = null;

  function setStatus(element, text, type) {
    element.textContent = text;
    element.className = `status${type ? ` ${type}` : ''}`;
  }

  function stopCamera() {
    for (const track of stream?.getTracks?.() || []) track.stop();
    stream = null;
    if (video) video.srcObject = null;
  }

  async function poll() {
    if (!current) return;
    try {
      const response = await fetch(`/api/identity/challenges/${encodeURIComponent(current.challengeId)}`, {
        headers: { Authorization: `Bearer ${current.pollToken}` },
        cache: 'no-store'
      });
      if (!response.ok) throw new Error('La solicitud expiró o ya no está disponible.');
      const state = await response.json();
      if (state.status === 'verified') {
        const confidence = typeof state.confidence === 'number' ? ` Confianza: ${Math.round(state.confidence * 100)}%.` : '';
        setStatus(laptopStatus, `Rostro y prueba de presencia verificados.${confidence} ATLAS puede continuar el acceso.`, 'good');
        clearInterval(pollTimer); pollTimer = null;
      } else if (state.status === 'rejected') {
        setStatus(laptopStatus, `Verificación rechazada${state.reason ? `: ${state.reason}` : '.'}`, 'bad');
        clearInterval(pollTimer); pollTimer = null;
      } else if (state.status === 'verifying') {
        setStatus(laptopStatus, 'Selfie recibida. ATLAS está verificando identidad y presencia.');
      } else {
        setStatus(laptopStatus, 'Esperando la selfie desde el teléfono vinculado.');
      }
    } catch (error) {
      setStatus(laptopStatus, error.message || 'No se pudo consultar la verificación.', 'bad');
      clearInterval(pollTimer); pollTimer = null;
    }
  }

  async function startChallenge() {
    if (!subjectId) {
      setStatus(laptopStatus, 'ATLAS debe iniciar esta verificación desde una sesión autenticada para ligar el rostro al usuario correcto.', 'bad');
      return;
    }
    startButton.disabled = true;
    try {
      const response = await fetch('/api/identity/challenges', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subjectId })
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        if (result.error === 'public_origin_not_configured') throw new Error('Falta configurar el origen HTTPS seguro que puede abrir el teléfono vinculado.');
        if (result.error === 'local_face_verifier_not_configured') throw new Error('El motor biométrico local todavía no está configurado. ATLAS no solicitará una selfie sin un verificador real.');
        if (result.error === 'local_face_verifier_secret_not_configured') throw new Error('El canal privado entre ATLAS y el motor biométrico no está configurado.');
        if (result.error === 'valid_subject_id_required') throw new Error('La sesión no contiene una identidad válida para verificar.');
        throw new Error(result.error || 'No se pudo crear la solicitud.');
      }

      current = result;
      phoneLink.href = current.phoneUrl;
      phoneUrl.textContent = current.phoneUrl;
      phoneLinkWrap.classList.remove('hidden');
      cancelButton.classList.remove('hidden');
      setStatus(laptopStatus, `Solicitud protegida creada. Expira en ${current.expiresInSeconds} segundos.`);
      pollTimer = setInterval(poll, 1500);
      poll();
    } catch (error) {
      setStatus(laptopStatus, error.message || 'Error al crear la verificación.', 'bad');
      startButton.disabled = false;
    }
  }

  async function cancelChallenge() {
    if (current) {
      await fetch(`/api/identity/challenges/${encodeURIComponent(current.challengeId)}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${current.pollToken}` }
      }).catch(() => {});
    }
    current = null;
    clearInterval(pollTimer); pollTimer = null;
    phoneLinkWrap.classList.add('hidden');
    cancelButton.classList.add('hidden');
    startButton.disabled = false;
    setStatus(laptopStatus, 'Verificación cancelada.');
  }

  async function enableCamera() {
    try {
      if (!window.isSecureContext) throw new Error('La cámara requiere una conexión HTTPS segura en el teléfono.');
      if (!navigator.mediaDevices?.getUserMedia) throw new Error('Este navegador no permite acceso seguro a la cámara.');
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 1280 } },
        audio: false
      });
      video.srcObject = stream;
      captureButton.disabled = false;
      setStatus(phoneStatus, 'Cámara activa. Centra tu rostro y toma la selfie.');
    } catch (error) {
      setStatus(phoneStatus, error.message || 'No fue posible abrir la cámara.', 'bad');
    }
  }

  async function captureAndVerify() {
    if (!challengeId || !phoneToken) return setStatus(phoneStatus, 'La solicitud no es válida.', 'bad');
    if (!consent.checked) return setStatus(phoneStatus, 'Debes autorizar la captura para continuar.', 'bad');
    if (!stream || video.videoWidth < 1) return setStatus(phoneStatus, 'Activa la cámara antes de tomar la selfie.', 'bad');

    captureButton.disabled = true;
    canvas.width = Math.min(video.videoWidth, 1280);
    canvas.height = Math.round(canvas.width * (video.videoHeight / video.videoWidth));
    canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
    let selfieDataUrl = canvas.toDataURL('image/jpeg', 0.86);
    stopCamera();
    setStatus(phoneStatus, 'Selfie capturada. Verificando identidad y presencia…');

    try {
      const response = await fetch(`/api/identity/challenges/${encodeURIComponent(challengeId)}/capture`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: phoneToken, consent: true, selfieDataUrl })
      });
      selfieDataUrl = '';
      canvas.width = 1;
      canvas.height = 1;

      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.ok) throw new Error(result.reason || result.error || 'La verificación no fue aprobada.');
      setStatus(phoneStatus, 'Identidad verificada. La selfie fue descartada; puedes volver a la laptop.', 'good');
      cameraButton.disabled = true;
    } catch (error) {
      selfieDataUrl = '';
      canvas.width = 1;
      canvas.height = 1;
      setStatus(phoneStatus, error.message || 'No se pudo verificar la identidad.', 'bad');
      cameraButton.disabled = false;
    }
  }

  if (mode === 'phone') {
    laptopPanel.classList.add('hidden');
    phonePanel.classList.remove('hidden');
    if (!challengeId || !phoneToken) {
      setStatus(phoneStatus, 'Enlace de verificación incompleto o inválido.', 'bad');
      cameraButton.disabled = true;
    }
    cameraButton.addEventListener('click', enableCamera);
    captureButton.addEventListener('click', captureAndVerify);
  } else {
    if (!subjectId) {
      startButton.disabled = true;
      setStatus(laptopStatus, 'Abre esta verificación desde una sesión autenticada de ATLAS. No se permite seleccionar manualmente la identidad.', 'bad');
    }
    startButton.addEventListener('click', startChallenge);
    cancelButton.addEventListener('click', cancelChallenge);
  }

  addEventListener('pagehide', stopCamera);
})();
