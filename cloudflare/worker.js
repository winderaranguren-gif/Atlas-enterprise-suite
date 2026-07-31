const SECURITY_HEADERS = Object.freeze({
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-Frame-Options': 'DENY',
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Permissions-Policy': 'camera=(self), microphone=(self), geolocation=(self)',
  'Content-Security-Policy': "default-src 'self'; script-src 'self' https://cdn.jsdelivr.net; connect-src 'self' https://*.supabase.co wss://*.supabase.co; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; media-src 'self' blob:; worker-src 'self' blob:; frame-ancestors 'none'; base-uri 'self'; form-action 'self'"
});

function applySecurityHeaders(response, requestUrl) {
  const headers = new Headers(response.headers);
  for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
    headers.set(name, value);
  }

  const pathname = requestUrl.pathname;
  const contentType = headers.get('Content-Type') || '';

  if (contentType.includes('text/html') || pathname.endsWith('.html') || pathname === '/') {
    headers.set('Cache-Control', 'no-store, max-age=0');
  } else if (pathname === '/service-worker.js') {
    headers.set('Cache-Control', 'public, max-age=0, must-revalidate');
  } else {
    headers.set('Cache-Control', 'public, max-age=3600');
  }

  if (pathname.startsWith('/private-beta') || pathname.startsWith('/cloud-auth')) {
    headers.set('X-Robots-Tag', 'noindex, nofollow, noarchive');
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const response = await env.ASSETS.fetch(request);
    return applySecurityHeaders(response, url);
  }
};
