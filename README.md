# ATLAS Enterprise Suite

Clean rebuild baseline for ATLAS.

## Current phase
Core v0.7 — Identity, Authentication, Organizations, DBA scopes, RBAC, immutable Audit Ledger, Security Events, tenant-safe API guards, HR Knowledge foundation and CRM v1.

Version source: `modules/version.js`. The runtime health response and build validator must use this canonical value.

The shared security and data-isolation boundary is established. HR Knowledge remains feature-gated, while CRM v1 is wired through the dedicated Cloudflare Worker entry point and validated by the production build.

## Core principles
- `main` stays minimal and validated.
- Add one capability layer at a time.
- No production credentials or private prompts in source control.
- Authentication is fail-closed when the identity database is unavailable.
- Business data must be scoped by authenticated user + Organization + DBA.
- No implicit `default` Organization or DBA is allowed.
- Authorization uses explicit role permissions and is deny-by-default.
- New modules must use the shared tenant guard rather than trusting scope headers by themselves.
- Audit and security evidence are append-only and immutable at the database layer.
- External providers are execution layers, not ATLAS sources of truth.

## Autonomous operations
ATLAS validation and safe configuration repair do not depend on GitHub-hosted runners.

- `npm run atlas:doctor` — diagnose repository, baseline, workflow, and recovery integrity.
- `npm run atlas:verify` — run the full local production gate and ATLAS QA.
- `npm run atlas:self-heal` — restore safe Wrangler configuration drift from the repository baseline, then run the full gate.
- `npm run infra:validate` — compare `wrangler.jsonc` with the canonical Cloudflare baseline.
- `npm run infra:repair` — repair repository-owned Wrangler drift only.

GitHub Actions are retained as manual runners while hosted Actions are billing-blocked. Cloudflare is the current automatic edge deployment layer; `main`, the repository baseline, migrations, and recovery records remain canonical.

Operational contract: `docs/ATLAS_AUTONOMY.md`.
Security policy: `SECURITY.md`.
Cloudflare recovery record: `infra/cloudflare/known-good.json`.

## Authentication endpoints
- `POST /api/auth/bootstrap` — one-time initial user creation; requires `ATLAS_BOOTSTRAP_TOKEN`.
- `POST /api/auth/login` — creates a hashed-token session.
- `GET /api/auth/me` — returns the authenticated user/session.
- `POST /api/auth/logout` — revokes the current session.

## Organization / DBA / RBAC endpoints
- `POST /api/core/organizations` — creates an Organization and its initial DBA; authenticated creator becomes owner.
- `GET /api/core/context` — lists only the authenticated user's active Organization/DBA scopes and permissions.
- `POST /api/core/organizations/:organizationId/dbas` — creates a DBA; requires owner/admin organization authority.
- `POST /api/core/memberships` — creates or updates a user membership in an exact Organization/DBA scope; requires `membership.manage`.

## Evidence endpoints
These routes require a valid session, exact `x-atlas-organization` and `x-atlas-dba` headers, and the `audit.read` permission.

- `GET /api/core/audit` — tenant-scoped immutable audit ledger, capped at 200 results.
- `GET /api/core/security-events` — tenant-scoped immutable security-event stream, capped at 200 results.

Both support bounded filtering and correlation IDs for tracing activity across future ATLAS modules.

## Shared module contract
Future business modules should call `requireTenantPermission(request, env, permission, action)` from `modules/tenant.js`. The guard verifies session + Organization + DBA membership + explicit permission and records canonical authorization evidence in `audit_ledger`.

Security-sensitive modules can emit append-only evidence through `appendSecurityEvent(...)` from `modules/audit.js`.

## Roles
`owner`, `admin`, `manager`, `member`, `auditor`, `viewer`.

## Permission contract
Current shared permissions are `organization.manage`, `dba.manage`, `membership.manage`, `audit.read`, `module.read`, and `module.write`.

## Runtime
- `/` — core status page.
- `/api/health` — runtime health response.
- D1 binding expected as `DB`; until configured, database-dependent routes return a controlled 503 instead of falling back to fake/local tenant data.
