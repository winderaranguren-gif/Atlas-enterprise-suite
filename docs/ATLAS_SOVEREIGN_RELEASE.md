# ATLAS Sovereign Release

ATLAS Sovereign Release makes the portable ATLAS runtime the canonical provider-independent release artifact.

## Principle

ATLAS owns the application architecture and runtime contract. Cloud providers are optional adapters. A failed provider credential must not invalidate a verified ATLAS build or portable OCI image.

## Release states

1. `CODE VERIFIED` — canonical repository checks pass.
2. `PORTABLE RUNTIME VERIFIED` — Node, durable-state compatibility, assets and WebSocket signaling pass.
3. `OCI IMAGE READY` — the immutable ATLAS image for the commit exists in GHCR.
4. `HOST ATTACHED` — an operator supplies a real Node/OCI host and configures `ATLAS_SOVEREIGN_PRODUCTION_URL`.
5. `PRODUCTION VERIFIED` — the host responds to ATLAS runtime, identity, Creator and public-site checks.

The system must never call step 3 production. An image in a registry is deployable software, not a live production service.

## Canonical image

- `ghcr.io/winderaranguren-gif/atlas-enterprise-suite:latest`
- `ghcr.io/winderaranguren-gif/atlas-enterprise-suite:<commit-sha>`

The image is produced by `.github/workflows/portable-runtime.yml` after the portable runtime, WebSocket signaling, build graph, container health and durable restart checks pass.

## Host requirements

A sovereign host needs Docker or Node 22+, persistent storage, TLS termination and a stable public hostname. For OCI, persist `/var/lib/atlas`. Do not mount the same local state volume into multiple replicas. Multi-replica production requires a shared persistence and signaling adapter.

Example single-node start:

```bash
docker pull ghcr.io/winderaranguren-gif/atlas-enterprise-suite:latest
docker run -d --restart unless-stopped \
  --name atlas-enterprise-suite \
  -p 8080:8080 \
  -v atlas-state:/var/lib/atlas \
  ghcr.io/winderaranguren-gif/atlas-enterprise-suite:latest
```

## Live verification

Set the repository variable `ATLAS_SOVEREIGN_PRODUCTION_URL` to the actual public origin of the ATLAS-owned runtime. The release workflow then verifies:

- `/_atlas/health`
- `/_atlas/runtime`
- `/`
- `/identity`
- `/studio/create-anything`
- `/api/studio/creator/universal/capabilities`
- `/api/studio/creator/web/capabilities`

The same verification can be executed from any Node 22 environment:

```bash
ATLAS_PRODUCTION_URL=https://atlas.example.com node scripts/verify-sovereign-production.mjs
```

## Security boundary

Runtime credentials are injected by the host. They are never baked into the OCI image or committed to the repository. Production verification reports only public runtime state and does not print credentials, environment variables or filesystem paths.

## Cloudflare

Cloudflare can remain one optional adapter for DNS, Workers or edge delivery. ATLAS Sovereign Release does not require Cloudflare authentication to validate or publish the canonical OCI artifact. If the ATLAS domain is currently delegated to Cloudflare DNS, changing the serving origin still requires an authorized DNS change outside the application runtime.
