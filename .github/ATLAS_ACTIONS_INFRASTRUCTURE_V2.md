# ATLAS GitHub Actions Infrastructure v2

Rebuilt from zero on 2026-08-09 after repeated workflow jobs failed before exposing executable steps or job logs.

## Design goals

1. Separate GitHub runner availability from ATLAS validation failures.
2. Use Node.js 22 consistently with the repository engine contract.
3. Remove duplicated CI/MVP pipelines.
4. Keep production deployment behind a successful ATLAS validation job and a push to `main`.
5. Fail explicitly when Cloudflare deployment secrets are missing; never pretend production was deployed.
6. Run production verification only after a successful deployment.
7. Keep iOS and backup workloads isolated from the core CI path.
8. Use least-privilege GitHub permissions.

## Workflows

### `atlas-ci-v2.yml`

`Runner Probe -> Validate and Build -> Deploy Production -> Verify Production`

On pull requests only the runner probe and validation/build path execute. Production mutation is restricted to pushes to `main`.

### `atlas-ios-v2.yml`

Runs only for mobile-relevant changes, pushes to `main`, or manual dispatch. It starts with an independent macOS runner probe and generates a clean Capacitor iOS project before building the simulator target without signing.

### `atlas-backup-v2.yml`

Runs daily at 10:00 UTC (06:00 America/New_York during EDT), on relevant backup changes, or by manual dispatch. It creates and verifies the sovereign backup before publishing the artifact.

## Diagnostic invariant

Every workflow begins with a runner probe that uses no repository checkout and no third-party action.

- If a runner probe exposes and executes its step, GitHub-hosted runner provisioning is functioning and later failures are actionable inside ATLAS or an external dependency.
- If the runner probe itself fails with no steps/logs, the failure is outside repository code because no ATLAS code or action has executed.

## Removed legacy workflows

The following legacy workflow files were deleted before v2 was created:

- `ci.yml`
- `validate.yml`
- `atlas-ios-build.yml`
- `atlas-production-e2e.yml`
- `deploy-production.yml`
- `atlas-sovereign-backup.yml`

No legacy workflow file should be restored without an explicit architectural reason.
