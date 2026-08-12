import { json, health } from '../../../platform/runtime/health.js';
import { publicRuntimeMeta } from '../../../platform/runtime/meta.js';
import { connectivityRoutes } from '../../connectivity/routes.js';
import { authRoutes } from '../../identity/auth-routes.js';
import { sessionRoutes } from '../../identity/session-routes.js';
import { identityRoutes } from '../../identity/routes.js';
import { intelligenceRoutes } from '../../intelligence/routes.js';
import { crmRoutes } from '../../crm/routes.js';
import { documentRoutes } from '../../documents/routes.js';
import { accountingRoutes } from '../../accounting/routes.js';
import { analyticsRoutes } from '../../analytics/routes.js';
import { backupRoutes } from '../../backups/routes.js';

export const API_ROUTE_CATALOG = Object.freeze([
  ['connectivity', connectivityRoutes],
  ['auth', authRoutes],
  ['session', sessionRoutes],
  ['identity', identityRoutes],
  ['intelligence', intelligenceRoutes],
  ['crm', crmRoutes],
  ['documents', documentRoutes],
  ['accounting', accountingRoutes],
  ['analytics', analyticsRoutes],
  ['backup-recovery', backupRoutes]
]);

export async function dispatchApi(request, env, url = new URL(request.url)) {
  if (url.pathname === '/api/health') return json(await health(env));
  if (url.pathname === '/api/meta') return json(publicRuntimeMeta(env));

  for (const [, handler] of API_ROUTE_CATALOG) {
    const response = await handler(request, env, url);
    if (response) return response;
  }

  if (url.pathname.startsWith('/api/')) {
    return json({ ok: false, error: 'not_implemented' }, 501);
  }

  return null;
}
