const securityHeaders = {
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-Frame-Options': 'DENY',
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Permissions-Policy': 'camera=(self), microphone=(self), geolocation=(self)'
};

function json(data, init = {}) {
  const headers = new Headers(init.headers || {});
  headers.set('content-type', 'application/json; charset=utf-8');
  for (const [key, value] of Object.entries(securityHeaders)) headers.set(key, value);
  return new Response(JSON.stringify(data), { ...init, headers });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === '/api/health') {
      return json({
        ok: true,
        service: 'atlas-enterprise-suite',
        runtime: 'cloudflare-workers',
        timestamp: new Date().toISOString()
      });
    }

    if (url.pathname === '/api/version') {
      return json({
        name: 'ATLAS Enterprise Suite',
        platform: 'Cloudflare Workers + Static Assets',
        architecture: 'clean-rebuild-v1'
      });
    }

    if (url.pathname === '/api' || url.pathname.startsWith('/api/')) {
      return json({
        ok: false,
        error: 'API route not found',
        path: url.pathname
      }, { status: 404 });
    }

    if (!env.ASSETS) {
      return json({ ok: false, error: 'ASSETS binding unavailable' }, { status: 503 });
    }

    const response = await env.ASSETS.fetch(request);
    const headers = new Headers(response.headers);
    for (const [key, value] of Object.entries(securityHeaders)) headers.set(key, value);
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers
    });
  }
};
