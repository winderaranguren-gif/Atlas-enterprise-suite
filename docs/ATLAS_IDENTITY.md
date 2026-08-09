# ATLAS Identity

ATLAS Identity is the central identity and authorization layer for the ATLAS ecosystem.

It is intentionally built on top of Supabase Auth instead of creating a second password or session system. Supabase remains responsible for credential handling, session refresh, password recovery, OAuth/OIDC providers, and MFA primitives. ATLAS Identity adds organization context, roles, effective permissions, module visibility, policy overrides, auditable authorization changes, and a federation boundary for external identity providers.

## Design goals

- One authenticated identity across ATLAS modules.
- Multi-organization isolation.
- Explicit permissions instead of scattered role checks in the UI.
- Backward compatibility with the existing `organization_members.role` model.
- No service-role keys, database passwords, OAuth client secrets, or administrative secrets in browser code.
- Audited permission overrides.
- A reusable browser API that every ATLAS module can consume.
- External IdPs must feed the same ATLAS/Supabase session boundary instead of creating parallel application sessions.

## Database layer

Migration `202608082250_atlas_identity_foundation.sql` adds:

- `identity_permissions`: canonical permission catalog.
- `identity_role_permissions`: default permissions for owner, admin, accountant, manager, staff, and viewer.
- `organization_role_permissions`: organization-specific allow/deny overrides.
- `identity_security_events`: immutable identity-policy change records from trusted RPCs.
- `has_identity_permission(org_id, permission)`: server-side authorization helper.
- `get_identity_context()`: returns the signed-in user's organizations, role, effective permissions, enabled modules, and current Authenticator Assurance Level.
- `set_identity_role_permission(...)`: owner/admin RPC for audited permission overrides.

Migration `202608082251_atlas_identity_audit_hardening.sql` removes direct browser mutation privileges from `organization_role_permissions`, forcing changes through the audited RPC.

## Browser API

`atlas-identity.js` exposes `window.ATLAS_IDENTITY`.

Core methods:

- `connect(supabaseClient)`
- `init(supabaseClient)`
- `clear()`
- `refresh()`
- `current()`
- `organizations()`
- `setActiveOrganization(orgId)`
- `can(permission, orgId)`
- `require(permission, orgId)`
- `role(orgId)`
- `enabledModules(orgId)`
- `setRolePermission(...)`
- `getAuthenticatorAssuranceLevel()`
- `signInWithProvider(provider, options)`

`connect()` attaches the existing Supabase client without requiring an authenticated session. This is what makes it possible to start an OAuth/OIDC redirect before the user has a session. `refresh()` is fail-closed and requires a valid authenticated session before resolving organizations and permissions.

The active organization is persisted locally only as a UI preference. Authorization still comes from the database on every protected operation through RLS/RPC rules. In-memory identity context is cleared on logout so one browser user cannot inherit another user's resolved organization data.

## Initial permission catalog

The first catalog covers Core, organization administration, members, modules, Accounting, CRM, Inventory, HR, Documents, Audit, Identity administration, and security-event visibility.

This is deliberately additive. Existing RLS policies continue to protect current ATLAS data while modules are progressively migrated from broad role checks to `has_identity_permission(...)`.

## Authentik federation

Authentik is treated as an optional federated Identity Provider, not as a second ATLAS session store.

Target flow:

1. The user opens `cloud-auth.html`.
2. ATLAS calls Supabase Auth with provider `custom:authentik`.
3. Supabase redirects the browser to the Authentik OAuth2/OIDC provider.
4. Authentik performs its authentication and authorization flow.
5. Authentik returns to the Supabase Auth callback.
6. Supabase creates/refreshes the ATLAS application session.
7. ATLAS Identity resolves `organization_members`, modules, permissions, and RLS under that same session.

This preserves one application session and avoids synchronizing passwords or maintaining duplicate refresh-token stores.

### Authentik provider requirements

Create an OAuth2/OpenID Connect provider and associated application in Authentik. Use a signing key so tokens are asymmetrically signed and expose the provider's OIDC discovery/JWKS endpoints. Prefer the per-provider issuer mode.

The issuer follows the provider/application slug, for example:

```text
https://identity.example.com/application/o/atlas/
```

The corresponding discovery document is:

```text
https://identity.example.com/application/o/atlas/.well-known/openid-configuration
```

Configure the redirect URI in Authentik to the callback URL shown by Supabase when the custom provider is created. Do not invent or hard-code that callback URL in this repository.

### Supabase provider requirements

In Supabase Auth Providers, create a Custom OAuth/OIDC provider using auto-discovery:

```text
Identifier: custom:authentik
Issuer:     https://identity.example.com/application/o/atlas/
```

Store the Authentik Client ID and Client Secret in the Supabase provider configuration. They must never be placed in `atlas-config.js`, HTML, JavaScript bundles, Cloudflare static assets, or GitHub.

After the provider is successfully configured and tested, enable the public UI switch:

```js
federatedIdentity: {
  enabled: true,
  provider: 'custom:authentik',
  label: 'Continuar con ATLAS Identity SSO',
  scopes: 'openid profile email'
}
```

`enabled` remains `false` in source control until the provider exists in the controlled Supabase project. This prevents a visible SSO button from pointing to an unconfigured provider.

## What happens to a separate `atlas-identity` repository

A separate identity repository must not own a second user/password/session database for ATLAS Enterprise Suite. Its valid roles are limited to specialized identity surfaces such as:

- administration UI for identity policy;
- Authentik deployment/configuration assets;
- OIDC/SAML federation adapters;
- identity observability and audit tooling;
- shared SDK/package code consumed by ATLAS modules.

The canonical authorization contract remains the ATLAS Identity context and server-side permission/RLS model in the main ATLAS platform.

## Activation

1. Apply all existing Supabase migrations in order.
2. Apply `202608082250_atlas_identity_foundation.sql`.
3. Apply `202608082251_atlas_identity_audit_hardening.sql`.
4. Deploy `atlas-identity.js` with `cloud-auth.html` and `cloud-auth.js`.
5. Sign in with a real test account using the existing Supabase method.
6. Verify that the account page lists authorized organizations, role, permission count, and enabled module count.
7. Configure the optional Authentik custom OIDC provider in Authentik and Supabase.
8. Test Authentik sign-in while `federatedIdentity.enabled` is still false by invoking the provider only in a controlled test surface.
9. Confirm the returned user receives a normal Supabase session and the correct ATLAS organization context.
10. Set `federatedIdentity.enabled` to true only after the complete redirect/logout/refresh flow succeeds.
11. Test at least owner, staff, and viewer accounts in separate organizations before attaching additional production modules.

## Next production steps

- Add an ATLAS Identity administration screen for membership and role management.
- Add MFA enrollment and step-up authentication for high-risk actions.
- Migrate module RLS policies to explicit permission checks where appropriate.
- Add invitation lifecycle and account suspension workflows.
- Validate Authentik login, refresh, logout, issuer, JWKS rotation, and disabled-user behavior end-to-end.
- Add automated authorization tests for cross-organization isolation and permission denial cases.
