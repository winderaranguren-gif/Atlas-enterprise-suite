# Atlas Enterprise Suite — Functional MVP

This package is a runnable local MVP of the Atlas Core concept: one modular platform for multiple companies and industries.

## Included now

- Secure demo login plus a simulated six-digit verification code.
- Multi-company switching with separate operational records.
- Dashboard with KPIs, charts, recent invoices and activity.
- Customer CRM with create, edit, delete, search and CSV export.
- Invoices and accounts receivable with payment confirmation.
- Expenses and accounts payable.
- General ledger with balanced journal entries.
- Inventory and service catalog.
- Employees and HR records.
- Executive report with browser PDF printing.
- Users, roles and company access.
- Modular solution center for POS, CleanScan 3D, RideCare, Knowledge Atlas, United Hands Hub, Health Portal and Atlas Mail.
- Audit trail, security settings, language switch and browser persistence.
- Responsive layout and PWA cache support.

## Run on Windows

1. Install Node.js 18 or newer from the official Node.js website.
2. Extract this folder.
3. Double-click `start-atlas.bat`.
4. Open `http://127.0.0.1:4173` if it does not open automatically.

## Run on macOS or Linux

```bash
cd atlas-enterprise-suite-mvp
./start-atlas.sh
```

Then open `http://127.0.0.1:4173`.

## Demo credentials

- Email: `demo@atlas.local`
- Password: `Atlas2026!`
- Verification code: `246810`

## Important production note

This MVP stores data in the browser's local storage. It demonstrates the user experience and core workflows, but it is not yet a production accounting system. A production release needs a protected backend API, PostgreSQL or another managed database, encrypted secrets, real email/SMS providers, backups, multi-tenant authorization enforcement, testing, logging, deployment, and compliance review.

## Repository controls

- The official repository must remain **private** during the Private Beta phase.
- Real secrets belong in protected hosting environment variables, never in Git.
- Changes should be made through branches and reviewed before merging into `main`.
- GitHub Actions validates JavaScript syntax and performs a server smoke test on each push and pull request.

See [`SECURITY.md`](SECURITY.md), [`ARCHITECTURE.md`](ARCHITECTURE.md), and [`docs/REPOSITORY_STATUS.md`](docs/REPOSITORY_STATUS.md).

## Cloud database foundation

The `supabase/` directory now contains the PostgreSQL schema, Row Level Security policies, private document storage policies, accounting controls, audit trail, and organization bootstrap function planned for ATLAS Core v0.2.0. See the Spanish and English setup guides in `docs/`.


## Cloud authentication test surface

Open `cloud-auth.html` after configuring `atlas-config.js` to validate Supabase password authentication, signup, recovery, organization memberships, and the protected organization-creation RPC. This is deliberately separate from the localStorage dashboard until the production CRUD adapter is complete.
