(() => {
  'use strict';

  const config = window.ATLAS_CONFIG || {};
  const sdk = window.supabase;
  const identity = window.ATLAS_IDENTITY;
  const federation = config.federatedIdentity || {};
  const $ = (selector) => document.querySelector(selector);
  const state = {
    mode: 'signin',
    client: null,
    mfaEnrollmentFactorId: null,
    mfaVerifiedFactorId: null
  };

  const elements = {
    dot: $('#connection-dot'),
    connectionTitle: $('#connection-title'),
    connectionDetail: $('#connection-detail'),
    authSection: $('#auth-section'),
    accountSection: $('#account-section'),
    authForm: $('#auth-form'),
    email: $('#auth-email'),
    password: $('#auth-password'),
    passwordLabel: $('#password-label'),
    name: $('#auth-name'),
    nameLabel: $('#name-label'),
    submit: $('#auth-submit'),
    help: $('#auth-help'),
    federatedAuth: $('#federated-auth'),
    federatedSignin: $('#federated-signin'),
    federatedHelp: $('#federated-help'),
    mfaBadge: $('#mfa-badge'),
    mfaStatus: $('#mfa-status'),
    mfaDetail: $('#mfa-detail'),
    mfaRefresh: $('#mfa-refresh'),
    mfaEnrollButton: $('#mfa-enroll-button'),
    mfaEnrollPanel: $('#mfa-enroll-panel'),
    mfaQr: $('#mfa-qr'),
    mfaSecret: $('#mfa-secret'),
    mfaEnrollCode: $('#mfa-enroll-code'),
    mfaEnrollVerify: $('#mfa-enroll-verify'),
    mfaEnrollCancel: $('#mfa-enroll-cancel'),
    mfaStepupPanel: $('#mfa-stepup-panel'),
    mfaStepupCode: $('#mfa-stepup-code'),
    mfaStepupVerify: $('#mfa-stepup-verify'),
    message: $('#message'),
    userEmail: $('#user-email'),
    orgList: $('#organization-list'),
    orgForm: $('#organization-form'),
    orgName: $('#org-name'),
    orgLegalName: $('#org-legal-name'),
    orgIndustry: $('#org-industry'),
    signOut: $('#signout-button'),
    refreshOrgs: $('#refresh-orgs')
  };

  function showMessage(text, isError = false) {
    elements.message.textContent = text;
    elements.message.classList.remove('hidden', 'error');
    if (isError) elements.message.classList.add('error');
  }

  function clearMessage() {
    elements.message.classList.add('hidden');
    elements.message.textContent = '';
  }

  function setBusy(busy) {
    [
      elements.submit,
      elements.signOut,
      elements.refreshOrgs,
      elements.federatedSignin,
      elements.mfaRefresh,
      elements.mfaEnrollButton,
      elements.mfaEnrollVerify,
      elements.mfaEnrollCancel,
      elements.mfaStepupVerify
    ].forEach((element) => {
      if (element) element.disabled = busy;
    });
  }

  function updateFederatedVisibility() {
    const enabled = Boolean(federation.enabled && federation.provider && identity);
    elements.federatedAuth.classList.toggle('hidden', !enabled || state.mode !== 'signin');
    if (!enabled) return;

    elements.federatedSignin.textContent = federation.label || 'Continuar con SSO';
    elements.federatedHelp.textContent = 'Acceso federado mediante OIDC; ATLAS conserva una sola sesión Supabase y las mismas políticas RLS.';
  }

  function setMode(mode) {
    state.mode = mode;
    document.querySelectorAll('[data-auth-mode]').forEach((button) => {
      button.classList.toggle('active', button.dataset.authMode === mode);
    });

    const recovery = mode === 'recovery';
    const signup = mode === 'signup';
    elements.passwordLabel.classList.toggle('hidden', recovery);
    elements.password.required = !recovery;
    elements.nameLabel.classList.toggle('hidden', !signup);
    elements.name.required = signup;
    elements.password.autocomplete = signup ? 'new-password' : 'current-password';

    const labels = {
      signin: ['Entrar de forma segura', 'Usa una cuenta autorizada en ATLAS Identity.'],
      signup: ['Crear cuenta', 'Supabase puede requerir confirmación por correo antes del primer acceso.'],
      recovery: ['Enviar enlace de recuperación', 'El enlace regresará a esta página mediante la URL autorizada.']
    };
    elements.submit.textContent = labels[mode][0];
    elements.help.textContent = labels[mode][1];
    updateFederatedVisibility();
    clearMessage();
  }

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, (character) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[character]));
  }

  function resetMfaEnrollmentUi() {
    state.mfaEnrollmentFactorId = null;
    elements.mfaEnrollPanel.classList.add('hidden');
    elements.mfaQr.removeAttribute('src');
    elements.mfaSecret.textContent = '—';
    elements.mfaEnrollCode.value = '';
  }

  async function loadMfaState() {
    try {
      if (!identity) throw new Error('ATLAS Identity client is not available.');
      const mfa = await identity.getMfaState();
      const totpFactors = mfa.factors?.totp || [];
      const verifiedFactor = totpFactors.find((factor) => factor.status === 'verified') || totpFactors[0] || null;
      state.mfaVerifiedFactorId = verifiedFactor?.id || null;

      elements.mfaBadge.textContent = String(mfa.currentLevel || 'aal1').toUpperCase();
      elements.mfaBadge.classList.toggle('verified', mfa.currentLevel === 'aal2');
      elements.mfaStepupPanel.classList.toggle('hidden', !mfa.requiresStepUp);
      elements.mfaEnrollButton.textContent = totpFactors.length ? 'Agregar otro autenticador' : 'Agregar autenticador';

      if (mfa.currentLevel === 'aal2') {
        elements.mfaStatus.textContent = 'Sesión verificada con segundo factor';
        elements.mfaDetail.textContent = 'AAL2 activo. Las acciones sensibles de ATLAS Identity pueden continuar.';
      } else if (mfa.requiresStepUp) {
        elements.mfaStatus.textContent = 'MFA configurado; falta verificar esta sesión';
        elements.mfaDetail.textContent = 'Introduce un código del autenticador para elevar esta sesión a AAL2.';
      } else {
        elements.mfaStatus.textContent = 'Sesión estándar sin segundo factor verificado';
        elements.mfaDetail.textContent = 'AAL1 activo. Puedes agregar un autenticador para proteger acciones sensibles.';
      }

      return mfa;
    } catch (error) {
      elements.mfaStatus.textContent = 'No se pudo revisar MFA';
      elements.mfaDetail.textContent = error?.message || 'Error al consultar el nivel de seguridad.';
      throw error;
    }
  }

  async function startMfaEnrollment() {
    clearMessage();
    setBusy(true);
    try {
      const enrollment = await identity.enrollTotp('ATLAS Identity');
      state.mfaEnrollmentFactorId = enrollment.factorId;
      elements.mfaSecret.textContent = enrollment.secret || 'No disponible';
      if (enrollment.qrCode) elements.mfaQr.src = enrollment.qrCode;
      elements.mfaEnrollPanel.classList.remove('hidden');
      elements.mfaEnrollCode.focus();
      showMessage('Escanea el código QR y confirma con el código generado por tu autenticador.');
    } catch (error) {
      showMessage(error?.message || 'No se pudo iniciar la configuración de MFA.', true);
    } finally {
      setBusy(false);
    }
  }

  async function completeMfaEnrollment() {
    clearMessage();
    setBusy(true);
    try {
      if (!state.mfaEnrollmentFactorId) throw new Error('No hay una configuración MFA pendiente.');
      await identity.challengeAndVerifyFactor({
        factorId: state.mfaEnrollmentFactorId,
        code: elements.mfaEnrollCode.value
      });
      resetMfaEnrollmentUi();
      await loadMfaState();
      showMessage('MFA activado correctamente. La sesión está verificada con AAL2.');
    } catch (error) {
      showMessage(error?.message || 'No se pudo verificar el segundo factor.', true);
    } finally {
      setBusy(false);
    }
  }

  async function cancelMfaEnrollment() {
    setBusy(true);
    try {
      if (state.mfaEnrollmentFactorId) {
        const { error } = await state.client.auth.mfa.unenroll({ factorId: state.mfaEnrollmentFactorId });
        if (error) throw error;
      }
      resetMfaEnrollmentUi();
      await loadMfaState();
      showMessage('Configuración de MFA cancelada.');
    } catch (error) {
      showMessage(error?.message || 'No se pudo cancelar la configuración de MFA.', true);
    } finally {
      setBusy(false);
    }
  }

  async function verifyMfaStepUp() {
    clearMessage();
    setBusy(true);
    try {
      const mfa = await identity.getMfaState();
      const totpFactors = mfa.factors?.totp || [];
      const factor = totpFactors.find((item) => item.status === 'verified') || totpFactors[0];
      if (!factor) throw new Error('No hay un autenticador TOTP disponible para verificar.');

      await identity.challengeAndVerifyFactor({ factorId: factor.id, code: elements.mfaStepupCode.value });
      elements.mfaStepupCode.value = '';
      await loadMfaState();
      showMessage('Sesión elevada a AAL2. Las acciones sensibles están habilitadas.');
    } catch (error) {
      showMessage(error?.message || 'No se pudo completar la verificación adicional.', true);
    } finally {
      setBusy(false);
    }
  }

  async function loadOrganizations() {
    elements.orgList.innerHTML = '<div class="organization"><span>Cargando empresas y permisos…</span></div>';

    try {
      if (!identity) throw new Error('ATLAS Identity client is not available.');
      const context = await identity.refresh();
      const organizations = context.organizations || [];

      if (!organizations.length) {
        elements.orgList.innerHTML = '<div class="organization"><strong>Aún no tienes empresas.</strong><span>Crea la primera con el formulario inferior.</span></div>';
        return;
      }

      elements.orgList.innerHTML = organizations.map((org) => {
        const permissionCount = Array.isArray(org.permissions) ? org.permissions.length : 0;
        const moduleCount = Array.isArray(org.modules) ? org.modules.length : 0;
        return `<article class="organization" data-org-id="${escapeHtml(org.id)}"><strong>${escapeHtml(org.name || 'Empresa')}</strong><span>${escapeHtml(org.legal_name || org.industry || 'Sin detalles adicionales')}</span><small>Rol: ${escapeHtml(org.role)} · ${permissionCount} permisos · ${moduleCount} módulos activos</small></article>`;
      }).join('');
    } catch (error) {
      elements.orgList.innerHTML = '<div class="organization"><strong>No se pudo resolver ATLAS Identity.</strong></div>';
      showMessage(error?.message || 'No se pudieron leer las empresas y permisos.', true);
    }
  }

  async function renderSession(session) {
    const signedIn = Boolean(session?.user);
    elements.authSection.classList.toggle('hidden', signedIn);
    elements.accountSection.classList.toggle('hidden', !signedIn);
    if (!signedIn) {
      identity?.clear();
      resetMfaEnrollmentUi();
      elements.mfaStepupPanel.classList.add('hidden');
      updateFederatedVisibility();
      return;
    }
    elements.userEmail.textContent = session.user.email || session.user.id;
    await loadOrganizations();
    try {
      await loadMfaState();
    } catch {
      // MFA status is shown in its own panel; organization access remains usable.
    }
  }

  async function submitAuth(event) {
    event.preventDefault();
    clearMessage();
    setBusy(true);
    try {
      const email = elements.email.value.trim();
      const password = elements.password.value;

      if (state.mode === 'signin') {
        const { data, error } = await state.client.auth.signInWithPassword({ email, password });
        if (error) throw error;
        await renderSession(data.session);
        showMessage('Sesión iniciada. ATLAS Identity cargó empresas, módulos, permisos y nivel MFA para esta cuenta.');
      } else if (state.mode === 'signup') {
        const { data, error } = await state.client.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: config.authRedirectUrl,
            data: { full_name: elements.name.value.trim() }
          }
        });
        if (error) throw error;
        if (data.session) await renderSession(data.session);
        showMessage(data.session ? 'Cuenta creada y sesión iniciada.' : 'Cuenta creada. Revisa el correo para confirmar el acceso.');
      } else {
        const { error } = await state.client.auth.resetPasswordForEmail(email, {
          redirectTo: config.authRedirectUrl
        });
        if (error) throw error;
        showMessage('Solicitud enviada. Revisa el correo y utiliza el enlace de recuperación.');
      }
    } catch (error) {
      showMessage(error?.message || 'No se pudo completar la solicitud.', true);
    } finally {
      setBusy(false);
    }
  }

  async function signInFederated() {
    clearMessage();
    setBusy(true);
    try {
      if (!identity) throw new Error('ATLAS Identity client is not available.');
      if (!federation.enabled || !federation.provider) throw new Error('Federated identity is not enabled.');

      const providerOptions = {};
      if (federation.scopes) providerOptions.scopes = federation.scopes;
      await identity.signInWithProvider(federation.provider, providerOptions);
    } catch (error) {
      showMessage(error?.message || 'No se pudo iniciar el acceso federado.', true);
      setBusy(false);
    }
  }

  async function createOrganization(event) {
    event.preventDefault();
    clearMessage();
    setBusy(true);
    try {
      const { data, error } = await state.client.rpc('create_organization', {
        organization_name: elements.orgName.value.trim(),
        organization_legal_name: elements.orgLegalName.value.trim() || null,
        organization_industry: elements.orgIndustry.value.trim() || null
      });
      if (error) throw error;
      elements.orgForm.reset();
      await loadOrganizations();
      showMessage(`Empresa creada correctamente. ATLAS Identity te asignó como owner. Identificador: ${data}`);
    } catch (error) {
      showMessage(error?.message || 'No se pudo crear la empresa.', true);
    } finally {
      setBusy(false);
    }
  }

  async function initialize() {
    const configured = Boolean(config.supabaseUrl && config.supabasePublishableKey);
    if (!sdk?.createClient) {
      elements.dot.classList.add('error');
      elements.connectionTitle.textContent = 'No se cargó Supabase JS';
      elements.connectionDetail.textContent = 'Revisa la conexión al CDN o instala el paquete durante el build.';
      elements.submit.disabled = true;
      return;
    }
    if (!configured) {
      elements.dot.classList.add('error');
      elements.connectionTitle.textContent = 'Configuración pendiente';
      elements.connectionDetail.textContent = 'Agrega SUPABASE_URL y SUPABASE_PUBLISHABLE_KEY en atlas-config.js.';
      elements.submit.disabled = true;
      showMessage('La página está construida, pero no puede conectarse hasta completar los dos valores públicos de Supabase.', true);
      return;
    }

    state.client = sdk.createClient(config.supabaseUrl, config.supabasePublishableKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
    });

    if (!identity) {
      elements.dot.classList.add('error');
      elements.connectionTitle.textContent = 'ATLAS Identity no cargó';
      elements.connectionDetail.textContent = 'Revisa atlas-identity.js.';
      elements.submit.disabled = true;
      return;
    }

    identity.connect(state.client);
    updateFederatedVisibility();

    elements.dot.classList.add('ready');
    elements.connectionTitle.textContent = 'ATLAS Identity conectado';
    elements.connectionDetail.textContent = config.environment || 'Private Beta';

    const { data, error } = await state.client.auth.getSession();
    if (error) showMessage(error.message, true);
    await renderSession(data?.session);

    state.client.auth.onAuthStateChange((_event, session) => {
      window.setTimeout(() => renderSession(session), 0);
    });
  }

  document.querySelectorAll('[data-auth-mode]').forEach((button) => {
    button.addEventListener('click', () => setMode(button.dataset.authMode));
  });
  elements.authForm.addEventListener('submit', submitAuth);
  elements.orgForm.addEventListener('submit', createOrganization);
  elements.refreshOrgs.addEventListener('click', loadOrganizations);
  elements.federatedSignin.addEventListener('click', signInFederated);
  elements.mfaRefresh.addEventListener('click', () => loadMfaState().catch((error) => showMessage(error.message, true)));
  elements.mfaEnrollButton.addEventListener('click', startMfaEnrollment);
  elements.mfaEnrollVerify.addEventListener('click', completeMfaEnrollment);
  elements.mfaEnrollCancel.addEventListener('click', cancelMfaEnrollment);
  elements.mfaStepupVerify.addEventListener('click', verifyMfaStepUp);
  elements.signOut.addEventListener('click', async () => {
    setBusy(true);
    const { error } = await state.client.auth.signOut();
    identity?.clear();
    resetMfaEnrollmentUi();
    setBusy(false);
    if (error) showMessage(error.message, true);
    else showMessage('Sesión cerrada correctamente.');
  });

  setMode('signin');
  initialize().catch((error) => {
    elements.dot.classList.add('error');
    elements.connectionTitle.textContent = 'Error de inicialización';
    elements.connectionDetail.textContent = error?.message || 'Error desconocido';
    showMessage(elements.connectionDetail.textContent, true);
  });
})();
