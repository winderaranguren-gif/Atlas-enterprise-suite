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

  async function requireSession() {
    if (!client) throw new Error('ATLAS Identity has not been connected.');
    const { data, error } = await client.auth.getSession();
    if (error) throw error;
    if (!data?.session?.user) throw new Error('ATLAS Identity requires an authenticated session.');
    return data.session;
  }

  async function refresh() {
    await requireSession();

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

  async function getAuthenticatorAssuranceLevel() {
    await requireSession();
    if (!client?.auth?.mfa?.getAuthenticatorAssuranceLevel) {
      return { currentLevel: context?.aal || 'aal1', nextLevel: context?.aal || 'aal1' };
    }

    const { data, error } = await client.auth.mfa.getAuthenticatorAssuranceLevel();
    if (error) throw error;
    return data;
  }

  async function listFactors() {
    await requireSession();
    const { data, error } = await client.auth.mfa.listFactors();
    if (error) throw error;
    return {
      all: Array.isArray(data?.all) ? data.all : [],
      totp: Array.isArray(data?.totp) ? data.totp : [],
      phone: Array.isArray(data?.phone) ? data.phone : []
    };
  }

  async function getMfaState() {
    const [assurance, factors] = await Promise.all([
      getAuthenticatorAssuranceLevel(),
      listFactors()
    ]);

    return {
      ...assurance,
      factors,
      requiresStepUp: assurance.currentLevel === 'aal1' && assurance.nextLevel === 'aal2',
      verified: assurance.currentLevel === 'aal2'
    };
  }

  async function enrollTotp(friendlyName = 'ATLAS Authenticator') {
    await requireSession();
    const { data, error } = await client.auth.mfa.enroll({
      factorType: 'totp',
      friendlyName
    });
    if (error) throw error;

    return {
      factorId: data.id,
      type: data.type,
      friendlyName: data.friendly_name || friendlyName,
      qrCode: data.totp?.qr_code || '',
      secret: data.totp?.secret || '',
      uri: data.totp?.uri || ''
    };
  }

  async function challengeAndVerifyFactor({ factorId, code }) {
    await requireSession();
    if (!factorId) throw new Error('An MFA factor is required.');
    if (!code || !String(code).trim()) throw new Error('Enter the verification code.');

    if (client.auth.mfa.challengeAndVerify) {
      const { data, error } = await client.auth.mfa.challengeAndVerify({
        factorId,
        code: String(code).trim()
      });
      if (error) throw error;
      await refresh();
      return data;
    }

    const challenge = await client.auth.mfa.challenge({ factorId });
    if (challenge.error) throw challenge.error;

    const verification = await client.auth.mfa.verify({
      factorId,
      challengeId: challenge.data.id,
      code: String(code).trim()
    });
    if (verification.error) throw verification.error;
    await refresh();
    return verification.data;
  }

  async function unenrollFactor(factorId) {
    await requireSession();
    if (!factorId) throw new Error('An MFA factor is required.');
    const assurance = await getAuthenticatorAssuranceLevel();
    if (assurance.currentLevel !== 'aal2') {
      const error = new Error('ATLAS Identity requires MFA step-up before removing a verified factor.');
      error.name = 'AtlasIdentityMfaRequiredError';
      throw error;
    }

    const { data, error } = await client.auth.mfa.unenroll({ factorId });
    if (error) throw error;
    return data;
  }

  async function requireAal2() {
    const assurance = await getAuthenticatorAssuranceLevel();
    if (assurance.currentLevel !== 'aal2') {
      const error = new Error('ATLAS Identity requires MFA step-up (AAL2) for this action.');
      error.name = 'AtlasIdentityMfaRequiredError';
      error.assurance = assurance;
      throw error;
    }
    return assurance;
  }

  async function setRolePermission({ orgId = activeOrganizationId, role: targetRole, permission, allowed }) {
    requirePermission('identity.manage', orgId);
    await requireAal2();
    const { error } = await client.rpc('set_identity_role_permission', {
      organization_id: orgId,
      target_role: targetRole,
      target_permission: permission,
      allow_permission: Boolean(allowed)
    });
    if (error) throw error;
    return refresh();
  }

  async function listMembers(orgId = activeOrganizationId) {
    requirePermission('members.read', orgId);
    const { data, error } = await client.rpc('list_identity_members', {
      organization_id: orgId
    });
    if (error) throw error;
    return Array.isArray(data) ? data : [];
  }

  async function setMemberRole({ orgId = activeOrganizationId, userId, role: targetRole }) {
    requirePermission('members.manage', orgId);
    await requireAal2();
    if (!userId) throw new Error('A target member is required.');
    const { error } = await client.rpc('set_identity_member_role', {
      organization_id: orgId,
      target_user_id: userId,
      target_role: targetRole
    });
    if (error) throw error;
    const nextContext = await refresh();
    emit('atlas:identity-members-changed', { orgId, userId, action: 'role' });
    return nextContext;
  }

  async function setMemberStatus({ orgId = activeOrganizationId, userId, status }) {
    requirePermission('members.manage', orgId);
    await requireAal2();
    if (!userId) throw new Error('A target member is required.');
    const { error } = await client.rpc('set_identity_member_status', {
      organization_id: orgId,
      target_user_id: userId,
      target_status: status
    });
    if (error) throw error;
    const nextContext = await refresh();
    emit('atlas:identity-members-changed', { orgId, userId, action: 'status' });
    return nextContext;
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
    listMembers,
    setMemberRole,
    setMemberStatus,
    getAuthenticatorAssuranceLevel,
    listFactors,
    getMfaState,
    enrollTotp,
    challengeAndVerifyFactor,
    unenrollFactor,
    requireAal2,
    signInWithProvider
  });
})();
