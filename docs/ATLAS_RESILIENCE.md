# ATLAS Resilience Controller

ATLAS Resilience is the runtime policy for handling repeated failures without blindly replaying the same action.

## Operating invariant

For every recoverable failure ATLAS follows this sequence:

1. Observe the current state and classify the failing layer.
2. Preserve healthy components and avoid unrelated mutations.
3. Check failure memory for the same operation and strategy.
4. Prefer a materially different eligible strategy after a failure.
5. Execute only the minimum safe/authorized action.
6. Perform a fresh verification after mutation.
7. Record the outcome and exact blocker.
8. Open a circuit after repeated failures instead of looping indefinitely.

The shorthand is:

`detect -> isolate -> adapt -> execute minimum change -> verify -> learn`

## Failure memory

`atlas-resilience.js` stores bounded local failure/history state under `atlas-resilience-v1`.

The runtime records:

- operation scope and normalized operation key;
- strategy used;
- failure time and recent failure count;
- failure layer classification;
- verification result;
- open circuit state;
- bounded execution history.

A recently failed strategy enters cooldown. If another strategy can serve the same operation, ATLAS tries the materially different strategy first. If every matching strategy is cooling down, ATLAS blocks the replay and reports the required next action.

## Failure layers

The initial classifier distinguishes:

- infrastructure;
- network;
- identity/access;
- provider/API;
- client runtime/storage/cache;
- code/validation;
- unknown.

This is intentionally a layer classifier, not a claim of root cause. External state must still be verified.

## Verification rule

A mutation-capable strategy cannot be marked successful without a fresh verifier. A strategy that returns success but has no verifier remains unverified and therefore does not produce a verified ATLAS success.

Read-only operations may complete without post-mutation verification because they did not change state.

## Circuit breaker

Repeated failures for the same operation/strategy/error signature are counted in a rolling 15-minute window. After the configured threshold, ATLAS opens a circuit for that operation and refuses further blind execution until the failing layer is resolved or an explicit recovery path is used.

## Technical Support integration

The controller loads before `atlas-technical-support.js` and wraps the public `ATLASTechnicalSupport.diagnose(...)` surface after the support runtime emits `atlas:support:ready`.

Compatibility is preserved: callers still receive `status: resolved|blocked`, diagnostics/actions/blockers, plus a `resilience` object with strategy/verification evidence.

## Agent Fabric integration

If `ATLASAgentFabric` is present, the controller registers itself as the `resilience` tool. This lets Agent Fabric use the same failure-memory and verification contract without duplicating policy.

## Validation

`npm run check:resilience` validates:

- resilience invariants are present;
- runtime load order is correct;
- the PWA shell includes the resilience runtime;
- the Service Worker cache version was advanced;
- `check:js` syntax-checks the controller;
- repository-wide `npm run validate` includes the resilience contract.

Do not weaken an existing Identity, accessibility, constitutional, deployment-boundary, security, or production gate to bypass a resilience failure.