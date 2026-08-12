# ATLAS Enterprise Suite

Clean modular rebuild — 2026-08-11.

## Architecture

- `platform/` — shared runtime, auth contracts, audit contracts, deploy/readiness.
- `modules/identity/` — users, memberships, sessions, permissions.
- `modules/crm/` — CRM only.
- `modules/documents/` — documents only.
- `modules/accounting/` — accounting only.
- `modules/backups/` — backup/restore only.
- `modules/creative/` — ATLAS Creative Studio for generative image/video workflows, reusable characters and future media orchestration.
- `worker/index.js` — thin router only.
- `migrations/` — ordered D1 migrations.
- `public/` — English-first web shell with explicit language selection.
- `tests/` — module and end-to-end gates.

## Rule

A module is never marked operational until its deployed path passes end-to-end verification. Repeated failure in one module is isolated to that module; healthy modules are not rewritten to compensate.

## Current state

Core deployment baseline only. Commercial modules are being rebuilt one at a time and are not yet operational.
