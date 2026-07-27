# Repository status

## Current version

- Product: ATLAS Core
- Version: v0.2.5
- Release channel: Private Beta activation
- Default branch: `main`
- Repository visibility: private

## Completed in code

- Private GitHub repository under the founder's account.
- Functional local browser MVP.
- Independent Supabase Private Beta Cloud application.
- Supabase Auth, real sessions, signup, password recovery, memberships, and organization creation.
- Cloud CRUD for customers, invoices, payments, expenses, inventory, employees, journals, audit, and organization settings.
- Multi-company PostgreSQL schema and Row Level Security.
- Role helpers for owner, admin, accountant, manager, staff, and viewer.
- Operation-specific mutation policies so read-only users cannot change data.
- Cross-organization relationship guards.
- Protected RPC for invoice payments and balanced journal entries.
- Automatic invoice balances and audit triggers.
- Private document-storage policies.
- Repository security files, proprietary license, CI workflow, Vercel configuration, and bilingual guides.
- Local JavaScript, database-package, and server smoke validations.

## External activation required before internet launch

1. Create or confirm the founder-owned Supabase project.
2. Apply migrations `001`, `002`, `003`, and `004` in order.
3. Place only the Supabase project URL and publishable key in `atlas-config.js`.
4. Test tenant isolation and every role with at least two users and two organizations.
5. Import the private GitHub repository into Vercel and deploy a Preview environment.
6. Run security, backup, recovery, and pilot-user acceptance tests.
7. Connect the official domain only after Private Beta approval.

No real data should be entered until those activation and acceptance gates pass.
