# ATLAS Enterprise Suite — Functional Local MVP v0.4.0

Private repository for the controlled ATLAS Enterprise Suite foundation.

## Local functional MVP

Run:

```bash
npm start
```

Open `http://127.0.0.1:4173`.

Demo access:

- Email: `demo@atlas.local`
- Password: `Atlas2026!`
- Verification code: `246810`

The local application now includes functional navigation, local persistence, record creation/editing/deletion, search, audit logging, CSV export and JSON backup/restore for:

- ATLAS Core and multi-company workspaces
- CRM & Sales
- Invoices & Accounts Receivable
- Expenses & Accounts Payable
- Accounting & General Ledger
- Inventory
- HR & Payroll
- Reports & Intelligence
- Freight Network
- Documents & Sign
- **ATLAS Wallet** for masked identity, legal, professional, employment, membership, insurance and financial credentials
- **ATLAS Ride** for gig platforms, trips, deliveries, shopping activity, earnings, tips, mileage, costs and reconciliation
- **ATLAS Marketplace** for orders, merchants, operational cards, receipts and delivery status
- **ATLAS Rewards** for points, tiers, bonuses and redemptions
- ATLAS Cars
- ATLAS Health administrative tracking
- Public Safety
- Community Hub
- Module Center, Audit Trail and Settings

## ATLAS Wallet privacy boundary

The local MVP intentionally accepts only masked identifiers and limits locally stored credential images to small image files. Do not commit real identity documents, full card numbers, expiration security codes, immigration identifiers, medical records or other sensitive user data to this repository.

Browser data and uploaded previews are stored in local browser storage for demonstration. Production use requires encrypted private object storage, tenant isolation, row-level security, access logging, retention controls and verified recovery procedures.

## Supabase Private Beta Cloud

Open `/private-beta.html` after configuring `atlas-config.js`. The cloud foundation includes:

- Supabase Auth sign-in, signup, recovery and sign-out
- RLS-protected organization memberships and company switching
- PostgreSQL persistence for core financial and operational records
- Transactional invoice payments and balanced journal entries through protected RPC functions
- Automatic invoice balances, audit records and private document-storage policies
- Operation-specific write permissions and cross-organization integrity guards

The local functional module suite does not imply that every new module is already connected to the production cloud schema. Cloud activation and sensitive-document storage remain gated by migrations, security review and acceptance testing.

## Validation

```bash
npm run validate
```

## Activation boundary

Never commit a secret/service-role key, database password, provider token, full payment-card number, CVV, government identification number or unredacted personal document.

No real customer, financial, employee, health, banking or identity information should be entered into the cloud environment until tenant isolation, role controls, backup, recovery, encryption and pilot acceptance tests pass.
