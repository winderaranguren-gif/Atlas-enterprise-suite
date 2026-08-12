import { json, health } from '../../../platform/runtime/health.js';
import { publicRuntimeMeta } from '../../../platform/runtime/meta.js';
import { connectivityRoutes } from '../../connectivity/routes.js';
import { authRoutes, sessionRoutes } from '../../auth/src/routes.js';
import { identityRoutes } from '../../identity/src/routes.js';
import { intelligenceRoutes } from '../../intelligence/routes.js';
import { crmRoutes } from '../../crm/routes.js';
import { documentRoutes } from '../../documents/routes.js';
import { accountingRoutes } from '../../accounting/routes.js';
import { analyticsRoutes } from '../../analytics/routes.js';
import { backupRecoveryRoutes } from '../../backup-recovery/src/routes.js';
import { liveCommerceRoutes } from '../../live-commerce/routes.js';
import { securityEmergencyRoutes } from '../../security-emergency/routes.js';

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
  ['backup-recovery', backupRecoveryRoutes],
  ['live-commerce', liveCommerceRoutes],
  ['security-emergency', securityEmergencyRoutes]
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
