# ATLAS Core Database Model

## Tenant boundary

`organizations` is the tenant root. Every operational table contains `org_id` and every
RLS policy checks active membership before returning data.

## Main relationships

- `auth.users` → `profiles`
- `organizations` ↔ `organization_members` ↔ `auth.users`
- `organizations` → customers, vendors, products, expenses, employees, documents
- customers → invoices → invoice lines
- invoices → payments
- organizations → chart of accounts → journal entries → journal lines
- organizations → settings and module activation
- all important entities → audit logs

## Production rules

1. The frontend uses only the Supabase anon/public key.
2. The service-role key is limited to trusted server jobs.
3. Every write includes the authenticated user's ID in `created_by` or `uploaded_by`.
4. Derived invoice totals are recalculated by database triggers.
5. Posted journal entries cannot remain unbalanced.
6. Private documents use organization-prefixed storage paths.
