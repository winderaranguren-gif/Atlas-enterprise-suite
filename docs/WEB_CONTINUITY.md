# ATLAS Web Continuity

Technical handoff for future ATLAS development sessions. This file contains project metadata only; no chat transcripts, credentials, secrets, or personal data belong here.

## Canonical project

- Repository: `winderaranguren-gif/Atlas-enterprise-suite` (private)
- Production branch: `main`
- Cloudflare Worker project: `atlas-enterprise-suite`
- Canonical public domain: `https://atlasenterprisesuite.com/`
- Worker entry point configured by Wrangler: `worker-meta.js`
- Core web runtime: `worker.js`
- Public web shell: `modules/web-shell.js`
- Cloudflare config: `wrangler.jsonc`
- Cloudflare desired baseline: `infra/cloudflare/production-baseline.json`
- Known-good recovery record: `infra/cloudflare/known-good.json`

## Deployment contract

1. Treat GitHub `main` as the canonical source.
2. Cloudflare production must deploy from `main` only.
3. Do not replace the canonical domain with a recovery/preview URL.
4. Every production build must be stamped with its exact source commit.
5. Verify `/api/readiness` and `/api/release` after every production deployment.
6. Never claim public-domain verification from a provider check alone; distinguish build success from end-to-end domain verification.
7. Keep credentials and user conversations out of source control.
8. GitHub Actions are optional manual runners; ATLAS local validation is the primary fallback when hosted runners are unavailable.

## Resilience and release commands

- `npm run atlas:doctor` — repository/configuration diagnosis.
- `npm run atlas:dna` — scan release-critical source invariants, imports and secret-exposure patterns.
- `npm run atlas:verify` — full local release gate.
- `npm run atlas:self-heal` — safe Wrangler baseline repair followed by full verification.
- `npm run infra:validate` — Cloudflare baseline comparison.
- `npm run infra:repair` — restore deterministic repository-owned Wrangler configuration.
- `npm run deploy` — validate the production build, then deploy with the repository-pinned Wrangler version.
- `npm run verify:production` — verify canonical domain, identity readiness and exact deployed source SHA.
- `npm run release:production` — deploy and then verify production end-to-end.

## Recovered history

- Commit `96780c4`: activated 12 footer routes; web core advanced from v0.4 to v0.5; System Status connected to the real health endpoint.
- Recovery deployment: `atlas-enterprise-suite-recovery-d997fcx2t.vercel.app`; it remained private behind Deployment Protection and never replaced the canonical domain.
- Commit `e7a939932e5bbeaaec5854e21122a30d9ba21ff0`: added canonical redirects for common public aliases and trailing-slash normalization to reduce 404s.
- Commit `9ea387d209274e2f71215980cc36c9a23e67fc52`: paused automatic GitHub-hosted Actions while runner billing/spending limits are blocking job startup.
- Commit `c6aab74e17143e1ddaa2079b3d7760f31b5b8a89`: made the Cloudflare repository baseline part of production validation.
- Commit `f8a9ff4dbfef031fdbcce6476efdad7907fe2162`: recorded the previous known-good Cloudflare recovery point.
- Commit `8e3f79a0359873f8d763430b9709a79e991be890`: aligned the Cloudflare production baseline to `worker-meta.js`.
- Commit `41b987337f078e132cfdb795f0d6f0e0244965f8`: required real production readiness before ATLAS can be declared LIVE.

## Current known state — 2026-08-15

- Website code and the production edge configuration baseline exist on `main`.
- GitHub-hosted CI workflows are manual-only while hosted runners are billing/spending-limit blocked; this condition is not treated as an application-test failure.
- Cloudflare Workers last provider build recorded as verified was commit `f8a9ff4dbfef031fdbcce6476efdad7907fe2162`, version `e8df4c77-7032-43b8-97da-3c18a2ecc9b0`; newer `main` commits require fresh provider/deployed-SHA verification.
- `wrangler.jsonc` and the production baseline now agree on `worker-meta.js`, with `workers_dev: false`, explicit apex/www routes, observability enabled, and `run_worker_first: true` for assets.
- Wrangler is pinned in the project so deployment does not depend on an arbitrary latest CLI version.
- D1 binding `DB` remains required for database-backed readiness, authentication, CRM, contact and telemetry functions.
- First Owner creation additionally requires the protected `ATLAS_BOOTSTRAP_TOKEN` until the first user exists.
- End-to-end public-domain verification remains separate from provider build success.

## Resume checklist

1. Read this file and `docs/ATLAS_AUTONOMY.md` before making production changes.
2. Inspect `main` HEAD and provider checks.
3. Run `npm run atlas:dna` and `npm run atlas:doctor`; use `npm run atlas:self-heal` if deterministic configuration drift is detected.
4. Run the complete production gate before intentional promotion.
5. Confirm Worker name `atlas-enterprise-suite` and entry point `worker-meta.js`.
6. Confirm D1 binding `DB`, schema migrations and required secrets/feature flags exist without exposing their values.
7. Deploy/promote only the exact validated `main` commit.
8. Verify `/`, `/login`, `/signup`, `/api/health`, `/api/readiness` and `/api/release` on the canonical domain.
9. Confirm `/api/release` reports the exact `main` SHA that was promoted.
10. Record a new known-good recovery point only after provider build, readiness and deployed-SHA evidence agree.

## Last provider build verified

- Commit: `f8a9ff4dbfef031fdbcce6476efdad7907fe2162`
- Cloudflare Workers build: success
- Cloudflare version: `e8df4c77-7032-43b8-97da-3c18a2ecc9b0`
- Public-domain end-to-end verification: separate/not asserted by this record
