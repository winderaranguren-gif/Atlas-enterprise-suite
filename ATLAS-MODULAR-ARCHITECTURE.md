# ATLAS Modular Architecture v2

Status: replacement architecture for the previous monolithic layout.

## Principles
- Every domain is isolated under `modules/<module>/`.
- Shared code belongs only in `modules/core/` or `packages/shared/`.
- Each module owns its API, tests, configuration, documentation and deployment boundary.
- A failure in one domain must not require changes to unrelated domains.
- Cross-module communication should use explicit contracts/events rather than direct internal coupling.
- Duplicate domain modules are not allowed: extend or merge into the canonical module instead of creating a second implementation.

## Modules
- core
- dashboard
- accounting
- finance
- payroll
- hr
- health
- communications
- media
- documents
- knowledge
- operations
- commerce
- enterprise
- mobility
- gps
- logistics
- energy
- water
- security-emergency
- public-services
- agriculture
- industry
- tourism
- democracy
- special
- ai
- api-gateway
- auth
- database
- backups

## Standard module layout
Each module should converge on:

```text
modules/<name>/
  src/
  api/
  tests/
  config/
  docs/
  README.md
```

This branch is the canonical modular rebuild line: `atlas-modular-v2`.
