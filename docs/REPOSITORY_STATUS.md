# Repository status

## Current version

- Product: ATLAS Core
- Version: v0.2.3
- Release channel: Private Beta preparation
- Default branch: `main`
- Repository visibility: private

## Completed

- Private GitHub repository under the founder's account.
- Functional browser MVP with local persistence.
- Multi-company UI and principal operational modules.
- Customer, invoice, expense, inventory, employee, journal, report, audit, and settings workflows.
- Repository security files and proprietary license.
- Automated JavaScript, database-package, and server smoke validation.
- Supabase/PostgreSQL multi-tenant schema.
- Row Level Security and role helpers.
- Private document storage policies.
- Balanced-journal validation helper.
- Organization bootstrap RPC.
- Independent Supabase Auth test surface.
- Spanish and English database, authentication, deployment, and acceptance-test guides.
- Vercel deployment configuration.

## External activation still required before internet launch

1. Create or confirm the founder-owned Supabase project.
2. Apply the two SQL migrations in order.
3. Place only the Supabase project URL and publishable key in `atlas-config.js`.
4. Test tenant isolation and roles with at least two users.
5. Connect operational CRUD from browser localStorage to Supabase.
6. Import the private GitHub repository into Vercel and deploy a Preview environment.
7. Run security, backup, recovery, and pilot-user acceptance tests.
8. Connect the official domain only after Private Beta approval.

No real customer, financial, employee, health, or banking data should be entered until these activation and acceptance steps pass.
