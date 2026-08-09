# ATLAS Identity

ATLAS Identity is the central identity, authentication-context, and authorization layer for the ATLAS ecosystem.

Supabase Auth remains the application credential/session boundary. ATLAS Identity adds organization context, roles, effective permissions, module visibility, MFA assurance, member administration, secure invitations, policy overrides, security-event auditing, and an optional federation boundary for external identity providers such as Authentik.

## Core rules

- One authenticated application session across ATLAS modules.
- No duplicate ATLAS password store.
- Multi-organization isolation remains enforced by database RLS/RPC rules.
- Browser visibility is not authorization; sensitive decisions are checked again in PostgreSQL.
- No service-role key, database password, OAuth client secret, or other privileged secret may be shipped in static/browser code.
- Direct writes to Identity policy, membership, and invitation tables are removed where audited RPC boundaries are required.
- High-risk Identity mutations require AAL2 in the backend.
- Authentication/Identity pages and JavaScript are network-only/no-store rather than service-worker runtime cached.

## Database migrations

The active Identity migration chain is:

1. `202608082250_atlas_identity_foundation.sql` — permission catalog, role defaults, organization overrides, security events, permission/context RPCs.
2. `202608082251_atlas_identity_audit_hardening.sql` — removes direct authenticated writes to permission overrides.
3. `202608082252_atlas_identity_invoker_hardening.sql` — changes read-only permission/context helpers to `SECURITY INVOKER`.
4. `202608082253_atlas_identity_indexes.sql` — indexes Identity foreign keys and security-event lookup paths.
5. `202608082254_atlas_identity_mfa_stepup.sql` — requires AAL2 for permission-policy changes and records assurance in audit events.
6. `202608082255_atlas_identity_member_admin.sql` — adds member list/role/status RPCs and removes direct authenticated membership writes.
7. `202608082256_atlas_identity_hierarchy_locking.sql` — enforces effective permissions, owner/admin hierarchy, last-owner protection, and organization-scoped transaction locks.
8. `202608082257_atlas_identity_member_indexes.sql` — indexes user-to-organization context and owner hierarchy lookups.
9. `202608082258_atlas_identity_invitations.sql` — creates the invitation store and create/list/revoke/accept RPC lifecycle with hashed one-time tokens.
10. `202608082259_atlas_identity_invitation_confirmation.sql` — requires a confirmed Auth email matching the invitation before acceptance.
11. `202608082300_atlas_identity_invitation_indexes.sql` — indexes invitation actor foreign keys.

All eleven migrations are represented in the repository. The corresponding Identity schema changes through invitation confirmation and invitation indexes have been applied to Supabase project `ggmanzcgtlrvqfoccgsh` (`atlas-core`).

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

Invitation methods:

- `listInvitations(orgId)`
- `createInvitation(...)`
- `revokeInvitation(...)`
- `acceptInvitation(token)`

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

Client-side `requireAal2()` improves UX, but it is not the security boundary. Permission changes, member role/status changes, and invitation creation/revocation independently inspect the JWT assurance level in PostgreSQL and reject non-AAL2 sessions.

Removing a verified factor is supported by the Identity client API and requires an AAL2 session. A dedicated factor-management UI beyond enrollment/step-up remains a later enhancement.

## Member administration

The ATLAS Identity account screen supports an active organization context and a dynamic member-administration panel.

A user with `members.read` can list organization members. The member projection intentionally exposes the public profile name, user identifier, role, status, and membership timestamps; it does not expose `auth.users.email` through the member-list RPC.

Role and status mutations require all of the following:

- authenticated ATLAS session;
- AAL2;
- active owner/admin membership;
- effective `members.manage` permission;
- hierarchy rules enforced server-side.

An admin cannot change the role/status of an owner or admin and cannot promote another member to owner/admin. Owner-sensitive operations are serialized per organization to prevent concurrent changes from removing the last active owner.

## Invitation lifecycle

ATLAS Identity now has a complete database and browser invitation lifecycle that does not require exposing an Auth administrative key to the browser.

Creation requirements:

- active owner/admin membership;
- effective `members.manage`;
- AAL2;
- target role limited to `admin`, `accountant`, `manager`, `staff`, or `viewer`;
- admins cannot create admin invitations;
- `owner` is deliberately excluded from automatic invitation roles.

Each invitation receives 32 random bytes encoded as a one-time token. The raw token is returned to the creator only so the browser can construct the invitation link. PostgreSQL stores only `SHA-256(token)` in `identity_invitations`.

