# ATLAS Identity

ATLAS Identity is the central identity, authentication-context, and authorization layer for the ATLAS ecosystem.

Supabase Auth remains the application credential/session boundary. ATLAS Identity adds organization context, roles, effective permissions, module visibility, MFA assurance, member administration, policy overrides, security-event auditing, and an optional federation boundary for external identity providers such as Authentik.

## Core rules

- One authenticated application session across ATLAS modules.
- No duplicate ATLAS password store.
- Multi-organization isolation remains enforced by database RLS/RPC rules.
- Browser visibility is not authorization; sensitive decisions are checked again in PostgreSQL.
- No service-role key, database password, OAuth client secret, or other privileged secret may be shipped in static/browser code.
- Direct writes to Identity policy and membership tables are removed where an audited privileged RPC is required.
- High-risk Identity mutations require AAL2 in the backend.

## Database migrations

The Identity migration chain is:

1. `202608082250_atlas_identity_foundation.sql`
   - canonical permission catalog;
   - role-to-permission defaults;
   - organization-specific permission overrides;
   - Identity security events;
   - `has_identity_permission(...)`;
   - `get_identity_context()`;
   - audited role-permission mutation RPC.

2. `202608082251_atlas_identity_audit_hardening.sql`
   - removes direct authenticated writes to organization permission overrides.

3. `202608082252_atlas_identity_invoker_hardening.sql`
   - changes read-only Identity context/permission helpers to `SECURITY INVOKER`.

4. `202608082253_atlas_identity_indexes.sql`
   - indexes Identity foreign keys and security-event lookup paths.

5. `202608082254_atlas_identity_mfa_stepup.sql`
   - requires `aal2` for permission-policy changes at the database boundary;
   - records the assurance level in the security audit event.

6. `202608082255_atlas_identity_member_admin.sql`
   - adds member listing, role-change, and status-change RPCs;
   - removes the old direct `member_manage` write policy;
   - revokes authenticated INSERT/UPDATE/DELETE on `organization_members`;
   - preserves member reads through controlled RLS/RPC access.

7. `202608082256_atlas_identity_hierarchy_locking.sql`
   - enforces effective `identity.manage` and `members.manage` inside privileged RPCs;
   - prevents admins from managing owner/admin hierarchy;
   - prevents denying `identity.manage` to the owner role;
   - serializes owner-sensitive mutations per organization with a transaction advisory lock;
   - protects the invariant that every organization retains at least one active owner.

8. `202608082257_atlas_identity_member_indexes.sql`
   - indexes `organization_members(user_id)` for authenticated identity-context resolution;
   - indexes `(org_id, role, status)` for owner/hierarchy checks.

## Browser API

`atlas-identity.js` exposes `window.ATLAS_IDENTITY`.

Identity/context methods:

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

Policy methods:

- `setRolePermission(...)`

Member methods:

- `listMembers(orgId)`
- `setMemberRole(...)`
- `setMemberStatus(...)`

MFA methods:

- `getAuthenticatorAssuranceLevel()`
- `listFactors()`
- `getMfaState()`
- `enrollTotp(friendlyName)`
- `challengeAndVerifyFactor(...)`
- `unenrollFactor(factorId)`
- `requireAal2()`

Federation method:

- `signInWithProvider(provider, options)`

The active organization stored in local storage is only a UI preference. It does not grant authorization. Server-side RLS/RPC checks remain authoritative.

## MFA and step-up

The `cloud-auth` surface can enroll a TOTP authenticator, display the QR/manual secret during enrollment, verify the factor, detect AAL1/AAL2 state, and request a step-up code when a verified factor exists.

Client-side `requireAal2()` improves UX, but it is not the security boundary. Permission changes and member role/status changes independently inspect the JWT assurance level in PostgreSQL and reject non-AAL2 sessions.

Removing a verified factor is supported by the Identity client API and requires an AAL2 session. A dedicated factor-management UI beyond enrollment/step-up can be added later.

