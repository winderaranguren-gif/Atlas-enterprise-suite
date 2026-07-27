# Atlas target architecture

## Current MVP

- Frontend: HTML, CSS and JavaScript without external dependencies.
- Persistence: browser localStorage.
- Runtime: any modern browser; optional built-in Node.js static server.
- Security demonstration: password screen, simulated OTP and audit events.

## Production target

1. Web client: React/Next.js or equivalent component architecture.
2. API: TypeScript service layer with strict validation.
3. Database: PostgreSQL using tenant and company identifiers on every business record.
4. Identity: managed authentication, MFA, recovery and session revocation.
5. Authorization: role-based and policy-based permissions enforced on the server.
6. Storage: encrypted object storage for invoices, receipts, contracts and scans.
7. Messaging: transactional email and SMS providers.
8. Integrations: banking, payments, tax, payroll, maps and industry-specific providers.
9. Operations: automated tests, CI/CD, observability, backups and disaster recovery.
10. Compliance: documented controls, retention, privacy and industry-specific review.


## Database foundation prepared

The repository includes Supabase/PostgreSQL migrations implementing organization tenancy, authenticated memberships, role-aware RLS, customers, vendors, products, invoices, payments, expenses, accounting, employees, documents, audit history, and private storage. The current browser UI is not connected to this schema yet; that connection is the next implementation phase.


## Cloud authentication test surface

A separate `cloud-auth.html` surface now validates Supabase password sign-in, signup, password recovery, organization memberships, and organization creation. It remains separated from the localStorage dashboard so no one mistakes authenticated access for completed cloud persistence.
