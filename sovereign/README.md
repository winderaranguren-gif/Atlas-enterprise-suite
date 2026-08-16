# ATLAS Sovereign Core

ATLAS Sovereign Core removes GitHub and Cloudflare from the critical production path. They may remain mirrors/backups, never authorities.

## Components

- **ATLAS Forge** — Git repository authority, branches, commits, release metadata and deploy hooks. Uses native `git` repositories on ATLAS-controlled storage.
- **ATLAS Edge** — release registry, atomic promotion/rollback, health/readiness, reverse-proxy origin integration and deployment state.
- **Caddy** — replaceable TLS/reverse-proxy process at the network boundary. ATLAS configuration owns the routes; Caddy is not a source of truth.
- **PostgreSQL** — target database/auth system of record for the fully sovereign phase. Supabase remains a migration source until data/auth cutover is complete.

## Canonical flow

`change -> ATLAS Forge -> validation -> immutable release -> ATLAS Edge promote -> atlasenterprisesuite.com`

No GitHub Actions, Wrangler, Workers Builds or Cloudflare Worker is required by this flow.

## Host layout

```
/opt/atlas/
  forge/repos/       bare Git repositories
  releases/          immutable release directories
  current -> releases/<release-id>
  state/             deployment state
  logs/
/etc/atlas/
  atlas.env
  Caddyfile
```

## Required host

A Linux VPS/server with a public IPv4/IPv6 address, ports 80/443 reachable, and administrative access. DNS for `atlasenterprisesuite.com` must ultimately point at that host. DNS may stay with any registrar/provider; ATLAS does not require Cloudflare DNS.

## Security baseline

- services run as dedicated `atlas` user
- Forge and Edge bind to loopback by default
- bearer control token stored only in `/etc/atlas/atlas.env`
- production releases are immutable directories
- promotion is an atomic symlink switch
- rollback never rebuilds; it promotes a previously validated release
- GitHub/Cloudflare mirrors are outbound-only once Sovereign Core becomes authoritative

## Bootstrap

Run `sudo bash sovereign/bootstrap.sh` on the future ATLAS server. The bootstrap is intentionally idempotent and refuses to overwrite an existing secret configuration.
