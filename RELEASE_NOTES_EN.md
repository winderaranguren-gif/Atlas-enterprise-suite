# ATLAS Core 0.2.1 — Release Notes

## Database foundation prepared

ATLAS Core now includes a Supabase/PostgreSQL private-beta foundation in addition to the local browser MVP.

### Added

- Multi-company PostgreSQL data model.
- Supabase Auth profile integration.
- Organization membership and role model.
- Row Level Security for every application table.
- Customers, vendors, products, invoices, payments, expenses, accounting, employees, documents, modules, and audit history.
- Private organization-scoped document storage policies.
- Automatic invoice total and payment balance recalculation.
- Balanced journal-entry enforcement.
- Organization bootstrap RPC with starter modules, chart of accounts, and expense categories.
- Spanish and English setup documentation.
- Automated structural validation for the database package.

## Important limitation

The browser interface still uses localStorage. The database is prepared but is not yet connected to the UI, and no live Supabase project or public deployment is included in this release.


## 0.2.1 update

- Independent Supabase Auth sign-in, signup, and recovery surface.
- RLS-protected organization membership loading.
- Protected RPC for first-organization creation.
- Modern Supabase publishable-key configuration.
- `vercel.json` security headers and connection policy.
- Spanish and English authentication and deployment guides.
- The principal dashboard remains separated until cloud CRUD persistence is complete.
