# ATLAS — Production Foundation v0.5.0

Private repository for the controlled ATLAS foundation across web, PWA and mobile targets.

## Production architecture

ATLAS uses one global core rather than cloned applications. The runtime hierarchy remains:

`ATLAS Global Core -> Region -> Country -> Organization -> User`

The product source of truth is no longer a browser demo store. Production access uses real authentication, organization membership, Row Level Security and the ATLAS production data fabric.

### Horizontal layers

- **ATLAS Identity** — authenticated sessions, organizations, memberships and roles.
- **ATLAS Data Fabric** — organization-scoped relational data, specialized module records, private documents and offline operation queue.
- **ATLAS Event Fabric** — cross-module events and audit-ready operational traces.
- **ATLAS Intelligence** — central signals, workflow orchestration and cross-module reasoning contracts.
- **ATLAS Automation** — production workflow definitions/runs, dynamic forms and outbox contracts.
- **ATLAS Integration Hub** — connector metadata with server-side secret references; provider execution is enabled only when authorized/configured.

Twenty-seven ATLAS modules are registered and active for the initial production tenant. A module may use a dedicated relational schema or the shared organization-scoped production record backend. External provider status is separate from internal module activation.

## Core production modules

Dedicated relational data is used for:

- CRM / customers
- finance / invoices and payments
- accounting / chart of accounts and journals
- expenses / vendors
- inventory / products
- HR / employees
- documents / private storage

Shared production module records currently support specialized modules such as payroll, projects, POS, field operations, Ride, Marketplace, Freight, Cars, Wallet, Rewards, Education, Health, Safety, Community and Technical Support while dedicated schemas are introduced only when their domain requirements justify them.

## ATLAS Intelligence

`atlas-intelligence-core.js` is the central orchestration layer. It consumes ATLAS Event Fabric events, creates intelligence signals, executes organization-scoped workflows and routes governed work into the production outbox.

Supported workflow actions currently include:

- `create_record`
- `emit_event`
- `signal`
- `outbox`

ATLAS-owned orchestration is preferred over duplicating third-party automation engines.

## Offline behavior

IndexedDB is used as an offline operation queue. It is not the production source of truth. When connectivity returns, queued writes are replayed against the authenticated production backend and remain subject to RLS and server-side constraints.

## Automation & Field Operations

`atlas-automation-field-ops.html` is connected to the production fabric for:

- workflows
- dynamic form definitions/submissions
- connector registry
- field sales/collections records
- GPS evidence
- Analytics 360 event visibility
- RLS-limited exports

External connectors are never presented as connected until their required credentials and server/device adapters exist.

## Regional runtime

The regional runtime is exposed through `window.ATLASRegionalNavigation`. Regional and country differences should be configuration, policy, language, currency, compliance, public-sector, design and integration overrides. Do not fork the product into disconnected regional copies.

Initial regional layers remain North America, Central America, Caribbean, South America, Europe, Africa, Asia, Oceania and Antarctica/Research.

## Interface rules

- Navigation and module availability are driven by the production module registry.
- Modules may be shown or hidden according to capability, organization, user and regional context.
- The shell remains responsive across desktop and mobile layouts.
- Disconnected specialty surfaces must not be promoted as production navigation until they are connected to production contracts.

## Identity and access

Main application: `/`

Identity surface: `/cloud-auth.html`

There are no demo credentials or fake OTPs in the production entry. Browser configuration may include the Supabase project URL and publishable key only. Service-role keys, database passwords, OAuth client secrets, payment secrets and provider credentials must remain server-side.

## External/provider boundary

Provider-dependent capabilities remain explicitly **DISCONNECTED** until credentials, hardware or compliance configuration are available. Issue #85 tracks this layer horizontally: OAuth/OIDC/SSO, secure API proxying, database adapters, webhooks, payments, e-invoicing, messaging, maps/geofences, Bluetooth printing, ETL/warehouse, optional external AI providers and related SDK/runbooks.

ATLAS may study publicly described product capabilities as functional research, but must not copy proprietary source code, copywriting, branding or assets.

## Validation

Run:

```bash
npm run check:production-fabric
npm run validate
npm run build:prod
```

The production release gate checks the new data/intelligence fabric and rejects demo credentials and the legacy local runtime boot path.

## Database migrations

Historical migrations are applied in timestamp order, followed by the production-horizontal migrations:

- `202608090001_atlas_horizontal_production_fabric.sql`
- `202608090002_bootstrap_atlas_production_tenant.sql`
- `202608090003_atlas_horizontal_fabric_hardening.sql`

These migrations are already applied to the connected ATLAS Supabase project.

## Technical Operations

ATLAS Technical Support may perform allowlisted safe/reversible operations, but it must not bypass access controls, deployment permissions, physical-access requirements or irreversible-action boundaries. It must report real blockers instead of claiming success.

## Commercial sequence

1. **ATLAS Business Core** — Finance + CRM + Automation/Intelligence.
2. **ATLAS Operations Intelligence** — Inventory + Field Ops + Fleet/Logistics.
3. **ATLAS Intelligence Platform** — Event Fabric + Automation Studio + Analytics 360 + governed connectors.

High-potential follow-ons include Inventory Intelligence/Pallet Spatial Count, Fleet Intelligence/GPS 4D, Financial Template Studio/Tax & Audit workflows and Technical Support/Resilience/Accessibility. Health remains strategically significant but requires a separate regulatory/security release program before external commercial use.

## Security boundary

Do not commit production secrets or unredacted sensitive personal, financial, health or identity information to this repository. Production data remains protected by tenant isolation, role controls, server-side constraints, audit, backup/recovery policies and release validation.
