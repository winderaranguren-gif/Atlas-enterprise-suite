# ATLAS Enterprise Suite — Production Foundation v0.5.0

Private repository for the controlled ATLAS Enterprise Suite foundation across web, PWA and mobile targets.

## Current architecture

ATLAS uses one global product core rather than cloned applications by geography.

Resolution hierarchy:

`ATLAS Global Core -> Region -> Country -> Organization -> User`

The regional runtime is exposed through `window.ATLASRegionalNavigation`, persists the selected context locally and emits `atlas:region-changed` so modules can adapt dynamically.

Initial regional layers:

- ATLAS Global
- North America
- Central America
- Caribbean
- South America
- Europe
- Africa
- Asia
- Oceania
- Antarctica / Research

Regional and country differences should be implemented as configuration, policy, language, currency, compliance, public-sector, design and integration overrides. Do not fork the application into disconnected regional copies.

## Interface rules

- Navigation and module availability must be driven by the ATLAS runtime/registry, not fixed duplicated menus.
- Modules may be shown or hidden according to available capabilities, organization, user and regional context.
- The shell must remain responsive between desktop and mobile layouts.
- North America keeps the original ATLAS futuristic identity.
- Regional experiences may add their own visual layer without breaking the shared core or navigation model.

## Functional local foundation

Run:

```bash
npm start
```

Open `http://127.0.0.1:4173`.

Use only non-production test accounts in the local environment.

The local application includes functional navigation, local persistence, record creation/editing/deletion, search, audit logging, CSV export and JSON backup/restore for:

- ATLAS Core and multi-company workspaces
- CRM & Sales
- Invoices & Accounts Receivable
- Expenses & Accounts Payable
- Accounting & General Ledger
- Inventory
- HR & Payroll
- Reports & Intelligence
- Freight Network
- ATLAS Fleet Intelligence
- Documents & Sign
- ATLAS Wallet
- ATLAS Ride
- ATLAS Marketplace
- ATLAS Rewards
- ATLAS Cars
- ATLAS Health administrative tracking
- Public Safety
- Community Hub
- Module Center, Audit Trail and Settings

## ATLAS Technical Operations

ATLAS Technical Support includes autonomous diagnostics, safe reversible repair actions, exact blocker reporting, post-repair verification and a runbook planning engine.

ATLAS may execute allowlisted safe/reversible actions automatically, but it must not bypass access controls, deployment permissions, physical-access requirements or irreversible-action boundaries. It must report the exact blocker instead of claiming success.

## ATLAS Owned Core

ATLAS includes a local-first intelligence control plane that keeps core routing, classification, tool execution and lightweight memory under ATLAS control.

Provider priority is:

`ATLAS-native -> ATLAS self-hosted -> external provider (optional)`

External AI providers are disabled by default. The browser self-hosted adapter uses only same-origin ATLAS endpoints and does not require third-party API keys in client code.

Runtime components:

- `atlas-owned-core.js` — local classification, provider/tool registries, local memory and policy enforcement
- `atlas-local-inference-provider.js` — same-origin bridge for an ATLAS-controlled inference service
- `scripts/validate-owned-core.js` — repository gate that enforces provider isolation, loading and PWA availability
- `docs/ATLAS_OWNED_CORE.md` — architecture and operating boundary

The Owned Core does not claim that a frontier language model has been trained from scratch. Large-model training/inference still consumes compute, storage, bandwidth and electricity. The design instead keeps the orchestration layer owned by ATLAS and allows model runtimes or compatible open-weight models to run behind ATLAS-controlled infrastructure.

## ATLAS Fleet Intelligence boundary

`atlas-fleet-intelligence.html` provides an ATLAS-native fleet operations module with local demo telemetry. It supports vehicles, heavy equipment, trailers and tools, including geofence processing, utilization and maintenance indicators, route/event history and local exports.

Live production tracking requires an authorized telematics data feed and secure server-side configuration.

## Cloud foundation

Open `/private-beta.html` after configuring the environment-specific ATLAS configuration. The cloud foundation includes:

- authenticated sign-in and recovery flows
- organization memberships and company switching
- PostgreSQL persistence for core financial and operational records
- protected transactional functions for financial operations
- audit records and private document-storage policies
- operation-specific write permissions and cross-organization integrity guards

The local functional module suite does not imply that every module is already connected to the production cloud schema. Cloud activation remains gated by migrations, security review and acceptance testing.

## Production and deployment

Primary production hostnames are configured for:

- `https://atlasenterprisesuite.com`
- `https://www.atlasenterprisesuite.com`

Cloudflare deployment uses the repository build lifecycle so the distribution package is generated and validated before deployment.

## Validation

Run the complete repository validation pipeline with:

```bash
npm run validate
```

This validates JavaScript syntax, ATLAS Owned Core isolation, database/personal-intelligence packages, regional navigation structure and the production smoke suite.

For the production package:

```bash
npm run build
```

## Security boundary

Do not commit production secrets or unredacted sensitive personal, financial, health or identity information to this repository. Production data activation requires tenant isolation, role controls, backup, recovery, encryption and acceptance testing.
