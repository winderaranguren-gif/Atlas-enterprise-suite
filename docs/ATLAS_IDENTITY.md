# ATLAS Identity

ATLAS Identity is the canonical identity, authentication-context, and authorization layer for ATLAS Enterprise Suite. Supabase Auth remains the credential/session boundary; ATLAS Identity adds multi-organization context, effective permissions, MFA assurance, member administration, invitations, auditing, and optional Authentik federation.

## Non-negotiable rules

- One ATLAS application session; no parallel password database.
- Server-side RLS/RPC authorization remains authoritative.
- Sensitive Identity writes require AAL2 in PostgreSQL, not merely in the UI.
- No service-role keys, database passwords, OAuth client secrets, or Authentik secrets in browser/static assets.
- Direct authenticated writes to permission overrides, organization memberships, and invitations are revoked where guarded RPCs are used.
- Auth/Identity web assets are network-only/no-store and are excluded from service-worker runtime caching.

## Migration chain

1. `202608082250_atlas_identity_foundation.sql` — permission catalog, role defaults, overrides, security events, context/permission RPCs.
2. `202608082251_atlas_identity_audit_hardening.sql` — removes direct permission-override mutations.
3. `202608082252_atlas_identity_invoker_hardening.sql` — read helpers become `SECURITY INVOKER`.
4. `202608082253_atlas_identity_indexes.sql` — Identity relationship/security-event indexes.
5. `202608082254_atlas_identity_mfa_stepup.sql` — AAL2 requirement for permission changes.
6. `202608082255_atlas_identity_member_admin.sql` — member list/role/status RPCs; removes direct membership writes.
7. `202608082256_atlas_identity_hierarchy_locking.sql` — effective-permission checks, owner/admin hierarchy, last-owner invariant, organization transaction locks.
8. `202608082257_atlas_identity_member_indexes.sql` — membership lookup/hierarchy indexes.
9. `202608082258_atlas_identity_invitations.sql` — hashed one-time invitation lifecycle.
10. `202608082259_atlas_identity_invitation_confirmation.sql` — confirmed-email binding before invitation acceptance.
11. `202608082300_atlas_identity_invitation_indexes.sql` — invitation actor indexes.
12. `202608082301_atlas_identity_invitation_rls.sql` — explicit deny-all direct RLS policy and documentation of guarded `SECURITY DEFINER` invitation RPCs.

All twelve Identity schema changes are represented in the branch and have corresponding deployed changes in Supabase project `ggmanzcgtlrvqfoccgsh` (`atlas-core`).

## Browser APIs

`atlas-identity.js` exposes the shared `window.ATLAS_IDENTITY` API for:

- session/context: `connect`, `init`, `clear`, `refresh`, `current`, `organizations`, `setActiveOrganization`;
- authorization: `can`, `require`, `role`, `enabledModules`, `setRolePermission`;
- members: `listMembers`, `setMemberRole`, `setMemberStatus`;
- invitations: `listInvitations`, `createInvitation`, `revokeInvitation`, `acceptInvitation`;
- MFA: `getAuthenticatorAssuranceLevel`, `listFactors`, `getMfaState`, `enrollTotp`, `challengeAndVerifyFactor`, `unenrollFactor`, `requireAal2`;
- federation: `signInWithProvider`.

`atlas-identity-invitations.js` handles invitation-link UX separately from the main login/MFA controller.

## MFA / AAL2

The account screen supports TOTP enrollment and step-up. Client-side AAL checks improve UX, while PostgreSQL independently checks the JWT assurance level for permission changes, membership role/status changes, and invitation creation/revocation.

## Member hierarchy

Member administration requires an authenticated active owner/admin, the effective `members.manage` permission, and AAL2 for mutations. Admins cannot alter owners/admins or promote users into those tiers. Organization-scoped advisory locks protect the requirement that at least one active owner remains.

Permission-policy mutations likewise require effective `identity.manage` plus AAL2. Admins cannot modify owner/admin policy, and the owner role cannot be denied `identity.manage`.

## Secure invitations

Invitation creation is limited to `admin`, `accountant`, `manager`, `staff`, and `viewer`; `owner` is deliberately excluded. An admin cannot issue an admin invitation.

The database generates 32 cryptographically random bytes, returns the raw token once, and stores only its SHA-256 hash. The browser constructs a link with the token in the URL fragment, immediately transfers it to `sessionStorage`, and removes it from browser-visible history. The token is not written to `localStorage`.

Acceptance requires an authenticated account whose `auth.users.email` exactly matches the invitation and whose `email_confirmed_at` is present. The invitation must still be pending/unexpired, the organization active, and the account must not already have a membership. Acceptance and membership creation occur in one transaction.

Direct table access to `identity_invitations` is revoked and an explicit deny-all RLS policy exists for `anon` and `authenticated`. Creation/list/revocation/acceptance use narrowly scoped guarded RPCs. Their `SECURITY DEFINER` status is intentional and documented because the underlying tables/Auth records are not exposed directly.

The current UI generates and copies invitation links. Automatic outbound email delivery is not yet implemented.

## Authentik federation

Authentik remains optional and acts only as an external OIDC identity provider through Supabase. The browser provider identifier remains `custom:authentik`, with federation disabled until the provider is configured and exercised end-to-end. Authentik Client ID/Client Secret values belong only in private Supabase Auth provider configuration.

## Secure delivery

`scripts/build-cloudflare.js` requires the Identity assets to exist in the build and emits `Cache-Control: no-store` for authentication/configuration assets.

`service-worker.js` defines `IDENTITY_NETWORK_ONLY` for `cloud-auth`, `atlas-config`, Identity clients, and private-beta recovery assets. Those requests are fetched with `cache: 'no-store'` and are never satisfied by runtime cache.

`scripts/validate-identity-package.js` validates the Identity schema/client contract. `scripts/validate-identity-delivery.js` validates invitation delivery, deny-all RLS representation, Cloudflare no-store headers, and service-worker network-only behavior. Both are wired into `npm run validate`.

## Current verified backend properties

- 19 canonical permissions and 76 initial role-to-permission assignments.
- Direct authenticated writes to permission overrides and memberships are revoked.
- Direct `anon`/`authenticated` invitation-table access is revoked and deny-all RLS is explicit.
- Sensitive Identity mutation RPCs require AAL2 where appropriate.
- Owner/admin hierarchy and last-active-owner controls are server-side.
- Secure invitation create/list/revoke/accept RPCs are deployed.
- Invitation acceptance is bound to a confirmed matching email.
- Identity/member/invitation relationship indexes are deployed.

## Remaining production gates

- Exercise TOTP enrollment, step-up, factor removal, and recovery using real authenticated accounts.
- Test owner/admin/staff/viewer isolation across at least two organizations.
- Test invitation creation, revocation, wrong-email rejection, expiration, and confirmed-email acceptance end-to-end.
- Add automatic invitation email delivery if desired.
- Add an Identity security-event/history UI.
- Configure and test Authentik + Supabase `custom:authentik` before enabling SSO.
- Progressively migrate high-value module RLS policies to explicit Identity permissions.
- Restore healthy CI/release execution before production merge.
