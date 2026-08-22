# ATLAS Linux Server

ATLAS Linux Server is the first-boot Linux host profile for ATLAS Enterprise Suite. It turns a fresh Ubuntu/Debian-compatible cloud VM into the sovereign ATLAS VPS runtime without requiring Cloudflare.

## What it provisions

- locked root account and SSH key-only administrator access
- Docker Engine and Docker Compose v2
- UFW with only SSH, HTTP, HTTPS and HTTP/3 ingress
- the canonical ATLAS OCI image from `ghcr.io/winderaranguren-gif/atlas-enterprise-suite`
- persistent ATLAS state and Caddy TLS volumes
- a read-only ATLAS application container with dropped Linux capabilities and `no-new-privileges`
- Caddy edge termination for TLS and reverse proxying
- health-gated first boot using `/_atlas/health`

## Render a boot image

Do not commit an SSH private key or API credential. Generate cloud-init with a public SSH key:

```bash
node scripts/render-atlas-linux-cloud-init.mjs \
  --domain atlas.example.com \
  --ssh-public-key 'ssh-ed25519 AAAA... operator@example' \
  --output atlas-cloud-init.yaml
```

Optional flags:

- `--image ghcr.io/winderaranguren-gif/atlas-enterprise-suite:<tag-or-digest>`
- `--ssh-port 22`
- `--hostname atlas-linux-server`

Give the rendered file to a VM platform as cloud-init/user-data when creating an Ubuntu server. The machine will bootstrap itself on first boot.

## Production boundary

The cloud-init document is a machine definition, not a physical VM. A compute platform, physical server, hypervisor, or other machine must allocate CPU, memory, disk and network. ATLAS does not mark production verified until the resulting public origin passes `scripts/verify-sovereign-production.mjs`.

## DNS

Point the chosen hostname at the server's public IP before expecting automatic TLS issuance from Caddy. DNS can be hosted by any provider. Cloudflare is not required.
