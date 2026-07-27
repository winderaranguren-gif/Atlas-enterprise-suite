# ATLAS Enterprise Suite — ATLAS Core v0.2.3

Private repository for the first controlled ATLAS Core release.

## Functional now

- Demo login with six-digit verification.
- Multi-company switching and separated local records.
- Executive dashboard and KPIs.
- Customer management with search and CSV export.
- Invoices and accounts receivable.
- Expenses and accounts payable.
- Balanced journal-entry workflow.
- Inventory and service catalog.
- Employees and basic HR records.
- Executive reports with browser PDF printing.
- Module center, audit trail, settings, responsive layout, and PWA cache.

## Cloud foundation included

- Supabase/PostgreSQL multi-company schema.
- Row Level Security and role helpers.
- Private organization-scoped document storage.
- Supabase Auth test surface for sign-in, signup, recovery, memberships, and first-organization creation.
- Vercel configuration and GitHub Actions validation.
- Spanish and English setup, deployment, security, and acceptance-test guides.

## Run locally

```bash
npm start
```

Open `http://127.0.0.1:4173`.

### Demo credentials

- Email: `demo@atlas.local`
- Password: `Atlas2026!`
- Verification code: `246810`

## Current boundary

The operational dashboard still stores demo records in browser `localStorage`. The Supabase schema and real-auth surface are prepared, but operational CRUD must be connected to the founder-owned Supabase project before real customer, financial, employee, or health information is entered.

## Security controls

- Repository must remain private during Private Beta.
- Never commit Supabase secret/service-role keys, database passwords, or provider tokens.
- Only the Supabase project URL and publishable browser key may be placed in `atlas-config.js`.
- Changes should be reviewed before merging into `main`.

See `SECURITY.md`, `ARCHITECTURE.md`, `docs/REPOSITORY_STATUS.md`, and `docs/SUPABASE_TEST_PLAN.md`.
