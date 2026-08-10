# ATLAS Enterprise Suite — Core Services v1.1.0

ATLAS Enterprise Suite uses the clean v1 foundation as a dependency-light production surface and adds ATLAS-owned, provider-independent core services without restoring the previous monolithic repository tree.

## Identity

- Product: ATLAS Enterprise Suite
- Operational contact: `atlashealthfrontiers@gmail.com`
- Repository target: `winderaranguren-gif/Atlas-enterprise-suite`
- Default branch: `main`
- Architecture: `ATLAS Global Core -> Region -> Country -> Organization -> User`

## v1.1 architecture

The clean client contains eight core service contracts:

- **ATLAS Data Fabric** — backend-verified data boundary with an explicit provider-adapter contract. The clean browser build fails closed until an authorized data adapter is attached.
- **ATLAS Event Fabric** — ATLAS-native bounded event runtime; its server-side event model has already been verified independently.
- **ATLAS Identity** — backend-verified identity/RLS boundary with an explicit client adapter; no credentials are embedded in this repository.
- **ATLAS Intelligence** — ATLAS-native rules and signals. It operates without an external AI provider and may optionally accept provider adapters later.
- **ATLAS Agent Fabric** — provider-independent skill routing with permission checks, explicit approval for high-risk execution, bounded session run history, and post-action verification.
- **ATLAS Work Graph** — projects, work units, dependencies, evidence and execution state, including cycle prevention. Its server-side schema has already been verified independently.
- **ATLAS Music** — six ATLAS Originals generated locally with Web Audio and ATLAS-owned playback/video-sync rights. Commercial catalog providers are optional extensions, not a dependency.
- **ATLAS Integrations** — an optional adapter gateway. A provider is never represented as connected until an authorized adapter reports that state.

## What “green” means

ATLAS distinguishes internal readiness from third-party connectivity:

- `active` — an ATLAS-owned runtime is operational in this build.
- `verified` — the corresponding controlled backend boundary has been independently validated; the clean client still requires its authorized adapter before using real account data.
- `ready` — the integration gateway can accept optional adapters but does not pretend an external service is connected.

This prevents a missing Apple, YouTube, OpenAI, banking, mail, map, device or other provider credential from turning the ATLAS core itself into a failed product. External providers extend ATLAS; they do not define whether the ATLAS-owned core is healthy.

## Module registry

The v1.1 registry includes the v1 business and operational capabilities plus Work Graph, Agent Fabric and Music. Regional behavior remains configuration-driven so ATLAS can adapt policy, language and experience without cloning the application by geography.

## Work execution model

The ATLAS-owned execution path is:

```text
Intent / module / event
        ↓
ATLAS Intelligence
        ↓
ATLAS Agent Fabric
        ↓
Identity + permission gate
        ↓
ATLAS Work Graph
        ↓
Minimum authorized action
        ↓
Fresh verification + evidence
```

High-risk execution requires explicit approval in addition to the relevant permission. When no executable provider or tool adapter exists, Agent Fabric returns a plan instead of claiming an external action succeeded.

## Music boundary

ATLAS Music v1.1 includes these original local tracks:

- First Light
- Horizon Rise
- Pulse Core
- Focus Flow
- Vector Drive
- Calm Room

They are synthesized locally and do not copy, download or mirror commercial recordings. Apple Music, YouTube or other catalogs may be added only as optional authorized provider adapters with their own rights boundaries.

## Browser privacy boundary

Execution runs, local events, Work Graph previews and intelligence signals in the clean client are bounded to the browser session. They are not treated as the durable production audit ledger. Durable organizational data belongs behind the authorized Data/Identity adapter and controlled server-side policies.

The browser may store the selected regional preference locally. Production secrets, access tokens, private keys, passwords, health records and financial records must not be embedded in the static client.

## Validation

Run:

```bash
npm run validate
npm run build
```

The v1.1 validation gate checks:

- package/config version consistency;
- the eight required core service contracts;
- backend-verification markers for Data Fabric, Event Fabric, Identity and Work Graph;
- JavaScript syntax for the application, core services and Music;
- Work Graph cycle prevention and Agent Fabric approval/permission invariants;
- the seven built-in Agent Fabric skill domains;
- ATLAS Music original catalog and rights/provider boundary;
- PWA caching and shell wiring;
- obvious embedded-secret patterns.

The build remains deterministic and copies the controlled `public/` tree plus `atlas.config.json` into `dist/` for Cloudflare Pages.

## External integrations

External services are optional capability adapters. ATLAS must not label a provider `connected` merely because a connector definition exists. A real connection requires authorized configuration and a successful provider-specific health check outside the static client.

## Security boundary

No secrets, tokens, passwords, production health data, personal financial data or authentication credentials belong in the client repository. External services must use explicit server-side trust boundaries, least privilege and auditable authorization.
