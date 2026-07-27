# ATLAS Core — Supabase/PostgreSQL Database

## What is prepared

The `supabase/` directory contains the multi-company database and transaction layer for the ATLAS Core Private Beta Cloud. It covers users, organizations, memberships, customers, vendors, inventory, invoices, payments, expenses, accounting, employees, documents, modules, and audit history.

Data separation is enforced with Row Level Security (RLS). A user can only read an organization's records when that user has an active membership. Write access depends on the assigned role: owner, admin, accountant, manager, staff, or viewer.

## Files

- `migrations/202607270001_atlas_core_schema.sql`: tables, functions, controls, and RLS.
- `migrations/202607270002_atlas_storage.sql`: private document storage.
- `migrations/202607270003_atlas_cloud_operations.sql`: payment transactions, invoice balances, balanced journals, profile bootstrap, automatic audit, role hardening, and cross-organization guards.
- `migrations/202607270004_atlas_security_patch.sql`: trigger-safety fixes and final expense-category permissions.
- `seed.sql`: first-organization instructions without fake financial transactions.

## Supabase installation

1. Create a Supabase project under an account controlled by Winder.
2. Copy the project URL and publishable browser key into `atlas-config.js`.
3. Run migrations `001`, `002`, `003`, and `004` in order through the Supabase SQL Editor or CLI.
4. Add the deployed `/private-beta.html` URL to Supabase Auth Redirect URLs.
5. Open `/private-beta.html` and create or sign into a real user.
6. Create the first organization from the onboarding screen.
7. Verify with a second user and second organization that RLS blocks unauthorized access.

## Security

- Never expose `SUPABASE_SECRET_KEY`, a service-role key, database password, or administrative token in browser code.
- Never commit real passwords, secret keys, or provider tokens to GitHub.
- The `atlas-documents` bucket is private.
- Every stored file path starts with the organization's UUID.
- Accounting and payment writes require owner, admin, or accountant roles.
- Posted journal entries must have balanced debits and credits.
- Important record changes create immutable audit entries.
- Cross-organization foreign-key relationships are rejected by database triggers.

## Status

The code and migrations are prepared. The founder-owned Supabase project must still be activated, the four migrations applied, the two public browser values configured, and acceptance testing completed before real data is entered.
