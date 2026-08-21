# ATLAS production blocker: Cloudflare API token

Date: 2026-08-21

## Status

The ATLAS public website architecture is merged to `main` at commit `69733a0a6f0e2574df4e514800a3774315aacb06` and all source/build validation gates passed before merge.

Production deployment is blocked outside the source tree by the GitHub Actions secret `CLOUDFLARE_API_TOKEN`.

## Evidence

Primary deploy run: `32475441862`

- validation job: passed
- Finance validation: passed
- launch queue validation: passed
- Wrangler Worker bundle dry-run: passed
- deploy job stopped before deployment
- Cloudflare token verification returned HTTP 400
- Cloudflare error code: `6003`
- Cloudflare message: `Invalid request headers`

Rescue deploy run: `32475441886`

- release bundle validation: passed
- Wrangler Worker bundle dry-run: passed
- one sanitized token candidate was found
- no candidate validated as a Cloudflare bearer API token
- deploy and production verification were therefore skipped

## Required external correction

Replace the GitHub Actions secret named `CLOUDFLARE_API_TOKEN` with a valid Cloudflare API Token value only. Do not store an `Authorization:` header, `Bearer ` prefix, JSON object, Global API Key, email/key pair, URL, or shell assignment in this secret.

The token must be authorized for the ATLAS Cloudflare account and have the permissions required by the canonical Worker deployment, route management and any release-time Cloudflare Realtime/TURN provisioning currently used by `.github/workflows/deploy-cloudflare.yml`.

No token value belongs in this repository.

## Exit criteria

Production is green only when all of the following are true:

1. `atlas/production` is `success` for the current `main` SHA.
2. `atlas/rescue-production` is not required to recover the release, or if used, it is `success`.
3. The canonical Worker deploy step completes.
4. Existing production health checks pass.
5. The public-site production verification confirms:
   - `/` serves the corporate ATLAS website.
   - `/app` resolves to the application entry.
   - `/dashboard` remains operational and carries `X-Robots-Tag: noindex, nofollow, noarchive`.
   - `/product`, `/trust`, and `/status` serve successfully.
   - the public homepage contains no internal administrator persona, decorative uptime/compliance metrics, or unverified LIVE labels.

Do not mark `PRODUCTION VERIFIED` until these conditions are evidenced by the workflows.
