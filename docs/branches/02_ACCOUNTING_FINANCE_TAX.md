# Branch 02 — Accounting, Finance & Tax

**Parent:** ATLAS Master Index & Genealogy  
**Lineage:** Human mission → ATLAS OS / Core → Accounting, Finance & Tax  
**Status:** living branch dossier  
**Rule:** this branch is the authoritative financial record layer of ATLAS. Other branches may reference financial records and derive reports, but may not create parallel ledgers.

---

## 1. Branch purpose

Accounting, Finance & Tax converts business events into controlled financial records and decision-ready financial statements. Its fruit is not a visual balance; its fruit is an auditable accounting fact: a balanced journal, an AP/AR balance, a reconciled bank account, a controlled budget, a closed accounting period, a tax obligation record or an asset register whose values can be traced back to authoritative entries.

## 2. Roots inherited

- Truthful financial records over decorative metrics.
- Organization + DBA tenant isolation.
- Least privilege for financial reads and writes.
- Balanced double-entry accounting.
- Immutable audit evidence for material mutations.
- No silent mutation of closed accounting periods.
- Reports derive from ledgers; reports do not become ledgers.
- Regulated execution is separated from ATLAS recordkeeping and workflow intelligence.

## 3. Trunk dependencies

| Trunk service | Required use |
|---|---|
| Authentication / session | Every protected finance workspace and API |
| Organization + DBA | Exact scope of every financial record |
| RBAC / tenant guard | `module.read` / `module.write` and action-specific evidence |
| Audit Ledger | Account, journal, bank, reconciliation, period and other mutation evidence |
| Enterprise / CRM / Operations | Source business context; not accounting authority |
| Documents | Supporting records and workpapers |
| Reports | Read-only cross-module/executive presentation |
| Release verification | Required before any source-implemented fruit is called production-LIVE |

## 4. Canonical sub-branches

### 4.1 Chart of Accounts — WORKING FRUIT

**Route:** `/platform/finance/general-ledger`  
**System of record:** `finance_accounts` in `migrations/0007_finance_core.sql`.  
**Runtime:** `modules/finance.js`.

ATLAS persists account code, name, type, normal balance, status and tenant scope. Account types are constrained to asset, liability, equity, revenue and expense.

**Fruit:** a controlled chart of accounts that anchors all journal lines.

### 4.2 General Ledger & Journals — WORKING FRUIT

**System of record:** `finance_journal_entries` + `finance_journal_lines`.  
**Runtime:** `modules/finance.js`.

ATLAS validates journals before posting: 2–100 lines, valid active accounts, mutually exclusive debit/credit per line, non-zero amounts and exact total debit = total credit.

**Fruit:** balanced, scoped, auditable double-entry postings.

**Invariant:** no other branch writes a financial balance directly; financial effects must resolve to Finance-owned records.

### 4.3 Accounts Payable — WORKING FRUIT / PARTIAL LIFECYCLE

**Route:** `/platform/finance/accounts-payable`  
**System of record:** `finance_bills`.

Current source persists vendor name, invoice number, issue/due dates, total, paid amount and status.

**Working fruit:** AP obligations and outstanding balances can be registered and reported.

**Green edge:** a complete payment/disbursement event model, payment-method ledger and purchase-order three-way match are not yet proven as a canonical durable chain.

### 4.4 Accounts Receivable — WORKING FRUIT / PARTIAL LIFECYCLE

**Route:** `/platform/finance/accounts-receivable`  
**System of record:** `finance_invoices`.

Current source persists customer name, invoice number, issue/due dates, total, received amount and status.

**Working fruit:** customer receivables and outstanding balances can be registered and reported.

**Green edge:** a complete cash-receipt allocation model and canonical Sales Order → Invoice lineage still require maturation.

### 4.5 Banking Ledger — WORKING FRUIT

**Route:** `/platform/finance/banking`  
**System of record:** `finance_bank_accounts` + `finance_bank_transactions` in `migrations/0008_finance_controls.sql`.  
**Runtime:** `modules/finance-advanced.js`.

A bank account must link to an active asset GL account. Bank transactions can optionally link to posted journal entries.

**Fruit:** controlled internal banking records and visibility into ledger-linked vs unlinked bank activity.

**Boundary:** this does not mean ATLAS is a bank or has live access to an institution. Real bank feeds / ACH execution require authorized connectors/providers.

### 4.6 Reconciliations — WORKING FRUIT

**Route:** `/platform/finance/reconciliations`  
**System of record:** `finance_reconciliations`.

A reconciliation computes ledger-side bank balance from opening seed + posted bank transactions. Completion is blocked unless:
- reconciliation difference is exactly zero; and
- no posted bank transactions through the statement date remain unlinked to a journal entry.

**Fruit:** a defensible reconciliation close, not a cosmetic “reconciled” checkbox.

### 4.7 Budgets & Variance — WORKING FRUIT

