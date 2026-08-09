---
name: atlas-resilience
description: Apply the ATLAS no-blind-retry resilience contract when diagnosing failures, changing infrastructure, switching providers, repairing modules, or verifying recovery.
---

# ATLAS Resilience

Use this skill whenever an ATLAS operation fails, a previous approach is being retried, or a recovery/fallback path is being designed.

## Mandatory behavior

1. Read the current state before changing anything.
2. Identify the failing layer: code/validation, client runtime, identity/access, provider/API, network, or infrastructure.
3. Preserve healthy components; do not rebuild unrelated layers because one layer failed.
4. Check whether the same strategy has already failed for the same operation.
5. Do not blindly repeat a recently failed strategy.
6. Prefer a materially different strategy or fallback when one is available.
7. Apply only the minimum safe and authorized mutation.
8. Re-read or re-test the affected state after the mutation.
9. Never claim success without fresh evidence.
10. If distinct safe strategies are exhausted, report the exact blocker and stop the loop.

## Runtime contract

- Controller: `atlas-resilience.js`
- Structural validator: `scripts/validate-resilience.js`
- Architecture: `docs/ATLAS_RESILIENCE.md`
- Repository gate: `npm run check:resilience`

Mutation-capable strategies require an explicit verifier. Repeated failures trigger cooldown and eventually a circuit breaker instead of an infinite retry loop.

## Provider rule

A provider failure is not permission to rewrite working ATLAS code. Verify the provider/infrastructure layer independently first. If a runner, network, permission, API, or deployment service fails before ATLAS code executes, treat that external layer as the blocker and preserve the healthy repository state.

## Safety

Do not bypass Identity, accessibility, constitutional, security, deployment-boundary, privacy, or production gates to make a retry succeed.