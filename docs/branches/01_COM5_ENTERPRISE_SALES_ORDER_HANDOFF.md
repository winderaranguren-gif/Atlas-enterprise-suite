# Branch 01 / Branch 11 — COM5 Enterprise Sales Order Handoff

**Status:** WORKING CONTRACT / GREEN DURABLE SALES ORDER  
**Enterprise authority:** Branch 01 — Enterprise & Operations  
**Commerce consumer:** Branch 11 — Commerce, Market & Regulated Finance

## Purpose

COM5 defines the only allowed path from a COM4-revalidated cart toward a future durable Sales Order. Commerce may prepare an Enterprise Order Draft Envelope, but Enterprise remains the authoritative owner of the commercial transaction.

## Runtime

`modules/commercial-transaction-handoff.js`

Routes:
- `GET /feeds/enterprise/commercial-transaction-contract.json`
- `GET /feeds/commerce/order-handoff/status`
- `POST /api/commerce/order/handoff`

## Required sequence

`Cart snapshot → COM4 revalidation → ready decision → Enterprise Order Draft Envelope → future Enterprise persistence → future inventory reservation/fulfillment → Finance handoff → payment-provider evidence`

The handoff endpoint performs COM4 internally. A caller cannot forge a `ready` flag and bypass offer revalidation.

## Draft envelope

The draft preserves organization/customer context, market/currency, source offer IDs, quantities, authoritative unit prices, fulfillment methods, COM4 lineage, subtotal, pending fulfillment intents and empty Finance/payment references.

## Truth boundaries

The current handoff explicitly returns:
- `persisted:false`
- `inventoryReserved:false`
- `paymentAuthorized:false`
- `salesOrderSystemOfRecordReady:false` in status

A ready envelope is not a Sales Order until Enterprise persists it in the canonical commercial transaction spine.

## Why persistence is not added in this fruit

The repository's applied source migration sequence currently ends at `0015`. The pending Capability State work already reserves migration `0016`, while production D1 identity remains unverified. COM5 therefore does not create a competing `0016`, does not guess a D1 target, and does not apply a remote migration.

## Next implementation

1. Resolve exact production D1 identity and the existing `0016` blocker.
2. Establish the next safe migration number.
3. Create the durable Enterprise commercial transaction schema.
4. Enforce tenant/RBAC/audit ownership.
5. Persist only handoffs whose COM4 decision is still valid at transaction time.
6. Integrate Inventory reservation/movement, Operations fulfillment and Finance invoice/AR lineage without duplicating their ledgers.

Until those steps are verified, `Quotes / Sales Orders` remains GREEN even though the handoff contract itself is WORKING.
