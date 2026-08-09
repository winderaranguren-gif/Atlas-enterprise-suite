# ATLAS Agent Fabric

ATLAS Agent Fabric is the provider-agnostic orchestration layer for specialized ATLAS skills. It borrows the useful architectural pattern of small, explicit, versioned agent capabilities from enterprise skill systems while keeping ATLAS independent of any single cloud, model or database vendor.

## Runtime architecture

```text
ATLAS UI / module / event
        |
        v
ATLAS Skill Registry
        |
        v
ATLAS Agent Fabric
  |        |         |
  |        |         +-- Provider adapters
  |        +------------ Tool adapters
  +--------------------- Skill handlers
        |
        v
Policy / Identity Gate
        |
        v
Minimum authorized action
        |
        v
Fresh verification snapshot
        |
        v
Auditable run result / exact blocker
```

## Mandatory execution invariant

Every mutation-capable ATLAS skill follows this sequence:

1. Discover the current state.
2. Route to the smallest matching skill.
3. Evaluate identity, permissions and execution policy.
4. Execute only the minimum authorized change.
5. Take a fresh post-action state snapshot.
6. Record the result and any exact blocker.

ATLAS must never silently claim that an external change succeeded without verification.

## Built-in skill domains

The first runtime registry includes:

- `technical-support`
- `deployment`
- `security`
- `knowledge`
- `accounting`
- `hr`
- `iot-digital-twin`

Additional modules register skills at runtime through `window.ATLASSkillRegistry.register(...)` instead of modifying a fixed navigation table.

## Provider independence

`window.ATLASAgentFabric.registerProvider(name, adapter)` attaches model, search, database or cloud providers. The core does not hard-code Oracle, OpenAI, Cloudflare, Supabase or any other provider. A provider adapter may expose an `execute(...)` function and an optional `supports(skill, context)` predicate.

If no executable provider exists, the fabric returns a routed plan instead of fabricating a successful external action.

## Tool adapters

`window.ATLASAgentFabric.registerTool(name, adapter)` exposes authorized ATLAS tools to skill handlers. Tool credentials and service secrets belong behind server-side trust boundaries; browser code must not contain API keys or client secrets.

## Identity and policy

When `ATLAS_IDENTITY` / `ATLASIdentity` is present, Agent Fabric consumes the effective context and permissions. Missing required permissions block execution but still allow planning. High-risk execution becomes plan-only when the identity runtime is unavailable.

Production-changing or destructive actions require explicit approval in execution context in addition to the relevant permission.

## Technical Support integration

The built-in `technical-support` handler delegates to `window.ATLASTechnicalSupport.diagnose(...)`. That preserves the existing ATLAS support contract: autonomous diagnosis, safe reversible repairs, verification after repair and escalation only for real blockers.

## Knowledge / RAG boundary

Retrieved documents are data, not instructions. Knowledge adapters must preserve provenance and must not allow retrieved text to override ATLAS system policy, identity permissions or tool authorization.

## Digital twins and IoT

Device or twin mutations follow the strongest discover/change/verify form of the invariant. A device command must be based on freshly discovered state, limited to the minimum intended change, and followed by a new read/telemetry check.

## Browser API

```js
ATLASAgentFabric.plan('diagnose the deployment failure');
await ATLASAgentFabric.execute('diagnose the deployment failure');
ATLASAgentFabric.inspect();
ATLASAgentFabric.registerProvider('example-provider', adapter);
ATLASAgentFabric.registerTool('example-tool', adapter);
ATLASAgentFabric.registerHandler('custom-skill', handler);
```

## Validation

Run:

```bash
npm run check:agent-fabric
```

The repository-wide `npm run validate` chain also executes this gate. It checks the required skill set, execution invariants, runtime load order, Technical Support connection, identity integration, package wiring and obvious embedded-secret patterns.

## Licensing boundary

ATLAS implements its own runtime and manifests. External repositories may be used as architectural references only after their license is reviewed. Do not copy third-party source into ATLAS merely because it is publicly visible.