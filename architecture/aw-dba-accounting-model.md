# ATLAS — AW Finance DBA Accounting & Consolidation Model

## Parent legal entity
AW Finance Advisory Solutions LLC

## Operating units / DBAs
- AW Finance / Accounting
- AW Tax Advisors
- PAPALERIA Studio & Print Lab
- Auron Men’s Care
- Clean Space Pro
- Winder Transportation
- United Hands for VZLA

> Legal status note: each name is treated in ATLAS as a DBA / operating unit unless and until a separate legal entity is verified.

## Core accounting rule
A single legal entity may contain multiple DBAs, but each DBA must maintain its own operational and accounting books inside ATLAS.

Each DBA must have its own:
- Customers and vendors
- Invoices and bills
- Accounts receivable and accounts payable
- Bank and cash activity
- Revenue and expenses
- Cost centers / departments
- General ledger dimensions
- Documents
- Users and role permissions
- Operational workflows
- Tax mappings where applicable
- Monthly close status
- Audit trail

## Company / DBA selector
ATLAS must expose a persistent company selector. A user selects the company or DBA they are working in and the application context changes without requiring a separate login.

Context examples:
- AW Finance Advisory Solutions LLC — Consolidated
- AW Finance / Accounting
- AW Tax Advisors
- PAPALERIA Studio & Print Lab
- Auron Men’s Care
- Clean Space Pro
- Winder Transportation
- United Hands for VZLA

Users only see units for which they have permission.

## Period close
ATLAS should support:
- Continuous bookkeeping
- Monthly pre-close
- Month-end close
- Quarter-end close
- Year-end close
- Reopening periods under controlled permission
- Close checklist by DBA
- Exceptions and unresolved reconciliation items

## Reporting levels
### Individual DBA reporting
Each DBA must support standalone:
- Trial Balance
- Profit & Loss
- Balance Sheet
- Cash Flow Statement
- AR Aging
- AP Aging
- General Ledger
- Budget vs Actual
- Department / cost-center reporting
- Tax-support schedules

### Parent / consolidated reporting
AW Finance Advisory Solutions LLC must support consolidated reporting across selected DBAs, including:
- Consolidated Trial Balance
- Consolidated P&L
- Consolidated Balance Sheet
- Consolidated Cash Flow
- Comparative performance by DBA
- Revenue / expense mix by DBA
- Cross-DBA dashboard and KPIs
- Elimination entries when needed

## ATLAS Intelligence close assistant
ATLAS Intelligence may assist by:
- Detecting unreconciled balances
- Flagging unusual journal entries
- Identifying missing accruals or recurring entries
- Comparing period-over-period changes
- Detecting duplicate or anomalous transactions
- Preparing proposed adjusting entries
- Preparing close checklists
- Drafting financial statement packages
- Preparing supporting workpapers
- Producing a certification / review workflow for a qualified accountant

## Professional certification rule
ATLAS may prepare, reconcile, analyze, assemble, and draft financial statements, but it must never falsely represent that the software itself is a licensed accountant, CPA, auditor, or independent assurance provider.

Any financial statements described as audited, reviewed, compiled, attested, or professionally certified must be approved and, where legally required, issued or signed by an appropriately licensed and independent accounting professional in accordance with the applicable engagement standards and jurisdiction.

ATLAS should retain:
- Preparer identity
- Reviewer identity
- Approver / accountant identity
- Version history
- Supporting workpapers
- Adjusting entries
- Sign-off timestamps
- Locked final-period package

## Target UX
The accounting experience should feel like one system with multiple books:

`ATLAS > Company Selector > DBA > Accounting / Operations`

At any moment the authorized user can switch to:

`ATLAS > AW Finance Advisory Solutions LLC > Consolidated`

and view the combined financial and operational position without destroying the separate books of each DBA.
