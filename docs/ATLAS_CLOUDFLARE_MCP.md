# ATLAS Cloudflare Control Plane

ATLAS uses two authorized Cloudflare control paths. Neither path bypasses account security or stores Cloudflare credentials in browser code or in the repository.

## Path A — Cloudflare managed MCP

Preferred interactive control plane when the client supports remote MCP tool invocation.

- Endpoint: `https://mcp.cloudflare.com/mcp`
- Transport: Streamable HTTP
- Authentication: OAuth preferred for interactive use; scoped API token only for automation where required
- Purpose: inspect and perform authorized Cloudflare API operations without duplicating Cloudflare's API surface inside ATLAS

Repository descriptor: `mcp/atlas-cloudflare.remote.json`.

## Path B — Native Cloudflare Workers Builds from GitHub

This path is intentionally independent of GitHub Actions. It exists so ATLAS can continue deploying even when GitHub-hosted runners fail before the first workflow step.

Cloudflare's Git integration watches the ATLAS GitHub repository. In the Workers Builds environment Cloudflare supplies `WORKERS_CI=1` and `WORKERS_CI_BRANCH`. ATLAS uses `scripts/cloudflare-ci-bootstrap.js` plus `scripts/cloudflare-build-router.js` to choose the correct validation path:

- `main` -> `npm run build:prod`
- every non-production branch -> `npm run build:dev`
- preview promotion must use `npx wrangler versions upload`
- a non-production branch is rejected if it attempts a production deploy command

The repository also keeps the explicit GitHub Actions production workflow as a secondary path, but the native Workers Builds path does not depend on it.

### One-time Cloudflare account connection

The repository cannot create the Cloudflare account's GitHub installation by itself. An authorized Cloudflare account user must connect `winderaranguren-gif/Atlas-enterprise-suite` to Workers Builds once. After that, pushes can trigger Cloudflare directly without GitHub Actions.

No Cloudflare API token belongs in source control. Use Cloudflare account secrets/settings or OAuth as appropriate.

## ATLAS GitHub synchronization bridge

The dedicated Worker in `cloudflare/github-bridge-worker.js` serves the opposite direction when deployed:

`ATLAS/Cloudflare -> validate bundle -> GitHub branch -> draft pull request -> review/CI -> main`

Required Worker secrets:

- `GITHUB_TOKEN`
- `ATLAS_BRIDGE_SHARED_SECRET`

The bridge never writes directly to `main`, supports dry-run, and blocks generated bundles from rewriting its protected trust-boundary files.

## Operating rule

ATLAS does not disable security controls to recover from a failed deployment. If one execution plane fails, move to the other authorized plane:

1. managed Cloudflare MCP when available in the client;
2. native Workers Builds from GitHub when MCP invocation is unavailable;
3. GitHub Actions as a secondary deployment route;
4. manual Wrangler only as an explicit operator-controlled fallback.

All production paths preserve ATLAS production validation and constitutional gates.
