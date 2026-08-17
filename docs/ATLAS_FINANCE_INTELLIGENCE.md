# ATLAS Finance Intelligence

Status: implementation branch `feature/atlas-finance-ai-native`

## Product rule

ATLAS Finance Intelligence is an independent ATLAS implementation of modern AI-native accounting workflows. It may reproduce useful functional patterns, but it must not copy third-party source code, trademarks, proprietary model weights, private APIs, copyrighted visual assets, or confidential data.

## Implemented in v0.1

- Finance control-plane dashboard
- Double-entry general ledger and trial balance
- Bank transaction inbox
- CSV bank import
- Rule-assisted transaction category suggestions
- Review-before-post accounting workflow
- Reconciliation readiness workspace
- Month-end Close Center: Collect → Book → Reconcile → Schedule → Review → Report
- Fixed asset, prepaid, accrual, and deferred-revenue schedule engine
- Accounts payable / bill workflow: Inbox → Review → Approved → Paid
- Accounts receivable / invoicing and payment recording
- Live Profit & Loss, Balance Sheet, cash metrics, burn and runway
- Vendors and customers directory
- Finance document Vault intake surface
- Multi-entity / accounting-firm workspace
- Local financial analyst for cash, revenue, expenses, profit, AR, AP, runway, overdue invoices and close readiness
- Audit trail
- `/api/finance/capabilities`
- `/api/finance/health`

## Current persistence boundary

v0.1 stores prototype accounting data in browser local storage. This avoids pretending that a production database is connected when it is not. The next production step is tenant-scoped server persistence with immutable audit evidence and RBAC.

## Production architecture

1. Identity and tenant boundaries
2. ATLAS accounting database
3. Object storage for receipts, statements, invoices and contracts
4. Bank/card/payroll/payment ingestion adapters
5. Accounting inference service with confidence scoring and reviewer feedback
6. Reconciliation engine with source-document evidence
7. Schedule service for depreciation, amortization, accruals and revenue recognition
8. AP approval/payment orchestration
9. AR invoice delivery/payment collection
10. Financial reporting service
11. Scoped AI/agent tools and MCP layer
12. Audit, observability, backup, disaster recovery and compliance controls

## ATLAS improvements beyond the reference pattern

- Multi-entity consolidation as a first-class model rather than an add-on
- Native HR/payroll, inventory, POS, logistics and CRM handoffs into accounting
- Strong review-before-post controls for AI-generated entries
- Evidence links from every reconciliation and automated posting to its source
- Replaceable integration rails: ATLAS owns the ledger and business logic
- Offline-capable capture queue for receipts and transactions
- Bilingual and multi-country accounting presentation layer
- Configurable accounting policies by entity, jurisdiction and reporting framework
- Exception-first close dashboard with materiality thresholds
- Audit-safe agent actions with explicit scopes and reversible drafts

## Functional parity roadmap

### Phase 1 — v0.1 (implemented)
Core UX and accounting workflow engine using local prototype persistence.

### Phase 2 — production ledger
Tenant database, auth/RBAC, durable source records, period locks, audit events, attachments and server-side statements.

### Phase 3 — financial data rails
Banks/cards, payroll, payment processors, expense platforms and document email intake.

### Phase 4 — accounting intelligence
Confidence-scored categorization, vendor normalization, recurrence detection, anomaly detection, duplicate detection, schedule detection and reviewer learning.

### Phase 5 — close automation
Statement retrieval, evidence-backed reconciliation, schedule proposals, quality review agents, close assignments and stakeholder reporting packages.

### Phase 6 — payments and collections
Authorized payment rails, approval policies, ACH/check orchestration, invoice delivery, online payment collection and automated reminders.

### Phase 7 — accounting-firm operating system
Client migration, client plans, white labeling, team roles, practice tasks, firm model, capacity analytics and cross-client exception management.

## Non-negotiable accounting controls

- Every posting must balance debits and credits.
- AI suggestions must expose confidence and source evidence.
- Low-confidence classifications stay in review.
- Payments, destructive changes and period reopenings require explicit authorization.
- Closed-period changes create a traceable adjustment or reopening event.
- No fabricated account balances, transactions, vendors, statements or reconciliations.
- Tenant data must never cross entity boundaries.