## Member administration

The ATLAS Identity account screen now supports an active organization context and a dynamic member-administration panel.

A user with `members.read` can list organization members. The member list intentionally exposes the public profile name, user identifier, role, status, and membership timestamps; it does not expose `auth.users.email` through the member-list RPC.

Role and status mutations require all of the following:

- authenticated ATLAS session;
- AAL2;
- active owner/admin membership;
- effective `members.manage` permission;
- hierarchy rules enforced server-side.

An admin cannot change the role/status of an owner or admin and cannot promote another member to owner/admin. Owner-sensitive operations are serialized per organization to prevent concurrent changes from removing the last active owner.

## Permission administration

`set_identity_role_permission(...)` is the audited write boundary for organization permission overrides.

It requires:

- AAL2;
- active owner/admin membership;
- effective `identity.manage` permission.

An admin cannot modify owner/admin permission policy. The owner role cannot be denied `identity.manage`, preventing an organization from accidentally removing its final Identity administration path.

## SECURITY DEFINER boundary

Supabase's database advisor warns whenever signed-in users may execute a `SECURITY DEFINER` function. For ATLAS Identity, the remaining privileged functions are intentional narrow API boundaries because direct table mutation privileges are revoked and each function performs explicit authorization checks.

`list_identity_members(...)` also remains a controlled definer RPC so authorized organization members can obtain the limited public member projection without exposing private Auth records.

These warnings must still be reviewed whenever a privileged RPC changes; they are not to be dismissed globally.

## Authentik federation

Authentik is optional and is treated as a federated Identity Provider, not as a second ATLAS session store.

Target flow:

1. ATLAS starts OAuth/OIDC through Supabase using provider `custom:authentik`.
2. Supabase redirects to the Authentik OAuth2/OIDC provider.
3. Authentik authenticates the user.
4. Authentik returns to the Supabase callback.
5. Supabase creates/refreshes the ATLAS application session.
6. ATLAS Identity resolves the same organizations, permissions, modules, AAL, and RLS context.

The browser configuration currently keeps federation disabled:

```js
federatedIdentity: {
  enabled: false,
  provider: 'custom:authentik',
  label: 'Continuar con ATLAS Identity SSO',
  scopes: 'openid profile email'
}
```

The Authentik Client ID/Client Secret belong in the private Supabase Auth provider configuration and must never be committed to this repository.

## Separate identity repository rule

A separate identity repository must not own a parallel ATLAS user/password/session database. It may contain specialized administration UI, Authentik deployment/configuration, federation adapters, observability/audit tooling, or shared SDK/package code, but the canonical authorization contract is ATLAS Identity in the main platform.

## Current deployed state

All eight Identity migrations listed above are applied to Supabase project `ggmanzcgtlrvqfoccgsh` (`atlas-core`).

Verified backend properties include:

- 19 canonical permissions and 76 initial role-to-permission assignments;
- Identity permission overrides and security-event tables present;
- direct authenticated writes to permission overrides revoked;
- direct authenticated INSERT/UPDATE/DELETE on `organization_members` revoked;
- AAL2 backend guard active on sensitive Identity mutation RPCs;
- anonymous execution removed from the privileged Identity RPCs;
- member administration RPCs present;
- owner/admin hierarchy protection present;
- organization-scoped concurrency locking present;
- member lookup/hierarchy indexes applied.

## Remaining production gates

- Exercise TOTP enrollment, step-up, factor removal, and recovery with real authenticated test accounts.
- Test owner/admin/staff/viewer behavior across at least two organizations and verify cross-organization denial cases.
- Add invitation lifecycle for users who do not yet have an organization membership.
- Add an Identity security-event/history UI.
- Configure Authentik + Supabase `custom:authentik` and validate login, refresh, logout, disabled-user behavior, issuer, and JWKS rotation before enabling the SSO button.
- Progressively migrate high-value module RLS policies to explicit Identity permission checks.
- Require healthy repository CI/release checks before production merge.
