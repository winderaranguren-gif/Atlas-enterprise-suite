# ATLAS Sovereign Runtime v1

## Architectural law
ATLAS must remain buildable, recoverable and deployable without GitHub, GitHub Actions, Lovable, Cloudflare or any other single hosted provider. External providers are adapters, mirrors or optional delivery surfaces; none is the source of truth for ATLAS.

## Canonical chain
`ATLAS Source Vault -> Local/Reproducible Build -> Integrity Snapshot -> Deploy Adapter -> Production Verification`

GitHub may mirror source and accept collaboration, but it is outside this required chain.

## Commands
- `npm run build:sovereign` runs the provider-neutral ATLAS validation/build contract.
- `npm run snapshot:sovereign` creates a self-contained source snapshot under `.atlas/sovereign/snapshots/` with a SHA-256 manifest.
- `npm run release:sovereign` builds and creates a bundle-only release without publishing externally.
- `npm run release:sovereign:cloudflare` uses Cloudflare only as a replaceable production adapter and requires direct Cloudflare credentials in the execution environment.
- `npm run validate:sovereign` enforces that the sovereign release orchestrator does not depend on GitHub runtime variables.

## Provider boundary
The deploy adapter interface is deliberately small: `preflight()`, `deploy()` and `verify()`. A future origin or provider can be added without changing ATLAS application modules. The Cloudflare adapter is explicitly marked `replaceable = true`.

## Snapshot contract
Every sovereign snapshot contains source files plus `manifest.json` with per-file SHA-256 hashes and one aggregate SHA-256. `.git`, `node_modules` and prior `.atlas` snapshots are excluded. The snapshot therefore survives loss of the GitHub account or repository mirror.

## Production truth
A bundle is not a deployment. A successful provider upload is not production verification. ATLAS may call a release LIVE only after the selected adapter completes its verification phase against the production surface.

## Current boundary
Cloudflare remains the current production delivery adapter for the canonical domain. This document and runtime remove GitHub Actions from the required path, but direct production deployment still requires valid Cloudflare credentials wherever the sovereign command is executed. Those secrets must never be committed to source.
