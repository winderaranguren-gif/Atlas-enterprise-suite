# ATLAS Production Horizontal Roadmap

## Decision

ATLAS no longer treats browser demo/local state as the product source of truth. The production architecture is horizontal: shared identity, organization boundaries, persistence, events, workflows, intelligence, audit and offline delivery are built once and reused across modules.

## Production foundation now implemented

- Supabase Auth session and organization membership.
- Row Level Security tenant boundaries.
- Production module registry with explicit backend assignment.
- Relational core for CRM, finance/accounting, inventory, HR and documents.
- Generic production module records for specialized modules that do not yet justify dedicated relational schemas.
- ATLAS Event Fabric for cross-module events.
- ATLAS Intelligence for signals and workflow orchestration.
- Production workflows and workflow runs.
- Connector registry containing metadata and server-side secret references only.
- Outbox contract for provider delivery/retry workers.
- IndexedDB offline write queue; browser localStorage is not the operational source of truth.
- Private document storage through the ATLAS documents bucket.
- Audit triggers on operational writes.
- Production release gate that rejects demo credentials and legacy local runtime boot.

## Backend assignment

Core relational backends: core, CRM, finance, accounting, inventory, HR, documents.

Shared production record backend: payroll, wallet, rewards, ride, marketplace, freight, cars, health, safety, community, projects, POS, education, field operations, calendar/support extensions where appropriate.

Dedicated system backends: security/identity, automation/workflow engine, analytics/event stream and intelligence/event stream.

## Provider adapters still requiring external authorization or device capabilities

These are not represented as active until the corresponding credentials, compliance configuration or supported hardware are available:

- OAuth/OIDC provider connections and enterprise SSO providers.
- External REST/API execution through a server proxy.
- Database connectors for PostgreSQL, MySQL, SQL Server, Oracle and MariaDB.
- Signed webhook delivery workers and retry processing.
- Payment-provider token/reference adapters.
- Electronic invoicing providers and jurisdiction-specific compliance (including FEL only when authorized/configured).
- Email/SMS delivery provider adapters.
- Interactive mapping/routing/geofencing providers where external map data is required.
- Bluetooth receipt/voucher printer device adapters.
- External ERP/CRM/cloud connector implementations.
- ETL/warehouse destinations.
- External AI/ML/NLP providers where ATLAS local/native intelligence cannot satisfy the workload.

ATLAS will implement open standards and its own orchestration layer rather than reproducing proprietary third-party implementations.

## Commercial product sequence

1. ATLAS Business Core — Finance + CRM + Automation/Intelligence.
2. ATLAS Operations Intelligence — Inventory + Field Ops + Fleet/Logistics.
3. ATLAS Intelligence Platform — Event Fabric + Automation Studio + Analytics 360 + governed connectors.

High-potential follow-ons: Inventory Intelligence/Pallet Spatial Count, Fleet Intelligence/GPS 4D, Financial Template Studio/Tax & Audit workflows, enterprise Technical Support/Resilience/Accessibility. ATLAS Health remains strategically high-potential but should not be a first external commercial release because health data and clinical workflows require a separate regulatory/security program.
