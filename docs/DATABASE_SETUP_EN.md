# ATLAS Core — Supabase/PostgreSQL Database

## What is prepared

The `supabase/` directory contains a multi-company database for the ATLAS Core Private Beta.
It covers users, organizations, memberships, customers, vendors, inventory, invoices,
payments, expenses, accounting, employees, documents, modules, and audit history.

Data separation is enforced with Row Level Security (RLS). A user can only read an
organization's records when that user has an active membership. Write access depends on
the assigned role: owner, admin, accountant, manager, staff, or viewer.

## Files

- `migrations/202607270001_atlas_core_schema.sql`: tables, functions, controls, and RLS.
- `migrations/202607270002_atlas_storage.sql`: private document storage.
- `seed.sql`: first-organization instructions without fake financial transactions.

## Supabase installation

1. Create a Supabase project under an account controlled by Winder.
2. Store `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` in protected hosting variables.
3. Run migration `001`, followed by `002`, through the Supabase SQL Editor or CLI.
4. Create a real user through Supabase Auth.
5. Sign in as that user and call `create_organization` from the application.
6. Verify that a user without membership cannot read the organization's records.

## Security

- Never expose `SUPABASE_SECRET_KEY` in browser code.
- Never commit real passwords, keys, or tokens to GitHub.
- The `atlas-documents` bucket is private.
- Every stored file path starts with the organization's UUID.
- Accounting and payment writes require owner, admin, or accountant roles.
- Posted journal entries must have balanced debits and credits.
- Important record changes create audit entries.

## Status

This package prepares the infrastructure. The real Supabase project must still be created,
the migrations must be applied, and the frontend must be connected with the project's public credentials.
