# ATLAS Enterprise Suite — Clean Foundation v1.0.0

ATLAS Enterprise Suite rebuilt as a clean, dependency-light production foundation for GitHub and Cloudflare Pages.

## Identity
- Product: ATLAS Enterprise Suite
- Operational contact: `atlashealthfrontiers@gmail.com`
- Repository target: `winderaranguren-gif/Atlas-enterprise-suite`
- Default branch: `main`
- Architecture: `ATLAS Global Core -> Region -> Country -> Organization -> User`

## Why this rebuild
This version intentionally starts from a new repository tree rather than layering patches over the previous application files. It minimizes build failure modes, removes abandoned deployment/auth files from the active tree, and establishes a deterministic Cloudflare Pages output.

## Included foundation
The configuration registry currently exposes 23 ATLAS capabilities: Core, CRM & Sales, AR, AP, General Ledger, Inventory, HR & Payroll, Reports & Intelligence, Freight Network, Fleet Intelligence, Documents & Sign, Wallet, Ride, Marketplace, Rewards, Cars, Health, Public Safety, Community Hub, Calendar, GPS 4D, Technical Support, and Settings.

Regional behavior is configuration-driven. North America can keep the original futuristic ATLAS identity while regional experiences can evolve without forking the core application.

## Local validation
```bash
npm run validate
npm run build
```
The build produces `dist/` and requires no package installation for the validation/build steps.

## Cloudflare Pages
Recommended GitHub build settings:
- Build command: `npm run build`
- Build output directory: `dist`
- Node.js: 22+
- Root directory: repository root

The included `wrangler.toml` also points Wrangler to `./dist`.

## Security boundary
No secrets, tokens, passwords, production health data, personal financial data, or authentication credentials belong in the client repository. Add external services only through explicit environment configuration and server-side boundaries.
