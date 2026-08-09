(() => {
  'use strict';

  const identity = window.ATLAS_IDENTITY;
  const config = window.ATLAS_CONFIG || {};
  const PENDING_INVITE_KEY = 'atlas.identity.pendingInvitation';
  const $ = (selector) => document.querySelector(selector);

  const elements = {
    authNotice: $('#invite-auth-notice'),
    pendingSection: $('#pending-invite-section'),
    pendingAccept: $('#pending-invite-accept'),
    invitationAdmin: $('#invitation-admin'),
    invitationRefresh: $('#invitation-refresh'),
    invitationForm: $('#invitation-form'),
    invitationEmail: $('#invitation-email'),
    invitationRole: $('#invitation-role'),
    invitationAdminRole: $('#invitation-admin-role'),
    invitationExpiry: $('#invitation-expiry'),
    invitationCreate: $('#invitation-create'),
    invitationResult: $('#invitation-result'),
    invitationLink: $('#invitation-link'),
    invitationCopy: $('#invitation-copy'),
    invitationList: $('#invitation-list'),
    message: $('#message')
  };

  let pendingToken = null;
  let activeOrgId = null;
  let loadingInvitations = false;

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, (character) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[character]));
  }

  function showMessage(text, isError = false) {
    if (!elements.message) return;
    elements.message.textContent = text;
    elements.message.classList.remove('hidden', 'error');
    if (isError) elements.message.classList.add('error');
  }

  function setBusy(busy) {
    [elements.pendingAccept, elements.invitationRefresh, elements.invitationCreate, elements.invitationCopy]
      .forEach((element) => {
        if (element) element.disabled = busy;
      });
    document.querySelectorAll('[data-invitation-revoke]').forEach((element) => {
      element.disabled = busy;
    });
  }

  function captureInvitationFromUrl() {
    const rawHash = window.location.hash.startsWith('#') ? window.location.hash.slice(1) : '';
    const params = new URLSearchParams(rawHash);
    const candidate = params.get('invite');

    if (candidate) {
      params.delete('invite');
      const nextHash = params.toString();
      const cleanUrl = `${window.location.pathname}${window.location.search}${nextHash ? `#${nextHash}` : ''}`;
      window.history.replaceState(null, document.title, cleanUrl);

      if (/^[a-f0-9]{64}$/i.test(candidate)) {
        window.sessionStorage.setItem(PENDING_INVITE_KEY, candidate);
      } else {
        window.sessionStorage.removeItem(PENDING_INVITE_KEY);
        showMessage('El enlace de invitación no tiene un token válido.', true);
      }
    }

    pendingToken = window.sessionStorage.getItem(PENDING_INVITE_KEY);
    elements.authNotice?.classList.toggle('hidden', !pendingToken);
    return pendingToken;
  }

  function updatePendingInviteUi(authenticated) {
    pendingToken = window.sessionStorage.getItem(PENDING_INVITE_KEY);
    elements.authNotice?.classList.toggle('hidden', !pendingToken || authenticated);
    elements.pendingSection?.classList.toggle('hidden', !pendingToken || !authenticated);
  }

  function formatDate(value) {
    if (!value) return '—';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '—';
    return new Intl.DateTimeFormat('es-US', {
      dateStyle: 'medium',
      timeStyle: 'short'
    }).format(date);
  }

  function buildInvitationLink(token) {
    const base = new URL(config.authRedirectUrl || window.location.href, window.location.href);
    base.hash = new URLSearchParams({ invite: token }).toString();
    return base.toString();
  }

  function renderInvitation(invitation, actorRole) {
    const status = invitation.status || 'pending';
    const canRevoke = status === 'pending' && !(actorRole === 'admin' && invitation.role === 'admin');

    return `<article class="invitation-card" data-invitation-id="${escapeHtml(invitation.id)}">
      <div class="invitation-head">
        <div>
          <strong>${escapeHtml(invitation.email)}</strong>
          <small>Rol: ${escapeHtml(invitation.role)} · expira ${escapeHtml(formatDate(invitation.expires_at))}</small>
        </div>
        <span class="invitation-status ${escapeHtml(status)}">${escapeHtml(status)}</span>
      </div>
      ${canRevoke ? `<div class="button-row"><button type="button" class="secondary" data-invitation-revoke="${escapeHtml(invitation.id)}">Revocar</button></div>` : ''}
    </article>`;
  }

  async function loadInvitations() {
    if (!identity || loadingInvitations) return;
    const current = identity.current();
    const org = current.activeOrganization;
    const actorRole = org ? identity.role(org.id) : null;
    const canManage = Boolean(org && ['owner', 'admin'].includes(actorRole) && identity.can('members.manage', org.id));

    activeOrgId = canManage ? org.id : null;
    elements.invitationAdmin?.classList.toggle('hidden', !canManage);
    if (!canManage) {
      if (elements.invitationList) elements.invitationList.innerHTML = '';
      return;
    }

    if (elements.invitationAdminRole) {
      const owner = actorRole === 'owner';
      elements.invitationAdminRole.hidden = !owner;
      elements.invitationAdminRole.disabled = !owner;
      if (!owner && elements.invitationRole?.value === 'admin') elements.invitationRole.value = 'staff';
    }

    loadingInvitations = true;
    if (elements.invitationList) {
      elements.invitationList.innerHTML = '<div class="invitation-card"><span>Cargando invitaciones…</span></div>';
    }

    try {
      const invitations = await identity.listInvitations(org.id);
      if (!invitations.length) {
        elements.invitationList.innerHTML = '<div class="invitation-card"><strong>No hay invitaciones registradas.</strong></div>';
        return;
      }
      elements.invitationList.innerHTML = invitations.slice(0, 50).map((item) => renderInvitation(item, actorRole)).join('');
    } catch (error) {
      elements.invitationList.innerHTML = '<div class="invitation-card"><strong>No se pudieron cargar las invitaciones.</strong></div>';
      showMessage(error?.message || 'No se pudieron cargar las invitaciones.', true);
    } finally {
      loadingInvitations = false;
    }
  }

  async function createInvitation(event) {
    event.preventDefault();
    if (!activeOrgId) return;
    setBusy(true);
    try {
      const result = await identity.createInvitation({
        orgId: activeOrgId,
        email: elements.invitationEmail.value.trim(),
        role: elements.invitationRole.value,
        expiresInHours: Number(elements.invitationExpiry.value || 168)
      });

      const link = buildInvitationLink(result.token);
      elements.invitationLink.value = link;
      elements.invitationResult.classList.remove('hidden');
      elements.invitationForm.reset();
      elements.invitationExpiry.value = '168';
      await loadInvitations();
      showMessage('Invitación creada. Comparte el enlace únicamente con la persona indicada.');
    } catch (error) {
      if (error?.name === 'AtlasIdentityMfaRequiredError') {
        showMessage('Crear una invitación requiere una sesión AAL2. Completa MFA y vuelve a intentarlo.', true);
      } else {
        showMessage(error?.message || 'No se pudo crear la invitación.', true);
      }
    } finally {
      setBusy(false);
    }
  }

  async function revokeInvitation(invitationId) {
    if (!activeOrgId || !invitationId) return;
    setBusy(true);
    try {
      await identity.revokeInvitation({ orgId: activeOrgId, invitationId });
      await loadInvitations();
      showMessage('Invitación revocada. El token anterior ya no puede crear una membresía.');
    } catch (error) {
      if (error?.name === 'AtlasIdentityMfaRequiredError') {
        showMessage('Revocar una invitación requiere una sesión AAL2.', true);
      } else {
        showMessage(error?.message || 'No se pudo revocar la invitación.', true);
      }
    } finally {
      setBusy(false);
    }
  }

  async function acceptPendingInvitation() {
    pendingToken = window.sessionStorage.getItem(PENDING_INVITE_KEY);
    if (!pendingToken) return;
    setBusy(true);
    try {
      const accepted = await identity.acceptInvitation(pendingToken);
      window.sessionStorage.removeItem(PENDING_INVITE_KEY);
      pendingToken = null;
      updatePendingInviteUi(true);
      showMessage(`Invitación aceptada. ATLAS agregó esta cuenta con rol ${accepted.role}.`);
    } catch (error) {
      showMessage(error?.message || 'No se pudo aceptar la invitación. Verifica que hayas iniciado sesión con el correo invitado.', true);
    } finally {
      setBusy(false);
    }
  }

  async function copyInvitationLink() {
    const value = elements.invitationLink?.value || '';
    if (!value) return;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(value);
      } else {
        elements.invitationLink.select();
        document.execCommand('copy');
      }
      showMessage('Enlace de invitación copiado.');
    } catch {
      elements.invitationLink.select();
      showMessage('Seleccioné el enlace para que puedas copiarlo manualmente.');
    }
  }

  function handleIdentityContext(event) {
    const context = event?.detail || identity?.current?.() || {};
    updatePendingInviteUi(Boolean(context.user_id));
    void loadInvitations();
  }

  captureInvitationFromUrl();
  updatePendingInviteUi(Boolean(identity?.current?.()?.user_id));

  elements.pendingAccept?.addEventListener('click', acceptPendingInvitation);
  elements.invitationForm?.addEventListener('submit', createInvitation);
  elements.invitationRefresh?.addEventListener('click', loadInvitations);
  elements.invitationCopy?.addEventListener('click', copyInvitationLink);
  elements.invitationList?.addEventListener('click', (event) => {
    const button = event.target.closest('[data-invitation-revoke]');
    if (button) revokeInvitation(button.dataset.invitationRevoke);
  });

  window.addEventListener('atlas:identity-context', handleIdentityContext);
  window.addEventListener('atlas:identity-organization-changed', handleIdentityContext);
  window.addEventListener('atlas:identity-members-changed', loadInvitations);
  window.addEventListener('atlas:identity-invitations-changed', loadInvitations);
  window.addEventListener('atlas:identity-context-cleared', () => {
    activeOrgId = null;
    elements.invitationAdmin?.classList.add('hidden');
    updatePendingInviteUi(false);
  });

  // The core auth controller may have resolved the session before this module loaded.
  // Hydrate from the current Identity context so UI state never depends on event timing.
  void loadInvitations();
})();
