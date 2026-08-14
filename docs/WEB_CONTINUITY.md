# ATLAS Web Continuity

Technical handoff for future ATLAS development sessions. This file contains project metadata only; no chat transcripts, credentials, secrets, or personal data belong here.

## Canonical project

- Repository: `winderaranguren-gif/Atlas-enterprise-suite` (private)
- Production branch: `main`
- Cloudflare Worker project: `atlas-enterprise-suite`
- Canonical public domain: `https://atlasenterprisesuite.com/`
- Worker entry point configured by Wrangler: `worker-crm.js`
- Core web runtime: `worker.js`
- Public web shell: `modules/web-shell.js`
- Cloudflare config: `wrangler.jsonc`

## Deployment contract

1. Treat GitHub `main` as the canonical source.
2. Cloudflare production must deploy from `main` only.
3. Do not replace the canonical domain with a recovery/preview URL.
4. Verify the live domain after every production deployment.
5. Never claim a deployment succeeded until the public domain and health endpoint respond.
6. Keep credentials and user conversations out of source control.

## Recovered history

- Commit `96780c4`: activated 12 footer routes; web core advanced from v0.4 to v0.5; System Status connected to the real health endpoint.
- Recovery deployment: `atlas-enterprise-suite-recovery-d997fcx2t.vercel.app`; it remained private behind Deployment Protection and never replaced the canonical domain.
- Commit `e7a939932e5bbeaaec5854e21122a30d9ba21ff0`: added canonical redirects for common public aliases and trailing-slash normalization to reduce 404s.

## Current known state — 2026-08-14

- Website code exists on `main`.
- Public routes, login, dashboard, status, contact, legal pages, CRM, manifest, icon, service worker, robots and sitemap are implemented in the Worker source.
- GitHub CI and Release Gate failed before executing job steps on the latest commit; this indicates an Actions/integration startup problem rather than a validated application test failure.
- Direct Cloudflare deployment access was not exposed in the current session, so production publication and the live domain remain unverified.
- D1 binding `DB` is required for database-backed health, authentication, CRM, contact and telemetry functions.

## Resume checklist

1. Read this file before making website changes.
2. Inspect `main` HEAD and all checks.
3. Confirm Cloudflare is connected to `winderaranguren-gif/Atlas-enterprise-suite`, branch `main`.
4. Confirm Worker name `atlas-enterprise-suite` and entry point `worker-crm.js`.
5. Confirm D1 binding `DB` and required secrets/feature flags exist without exposing their values.
6. Run `npm run build:prod` and `npm run qa:release`.
7. Deploy the exact validated commit.
8. Verify:
   - `https://atlasenterprisesuite.com/`
   - `https://atlasenterprisesuite.com/api/health`
   - `/login`, `/dashboard`, `/platform/crm`, `/trust/status`, `/contact`
   - redirects from `/home`, `/atlas`, `/app`, `/signin`, `/status`, `/platform`, `/index.html`
9. Record the deployed commit SHA and verification timestamp below.

## Last verified deployment

- Commit: pending
- Cloudflare deployment: pending
- Domain verification: pending
