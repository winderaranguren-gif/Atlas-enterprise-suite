# ATLAS Cloudflare → GitHub Bridge

## Purpose

This bridge separates ATLAS generation/deployment traffic from direct repository mutation. A dedicated Cloudflare Worker accepts a signed UTF-8 file bundle, validates it, writes it to an isolated `cloudflare-sync/<runId>` branch, and opens a **draft pull request** against `main`.

The bridge is intentionally not permitted to rewrite security/deployment infrastructure. It blocks `.github/`, `cloudflare/`, `.git/`, `wrangler.*`, `package.json`, `package-lock.json`, and `SECURITY.md`. Those paths remain human/repository controlled so a generated bundle cannot rewrite its own trust boundary.

## Flow

1. ATLAS Builder produces the file bundle.
2. Builder sends `POST /sync` to the bridge Worker with `Authorization: Bearer <ATLAS_BRIDGE_SHARED_SECRET>`.
3. Worker validates path, file count, per-file size and total bundle size.
4. Worker creates `cloudflare-sync/<runId>` from `main`.
5. Worker writes each file through the GitHub REST API using a server-side GitHub credential.
6. Worker opens a draft PR. Nothing is written directly to `main`.
7. Existing repository validation/review gates decide whether the PR can merge and deploy.

This avoids a deployment loop: GitHub remains the source of truth for production while Cloudflare acts as the execution/synchronization bridge.

## Required Cloudflare secrets

Set these as Worker secrets, never repository variables or browser JavaScript:

- `GITHUB_TOKEN` — fine-grained GitHub token or installation token with repository Contents: Read/Write and Pull Requests: Read/Write for `winderaranguren-gif/Atlas-enterprise-suite` only.
- `ATLAS_BRIDGE_SHARED_SECRET` — long random server-to-server bearer secret.

Non-secret Worker vars are already defined in `wrangler.bridge.jsonc`:

- `GITHUB_OWNER=winderaranguren-gif`
- `GITHUB_REPO=Atlas-enterprise-suite`
- `GITHUB_BASE_BRANCH=main`

## Deploy

Use the dedicated Wrangler configuration so the bridge cannot replace the primary ATLAS Worker accidentally:

```bash
npx wrangler@4 secret put GITHUB_TOKEN --config wrangler.bridge.jsonc
npx wrangler@4 secret put ATLAS_BRIDGE_SHARED_SECRET --config wrangler.bridge.jsonc
npx wrangler@4 deploy --config wrangler.bridge.jsonc
```

## Health check

`GET /healthz` returns service state and whether all required server-side variables are present. It never returns secret values.

## Sync payload

```json
{
  "runId": "spatial-command-2026-08-09-001",
  "title": "ATLAS Spatial Command generated bundle",
  "description": "Generated and staged through Cloudflare.",
  "files": [
    {"path":"atlas-spatial-command.html","content":"<!doctype html>..."},
    {"path":"atlas-spatial-command.js","content":"..."}
  ]
}
```

Send first with `"dryRun": true` to validate the bundle without creating a branch or PR.

## Safety limits

- Maximum 60 files per request.
- Maximum 256 KiB per file.
- Maximum 2 MiB total request content after JSON parsing.
- UTF-8 text only in v1.
- No direct writes to `main`.
- No protected infrastructure writes.
- Every generated file commit uses the `[atlas-bridge]` prefix for auditability.

## Recommended next stage

After the Worker is deployed, ATLAS Builder should call `/sync` instead of writing generated UI files directly to `main`. GitHub then validates the draft PR and Cloudflare deploys only after the repository gate succeeds.
