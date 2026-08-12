import { identityRoutes as legacyIdentityRoutes } from '../routes.js';

/**
 * ATLAS Identity modular runtime boundary.
 *
 * The API Gateway depends only on this module. During the Modular v2 migration,
 * the proven Users/Permissions/DBA/audit implementation remains behind a
 * compatibility adapter so commercial-pilot behavior is preserved while code
 * ownership moves into the modular boundary.
 */
export async function identityRoutes(request, env, url = new URL(request.url)) {
  return legacyIdentityRoutes(request, env, url);
}

export const IDENTITY_RUNTIME_CONTRACT = Object.freeze({
  owner: 'identity',
  compatibilityAdapter: true,
  scope: Object.freeze(['organization_id', 'dba_id']),
  roles: Object.freeze(['owner', 'admin', 'auditor', 'member', 'viewer']),
  routes: Object.freeze([
    'POST /api/identity/bootstrap',
    'GET /api/auth/me',
    'GET /api/identity/dbas',
    'POST /api/identity/dbas',
    'POST /api/identity/users',
    'GET /api/identity/memberships',
    'POST /api/identity/memberships',
    'PATCH /api/identity/memberships/:id',
    'GET /api/audit-events'
  ]),
  invariants: Object.freeze([
    'organization-and-dba-scoped-memberships',
    'owner-grant-requires-owner',
    'last-active-owner-protected',
    'identity-actions-audited'
  ])
});