**Route:** `/platform/finance/budgets`  
**System of record:** `finance_budgets` + `finance_budget_lines`.  
**Runtime:** `modules/finance-advanced.js` and `modules/finance-reporting.js`.

ATLAS persists annual budgets by account/month and derives actual-vs-budget variance from posted journal activity.

**Fruit:** budget control linked to the same chart of accounts and ledger.

### 4.8 Financial Statements — WORKING FRUIT

**Route:** `/platform/finance/statements`  
**Runtime:** `modules/finance-statements.js` and corrected reporting logic in `modules/finance-reporting.js`.

ATLAS derives:
- income statement;
- balance sheet;
- current earnings;
- balance difference;
- beginning/net/ending cash movement;
- count of unlinked bank transactions.

**Fruit:** statements derived from posted journals and bank activity under the selected Organization/DBA.

**Invariant:** statement numbers are calculations over authoritative ledgers, never independently editable values.

### 4.9 Accounting Periods / Close Controls — WORKING FRUIT

**System of record:** `finance_accounting_periods` via `migrations/0009_finance_reporting_controls.sql`.  
**Runtime:** `modules/finance-reporting.js`.

ATLAS prevents posting into a closed period. Period close checks include unbalanced journal evidence and posted bank transactions that remain unlinked to GL. Reopening requires elevated role authority plus a reason and audit evidence.

**Fruit:** period integrity and controlled reopen history.

### 4.10 Tax Obligation Register — WORKING FRUIT

**Route:** `/platform/finance/taxes`  
**System of record:** `finance_tax_items`.  
**Runtime:** `modules/finance-advanced.js`.

ATLAS can register tax type, jurisdiction, period, due date, amount due/paid, status and notes.

**Fruit:** organization/DBA tax obligation tracking and supporting accounting context.

**Boundary:** a tax-item record is not a filed federal/state return and is not proof of IRS/state acceptance.

### 4.11 Tax Compliance Capability — GREEN FRUIT

Capability Fusion contains a Tax Compliance workflow inspired by due-diligence patterns and connects it to the Finance Taxes workspace.

**Fruit today:** structured review/checklist/scenario experience.

**Missing for ripe status:** versioned authoritative rule sources, durable case/evidence persistence where needed, jurisdiction/year rule packs and validated pre-filing controls.

### 4.12 Tax Pro / Preparation Workspace — GREEN FRUIT

Capability Fusion contains a client tax-preparation workflow and bridge to Finance Taxes.

**Fruit today:** ATLAS-native tax preparation workflow foundation.

**Missing for ripe status:** complete tax-form calculation engine, tax-year schema versioning, signed client/evidence package, validated diagnostics, return-generation and licensed e-file transmission adapter.

### 4.13 E-file / Government Transmission — PARTNER-BOUND

ATLAS may prepare, validate, package, track and audit a return submission workflow. Actual electronic transmission to tax authorities must use authorized channels/providers and must not be represented as active until integration is verified.

### 4.14 Fixed Assets — WORKING FRUIT / LIMITED METHOD

**Route:** `/platform/finance/fixed-assets`  
**System of record:** `finance_fixed_assets`.

ATLAS persists asset tag, cost, salvage value, useful life, acquisition/disposal data and status. Current schema limits depreciation method to straight-line.

**Working fruit:** fixed-asset register and straight-line depreciation view.

**Green edge:** additional book/tax methods, conventions, bonus/Section 179 logic and disposal journal automation are future fruit.

### 4.15 Cash Disbursement / Receipt Allocation — GREEN FRUIT

AP and AR store paid/received amounts, but a complete canonical payment-event allocation system is not yet evidenced in the Finance core API.

**Required lineage:** payment/receipt event → bank transaction → AP/AR allocation → GL journal → reconciliation → audit.

### 4.16 Live Bank Feeds / Payments — PARTNER-BOUND

Bank connectivity, ACH/card/wallet execution and merchant acquiring are regulated/external execution layers. ATLAS owns orchestration, controls, accounting consequences and evidence; authorized providers own actual fund movement.

### 4.17 Multi-currency / Consolidation — GREEN FRUIT

Bank records include a currency code, but a complete FX remeasurement/translation and multi-entity consolidation engine is not yet evidenced as a canonical ledger capability.

### 4.18 Corporate Cost / Commission Models — GREEN FRUIT

Historical ATLAS design includes profitability-based commissions, freight and attributable costs for Global Promo/Global World. These calculations should consume authoritative Finance + Sales/Enterprise data and publish explainable calculation evidence rather than create a parallel ledger.

---

## 5. Authoritative object ownership

