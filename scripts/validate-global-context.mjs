import { globalContextRoutes, resolveGlobalContext } from '../modules/global-context.js';

function assert(condition, code) {
  if (!condition) throw new Error(code);
}

const explicitRequest = new Request('https://atlasenterprisesuite.com/?hl=es&gl=VE', {
  headers: { 'accept-language': 'en-US,en;q=0.9' }
});
const explicit = resolveGlobalContext(explicitRequest);
assert(explicit.language === 'es', 'explicit_language_failed');
assert(explicit.country === 'VE', 'explicit_country_failed');
assert(explicit.locale === 'es-VE', 'explicit_locale_failed');
assert(explicit.source.language === 'query', 'explicit_language_source_failed');
assert(explicit.source.country === 'query', 'explicit_country_source_failed');

const browserRequest = new Request('https://atlasenterprisesuite.com/', {
  headers: { 'accept-language': 'fr-CA,fr;q=0.9,en;q=0.7' }
});
const browser = resolveGlobalContext(browserRequest);
assert(browser.language === 'fr', 'browser_language_failed');
assert(browser.country === 'CA', 'browser_country_inference_failed');
assert(browser.locale === 'fr-CA', 'browser_locale_failed');
assert(browser.source.language === 'accept-language', 'browser_language_source_failed');

const rtlRequest = new Request('https://atlasenterprisesuite.com/?hl=ar&gl=EG');
const rtl = resolveGlobalContext(rtlRequest);
assert(rtl.direction === 'rtl', 'rtl_direction_failed');
assert(rtl.locale === 'ar-EG', 'rtl_locale_failed');

const invalidRequest = new Request('https://atlasenterprisesuite.com/?hl=%3Cscript%3E&gl=123', {
  headers: { 'accept-language': 'de-DE,de;q=0.8' }
});
const invalid = resolveGlobalContext(invalidRequest);
assert(invalid.language === 'de', 'invalid_language_fallback_failed');
assert(invalid.country === 'DE', 'invalid_country_fallback_failed');
assert(!invalid.locale.includes('<'), 'unsafe_locale_accepted');

const routeRequest = new Request('https://atlasenterprisesuite.com/api/context?hl=pt-BR&gl=BR');
const routeResponse = await globalContextRoutes(routeRequest, {}, new URL(routeRequest.url));
assert(routeResponse?.status === 200, 'global_context_route_failed');
const routeBody = await routeResponse.json();
assert(routeBody.locale === 'pt-BR', 'global_context_route_locale_failed');
assert(routeResponse.headers.get('content-language') === 'pt-BR', 'content_language_header_failed');
assert((routeResponse.headers.get('vary') || '').includes('accept-language'), 'vary_header_failed');

const methodRequest = new Request('https://atlasenterprisesuite.com/api/context', { method: 'POST' });
const methodResponse = await globalContextRoutes(methodRequest, {}, new URL(methodRequest.url));
assert(methodResponse?.status === 405, 'global_context_method_guard_failed');

console.log('ATLAS global context validation passed');
