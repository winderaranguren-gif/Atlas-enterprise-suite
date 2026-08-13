import { authRoutes } from './modules/auth.js';

const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>ATLAS Enterprise Suite</title><style>body{margin:0;font-family:system-ui,sans-serif;background:#07111f;color:#eaf2ff;display:grid;place-items:center;min-height:100vh}main{max-width:720px;padding:32px}h1{font-size:clamp(2rem,6vw,4rem);margin:0 0 12px}p{opacity:.8;line-height:1.6}.badge{display:inline-block;padding:8px 12px;border:1px solid #6f8fb8;border-radius:999px}</style></head><body><main><span class="badge">Core v0.2</span><h1>ATLAS Enterprise Suite</h1><p>Clean rebuild foundation with ATLAS Core Identity + Authentication. Business modules are added only after validation.</p></main></body></html>`;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === '/api/health') {
      return Response.json({
        ok: true,
        service: 'atlas-enterprise-suite',
        version: '0.2.0',
        phase: 'core-identity-auth',
        identityDatabase: env.DB ? 'configured' : 'unconfigured'
      }, { headers: { 'cache-control': 'no-store' } });
    }

    const authResponse = await authRoutes(request, env, url);
    if (authResponse) return authResponse;

    if (url.pathname === '/') {
      return new Response(html, {
        headers: { 'content-type': 'text/html; charset=utf-8' }
      });
    }

    return Response.json({ ok: false, error: 'not_found' }, { status: 404 });
  }
};
