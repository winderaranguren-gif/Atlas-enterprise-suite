export default {
  async fetch(request) {
    const url = new URL(request.url);
    if (url.pathname === '/health') {
      return Response.json({ status: 'ok', service: 'atlas-enterprise-suite', generation: 'clean-reset-v1' });
    }
    if (url.pathname === '/api/readiness') {
      return Response.json({ ready: true, service: 'atlas-enterprise-suite', generation: 'clean-reset-v1' });
    }
    const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>ATLAS Enterprise Suite</title><style>body{margin:0;font-family:Arial,sans-serif;background:#07111f;color:#eef6ff;min-height:100vh;display:grid;place-items:center}.wrap{max-width:880px;padding:48px}.badge{display:inline-block;padding:8px 12px;border:1px solid #5b7696;border-radius:999px}.card{margin-top:24px;padding:28px;border:1px solid #27415d;border-radius:24px;background:rgba(255,255,255,.04)}h1{font-size:clamp(42px,8vw,88px);margin:18px 0}p{font-size:20px;line-height:1.55;color:#bfd1e5}a{color:#fff}</style></head><body><main class="wrap"><span class="badge">ATLAS CANONICAL RESET</span><h1>ATLAS Enterprise Suite</h1><div class="card"><p>The canonical production stack has been reset to a clean baseline. This runtime is intentionally minimal while ATLAS is rebuilt on a single verified deployment path.</p><p><a href="/health">Health</a> · <a href="/api/readiness">Readiness</a></p></div></main></body></html>`;
    return new Response(html, { headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' } });
  }
};
