# ATLAS Enterprise Suite — Core Services v1.1.0

ATLAS Enterprise Suite now extends the secure Clean Foundation with ATLAS-owned, provider-independent core services while preserving the Cloudflare Workers Static Assets security and deployment boundary.

## Identity
- Product: ATLAS Enterprise Suite
- Operational contact: `atlashealthfrontiers@gmail.com`
- Repository target: `winderaranguren-gif/Atlas-enterprise-suite`
- Default branch: `main`
- Architecture: `ATLAS Global Core -> Region -> Country -> Organization -> User`

## What is green in v1.1
ATLAS separates the health of its own core from the availability of optional third-party providers.

- **ATLAS Data Fabric — VERIFIED.** The controlled backend data boundary was independently validated. The clean browser uses a same-origin adapter contract and fails closed until an authorized adapter is attached.
- **ATLAS Event Fabric — ACTIVE / VERIFIED.** The server-side event model was independently exercised and the clean runtime includes a bounded ATLAS-native event bus.
- **ATLAS Identity — VERIFIED.** RLS and sensitive identity boundaries were independently validated. Client account access must attach through a same-origin identity adapter; credentials are not embedded in the static application.
- **ATLAS Intelligence — ACTIVE.** ATLAS-native rules and signals operate without requiring an external AI provider. Optional model providers may extend this service later.
- **ATLAS Agent Fabric — ACTIVE.** Seven skill domains route work through permissions, explicit approval for high-risk actions, provider/tool adapters and post-action verification.
- **ATLAS Work Graph — ACTIVE / VERIFIED.** Projects, work units, dependencies and evidence are available in the clean runtime, with cycle prevention; the controlled backend schema was independently validated.
- **ATLAS Music — ACTIVE.** Six ATLAS Originals are generated locally with Web Audio and ATLAS-owned playback/video-sync rights. A commercial music/video provider is not required for ATLAS Music to function.
- **ATLAS Integrations — READY.** The gateway is operational, but an external provider is shown as connected only after an authorized same-origin adapter passes a real `health()` check.

### Status semantics
- `active`: an ATLAS-owned runtime is operational.
- `verified`: the corresponding controlled backend boundary has been independently validated.
- `ready`: the ATLAS gateway can accept optional adapters, without pretending that an external account/provider is already connected.

This means missing Apple Music, YouTube, OpenAI, mail, maps, banking, payment or device credentials no longer make the ATLAS-owned core yellow. Those providers have their own connection state and remain optional extensions.

## Core execution architecture

```text
Module / event / intent
        ↓
ATLAS Event + Intelligence Fabric
        ↓
ATLAS Agent Fabric
        ↓
Identity + permission + approval gate
        ↓
ATLAS Work Graph
        ↓
Minimum authorized action
        ↓
Fresh verification + evidence
```

If a skill has no executable tool/provider adapter, Agent Fabric returns a plan rather than claiming an external mutation succeeded. High-risk work requires both permission and explicit approval.

## ATLAS Music Originals
The clean Music core includes:
- First Light
- Horizon Rise
- Pulse Core
- Focus Flow
- Vector Drive
- Calm Room

They are synthesized locally and do not copy, download or mirror commercial recordings. Commercial catalogs may later attach through authorized adapters with separate rights controls.

## Provider / security boundary
The browser runtime contains no provider credentials and does not hard-code external service URLs. The current CSP keeps `connect-src 'self'`, so production data, identity and optional provider execution must pass through controlled same-origin server/API adapters.

The integration gateway cannot be marked `connected` by an arbitrary status setter. `connect(name, adapter)` requires an adapter with a real health check and only promotes the connector when `health().ok === true`.

## Browser privacy boundary
Only the selected regional UI preference may persist locally. Events, signals, Work Graph preview state and Agent Fabric run history are bounded to `sessionStorage`; they are not treated as the durable production audit ledger. Durable organizational records belong behind the authorized Data/Identity server boundary.

## Cloudflare Workers
The v1.0 security foundation remains intact:
- Workers Static Assets from `./public`
- `workers_dev = false`
- native SPA fallback through `assets.not_found_handling = "single-page-application"`
- no active catch-all `_redirects` rule
- CSP/HSTS/COOP/CORP/frame/object boundaries
- `atlas.config.json` fetched with `no-store`
- Service Worker never intercepts `/api/*` and caches only same-origin static assets

## Validation

```bash
npm run validate
npm run build
```

The v1.1 validation contract now combines security and functionality. It checks configuration parity, Workers deployment settings, JavaScript syntax, secret-shaped values, CSP/cache boundaries, the eight Core Services, Work Graph cycle prevention, Agent Fabric permissions/approval behavior, integration health enforcement and ATLAS Music rights/provider independence.

`npm run validate` also runs `scripts/runtime-test.mjs`, which exercises 15 behavioral assertions including fail-closed data access, event-to-intelligence signaling, dependency-cycle rejection, evidence capture, high-risk agent policy gates, post-action verification, integration health checks and the six provider-independent ATLAS Originals.

## Pre-v1.0.0 branches
Older feature PRs remain historical implementation sources only. They are not merge candidates for the clean foundation. Capabilities are selectively re-ported onto current `main`, validated, deployed and only then promoted. See `CLEAN_FOUNDATION_MIGRATION.md`.