The browser places the token in the URL fragment, captures it into `sessionStorage`, and removes it from the visible URL/history immediately. It is not persisted in `localStorage`.

Acceptance requires:

- an authenticated Supabase account;
- an unexpired, pending, non-revoked token;
- the account's `auth.users.email` to match the invited email;
- `email_confirmed_at` to be present;
- an active target organization;
- no existing membership for that account.

Acceptance creates the membership and consumes the invitation in one database transaction. Creation, revocation, and acceptance are recorded in `identity_security_events`.

The current UI generates/copies a secure invitation link. Automatic outbound email delivery is not implemented yet; that should be added as a separate delivery channel without moving privileged Auth credentials into the browser.

## Permission administration

`set_identity_role_permission(...)` is the audited write boundary for organization permission overrides.

It requires AAL2, active owner/admin membership, and effective `identity.manage`. An admin cannot modify owner/admin permission policy, and the owner role cannot be denied `identity.manage`.

## SECURITY DEFINER boundary

Supabase's database advisor warns whenever signed-in users may execute a `SECURITY DEFINER` function. ATLAS Identity intentionally retains narrowly scoped privileged RPCs where direct table privileges are revoked and explicit authorization is performed inside the function.

`list_identity_members(...)` and invitation-list operations return controlled projections rather than private Auth records. These warnings must still be reviewed whenever a privileged RPC changes; they are not globally ignored.

## Authentik federation

Authentik is optional and is treated as a federated Identity Provider, not as a second ATLAS session store.

Target flow:

1. ATLAS starts OAuth/OIDC through Supabase using provider `custom:authentik`.
2. Supabase redirects to the Authentik OAuth2/OIDC provider.
3. Authentik authenticates the user.
4. Authentik returns to the Supabase callback.
5. Supabase creates/refreshes the ATLAS application session.
6. ATLAS Identity resolves the same organizations, permissions, modules, AAL, and RLS context.

The browser configuration keeps federation disabled until the provider is configured and tested:

```js
federatedIdentity: {
  enabled: false,
  provider: 'custom:authentik',
  label: 'Continuar con ATLAS Identity SSO',
  scopes: 'openid profile email'
}
```

The Authentik Client ID/Client Secret belong in the private Supabase Auth provider configuration and must never be committed to this repository.

## Secure web delivery

`scripts/build-cloudflare.js` now requires the Identity assets to be present in the Cloudflare artifact and emits `Cache-Control: no-store` for the authentication/configuration JavaScript and CSS.

`service-worker.js` uses an explicit `IDENTITY_NETWORK_ONLY` boundary for `cloud-auth`, `atlas-config`, ATLAS Identity clients, and private-beta recovery surfaces. These requests use network-only fetches with `cache: 'no-store'`; they are not served from runtime cache.

`scripts/validate-identity-delivery.js` checks this delivery boundary and is included in `npm run validate`.

## Separate identity repository rule

A separate identity repository must not own a parallel ATLAS user/password/session database. It may contain specialized administration UI, Authentik deployment/configuration, federation adapters, observability/audit tooling, or shared SDK/package code, but the canonical authorization contract is ATLAS Identity in the main platform.

## Current deployed state

Verified backend properties include:

- 19 canonical permissions and 76 initial role-to-permission assignments;
- direct authenticated writes to permission overrides revoked;
- direct authenticated INSERT/UPDATE/DELETE on `organization_members` revoked;
- direct authenticated/anonymous table access to `identity_invitations` revoked;
- AAL2 backend guards on sensitive Identity mutations;
- anonymous execution removed from privileged Identity RPCs;
- owner/admin hierarchy and last-active-owner protection;
- organization-scoped concurrency locking;
- secure invitation creation/list/revocation/acceptance RPCs;
- confirmed-email binding on invitation acceptance;
- Identity/member/invitation relationship indexes applied.

## Remaining production gates

- Exercise TOTP enrollment, step-up, factor removal, and recovery with real authenticated test accounts.
- Test owner/admin/staff/viewer behavior across at least two organizations and verify cross-organization denial cases.
- Exercise invitation creation, revocation, wrong-email rejection, expired-token rejection, and successful confirmed-email acceptance with real accounts.
- Add automatic invitation email delivery if desired.
- Add an Identity security-event/history UI.
- Configure Authentik + Supabase `custom:authentik` and validate login, refresh, logout, disabled-user behavior, issuer, and JWKS rotation before enabling the SSO button.
- Progressively migrate high-value module RLS policies to explicit Identity permission checks.
- Require healthy repository CI/release checks before production merge.
