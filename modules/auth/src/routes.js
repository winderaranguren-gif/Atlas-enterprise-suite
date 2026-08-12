import { authRoutes as legacyAuthRoutes } from '../../identity/auth-routes.js';
import { sessionRoutes as legacySessionRoutes } from '../../identity/session-routes.js';

/**
 * ATLAS Auth modular runtime boundary.
 *
 * The API Gateway depends only on this module. During the Modular v2 migration,
 * the proven Identity auth/session implementations remain behind compatibility
 * adapters so production behavior is preserved while ownership moves here.
 */
export async function authRoutes(request, env, url = new URL(request.url)) {
  return legacyAuthRoutes(request, env, url);
}

export async function sessionRoutes(request, env, url = new URL(request.url)) {
  return legacySessionRoutes(request, env, url);
}

export const AUTH_RUNTIME_CONTRACT = Object.freeze({
  owner: 'auth',
  compatibilityAdapter: true,
  routes: Object.freeze([
    'POST /api/auth/setup-token',
    'POST /api/auth/activate',
    'POST /api/auth/login',
    'POST /api/auth/logout',
    'GET /api/auth/session'
  ])
});
