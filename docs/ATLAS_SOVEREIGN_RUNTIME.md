# ATLAS Sovereign Runtime v2

## Architectural law
ATLAS must remain buildable, recoverable and deployable without GitHub, GitHub Actions, Lovable, Cloudflare or any other single hosted provider. External providers are adapters, mirrors or optional delivery surfaces; none is the source of truth for ATLAS.

## Canonical chain
`ATLAS Source Vault / Forge -> committed main -> release stamp + validation -> immutable integrity snapshot -> deploy adapter -> ATLAS Edge -> ATLAS Runtime -> production verification`

GitHub may mirror source and accept collaboration, but it is outside this required chain.

## Commands
- `npm run build:sovereign` runs the provider-neutral ATLAS validation/build contract.
- `npm run snapshot:sovereign` creates a self-contained source snapshot under `.atlas/sovereign/snapshots/` with a SHA-256 manifest.
- `npm run release:sovereign` builds and creates a bundle-only release without publishing externally.
- `npm run release:sovereign:edge` stages an immutable release on an ATLAS-controlled host, promotes it through ATLAS Edge, verifies ATLAS Runtime, and automatically rolls back if runtime readiness fails.
- `npm run release:sovereign:cloudflare` uses Cloudflare only as a replaceable production adapter and requires direct Cloudflare credentials in the execution environment.
- `npm run validate:sovereign` enforces the sovereign runtime contract.

## Release integrity
Release identity is resolved from an explicit sovereign release SHA or the committed local Git/ATLAS Forge HEAD. A Git-derived release is refused when the source tree is dirty or the branch is not `main`. ATLAS stamps and validates that committed identity first and only then creates the immutable snapshot. The final release report exposes both the source release identity and the artifact SHA-256.

`ok` means the selected deployment path completed without a deployment/runtime failure. `liveVerified: true` is stricter: it is emitted only when the selected adapter verifies the public production origin. A staged or host-ready release is not described as LIVE.

## ATLAS Runtime
The sovereign application runtime is a Node.js 22+ service bound to loopback by default. It loads the currently promoted `worker-meta.js` release and executes its standard Web `fetch(request, env, ctx)` contract, preserving the canonical application instead of replacing it with a static copy.

The runtime currently provides:
- a D1-compatible database contract backed by an ATLAS-owned SQLite database at `/opt/atlas/state/atlas.sqlite3`
- prepared statements with `bind`, `first`, `all`, `run`, `raw` and transactional `batch`
- ordered SQL migration application with SHA-256 drift detection
- an `ASSETS` binding backed by the promoted release's `assets/` directory
- runtime health, readiness and active-release endpoints
- a token-protected schema/migration-state endpoint used only by the sovereign deployment preflight
- automatic loading of a newly promoted immutable release without rebuilding it

SQLite is the compatibility bridge for the current D1-oriented schema. PostgreSQL remains the target database/auth system for the later full sovereign data cutover; that migration must preserve tenant scope, RBAC, audit and ledger invariants before PostgreSQL becomes authoritative.

## Migration safety
Code rollback cannot reliably undo a database mutation after it has committed. For that reason the automatic Sovereign Edge release path is intentionally stricter than ordinary application loading.

Before a release is staged or promoted, the adapter authenticates to ATLAS Runtime and compares every migration in the candidate snapshot with the migration ledger already applied on the host. A previously applied migration whose SHA-256 changed is blocked as `migration_drift_preflight`. A new migration containing destructive schema changes or direct data rewrites such as `DROP`, `TRUNCATE`, `DELETE FROM`, `REPLACE INTO`, direct `UPDATE ... SET`, or destructive `ALTER TABLE` operations is blocked as `destructive_migration_blocked`.

The automatic release path is therefore for forward-compatible/additive migrations. A genuinely destructive or data-rewrite migration requires a separate planned migration procedure with an explicit database backup, compatibility assessment, controlled execution, post-migration validation and a data recovery plan. It must not be smuggled through ordinary release promotion merely because application code itself can roll back.

## ATLAS Edge and rollback
ATLAS Edge owns release promotion state and atomic `current` switching. The `sovereign-edge` adapter never overwrites an immutable release ID with different content. After promotion it verifies ATLAS Runtime. If the runtime cannot load the release, a migration drifts/fails, or application readiness fails, the adapter requests an ATLAS Edge rollback to the previous release.

If `ATLAS_PUBLIC_ORIGIN` is not configured, successful host verification is reported as `verified: false` with a host-ready reason. If a public origin is configured, the adapter additionally checks `/api/release` and `/api/readiness`; only a matching release identity and healthy readiness produce public verification.

## Provider boundary
Cloudflare remains an explicitly replaceable adapter. Caddy is also replaceable and is used only for TLS/reverse proxy at the sovereign host boundary. The application source, database state, release registry and deployment authority remain inside ATLAS-controlled storage.

## Snapshot contract
Every sovereign snapshot contains source files plus `manifest.json` with per-file SHA-256 hashes and one aggregate SHA-256. `.git`, `node_modules` and prior `.atlas` snapshots are excluded. The snapshot therefore survives loss of the GitHub account or repository mirror.

## Current production boundary
The canonical public domain must not be repointed until a sovereign host exists, the runtime has passed readiness on that host, data migration has been validated, TLS is healthy, and a cutover/rollback window is defined. Until then Cloudflare may continue serving the current canonical production surface, while ATLAS Sovereign Core is implemented and testable as a separate delivery path.
