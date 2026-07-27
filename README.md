# ATLAS Enterprise Suite — ATLAS Core v0.2.5

Private repository for the first controlled ATLAS Core release.

## Two working surfaces

### Local functional MVP

Open `/` for the local demo. It includes multi-company switching, dashboard, customers, invoices, expenses, accounting, inventory, employees, reports, modules, audit, settings, CSV export, and browser PDF printing. Demo data is stored in browser `localStorage`.

### Supabase Private Beta Cloud

Open `/private-beta.html` after configuring `atlas-config.js`. It includes:

- Supabase Auth sign-in, signup, recovery, and sign-out.
- RLS-protected organization memberships and company switching.
- Cloud dashboard and PostgreSQL persistence.
- Customers, invoices, payments, expenses, vendors, categories, inventory, employees, accounting, audit, and organization settings.
- Transactional invoice payments and balanced journal entries through protected PostgreSQL RPC functions.
- Automatic invoice balances, audit records, and private document-storage policies.
- Operation-specific write permissions and cross-organization integrity guards.

## Cloud foundation

- Four ordered Supabase/PostgreSQL migrations.
- Row Level Security and role helpers.
- Private organization-scoped document storage.
- Owner, admin, accountant, manager, staff, and viewer roles.
- Vercel configuration and GitHub Actions validation workflow.
- Spanish and English setup, deployment, security, and acceptance-test guides.

## Run locally

```bash
npm start
```

Open `http://127.0.0.1:4173`.

### Local-demo credentials

- Email: `demo@atlas.local`
- Password: `Atlas2026!`
- Verification code: `246810`

## Activation boundary

The cloud application code is complete but cannot connect until the founder-owned Supabase project exists, all four migrations are applied, and the project URL plus publishable browser key are placed in `atlas-config.js`. Never commit a secret/service-role key, database password, or provider token.

No real customer, financial, employee, health, or banking information should be entered until tenant isolation, role, backup, recovery, and pilot acceptance tests pass.
