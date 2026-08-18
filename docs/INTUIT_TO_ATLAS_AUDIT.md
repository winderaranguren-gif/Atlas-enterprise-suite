# ATLAS — Intuit Enterprise Suite Full Software Intelligence Audit

Date: 2026-08-17
Method: public-source clean-room analysis. No proprietary code, branding, secrets, or pixel-copying.

## Public capability inventory observed

Intuit Enterprise Suite publicly presents financial management, multi-entity management, intelligent reporting, dimensional forecasting, AI agents, HR/payroll, payments/bill pay, construction, professional services, financial services, migration/onboarding, permissions, audit-ready controls, and industry-specific workflows.

Observed public behaviors include: consolidated reporting, shared multi-entity views, intercompany transactions and automatic eliminations, entity/location/subsidiary administration, multi-dimensional reporting, management reports, custom dashboards, KPIs, Spreadsheet Sync, dimensional forecasting, budgets, AI-generated forecasts, Accounting AI, Finance AI, reconciliation assistance, payroll AI, project-management AI, project profitability guidance, approval controls, and migration standardization.

## ATLAS classification

| Capability | Classification | ATLAS target |
|---|---|---|
| Multi-entity workspace | EXISTING + MEJORABLE | Expand Finance Firm/Multi-Entity into Enterprise Accounting |
| Consolidated P&L / BS / CF | RECONSTRUIBLE / NATIVO ATLAS | Consolidation engine with drilldown |
| Intercompany due-to/due-from | RECONSTRUIBLE / NATIVO ATLAS | Reciprocal entries and balancing rules |
| Automatic eliminations | RECONSTRUIBLE / NATIVO ATLAS | Source-linked elimination ledger |
| Shared chart of accounts | RECONSTRUIBLE / NATIVO ATLAS | Canonical COA + entity mappings |
| Entity hierarchy | RECONSTRUIBLE / NATIVO ATLAS | Legal / tax / operating hierarchies |
| Multi-country entities | NUEVA OPORTUNIDAD | Jurisdiction-aware global entity model |
| Multi-currency consolidation | MEJORABLE / NATIVO ATLAS | Functional/reporting currency + FX layers |
| Multi-dimensional reporting | EXISTING + MEJORABLE | Dimension engine across finance modules |
| Management reports | RECONSTRUIBLE | Report packs + narrative + charts |
| Custom dashboards / KPIs | EXISTING + MEJORABLE | Widget-based dashboard builder |
| Spreadsheet sync | REQUIERE EXTERNAL OR LOCAL CONNECTOR | Excel adapter; ATLAS remains source of truth |
| Dimensional forecasting | RECONSTRUIBLE | Forecast cube by entity/dimension |
| AI-generated forecasts | RECONSTRUIBLE | ATLAS Finance AI with evidence trail |
| Accounting AI | EXISTING + MEJORABLE | Categorization, anomaly, close and reconciliation assistant |
| Finance AI | EXISTING + MEJORABLE | Variance, forecast, scenario, management narrative |
| Payroll AI | EXISTING HR/PAYROLL + MEJORABLE | Exception collection and approval workflow |
| Project Management AI | EXISTING PROJECTS + MEJORABLE | Project setup, cost allocation and margin guidance |
| AP / AR automation | EXISTING + MEJORABLE | Approval, matching, credits, collections, batch operations |
| Revenue recognition | RECONSTRUIBLE | Rules/schedules with approval and audit trail |
| Fixed assets / prepaids | EXISTING + MEJORABLE | Automated schedules and postings |
| Custom roles / permissions | EXISTING CORE + MEJORABLE | Entity + role + action + approval-level RBAC |
| Audit-ready traceability | EXISTING + MEJORABLE | Immutable business event ledger |
| Guided migration | RECONSTRUIBLE | Import, mapping, standardization, validation and go-live checklist |
| Industry workflows | NUEVA OPORTUNIDAD | Industry packs layered on common core |
| Demo tours | RECONSTRUIBLE | ATLAS native interactive Demo Center |
| Contract pricing | RECONSTRUIBLE | ATLAS modular quote/configuration model |

## Canonical module merge

### ATLAS Enterprise Accounting
Owns multi-entity, consolidation, intercompany, eliminations, chart of accounts, dimensions, close, revenue recognition, currencies and audit drilldown.

### ATLAS Finance Intelligence
Owns dashboards, FP&A, budgets, forecasting, scenarios, cash, management reporting, Accounting AI and Finance AI.

### ATLAS AP / AR
Owns vendors, customers, bills, invoices, credits, approvals, matching, collections and payment state. Money movement remains behind licensed/authorized providers where legally required.

### ATLAS Projects & Job Costing
Owns projects, WIP, profitability, cost allocations, time/cost integration and industry project packs.

### ATLAS People
Owns HR, Payroll, Workforce, assessments and payroll exception workflows.

### ATLAS Commerce & Inventory
Owns items, inventory, purchase orders, sales orders, receipts, locations and logistics.

### ATLAS CRM / Customer Hub
Owns leads, customers, notes, tasks, activities, proposals, contracts, appointments, referrals, feedback and work requests.

## Global ATLAS improvements beyond the public reference

1. Native global entity model instead of US-only assumptions.
2. Legal, tax, reporting and operating hierarchies can differ without duplicating entities.
3. Functional, transaction and reporting currencies tracked separately.
4. Every AI suggestion carries source references, rationale, confidence and approval state.
5. Sensitive accounting actions require RBAC and configurable approval policies.
6. Provider-independent integrations: banks, payment rails, Excel, payroll and tax are adapters, not ATLAS source of truth.
7. Sovereign runtime support through ATLAS Node infrastructure.
8. Demo Center generated from real route metadata so demos cannot drift from product navigation.

## Navigation target

Finance
- Overview
- Accounting AI
- Bookkeeping
- Reconciliation
- Close Center
- General Ledger
- Multi-Entity
  - Entities
  - Hierarchies
  - Shared Chart of Accounts
  - Intercompany
  - Allocations
  - Eliminations
  - Consolidation
  - Currencies
- AP
- AR
- Revenue Recognition
- Fixed Assets & Prepaids
- Reporting
  - Financial Statements
  - Management Reports
  - KPI Builder
  - Custom Reports
  - Audit Drilldown
- FP&A
  - Budgets
  - Forecasts
  - Scenarios
  - Variance Analysis
  - Cash Planning
- Audit & Controls

## Demo strategy

Each module receives an ATLAS-native interactive tour:
Dashboard → context → action → drilldown → result → cross-module handoff.
The demo uses simulated/demo-state data clearly labelled as demonstration data and never claims to be live production data.

## Delivery phases

1. Enterprise Accounting route family + Demo Center.
2. Consolidation/intercompany data contracts.
3. Reporting/FP&A data contracts.
4. AP/AR workflow expansion.
5. Projects/Inventory/CRM integration.
6. AI evidence/approval framework.
7. Public website product pages and onboarding.
8. Persistence and production validation on authorized ATLAS runtime.
