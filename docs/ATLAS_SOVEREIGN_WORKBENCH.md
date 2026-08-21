# ATLAS Sovereign Workbench

ATLAS Workbench is the internal developer-tool layer used to reduce hard dependencies on hosted builders and low-code platforms. It does not attempt to clone a vendor brand or proprietary implementation. It recreates the underlying capabilities ATLAS needs using repository-native, inspectable code.

## Design rule

A third-party service may accelerate ATLAS, but it must not become the only place where ATLAS can be edited, validated, checkpointed, modeled, or released. If an external dependency is unavailable, the canonical repository remains buildable and the core development workflow remains usable.

## Implemented capability map

| External capability pattern | ATLAS replacement | Status |
| --- | --- | --- |
| AI/visual app builder scaffold | `atlas/workbench.mjs app scaffold` | v1 deterministic scaffold |
| List directories | `atlas/workbench.mjs fs list` | v1 |
| Read files | `atlas/workbench.mjs fs read` | v1 |
| Search/grep project files | `atlas/workbench.mjs fs grep` | v1 |
| Create/overwrite files | `atlas/workbench.mjs fs write` | v1, dry-run by default |
| Exact file edits | `atlas/workbench.mjs fs replace` | v1, dry-run by default |
| Command/task execution | `atlas/workbench.mjs task run` | v1, risky scripts gated |
| App/project checkpoint | `atlas/forge.mjs snapshot` | v2 full-workspace snapshot |
| Compare checkpoint | `atlas/forge.mjs diff` | v2 |
| Restore checkpoint | `atlas/forge.mjs restore` | v2, preview by default |
| Define entity schema | `atlas/model-engine.mjs schema define` | v1 |
| List/read schemas | `atlas/model-engine.mjs schema list/show` | v1 |
| Create/query/update/delete entities | `atlas/model-engine.mjs entity ...` | v1 local engine |
| Connector catalog/readiness | `atlas/connectors.mjs` | v1 non-secret registry |
| Release staging/rollback | `atlas/deploy.mjs` | existing |
| Build verification | `atlas/build.mjs`, `scripts/validate-*.mjs` | existing + Workbench |
| Web control surface | `/workbench` | v1 |

## Safety model

File operations are constrained to the repository root. `.git`, `node_modules`, `.wrangler`, `.env*`, and `.dev.vars*` are blocked from Workbench reads and writes. Mutation commands preview by default and require `--apply`. Existing files additionally require `--overwrite` for full replacement. Exact replacements require a unique match unless `--all` is supplied.

The connector registry stores connector metadata and environment-variable names only. It never persists secret values. OAuth authorization remains a provider interaction and is not simulated.

The public `/workbench` route has no repository mutation endpoint. It is a control surface, capability catalog, and deterministic scaffold-plan generator. Repository mutation remains local/CI where authentication, filesystem boundaries, Git history, and review controls exist.

## Examples

```bash
npm run atlas:workbench -- status
npm run atlas:workbench -- fs list modules --depth 2
npm run atlas:workbench -- fs read modules/browser-worker.js --start 1 --end 80
npm run atlas:workbench -- fs grep handleBrowser modules

# Preview a file creation
npm run atlas:workbench -- fs write docs/example.md --content "# Example"

# Apply it
npm run atlas:workbench -- fs write docs/example.md --content "# Example" --apply

# Generate a module plan without changing files
npm run atlas:workbench -- app scaffold vendor-portal --description "Vendor evidence workspace"

# Generate the module files
npm run atlas:workbench -- app scaffold vendor-portal --description "Vendor evidence workspace" --apply

# Full repository checkpoint
npm run atlas:forge -- snapshot before-refactor
npm run atlas:forge -- diff before-refactor
npm run atlas:forge -- restore before-refactor
npm run atlas:forge -- restore before-refactor --apply
```

## Local model engine

The model engine recreates the useful core of a hosted entity/schema tool for prototypes, tests, and local ATLAS utilities. Data is stored under `.atlas/models`, which is gitignored.

```bash
npm run atlas:model -- schema define Project --json '{"type":"object","properties":{"name":{"type":"string"},"status":{"type":"string","enum":["active","closed"]}},"required":["name"]}' --apply
npm run atlas:model -- entity create Project --data '{"name":"ATLAS Browser","status":"active"}' --apply
npm run atlas:model -- entity query Project --query '{"status":"active"}'
npm run atlas:model -- entity update Project --query '{"name":"ATLAS Browser"}' --patch '{"$set":{"status":"closed"}}' --apply
```

This is intentionally not presented as a production multi-tenant database. Production business data still belongs in an authorized durable database with tenant isolation, backups, audit, access control, and migration discipline.

## Connector registry

```bash
npm run atlas:connectors -- catalog
npm run atlas:connectors -- status
npm run atlas:connectors -- status cloudflare
npm run atlas:connectors -- register internal-api --name "ATLAS Internal API" --auth token --env ATLAS_INTERNAL_TOKEN --capabilities records,events --apply
```

Readiness checks report only whether named environment variables are present. Values are never printed.

## What is not recreated yet

A vendor-independent AI generation adapter, authenticated browser-based repository writes, isolated ephemeral code sandboxes, OAuth broker storage, remote Git branch/PR operations, and multi-provider deployment orchestration remain separate phases. The Workbench architecture gives each of those capabilities a stable ATLAS-owned interface so providers can be swapped instead of becoming structural dependencies.
