# Branch 11 — Commerce, Market & Regulated Finance

**Parent:** ATLAS Master Index & Genealogy  
**Lineage:** Human mission → ATLAS OS / Core → Commerce, Market & Regulated Finance  
**Status:** living branch dossier  
**Rule:** product identity, ATLAS commercial offer, merchant offer, catalog publication, approval eligibility, inventory availability, price validity and payment execution are separate claims. ATLAS may orchestrate commerce, but regulated financial execution requires authorized providers and truthful status evidence.

---

## 1. Branch purpose

Commerce turns products/services into discoverable, comparable and controlled transactions. Its fruit is a truthful path from product → ATLAS offer → approval gate → merchant offer → freshness validation → cart → order → fulfillment → accounting/payment evidence, without ATLAS pretending that a catalog entry is stocked inventory, that a stale external price is current, that approval eligibility means persistence, or that a checkout UI is a processor.

## 2. Roots inherited

- Commercial truth over promotional convenience.
- Product definition is separate from commercial offer/price approval.
- Approval eligibility is separate from persisted activation.
- Merchant price/inventory must carry source provenance, observation time and expiry.
- Stale or unknown-inventory merchant offers are not usable commerce inputs.
- Orders reference authoritative Inventory/Enterprise records.
- Financial execution is separated from Finance recordkeeping and payment-provider execution.
- Regulated banking/lending/investment/insurance claims require licensing/authorized partners.

## 3. Trunk dependencies

Identity/Auth, Organization/DBA, CRM, Enterprise Orders/Procurement, Inventory, Finance, Documents, Operations/Delivery, Global Context, provider adapters, Audit, security and release verification.

## 4. Canonical sub-branches

### 4.0 Canonical Product + Commercial Offer Registry — WORKING FRUIT

**Routes:** `/feeds/commerce/products.json`, `/feeds/commerce/offers.json`, `/feeds/commerce/status`.  
**Runtime:** `modules/commercial-product-registry.js`.  
**Validation:** `scripts/validate-commerce-registry.mjs`.

COM1 separates Product Definition from ATLAS Commercial Offer. Current authority is repository-source-controlled because the exact production D1 identity remains unverified. Standard ATLAS offers remain `preview`; United Hands remains `community`/non-retail.

### 4.1 ATLAS Product / Meta Catalog Feed — WORKING FRUIT / PROJECTION

**Routes:** `/feeds/meta/atlas-catalog.csv`, `/feeds/meta/atlas-catalog.json`, `/feeds/meta/status`.  
**Runtime:** `modules/meta-catalog.js`.

Meta is a projection generated from the canonical Product + Commercial Offer registries. Presence in the feed does not prove sale readiness.

### 4.1A Commercial Catalog Truth Policy — WORKING FRUIT

Only an `active` and explicitly approved canonical offer may become Meta `in stock`; every non-active entry remains `out of stock`.

### 4.2 Commercial Offer / Pricing Governance — WORKING FRUIT / SOURCE-CONTROLLED

Canonical ATLAS offers carry product reference, offer ID, billing basis, candidate/list pricing, currency, market, status, approval evidence, effective dates and fulfillment evidence.

### 4.2A Commercial State Approval Gate — WORKING FRUIT / DECISION-ONLY

**Routes:** `/feeds/commerce/approval-policy.json`, `/feeds/commerce/approval-status`.  
**Runtime:** `modules/commercial-approval-gate.js`.  
**Validation:** `scripts/validate-commercial-approval-gate.mjs`.

The Approval Gate evaluates whether a `preview` offer has enough evidence to become `active`. Required evidence includes:

- `approvedForSale=true`;
- approval identity (`approvedBy`);
- approval timestamp (`approvedAt`);
- valid `effectiveFrom`;
- valid effective window when `effectiveTo` exists;
- at least one fulfillment evidence reference;
- valid market, currency and pricing.

Community offers cannot enter the retail activation transition. A successful decision returns eligibility for `active`, but **does not write or persist the transition**. Current policy exposes `writeEnabled:false`, `persisted:false`, and `persistence:'disabled-until-verified-d1'`.

