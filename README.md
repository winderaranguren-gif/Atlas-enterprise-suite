# ATLAS Enterprise Suite — Clean Foundation v1.0.0

ATLAS Enterprise Suite rebuilt as a clean, dependency-light production foundation for GitHub and Cloudflare Workers Static Assets.

## Identity
- Product: ATLAS Enterprise Suite
- Operational contact: `atlashealthfrontiers@gmail.com`
- Repository target: `winderaranguren-gif/Atlas-enterprise-suite`
- Default branch: `main`
- Architecture: `ATLAS Global Core -> Region -> Country -> Organization -> User`

## Why this rebuild
This version intentionally starts from a new repository tree rather than layering patches over the previous application files. It minimizes build failure modes, removes abandoned deployment/auth files from the active tree, and establishes a deterministic static foundation compatible with the Cloudflare Worker already connected to this repository.

## Included foundation
The configuration registry currently exposes 23 ATLAS capabilities: Core, CRM & Sales, AR, AP, General Ledger, Inventory, HR & Payroll, Reports & Intelligence, Freight Network, Fleet Intelligence, Documents & Sign, Wallet, Ride, Marketplace, Rewards, Cars, Health, Public Safety, Community Hub, Calendar, GPS 4D, Technical Support, and Settings.

Regional behavior is configuration-driven. North America can keep the original futuristic ATLAS identity while regional experiences can evolve without forking the core application.

## Local validation
```bash
npm run validate
npm run build
```
The local build produces `dist/` for inspection/export. Production Cloudflare deployment does not depend on `dist/`: the connected Worker deploys the validated `public/` directory directly as Workers Static Assets.

## Cloudflare Workers Static Assets
The repository is aligned with the existing Cloudflare Workers Git integration:
- Worker name: `atlas-enterprise-suite`
- Deploy command: `npx wrangler@4 deploy`
- Static asset directory: `./public`
- SPA fallback: `single-page-application`
- `workers.dev`: disabled by repository configuration
- `_headers` and `_redirects`: enforced from the static asset directory

The browser Service Worker is deliberately narrower than Cloudflare's edge cache. It never intercepts `/api/*`, never caches `atlas.config.json`, and only persists same-origin static assets.

## Security boundary
No secrets, tokens, passwords, production health data, personal financial data, or authentication credentials belong in the client repository. Add external services only through explicit server-side boundaries. `npm run validate` checks the active clean tree for credential-shaped values and verifies the deployment, browser-header, Service Worker, configuration and JavaScript boundaries.

## Pre-v1.0.0 branches
Older feature branches remain available as historical implementation sources. They are not merge candidates for this clean foundation. Any useful capability must be selectively re-ported from current `main` and validated against the current architecture before activation. See `CLEAN_FOUNDATION_MIGRATION.md`.
