# ATLAS Enterprise Suite

Clean rebuild baseline for ATLAS.

## Current phase
Core Identity + Authentication v0.2. Business modules are still disabled.

## Rebuild rules
- Keep `main` minimal and stable.
- Add one capability at a time.
- Validate every integration before the next module.
- Keep secrets and production credentials out of source control.
- Fail closed when required runtime resources are missing.

## Core endpoints
- `/` — current ATLAS rebuild status
- `/api/health` — runtime health and identity database readiness
- `POST /api/auth/bootstrap` — creates the first user only; requires `ATLAS_BOOTSTRAP_TOKEN`
- `POST /api/auth/login` — authenticates a user and returns a short-lived bearer session token
- `GET /api/auth/me` — returns the authenticated user/session
- `POST /api/auth/logout` — revokes the current session

## Identity storage
Apply `migrations/0001_identity.sql` to the D1 database bound as `DB` before using authentication.

Passwords are not stored. The authentication layer stores PBKDF2-SHA256 derived hashes with per-user random salts. Session bearer tokens are returned only to the authenticated client and stored in D1 only as SHA-256 hashes.

## Runtime configuration
Required before authentication becomes operational:
- Cloudflare D1 binding named `DB`
- secret `ATLAS_BOOTSTRAP_TOKEN` for one-time first-user enrollment

No database IDs, API tokens, passwords or production secrets are committed to this repository.