| Object | Owner | Notes |
|---|---|---|
| Chart of account | Finance | canonical financial account master |
| Journal entry / line | Finance | canonical double-entry ledger |
| Bill / AP balance | Finance | accounting obligation |
| Invoice / AR balance | Finance | accounting receivable |
| Bank account / bank transaction | Finance | internal bank ledger; not live institutional access by implication |
| Reconciliation | Finance | completion subject to zero-difference + linked-bank controls |
| Budget / budget line | Finance | tied to finance accounts |
| Accounting period | Finance | controls posting availability |
| Tax obligation item | Finance | accounting/tax tracking, not filed-return acceptance |
| Fixed asset | Finance | current straight-line method |
| Financial statement | Derived Finance report | never editable source data |
| Customer master / opportunity | CRM | referenced by Finance when mature integration exists |
| Vendor operational profile | Operations | referenced by Finance when mature integration exists |
| Purchase order | future Procurement / Enterprise | not to be replaced by AP bill |
| Sales order | future Commercial Orders / Enterprise | not to be replaced by AR invoice |

## 6. Fruit chains

### Record-to-report
`Business event → Journal/Subledger → Posted GL → Period controls → Financial statements → Reports`

### Bank-to-book
`Bank activity → Finance bank transaction → journal linkage → reconciliation → closed evidence`

### Procure-to-pay financial segment
`[Enterprise Purchase Order] → receipt → Finance bill/AP → [future payment allocation] → bank/journal → reconciliation`

### Order-to-cash financial segment
`[Enterprise Sales Order] → Finance invoice/AR → [future receipt allocation] → bank/journal → reconciliation`

### Tax lineage
`Accounting records → tax obligation/workpapers → Tax Compliance review → Tax Pro preparation → validated submission package → authorized e-file adapter`

## 7. Maturity matrix

| Sub-branch | Durable source | Controls / audit | Classification |
|---|---:|---:|---|
| Chart of Accounts | Yes | Yes | WORKING FRUIT |
| General Ledger / Journals | Yes | Yes + balance rule | WORKING FRUIT |
| AP | Yes | Yes | WORKING FRUIT / partial lifecycle |
| AR | Yes | Yes | WORKING FRUIT / partial lifecycle |
| Banking ledger | Yes | Yes | WORKING FRUIT |
| Reconciliations | Yes | Yes + zero/unlinked guards | WORKING FRUIT |
| Budgets / variance | Yes | Yes / derived | WORKING FRUIT |
| Financial statements | Derived from ledger | Read-only | WORKING FRUIT |
| Period close/reopen | Yes | Elevated controls + audit | WORKING FRUIT |
| Tax obligation register | Yes | Yes | WORKING FRUIT |
| Tax Compliance | Workflow foundation | Partial | GREEN FRUIT |
| Tax Pro | Workflow foundation | Partial | GREEN FRUIT |
| E-file | No native transmission claim | Partner required | PARTNER-BOUND |
| Fixed assets | Yes | Yes | WORKING FRUIT / straight-line only |
| Payment / receipt allocation | Not proven canonical | — | GREEN FRUIT |
| Live bank feeds / fund movement | No native regulated execution claim | Provider required | PARTNER-BOUND |
| Multi-currency / consolidation | Partial primitives | — | GREEN FRUIT |

## 8. Accounting invariants

1. Every posted journal must balance exactly.
2. Financial statements derive from posted records; they are not independently editable.
3. A closed accounting period blocks new journal posting into that date range.
4. Reconciliation cannot complete with a non-zero difference.
5. Reconciliation cannot complete while posted bank activity remains unlinked to GL.
6. Other ATLAS branches may reference Finance records but may not maintain duplicate accounting balances.
7. AP bills do not substitute for Purchase Orders; AR invoices do not substitute for Sales Orders.
8. A tax obligation record does not imply tax-return filing or authority acceptance.
9. A bank-account record does not imply a live bank connection.
10. Fund movement, e-file and other regulated execution require authorized adapters/providers.

## 9. Next fruit sequence

### F1 — Payment & receipt allocation ledger
Create canonical payment/receipt events with allocations against AP/AR, bank linkage, GL posting and reconciliation traceability.

### F2 — Counterparty referential integrity
Migrate from free-text-only vendor/customer names toward optional canonical CRM/Operations counterparty references without destroying historical snapshots.

### F3 — Enterprise transaction integration
Bind future Purchase Orders and Sales Orders to AP/AR through explicit reference contracts rather than name/number conventions.

### F4 — Tax evidence model
Create tax-case/workpaper/evidence objects with tax year, jurisdiction, rule-source version, reviewer, diagnostics and immutable submission history.

### F5 — Tax calculation / filing boundary
Define internal calculation engine contracts separately from authorized e-file transmission adapters.

### F6 — Fixed-asset maturity
Add book/tax depreciation layers, conventions, disposals and journal-generation controls.

### F7 — Multi-currency and consolidation
Define currency, FX source/effective date, realized/unrealized gain/loss, entity elimination and consolidation evidence.

## 10. Definition of ripe fruit

A Finance sub-branch is **RIPE FRUIT** only when its ledger/schema, authorization, audit evidence, validation gate and exact deployed release are verified for the stated environment. Any regulated execution must additionally have an authenticated authorized-provider integration and explicit status evidence.
