# ATLAS — Production Deploy

Clean deployment line created after the full repository reset.

## Purpose
This branch is the new production deployment baseline for ATLAS. Only code and configuration that can be verified should be promoted here.

## Deployment targets
- Cloudflare Workers — application/API runtime
- Cloudflare D1 — relational application data
- Cloudflare R2 — document/backup object storage
- Cloudflare Assets — web application assets

## Production rules
1. English is the default UI language; language selection is explicit and persistent.
2. Organization and DBA scope is enforced server-side.
3. Secrets never live in source control.
4. A feature is not operational until its deployed path passes end-to-end verification.
5. Releases are tied to the exact deployed commit SHA.
6. Failed verification must not be promoted as production-ready.
7. Backups require integrity verification and a real restore drill before restore is called operational.

## Current status
Repository baseline created. Infrastructure bindings, application modules, deployment workflow, and E2E verification are not yet operational and must be rebuilt incrementally.