Current canonical status is intentionally strict: 30 offers total, 0 active, 0 eligible for activation, 29 blocked preview offers and 1 community offer. Any change to those counts must be deliberate and must update production verification.

### 4.3 Master Product Identity / UPC-GTIN Model — GREEN FRUIT

ATLAS products have canonical ATLAS IDs, but universal manufacturer/GTIN/UPC identity is still pending.

### 4.3A Merchant Offer Provenance + Price/Inventory Freshness Contract — WORKING FRUIT

**Routes:** `/feeds/commerce/merchant-offer-contract.json`, `/feeds/commerce/merchant-offers.json`, `/feeds/commerce/merchant-offers/status`.  
**Runtime:** `modules/merchant-offer-contract.js`.  
**Validation:** `scripts/validate-merchant-offer-contract.mjs`.

COM3 requires merchant offer source, price, inventory, `observedAt`, `expiresAt` and fulfillment evidence. Expired, malformed, unknown-inventory and out-of-stock offers are not usable.

### 4.4 Merchant / Offer Directory — PARTNER-BOUND

The live directory remains provider- or verified-manual-source-bound. Current state: zero stored merchant offers; zero live provider sources; zero verified manual offers.

### 4.5 Market — GREEN FRUIT

Market must consume canonical product/offer data and only usable merchant offers; it must not create a shadow Inventory ledger.

### 4.6 Local — GREEN FRUIT

Local listings/promotions/business discovery should reuse Business Network/CRM identities, geographic provenance and permissioned merchant data.

### 4.7 Ads / Promotions — GREEN FRUIT

Campaigns/promotions require advertiser identity, target scope, creative/version, dates, disclosure and performance definitions.

### 4.8 Business Network — GREEN FRUIT

Business profiles/relationships should compose CRM/Organizations rather than create a second company master.

### 4.9 One Delivery — GREEN FRUIT

Product identity maps to merchant offers; price, inventory, promotions and delivery must be refreshed before payment.

### 4.10 Cart / Selection — GREEN FRUIT

Cart state should preserve chosen offer, quantity, observed price, expiry, substitutions and fulfillment method. Checkout must revalidate price/availability rather than trust stale cart state.

### 4.11 Checkout Orchestration — PARTNER-BOUND / GREEN

ATLAS may calculate totals and provider handoff. Actual payment execution requires authorized processors/providers.

### 4.12 Order Management — GREEN CROSS-BRANCH FRUIT

Canonical customer order lineage belongs to Enterprise commercial transactions.

### 4.13 Fulfillment / Delivery — GREEN / PARTNER-BOUND

Fulfillment should use Inventory/Operations/Transportation plus merchant/carrier adapters.

### 4.14 POS — GREEN / PARTNER-BOUND

POS workflow does not confer acquiring/payment authority.

### 4.15 Wallet — GREEN / PARTNER-BOUND

Wallet UI does not mean ATLAS holds funds or is a bank.

### 4.16 Pay / Payment Methods — PARTNER-BOUND

Actual fund movement/custody/settlement requires licensed/authorized providers.

### 4.17 Rewards / Loyalty — GREEN FRUIT

Rewards require explicit earning/redemption rules and liability accounting.

### 4.18 Corporate Purchasing Controls — GREEN CROSS-BRANCH FRUIT

Corporate purchasing should compose Enterprise Procurement, Operations approvals and Finance.

### 4.19 Subscription Commerce — GREEN CROSS-BRANCH FRUIT

Selling recurring plans requires authoritative entitlement/billing records and provider checkout.

### 4.20 Digital Assets Regulatory Readiness — ARTIFACT-VERIFIED

Readiness materials are research/compliance evidence, not authorization to issue, sell or custody regulated assets.

### 4.21 Banking / Connect Bank — PARTNER-BOUND

Banking execution requires authorized institutions/providers.

### 4.22 Lending / Credit Support — PARTNER-BOUND

Loan origination/underwriting/funding require licensed/authorized entities.

### 4.23 Insurance / FlexCover — PARTNER-BOUND

Insurance workflows require licensed parties and jurisdiction-specific compliance.

### 4.24 Investment / Securities — PARTNER-BOUND / HIGH-GOVERNANCE

Investment execution/advice/custody requires applicable authorization.

