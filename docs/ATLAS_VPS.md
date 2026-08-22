# ATLAS VPS

ATLAS VPS is the first-party single-node production host profile for the ATLAS Portable Runtime. It runs the canonical ATLAS OCI image with persistent ATLAS state, an HTTPS edge, health-gated upgrades and automatic rollback without requiring the Cloudflare Worker runtime.

Cloudflare is not required for ATLAS VPS. A DNS provider may still be used to point a domain to the VPS public IP, but DNS is an edge concern rather than an application runtime dependency.

## What ATLAS VPS is

- A hardened Docker Compose stack for one Linux host.
- The canonical `ghcr.io/winderaranguren-gif/atlas-enterprise-suite` OCI image.
- Persistent `atlas_vps_state` storage for the portable single-node durable adapter.
- Caddy as the local reverse proxy and automatic TLS edge when a public domain is configured.
- Container health checks against `/_atlas/health`.
- A bootstrap that installs the runtime, preserves SSH access in UFW, launches ATLAS and verifies local health.
- A deploy command that updates to a selected image tag/digest and rolls back if the new container fails health checks.
- A GitHub Actions handoff that can bootstrap/update an already-created Linux host over pinned-key SSH and run the sovereign production verifier.

## What ATLAS VPS is not

ATLAS is not a VPS provider and cannot create physical CPU, RAM, storage, a routable public IP or an Internet ASN out of software alone. One actual compute host must exist somewhere. That host can be a rented VPS, a dedicated server, a VM in a cloud account, or hardware owned by ATLAS.

The infrastructure boundary is therefore:

1. Compute provider or ATLAS-owned hardware supplies a Linux machine and public networking.
2. ATLAS VPS turns that machine into the canonical ATLAS production runtime.
3. ATLAS Sovereign Release verifies the live application. Provider-specific deployment adapters remain optional.

## Minimum host profile

Recommended initial production profile:

- Ubuntu 24.04 LTS or current Debian stable.
- 4 vCPU.
- 8 GB RAM.
- 80 GB SSD or larger.
- Public IPv4 and/or IPv6.
- TCP 22 (or the configured SSH port), 80 and 443 reachable.
- UDP 443 reachable for HTTP/3.
- DNS A/AAAA record for the desired ATLAS hostname before expecting automatic public TLS.

Smaller hosts can run the web runtime, but Creator/media/neural workloads should be separated from the public web VPS or moved to dedicated GPU nodes as load increases.

## Bootstrap

From a checkout of the canonical repository on the target host:

```bash
sudo bash scripts/atlas-vps-bootstrap.sh \
  --domain atlas.example.com \
  --image ghcr.io/winderaranguren-gif/atlas-enterprise-suite:latest
```

The bootstrap creates `/opt/atlas-vps`, installs the Compose stack, creates a private `.env`, configures the edge, optionally enables UFW, starts ATLAS and waits for a healthy application container.

For a host that should remain HTTP-only until DNS is ready, omit `--domain`. Do not call that state public production verified.

## Immutable deployment

Prefer an immutable commit tag or digest rather than `latest`:

```bash
sudo /opt/atlas-vps/bin/atlas-vps-deploy \
  ghcr.io/winderaranguren-gif/atlas-enterprise-suite:<commit-sha>
```

The deploy command stores the previous image selection, launches the new container, waits for Docker health, restarts the edge and rolls back to the previous selection if the health gate fails.

To also verify the public endpoint during deployment:

```bash
sudo ATLAS_PUBLIC_URL=https://atlas.example.com \
  /opt/atlas-vps/bin/atlas-vps-deploy \
  ghcr.io/winderaranguren-gif/atlas-enterprise-suite:<commit-sha>
```

## GitHub Actions handoff

`.github/workflows/deploy-atlas-vps.yml` is manual by design. It never creates a billable VM. It connects only to a host you have already authorized and only after the following repository secrets exist:

- `ATLAS_VPS_HOST`
- `ATLAS_VPS_USER`
- `ATLAS_VPS_SSH_PRIVATE_KEY`
- `ATLAS_VPS_KNOWN_HOST`
- `ATLAS_VPS_PRODUCTION_URL`

The pinned `ATLAS_VPS_KNOWN_HOST` entry is required. The workflow does not disable SSH host verification.

## State and scaling

The current portable durable adapter is a single-node state layer. `atlas_vps_state` must not be mounted concurrently by multiple independent replicas. Before horizontal scaling, move durable state to a shared database/state adapter and use shared signaling/pub-sub for multi-node video rooms.

Back up the Docker volume independently of image releases. An OCI image contains application code, not live business state.

## Production definition

An ATLAS VPS is not production merely because the image exists or a container starts. Production is verified only after the public origin passes the ATLAS sovereign verification checks, including runtime health and required application surfaces.
