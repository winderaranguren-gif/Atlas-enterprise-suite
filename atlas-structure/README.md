# ATLAS Canonical Repository Architecture

This directory is the architectural map for `AtlasEnterPriseSuite08-10-2026`. It does not relocate the proven v1.1 runtime yet; it defines where every capability belongs as ATLAS continues to converge.

```text
ATLAS/
├── apps/
│   ├── web/
│   ├── pwa/
│   ├── desktop/
│   └── mobile/
├── core/
│   ├── data-fabric/
│   ├── event-fabric/
│   ├── identity/
│   ├── intelligence/
│   ├── agent-fabric/
│   ├── work-graph/
│   ├── update-fabric/
│   ├── audit-evidence/
│   └── integration-gateway/
├── modules/
│   ├── enterprise/
│   ├── finance/
│   ├── payroll/
│   ├── hr/
│   ├── crm/
│   ├── projects/
│   ├── inventory/
│   ├── commerce-pos/
│   ├── documents/
│   ├── analytics/
│   ├── logistics/
│   ├── health/
│   ├── ride/
│   ├── cars/
│   ├── gps-4d/
│   ├── public-safety/
│   ├── calendar/
│   ├── music/
│   ├── video/
│   ├── voice/
│   ├── connect/
│   ├── education/
│   ├── community/
│   ├── elevator-operations/
│   └── design-studio/
├── platform/
│   ├── accessibility/
│   ├── localization/
│   ├── privacy/
│   ├── security/
│   ├── resilience/
│   ├── backup-export/
│   └── regionalization/
├── research/
│   ├── future-observatory/
│   ├── humanity-frontier-lab/
│   ├── health-frontiers/
│   ├── robotics/
│   └── space/
├── governance/
│   ├── constitution/
│   ├── originality-audit/
│   ├── release-gates/
│   └── rights-compliance/
├── infra/
│   ├── cloudflare/
│   ├── local-bridge/
│   ├── deployment/
│   └── update-channels/
└── history/
    ├── pr-ledger/
    └── migration-records/
```

## Update Fabric rule
Every deployable ATLAS surface participates in one release contract. Web/PWA can auto-apply validated same-origin releases. Native/desktop/mobile packages require a signed-package adapter and rollback. Module and design changes must increment the release manifest rather than requiring a new launcher or manual reinstall.

## Permanent launcher rule
The installed launcher is a stable bootstrapper. Product code, modules, configuration and approved design assets update behind it. Replacing the launcher is an exceptional migration, not the normal update mechanism.

## Safety rule
Automatic does not mean unvalidated. A release must pass validation/build/security gates before publication. Failed health verification must preserve the last known-good version or trigger rollback rather than promote a broken update.
