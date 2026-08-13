# ATLAS Backups & Recovery

Canonical backup and recovery module for ATLAS.

This module owns backup snapshots, integrity verification, organization/DBA scoping, R2 object protection, empty-only restore behavior, continuity and recovery operations.

## Runtime contract
- Storage: D1 + R2
- Scope: `organization_id` + `dba_id`
- Restore policy: `empty_only`
- Routes:
  - `GET /api/backups`
  - `POST /api/backups`
  - `POST /api/backups/:id/verify`
  - `POST /api/backups/:id/restore`

`modules/backups/routes.js` is the single canonical runtime implementation. Do not create a second backup/recovery adapter module; extend this module instead.