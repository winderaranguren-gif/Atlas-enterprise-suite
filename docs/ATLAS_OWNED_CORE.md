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
- `scripts/validate-owned-core.js`
  - repository validation gate
  - verifies external-provider isolation, same-origin inference, app loading and PWA caching

## AI boundary

The Owned Core is not a claim that ATLAS has trained a frontier language model from scratch. Training and serving a large generative model still requires model weights, compute, storage and electricity.

The architectural goal is to make the ATLAS application own the orchestration layer and allow compatible model weights to run on infrastructure controlled by ATLAS. Open-weight models may be served behind the same-origin ATLAS inference endpoint without changing the client application.

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

The browser adapter expects:

- `GET /api/atlas-ai/health`
- `POST /api/atlas-ai/infer`

The endpoint must be same-origin in production. Model runtimes, weights and hardware may change behind this boundary without changing ATLAS UI modules.

## Cost rule

ATLAS should prefer zero-recurring-license components and infrastructure already controlled by ATLAS. Self-hosting is not literally free: CPU/GPU, electricity, bandwidth, storage and operations remain real costs.

## Validation

Run:

```bash
npm run check:owned-core
```

The complete gate remains:

```bash
npm run validate
```
