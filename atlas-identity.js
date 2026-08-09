(() => {
  'use strict';

  let client = null;
  let context = null;
  let activeOrganizationId = null;

  const ACTIVE_ORG_KEY = 'atlas.identity.activeOrganizationId';

  function emit(name, detail) {
    window.dispatchEvent(new CustomEvent(name, { detail }));
  }

  function connect(supabaseClient) {
    if (!supabaseClient) throw new Error('A Supabase client is required.');
    client = supabaseClient;
    return true;
  }

  function clear() {
    context = null;
    activeOrganizationId = null;
    emit('atlas:identity-context-cleared', { activeOrganizationId: null });
  }

  function getOrganization(orgId = activeOrganizationId) {
    const organizations = context?.organizations || [];
    return organizations.find((org) => org.id === orgId) || null;
  }

  function chooseActiveOrganization() {
    const organizations = context?.organizations || [];
    const stored = window.localStorage.getItem(ACTIVE_ORG_KEY);
    const storedExists = organizations.some((org) => org.id === stored);
    activeOrganizationId = storedExists ? stored : (organizations[0]?.id || null);

    if (activeOrganizationId) {
      window.localStorage.setItem(ACTIVE_ORG_KEY, activeOrganizationId);
    } else {
      window.localStorage.removeItem(ACTIVE_ORG_KEY);
    }
  }

  async function refresh() {
    if (!client) throw new Error('ATLAS Identity has not been connected.');

    const { data: sessionData, error: sessionError } = await client.auth.getSession();
    if (sessionError) throw sessionError;
    if (!sessionData?.session?.user) {
      clear();
      throw new Error('ATLAS Identity requires an authenticated session.');
    }

    const { data, error } = await client.rpc('get_identity_context');
    if (error) throw error;

    context = data || { organizations: [] };
    if (!Array.isArray(context.organizations)) context.organizations = [];
    chooseActiveOrganization();

    emit('atlas:identity-context', current());
    return current();
  }

  async function initialize(supabaseClient) {
    connect(supabaseClient);
    return refresh();
  }

  function current() {
    return {
      ...(context || { organizations: [] }),
      activeOrganizationId,
      activeOrganization: getOrganization()
    };
  }

  function organizations() {
    return [...(context?.organizations || [])];
  }

  function setActiveOrganization(orgId) {
    const organization = getOrganization(orgId);
    if (!organization) throw new Error('The selected organization is not available to this user.');

    activeOrganizationId = orgId;
    window.localStorage.setItem(ACTIVE_ORG_KEY, orgId);
    emit('atlas:identity-organization-changed', current());
    return organization;
  }

  function can(permission, orgId = activeOrganizationId) {
    if (!permission) return false;
    const organization = getOrganization(orgId);
    return Boolean(organization?.permissions?.includes(permission));
  }

  function requirePermission(permission, orgId = activeOrganizationId) {
    if (!can(permission, orgId)) {
      const error = new Error(`ATLAS Identity denied permission: ${permission}`);
      error.name = 'AtlasIdentityPermissionError';
      throw error;
    }
    return true;
  }

  function role(orgId = activeOrganizationId) {
    return getOrganization(orgId)?.role || null;
  }

  function enabledModules(orgId = activeOrganizationId) {
    return [...(getOrganization(orgId)?.modules || [])];
  }

  async function setRolePermission({ orgId = activeOrganizationId, role: targetRole, permission, allowed }) {
    requirePermission('identity.manage', orgId);
    const { error } = await client.rpc('set_identity_role_permission', {
      organization_id: orgId,
      target_role: targetRole,
      target_permission: permission,
      allow_permission: Boolean(allowed)
    });
    if (error) throw error;
    return refresh();
  }

  async function getAuthenticatorAssuranceLevel() {
    if (!client?.auth?.mfa?.getAuthenticatorAssuranceLevel) {
      return { currentLevel: context?.aal || 'aal1', nextLevel: context?.aal || 'aal1' };
    }

    const { data, error } = await client.auth.mfa.getAuthenticatorAssuranceLevel();
    if (error) throw error;
    return data;
  }

  async function signInWithProvider(provider, options = {}) {
    if (!client) throw new Error('ATLAS Identity has not been connected.');
    if (!provider || typeof provider !== 'string') throw new Error('A federated identity provider is required.');

    const redirectTo = window.ATLAS_CONFIG?.authRedirectUrl || window.location.href;
    const { data, error } = await client.auth.signInWithOAuth({
      provider,
      options: { redirectTo, ...options }
    });
    if (error) throw error;
    return data;
  }

  window.ATLAS_IDENTITY = Object.freeze({
    connect,
    init: initialize,
    clear,
    refresh,
    current,
    organizations,
    setActiveOrganization,
    can,
    require: requirePermission,
    role,
    enabledModules,
    setRolePermission,
    getAuthenticatorAssuranceLevel,
    signInWithProvider
  });
})();
