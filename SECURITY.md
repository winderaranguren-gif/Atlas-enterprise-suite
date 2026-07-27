# Security Policy

## Current status

ATLAS Enterprise Suite v0.1.0 is a private, local demonstration MVP. It stores demonstration data in browser `localStorage` and does not provide production-grade authentication, authorization, encryption, backups, or regulatory controls.

## Secret-handling rules

- Never commit API keys, passwords, database connection strings, access tokens, private certificates, or recovery codes.
- Store production secrets only in the protected environment-variable system of the approved hosting provider.
- Keep this repository private until the production security review is complete.
- Demo credentials included in the interface are sample values only and must never be reused for a real account.

## Reporting a vulnerability

Report suspected vulnerabilities privately to the repository owner. Do not publish vulnerability details in a public issue.
