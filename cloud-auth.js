(() => {
  'use strict';

  const config = window.ATLAS_CONFIG || {};
  const sdk = window.supabase;
  const identity = window.ATLAS_IDENTITY;
  const $ = (selector) => document.querySelector(selector);
  const state = { mode: 'signin', client: null };

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
    elements.submit.disabled = busy;
    elements.signOut.disabled = busy;
    elements.refreshOrgs.disabled = busy;
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
    clearMessage();
  }

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, (character) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[character]));
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
    if (!signedIn) return;
    elements.userEmail.textContent = session.user.email || session.user.id;
    await loadOrganizations();
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
        showMessage('Sesión iniciada. ATLAS Identity cargó empresas, módulos y permisos efectivos para esta cuenta.');
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

    elements.dot.classList.add('ready');
    elements.connectionTitle.textContent = 'ATLAS Identity conectado';
    elements.connectionDetail.textContent = config.environment || 'Private Beta';

    const { data, error } = await state.client.auth.getSession();
    if (error) showMessage(error.message, true);

    if (data?.session && identity) {
      try {
        await identity.init(state.client);
      } catch (identityError) {
        showMessage(`Sesión válida, pero ATLAS Identity necesita su migración: ${identityError.message}`, true);
      }
    }

    await renderSession(data?.session);

    state.client.auth.onAuthStateChange((_event, session) => {
      window.setTimeout(async () => {
        if (session && identity) {
          try {
            await identity.init(state.client);
          } catch (identityError) {
            showMessage(identityError?.message || 'No se pudo cargar ATLAS Identity.', true);
          }
        }
        await renderSession(session);
      }, 0);
    });
  }

  document.querySelectorAll('[data-auth-mode]').forEach((button) => {
    button.addEventListener('click', () => setMode(button.dataset.authMode));
  });
  elements.authForm.addEventListener('submit', submitAuth);
  elements.orgForm.addEventListener('submit', createOrganization);
  elements.refreshOrgs.addEventListener('click', loadOrganizations);
  elements.signOut.addEventListener('click', async () => {
    setBusy(true);
    const { error } = await state.client.auth.signOut();
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