### 4.25 Food & Market — ARTIFACT-VERIFIED PROPOSAL FRUIT

Proposal artifacts do not prove operating inventory or investment availability.

### 4.26 Refunds / Returns / Disputes — GREEN FRUIT

Refund UI cannot imply funds moved until processor/provider confirmation exists.

### 4.27 Tax / Sales Tax Handoff — GREEN / PARTNER-BOUND

Tax determination/filing/remittance requires validated jurisdiction rules/providers. Finance owns accounting/tax records.

---

## 5. Current WORKING FRUIT status

Commerce now has six code-backed fruits:

1. Canonical Product Definition Registry.
2. Canonical ATLAS Commercial Offer Registry.
3. Fail-closed Commercial Catalog Truth Policy.
4. Meta catalog/feed projection from canonical records.
5. Merchant Offer Provenance + Freshness Contract.
6. Commercial State Approval Gate.

The Approval Gate is intentionally decision-only. It prevents ATLAS from confusing “eligible to activate” with “activated in production.” Persistent commercial state changes remain blocked until the real D1 target is verified.

Production verifier v4.0 checks the product/offer registries, approval policy/status, merchant-offer contract/status and Meta commercial truth before a release may be called LIVE.

## 6. Authority map

| Object | Authority |
|---|---|
| ATLAS product/service definition | Product Definition Registry |
| ATLAS baseline commercial offer | Commercial Offer Registry |
| Activation eligibility | Commercial State Approval Gate |
| Persisted commercial activation | not enabled until verified D1/write authority |
| Public Meta catalog | projection only |
| Merchant offer schema/freshness | Merchant Offer Contract |
| Merchant price/inventory record | verified provider/manual source satisfying COM3 |
| Merchant/company identity | CRM/Organization/Business Network |
| Stock/item movement owned by ATLAS tenant | Inventory |
| Sales order | Enterprise future commercial transaction spine |
| Payment authorization/settlement | authorized processor/provider |

## 7. Fruit chains

`Product definition → ATLAS commercial offer → approval evidence → approval gate → persisted activation (future D1) → merchant offer → freshness validation → cart → revalidation → order → fulfillment → accounting`

`Merchant observation → source evidence → observedAt → expiresAt → inventory state → usable/stale decision`

## 8. Commerce invariants

1. Product definition is not commercial offer.
2. Approval eligibility is not persisted activation.
3. Commercial approval writes remain disabled until verified D1.
4. A catalog entry is not proof of availability.
5. `in stock` requires approved commercial state and applicable inventory/capacity evidence.
6. A merchant offer requires accepted source provenance plus observation/expiry.
7. Expired/unknown/out-of-stock merchant offers are not usable live offers.
8. Merchant price/inventory is separate from ATLAS baseline pricing.
9. Commerce does not create a second Inventory or Finance ledger.
10. Checkout UI does not imply payment processing or settlement.
11. Wallet UI does not imply custody/banking authority.
12. Regulated finance execution remains provider/licensing bound.

## 9. Next fruit sequence

**Completed:** COM1 — Canonical Product + Commercial Offer Registry.  
**Completed:** COM2 — Meta commercial truth.  
**Completed:** COM3 — Merchant Offer provenance + freshness contract.  
**Completed:** Commercial State Approval Gate (decision-only).  
**Completed at source/verifier level:** COM10 — Commerce production truth verification.

**Next:** COM4 — Cart + checkout revalidation model.  
Then COM5 — Enterprise Sales Order + fulfillment lineage.  
COM6 — Plan/entitlement/subscription billing model.  
COM7 — Authorized payment-provider adapter and payment-event evidence.  
COM8 — Wallet/provider-source boundary and rewards liability.  
COM9 — Refund/dispute/provider-confirmation workflow.

## 10. Definition of ripe fruit

A Commerce fruit becomes **RIPE** only when product identity, persisted commercial approval, merchant-source provenance, price/source freshness, capacity/inventory, order/fulfillment authority, payment-provider status, accounting evidence, consumer disclosures and exact deployed behavior are verified. Decision eligibility, a registry row, stale merchant feed, price tag or checkout button alone never proves legal or operational sellability.
