# ATLAS Enterprise Suite

Clean rebuild baseline for ATLAS.

## Current phase
Core v0.3 — Identity, Authentication, Organizations, DBA scopes and RBAC.

Business modules are still disabled. The shared security boundary is being completed first.

## Core principles
- `main` stays minimal and validated.
- Add one capability layer at a time.
- No production credentials or private prompts in source control.
- Authentication is fail-closed when the identity database is unavailable.
- Business data must be scoped by authenticated user + Organization + DBA.
- No implicit `default` Organization or DBA is allowed.
- Authorization uses explicit role permissions and is deny-by-default.

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

## Roles
`owner`, `admin`, `manager`, `member`, `auditor`, `viewer`.

## Permission contract
Current shared permissions are `organization.manage`, `dba.manage`, `membership.manage`, `audit.read`, `module.read`, and `module.write`. Future modules must call the shared permission guard rather than trusting client-supplied scope headers by themselves.

## Runtime
- `/` — core status page.
- `/api/health` — runtime health response.
- D1 binding expected as `DB`; until configured, database-dependent routes return a controlled 503 instead of falling back to fake/local tenant data.
