# ATLAS Owned Core

ATLAS Owned Core is the local-first control plane for ATLAS intelligence, tools and lightweight memory.

## Objective

ATLAS must remain operational without requiring a paid external AI API for core routing, classification, tool registration, local memory or policy enforcement.

The provider order is:

`ATLAS-native -> ATLAS self-hosted -> external provider (optional and explicitly enabled)`

External providers are disabled by default.

## Runtime components

- `atlas-owned-core.js`
  - local intent classification
  - provider registry and deterministic provider selection
  - tool registry and execution
  - mandatory fresh verification for mutation-capable tools
  - local-first memory
  - policy inspection and events
- `atlas-local-inference-provider.js`
  - same-origin adapter for `/api/atlas-ai/infer`
  - no browser-side third-party API key
  - marks inference as self-hosted
- `server.js`
  - implements `/api/atlas-ai/health` and `/api/atlas-ai/infer` with Node standard-library infrastructure
  - provides ATLAS-native routing, classification, support analysis and support-plan generation without an external AI API
  - explicitly reports when no local generative model runtime/weights are installed
- `scripts/validate-owned-core.js`
  - repository validation gate
  - verifies external-provider isolation, same-origin inference, app loading and PWA caching
- `scripts/validate-owned-ai-server.js`
  - starts the ATLAS local server and tests the Owned AI endpoints end to end

## AI boundary

The Owned Core is not a claim that ATLAS has trained a frontier language model from scratch. Training and serving a large generative model still requires model weights, compute, storage and electricity.

The architectural goal is to make the ATLAS application own the orchestration layer and allow compatible model weights to run on infrastructure controlled by ATLAS. Open-weight models may be served behind the same-origin ATLAS inference endpoint without changing the client application.

Until a local generative runtime is installed, ATLAS continues to provide native classification, routing and technical-support planning, while generic generative requests return the explicit `local-generative-engine-not-installed` boundary instead of silently calling a paid provider.

## Provider contract

Providers register with:

- `ownership`: `atlas`, `self-hosted`, or `external`
- `priority`
- `network`
- `recurringCost`
- `supports(request, options)`
- `infer(request, options)`
- optional `health()`

Provider selection always prefers ATLAS-owned and self-hosted implementations. External providers are excluded unless both the global policy and the individual request explicitly allow them.

## Tool contract

Mutation-capable tools must provide a verifier. A successful execution without fresh post-action verification is not considered a verified mutation.

This keeps the Owned Core aligned with `atlas-resilience.js` and the ATLAS no-blind-retry rule.

## Self-hosted inference endpoint

The local Node server implements:

- `GET /api/atlas-ai/health`
- `POST /api/atlas-ai/infer`

Current zero-external-API tasks are:

- `classify`
- `route`
- `support-analyze`
- `support-plan`
- `status`

The endpoint must remain same-origin in production. Model runtimes, weights and hardware may change behind this boundary without changing ATLAS UI modules.

## Cost rule

ATLAS should prefer zero-recurring-license components and infrastructure already controlled by ATLAS. Self-hosting is not literally free: CPU/GPU, electricity, bandwidth, storage and operations remain real costs.

## Validation

Run structural policy validation:

```bash
npm run check:owned-core
```

Run the local endpoint end-to-end test:

```bash
npm run check:owned-ai-server
```

The complete gate remains:

```bash
npm run validate
```
