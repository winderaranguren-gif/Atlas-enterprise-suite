# ATLAS Core Supabase Acceptance Test Plan

## Purpose

These tests must pass before the Private Beta stores real customer or financial data.
Run them in a staging Supabase project, never for the first time in production.

## Test identities

Create three test users:

- User A: owner of Organization A.
- User B: staff member of Organization A.
- User C: owner of Organization B with no membership in Organization A.

## Required tests

### Authentication

1. A verified user can sign in and recover access.
2. An unverified or disabled user cannot access protected application routes.
3. Signing out invalidates the browser session.

### Tenant isolation

1. User A can read Organization A records.
2. User C cannot read, insert, update, or delete Organization A records.
3. User A cannot attach an Organization B customer to an Organization A invoice.
4. User A cannot attach an Organization B account to an Organization A journal line.
5. A document stored under Organization A's UUID cannot be downloaded by User C.

### Roles

1. Owner and admin can manage organization members and settings.
2. Accountant can manage payments, expenses, accounts, and journals.
3. Staff can manage ordinary business records but cannot delete accounting records.
4. Viewer has read-only access.
5. Staff cannot read another employee's restricted HR record unless explicitly authorized.

### Accounting controls

1. A draft journal entry may be incomplete.
2. An unbalanced journal entry cannot be posted.
3. A balanced journal entry can be posted.
4. Invoice lines recalculate subtotal, tax, total, and balance.
5. Confirmed payments reduce invoice balance.
6. Voided or refunded payments do not count as confirmed collections.

### Audit and documents

1. Creating, updating, or deleting a principal record creates an audit entry.
2. Audit entries cannot be edited or deleted by normal authenticated users.
3. Internal documents are visible to organization members.
4. Confidential documents are limited to control roles.
5. Restricted documents are limited to owner and admin.

### Recovery

1. Export a staging backup.
2. Delete selected staging records.
3. Restore them into a separate test environment.
4. Confirm totals, relationships, and access policies remain correct.

## Launch gate

ATLAS must not accept real business data until all isolation, role, accounting,
document, and recovery tests pass with evidence recorded by date and tester.
