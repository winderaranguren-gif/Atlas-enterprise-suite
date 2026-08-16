# Branch 11 — COM4 Cart + Checkout Revalidation

**Status:** WORKING FRUIT at source/runtime level  
**Parent:** Commerce, Market & Regulated Finance  
**Runtime:** `modules/cart-checkout-revalidation.js`

## Purpose

COM4 prevents a cart snapshot from silently becoming an order after the authoritative offer has changed. Every line is revalidated immediately before the future order-creation gate.

## Outcomes

- `ready` — the current authoritative offer still matches the cart snapshot closely enough to proceed to the next order-creation gate.
- `changed` — price or fulfillment changed; the cart must be refreshed and explicitly re-accepted.
- `blocked` — offer is missing, inactive, stale, unavailable, malformed, source-mismatched, market/currency-mismatched, or otherwise unsafe to proceed.

## Supported sources

1. `atlas-commercial-offer` — revalidated against the canonical ATLAS Commercial Offer Registry.
2. `merchant-offer` — revalidated against COM3 Merchant Offer provenance/freshness rules.

## Routes

- `GET /feeds/commerce/cart-revalidation-policy.json`
- `GET /feeds/commerce/cart-revalidation/status`
- `POST /api/commerce/cart/revalidate`

The POST endpoint is stateless. It returns a decision and current offer facts; it does not persist a cart, create an order, reserve inventory, authorize payment, settle funds, or grant an entitlement.

## Build and production gates

`validate:cart-revalidation` tests ready/changed/blocked behavior with controlled ATLAS and merchant-offer cases. `scripts/verify-cart-production.mjs` verifies the production policy/status and requires a known ATLAS preview offer to remain blocked before the general LIVE verifier can run.

## Truth boundaries

- A cart is a snapshot, not an authority.
- `ready` is not an order.
- `ready` is not inventory reservation.
- `ready` is not payment authorization.
- A changed price or fulfillment method requires re-acceptance.
- A stale merchant offer never silently passes checkout.
- Current persistent Cart Selection remains GREEN because durable user/session cart ownership is not implemented by this fruit.

## Next fruit

COM5 — Enterprise Sales Order + Fulfillment lineage. A future order creator must consume only a `ready` COM4 decision and then write into the authoritative Enterprise commercial transaction spine rather than inventing a Commerce-only order ledger.
