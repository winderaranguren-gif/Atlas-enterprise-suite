# ATLAS Identity

ATLAS Identity is the central identity and authorization layer for the ATLAS ecosystem.

It is intentionally built on top of Supabase Auth instead of creating a second password or session system. Supabase remains responsible for credential handling, session refresh, password recovery, OAuth/OIDC providers, and MFA primitives. ATLAS Identity adds organization context, roles, effective permissions, module visibility, policy overrides, and auditable authorization changes.

## Design goals

- One authenticated identity across ATLAS modules.
- Multi-organization isolation.
- Explicit permissions instead of scattered role checks in the UI.
- Backward compatibility with the existing `organization_members.role` model.
- No service-role keys, database passwords, or administrative secrets in browser code.
- Audited permission overrides.
- A reusable browser API that every ATLAS module can consume.

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

- `init(supabaseClient)`
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

The active organization is persisted locally only as a UI preference. Authorization still comes from the database on every protected operation through RLS/RPC rules.

## Initial permission catalog

The first catalog covers Core, organization administration, members, modules, Accounting, CRM, Inventory, HR, Documents, Audit, Identity administration, and security-event visibility.

This is deliberately additive. Existing RLS policies continue to protect current ATLAS data while modules are progressively migrated from broad role checks to `has_identity_permission(...)`.

## Authentik-inspired concepts

ATLAS Identity adopts mature IAM patterns such as centralized identity context, federation-ready sign-in, role-to-permission mapping, policy overrides, assurance levels, and security-event visibility. It does not copy Authentik source code and does not introduce Authentik as a runtime dependency.

## Activation

1. Apply all existing Supabase migrations in order.
2. Apply `202608082250_atlas_identity_foundation.sql`.
3. Apply `202608082251_atlas_identity_audit_hardening.sql`.
4. Deploy `atlas-identity.js` with `cloud-auth.html` and `cloud-auth.js`.
5. Sign in with a real test account.
6. Verify that the account page lists authorized organizations, role, permission count, and enabled module count.
7. Test at least owner, staff, and viewer accounts in separate organizations before attaching additional production modules.

## Next production steps

- Add an ATLAS Identity administration screen for membership and role management.
- Add MFA enrollment and step-up authentication for high-risk actions.
- Migrate module RLS policies to explicit permission checks where appropriate.
- Add invitation lifecycle and account suspension workflows.
- Add OIDC/SAML enterprise federation through supported identity providers.
- Add automated authorization tests for cross-organization isolation and permission denial cases.
