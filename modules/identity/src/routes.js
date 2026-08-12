// ATLAS Modular v2 Identity boundary.
// Keep the proven commercial-pilot implementation behind this adapter while
// ownership is migrated into the modular boundary without changing API contracts.
import { identityRoutes as legacyIdentityRoutes } from '../routes.js';

export async function identityRoutes(request, env, url) {
  return legacyIdentityRoutes(request, env, url);
}
