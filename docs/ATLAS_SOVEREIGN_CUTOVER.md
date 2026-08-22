# ATLAS Sovereign Production Cutover

ATLAS production is provider-neutral. The canonical release artifact is the ATLAS OCI image, and the canonical production host profile is ATLAS VPS. Cloudflare is retained only as an optional compatibility adapter and is not allowed to own the primary release or production status.

## Canonical release chain

1. Merge to `main`.
2. `ATLAS Portable Runtime` validates the provider-independence contract, portable HTTP runtime, durable-state adapter, WebSocket signaling, build graph, container build and restart persistence.
3. The workflow publishes immutable OCI tags to GHCR: `latest` and the exact commit SHA.
4. `atlas/sovereign-release` becomes the canonical release status.
5. If `ATLAS_VPS_AUTO_DEPLOY=true`, the successful portable workflow triggers `Deploy ATLAS VPS` with the immutable commit-SHA image.
6. The VPS deploy uses pinned SSH host verification, health-gated replacement and rollback.
7. `scripts/verify-sovereign-production.mjs` verifies the portable runtime, ATLAS Creator Studio, Native Studio, Universal Creator and Creator Web Director.
8. Only after those live checks pass may `atlas/sovereign-production` be marked successful.

## Cloudflare boundary

`.github/workflows/deploy-cloudflare-direct.yml` is manual-only. It cannot run on pushes or pull requests and writes only the `atlas/cloudflare-adapter` status. A Cloudflare token failure therefore cannot make the canonical ATLAS sovereign release fail.

`wrangler.jsonc` remains in the repository while the Cloudflare adapter is retained for compatibility and controlled rollback. Provider-specific configuration is not an architectural requirement for ATLAS business modules.

## Required VPS production configuration

The repository must have an already-authorized Linux host and the following GitHub Actions secrets:

- `ATLAS_VPS_HOST`
- `ATLAS_VPS_USER`
- `ATLAS_VPS_SSH_PRIVATE_KEY`
- `ATLAS_VPS_KNOWN_HOST`
- `ATLAS_VPS_PRODUCTION_URL`

For automatic deployment after every successful sovereign release, set repository variable:

- `ATLAS_VPS_AUTO_DEPLOY=true`
- `ATLAS_SOVEREIGN_DOMAIN=<production hostname>`

The host itself is external physical infrastructure. ATLAS cannot manufacture a public IP, CPU, RAM or Internet routing in software. Once an authorized host exists, the repository contains the bootstrap, runtime contract, deployment and rollback logic.

## Safe domain cutover

Do not remove the existing public edge before the sovereign origin is independently healthy.

1. Deploy the immutable ATLAS OCI image to the VPS under a temporary or dedicated hostname.
2. Run `node scripts/verify-sovereign-production.mjs https://<sovereign-host>`.
3. Back up existing ATLAS state and confirm portable state persistence.
4. Point the public ATLAS DNS records to the sovereign host.
5. Run the sovereign verifier against the final public origin.
6. Observe health and application logs through at least one complete release cycle.
7. Only then remove Cloudflare Worker routes, Durable Object bindings, Worker secrets and obsolete deployment credentials if they are no longer needed for rollback.

## State migration rule

A provider exit must never discard live state. Cloudflare Durable Object state, if any production data exists there, must be exported or reconciled into the ATLAS-owned persistence layer before deleting those resources. The portable runtime already supplies first-party single-node state for `CONNECT_STORE`, `CAPABILITY_STATE_STORE` and `WALLET_STORE`; horizontal production requires a shared persistence adapter before multiple replicas are enabled.

## Guardrail

Run:

```bash
npm run check:provider-independence
```

This fails if Cloudflare regains automatic push/PR deployment, if `deploy:provider` points back to Wrangler, if Cloudflare writes the canonical production status, or if sovereign OCI/VPS contracts disappear.
