import { authRoutes } from './modules/auth.js';
import { rbacRoutes } from './modules/rbac.js';
import { evidenceRoutes } from './modules/evidence.js';

const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="theme-color" content="#07111f">
  <title>ATLAS Enterprise Suite</title>
  <style>
    :root{color-scheme:dark;--bg:#07111f;--panel:rgba(12,28,48,.68);--line:rgba(154,193,255,.18);--text:#eef6ff;--muted:#9fb4cc;--accent:#8dc4ff;--glow:rgba(94,166,255,.18)}
    *{box-sizing:border-box}
    html{scroll-behavior:smooth}
    body{margin:0;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;background:radial-gradient(circle at 50% 110%,var(--glow),transparent 36%),linear-gradient(180deg,#07111f 0%,#081421 55%,#050b13 100%);color:var(--text);min-height:100vh}
    a{color:inherit;text-decoration:none}
    .shell{min-height:100vh;display:flex;flex-direction:column}
    main{flex:1;display:grid;place-items:center;max-width:980px;width:100%;margin:0 auto;padding:72px 24px}
    .hero{max-width:760px}
    h1{font-size:clamp(2.4rem,7vw,5rem);letter-spacing:-.055em;line-height:.95;margin:0 0 18px}
    p{color:var(--muted);line-height:1.7;margin:0}
    .badge{display:inline-flex;align-items:center;gap:8px;padding:8px 12px;margin-bottom:18px;border:1px solid var(--line);border-radius:999px;background:rgba(255,255,255,.035);backdrop-filter:blur(18px);font-size:.82rem;color:#cce3ff}
    .dot{width:7px;height:7px;border-radius:50%;background:#75e39d;box-shadow:0 0 14px rgba(117,227,157,.75)}
    .final-cta-wrap{width:100%;padding:0 24px 26px}
    .final-cta{position:relative;overflow:hidden;max-width:1180px;margin:0 auto;padding:46px;border:1px solid var(--line);border-radius:30px;background:linear-gradient(135deg,rgba(18,40,67,.82),rgba(8,18,31,.72));backdrop-filter:blur(28px);box-shadow:0 24px 80px rgba(0,0,0,.22);display:grid;grid-template-columns:minmax(0,1.5fr) minmax(250px,.75fr);gap:34px;align-items:center}
    .final-cta:before{content:"";position:absolute;width:320px;height:320px;border-radius:50%;right:-110px;top:-150px;background:radial-gradient(circle,rgba(77,162,255,.24),transparent 68%);pointer-events:none}
    .eyebrow{font-size:.76rem;letter-spacing:.16em;text-transform:uppercase;color:#a9d3ff;font-weight:700;margin-bottom:12px}
    .final-cta h2{font-size:clamp(2rem,4vw,3.35rem);line-height:1.03;letter-spacing:-.045em;margin:0 0 14px;max-width:720px}
    .final-cta p{max-width:690px}
    .cta-actions{display:grid;gap:12px;position:relative;z-index:1}
    .cta-button{display:flex;justify-content:center;align-items:center;min-height:52px;padding:13px 18px;border-radius:16px;border:1px solid rgba(151,200,255,.28);font-weight:750;letter-spacing:.01em;background:linear-gradient(180deg,#dceeff,#9bcaff);color:#07111f;box-shadow:0 12px 34px rgba(91,164,246,.18)}
    .cta-button.secondary{background:rgba(255,255,255,.035);color:#eaf5ff;box-shadow:none}
    .cta-note{font-size:.76rem;text-align:center;color:#7891ab}
    footer{border-top:1px solid var(--line);background:linear-gradient(180deg,rgba(8,18,30,.45),rgba(3,8,14,.9));backdrop-filter:blur(24px)}
    .footer-grid{max-width:1180px;margin:0 auto;padding:42px 24px 28px;display:grid;grid-template-columns:minmax(220px,1.6fr) repeat(3,minmax(130px,1fr));gap:30px}
    .brand-mark{font-size:1.08rem;font-weight:800;letter-spacing:.18em;margin-bottom:10px}
    .brand-copy{max-width:360px;font-size:.92rem}
    .footer-title{font-size:.74rem;letter-spacing:.14em;text-transform:uppercase;color:#d8eaff;margin-bottom:12px;font-weight:700}
    .footer-links{display:grid;gap:9px;font-size:.9rem;color:var(--muted)}
    .footer-links span{transition:color .2s ease}
    .footer-links span:hover{color:var(--text)}
    .footer-bottom{max-width:1180px;margin:0 auto;padding:18px 24px 26px;border-top:1px solid rgba(154,193,255,.1);display:flex;gap:18px;justify-content:space-between;align-items:center;color:#7f96ae;font-size:.78rem}
    .system-state{display:flex;align-items:center;gap:8px}
    @media(max-width:760px){main{padding:56px 20px}.final-cta-wrap{padding:0 20px 20px}.final-cta{padding:30px 24px;grid-template-columns:1fr;border-radius:24px}.footer-grid{grid-template-columns:1fr 1fr;padding:34px 20px 24px}.footer-grid .brand{grid-column:1/-1}.footer-bottom{padding:18px 20px 24px;align-items:flex-start;flex-direction:column}}
  </style>
</head>
<body>
  <div class="shell">
    <main>
      <section class="hero" aria-labelledby="atlas-title">
        <span class="badge"><span class="dot"></span>Core v0.4 · Secure foundation online</span>
        <h1 id="atlas-title">ATLAS Enterprise Suite</h1>
        <p>Clean rebuild foundation with Identity, Authentication, Organizations, DBA scopes, RBAC, immutable audit evidence and tenant-safe API guards.</p>
      </section>
    </main>

    <section class="final-cta-wrap" aria-labelledby="atlas-contact-title">
      <div class="final-cta">
        <div>
          <div class="eyebrow">Build with ATLAS</div>
          <h2 id="atlas-contact-title">One platform. Your operation. A connected future.</h2>
          <p>Explore ATLAS Enterprise Suite, evaluate the platform for your organization, or start a conversation about deployment, partnerships and integrated digital operations.</p>
        </div>
        <div class="cta-actions">
          <a class="cta-button" href="mailto:awfinanceadvisory@gmail.com?subject=ATLAS%20Enterprise%20Suite%20Inquiry">Contact ATLAS</a>
          <a class="cta-button secondary" href="/api/health">View system health</a>
          <div class="cta-note">Secure foundation · Multi-organization architecture</div>
        </div>
      </div>
    </section>

    <footer aria-label="ATLAS footer">
      <div class="footer-grid">
        <div class="brand">
          <div class="brand-mark">ATLAS</div>
          <p class="brand-copy">One connected enterprise environment for people, operations, finance, intelligence and secure digital services.</p>
        </div>
        <div>
          <div class="footer-title">Platform</div>
          <div class="footer-links"><span>Enterprise Suite</span><span>HR & Payroll</span><span>Finance</span><span>Operations</span></div>
        </div>
        <div>
          <div class="footer-title">Ecosystem</div>
          <div class="footer-links"><span>ATLAS Health</span><span>ATLAS Ride</span><span>ATLAS Connect</span><span>Public Safety</span></div>
        </div>
        <div>
          <div class="footer-title">Trust</div>
          <div class="footer-links"><span>Security Architecture</span><span>Privacy by Design</span><span>Audit Evidence</span><span>System Status</span></div>
        </div>
      </div>
      <div class="footer-bottom">
        <span>© 2026 ATLAS Enterprise Suite. All rights reserved.</span>
        <span class="system-state"><span class="dot"></span>Core services operational</span>
      </div>
    </footer>
  </div>
</body>
</html>`;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === '/api/health') {
      return Response.json({
        ok: true,
        service: 'atlas-enterprise-suite',
        version: '0.4.0',
        phase: 'core-audit-security-tenant-api',
        identityDatabase: env.DB ? 'configured' : 'unconfigured'
      }, { headers: { 'cache-control': 'no-store' } });
    }

    const authResponse = await authRoutes(request, env, url);
    if (authResponse) return authResponse;

    const rbacResponse = await rbacRoutes(request, env, url);
    if (rbacResponse) return rbacResponse;

    const evidenceResponse = await evidenceRoutes(request, env, url);
    if (evidenceResponse) return evidenceResponse;

    if (url.pathname === '/') {
      return new Response(html, {
        headers: { 'content-type': 'text/html; charset=utf-8' }
      });
    }

    return Response.json({ ok: false, error: 'not_found' }, { status: 404 });
  }
};
