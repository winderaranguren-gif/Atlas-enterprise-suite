(() => {
  'use strict';

  const identity = window.ATLAS_IDENTITY;
  const $ = (selector) => document.querySelector(selector);

  const elements = {
    section: $('#identity-audit-section'),
    org: $('#identity-audit-org'),
    refresh: $('#identity-audit-refresh'),
    list: $('#identity-audit-list'),
    message: $('#message')
  };

  let loading = false;

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

  function formatDate(value) {
    if (!value) return '—';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '—';
    return new Intl.DateTimeFormat('es-US', {
      dateStyle: 'medium',
      timeStyle: 'short'
    }).format(date);
  }

  function labelForEvent(eventType) {
    const labels = {
      role_permission_changed: 'Permiso de rol actualizado',
      member_role_changed: 'Rol de miembro actualizado',
      member_status_changed: 'Estado de miembro actualizado',
      member_invitation_created: 'Invitación creada',
      member_invitation_revoked: 'Invitación revocada',
      member_invitation_accepted: 'Invitación aceptada'
    };
    return labels[eventType] || String(eventType || 'Evento de seguridad').replaceAll('_', ' ');
  }

  function renderEvent(event) {
    const actor = event.actor_full_name || (event.actor_user_id ? `Usuario ${String(event.actor_user_id).slice(0, 8)}` : 'Sistema ATLAS');
    const metadata = JSON.stringify(event.metadata || {}, null, 2);

    return `<article class="audit-card">
      <div class="audit-head">
        <div>
          <strong>${escapeHtml(labelForEvent(event.event_type))}</strong>
          <small>${escapeHtml(actor)} · ${escapeHtml(formatDate(event.created_at))}</small>
        </div>
        <span class="audit-type">${escapeHtml(event.event_type || 'event')}</span>
      </div>
      <details class="audit-details">
        <summary>Ver detalles</summary>
        <pre>${escapeHtml(metadata)}</pre>
      </details>
    </article>`;
  }

  async function loadSecurityEvents() {
    if (!identity || loading) return;
    const context = identity.current();
    const org = context.activeOrganization;
    const allowed = Boolean(org && identity.can('security.events.read', org.id));

    elements.section?.classList.toggle('hidden', !allowed);
    if (!allowed) {
      if (elements.list) elements.list.innerHTML = '';
      return;
    }

    elements.org.textContent = org.name || 'Empresa activa';
    elements.list.innerHTML = '<div class="audit-card"><span>Cargando historial de seguridad…</span></div>';
    loading = true;
    if (elements.refresh) elements.refresh.disabled = true;

    try {
      const events = await identity.listSecurityEvents(org.id, 50);
      if (!events.length) {
        elements.list.innerHTML = '<div class="audit-card"><strong>Aún no hay eventos de Identity registrados.</strong></div>';
        return;
      }
      elements.list.innerHTML = events.map(renderEvent).join('');
    } catch (error) {
      elements.list.innerHTML = '<div class="audit-card"><strong>No se pudo cargar el historial.</strong></div>';
      showMessage(error?.message || 'No se pudo leer el historial de seguridad.', true);
    } finally {
      loading = false;
      if (elements.refresh) elements.refresh.disabled = false;
    }
  }

  elements.refresh?.addEventListener('click', loadSecurityEvents);

  [
    'atlas:identity-context',
    'atlas:identity-organization-changed',
    'atlas:identity-members-changed',
    'atlas:identity-invitations-changed',
    'atlas:identity-invitation-accepted'
  ].forEach((eventName) => window.addEventListener(eventName, loadSecurityEvents));

  window.addEventListener('atlas:identity-context-cleared', () => {
    elements.section?.classList.add('hidden');
    if (elements.list) elements.list.innerHTML = '';
  });
})();
