# ATLAS Security Policy

This is a private production repository. Security changes are handled under a fail-closed, least-privilege policy.

## Non-negotiable controls

- Never commit passwords, API tokens, private keys, session tokens, bootstrap tokens, or production database credentials.
- Authentication must fail closed when required identity/storage services are unavailable.
- Tenant access must be scoped by authenticated user + Organization + DBA and explicit permission.
- Authorization evidence and security events must remain append-only where the database schema enforces that property.
- Production promotion is `main` only; non-main Cloudflare builds must be blocked by the repository guard.
- Provider dashboards are operational surfaces, not authoritative sources of application state.

## Reporting a vulnerability

Use GitHub private vulnerability reporting in the repository Security area when it is enabled. Otherwise contact the repository owner through an existing authenticated private channel. Do not place secrets, exploit credentials, or sensitive customer data in a public or broadly visible issue.

## Incident priorities

- **P0:** active credential exposure, tenant-boundary bypass, unauthorized production deployment, destructive data access, or remote code execution.
- **P1:** exploitable authentication/authorization weakness, sensitive-data disclosure, or durable integrity failure.
- **P2:** defense-in-depth weakness without demonstrated unauthorized access.

For P0/P1 events, preserve evidence first, revoke/rotate affected secrets where appropriate, restore a known-good commit/configuration, and verify tenant isolation before resuming normal deployment.
