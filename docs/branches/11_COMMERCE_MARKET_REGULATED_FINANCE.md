# Branch 11 — Commerce, Market & Regulated Finance

**Parent:** ATLAS Master Index & Genealogy  
**Lineage:** Human mission → ATLAS OS / Core → Commerce, Market & Regulated Finance  
**Status:** living branch dossier  
**Rule:** product identity, commercial offer, catalog publication, commercial availability, inventory availability, price validity and payment execution are separate claims. ATLAS may orchestrate commerce, but regulated financial execution requires authorized providers and truthful status evidence.

---

## 1. Branch purpose

Commerce turns products/services into discoverable, comparable and controlled transactions. Its fruit is a truthful path from product → commercial offer → availability → order → fulfillment → accounting/payment evidence, without ATLAS pretending that a catalog entry is stocked inventory, that a checkout UI is a processor, or that a wallet interface makes ATLAS a bank.

## 2. Roots inherited

- Commercial truth over promotional convenience.
- Product/service identity is separate from retailer inventory/offer identity.
- Product definition is separate from commercial offer/price approval.
- Price, availability and delivery estimates require source and timestamp.
- Orders reference authoritative Inventory/Enterprise records.
- Financial execution is separated from Finance recordkeeping and payment-provider execution.
- Consumer/corporate consent, refunds/disputes and privacy must be explicit.
- Regulated banking/lending/investment/insurance claims require licensing/authorized partners.

## 3. Trunk dependencies

Identity/Auth, Organization/DBA, CRM, Enterprise Orders/Procurement, Inventory, Finance, Documents, Operations/Delivery, Global Context, provider adapters, Audit, security and release verification.

## 4. Canonical sub-branches

### 4.0 Canonical Product + Commercial Offer Registry — WORKING FRUIT

**Routes:** `/feeds/commerce/products.json`, `/feeds/commerce/offers.json`, `/feeds/commerce/status`.  
**Runtime:** `modules/commercial-product-registry.js`.  
**Validation:** `scripts/validate-commerce-registry.mjs`.

COM1 establishes two separate repository-owned registries:

1. **Product Definition Registry** — identity, title, category, brand, image and description: what the product/service is.
2. **Commercial Offer Registry** — offer ID, product reference, market, currency, billing basis, list/candidate price, commercial status, approval fields, effective dates and fulfillment evidence: whether/how it may be sold.

Current authority is deliberately **repository-source-controlled** because the exact production D1 identity remains unverified. `/feeds/commerce/status` declares `dynamicAdmin:false` and `d1Persistence:false` rather than implying database persistence that ATLAS cannot yet prove.

No offer is currently approved for sale. Standard ATLAS entries are `preview`; United Hands remains `community`/non-retail. An offer may become `active` only when it has explicit sale approval, approval provenance, an effective date and fulfillment evidence.

### 4.1 ATLAS Product / Meta Catalog Feed — WORKING FRUIT / PROJECTION

**Routes:** `/feeds/meta/atlas-catalog.csv`, `/feeds/meta/atlas-catalog.json`, `/feeds/meta/status`.  
**Runtime:** `modules/meta-catalog.js`.  
**Commercial policy:** `modules/commercial-catalog-state.js`.  
**Validation:** `scripts/validate-meta-catalog.mjs`.

The Meta feed is no longer the authority for product/price definition. It is a projection generated from the canonical Product + Commercial Offer registries. Presence in the feed does not prove sale readiness.

### 4.1A Commercial Catalog Truth Policy — WORKING FRUIT

The commercial catalog is fail-closed:

- default commercial state = `preview`;
- community-only entries remain non-retail listings;
- commercial state derives from the canonical Commercial Offer Registry;
- only an `active` and explicitly approved offer may become Meta `in stock`;
- every non-active item becomes `out of stock`;
- activation evidence is validated by the production build and production verifier.

### 4.2 Commercial Offer / Pricing Governance — WORKING FRUIT / SOURCE-CONTROLLED

The canonical offer now contains product/service ID, offer ID, billing basis, list/candidate price, currency, market, commercial status, approval fields, effective dates and fulfillment evidence.

**Current limitation:** the source-controlled registry is a safe baseline, not yet an authenticated dynamic commercial admin system. Dynamic approval/persistence remains blocked until the real D1 target is verified.

### 4.3 Master Product Identity / UPC-GTIN Model — GREEN FRUIT

The current Product Registry gives each ATLAS product a canonical ATLAS ID. Manufacturer/GTIN/UPC identity for universal commerce is still pending and remains GREEN. GTIN/UPC/manufacturer identity must not be duplicated per merchant.

### 4.4 Merchant / Offer Directory — GREEN / PARTNER-BOUND

Merchant-specific price, inventory, promotion, fulfillment options and delivery estimates require authorized merchant/provider feeds or verified manual records with freshness timestamps.

### 4.5 Market — GREEN FRUIT

Market is the commerce discovery layer across products/services/offers. It must consume canonical product/offer data, not create a shadow Inventory ledger.

### 4.6 Local — GREEN FRUIT

Local listings/promotions/business discovery should reuse Business Network/CRM identities, geographic provenance and permissioned merchant data.

### 4.7 Ads / Promotions — GREEN FRUIT

Campaigns/promotions require advertiser identity, target scope, creative/version, start/end, spend source, disclosure and performance definitions. Ads never change organic resource/safety/knowledge truth.

### 4.8 Business Network — GREEN FRUIT

Business profiles/relationships should compose CRM/Organizations and commerce metadata rather than create a second company master.

### 4.9 One Delivery — GREEN FRUIT

Historical architecture defines a universal marketplace/delivery experience for retailers, groceries, pharmacies, restaurants and local merchants. Product identity maps to multiple merchant offers; price/inventory/promotions/delivery are refreshed before payment.

**Boundary:** ATLAS may compare/orchestrate; actual merchant ordering, pharmacy restrictions and delivery execution depend on authorized integrations and laws/policies.

### 4.10 Cart / Selection — GREEN FRUIT

Cart state should preserve chosen offer, quantity, source price timestamp, substitutions and fulfillment method. Checkout must revalidate price/availability rather than trust stale catalog state.

### 4.11 Checkout Orchestration — PARTNER-BOUND / GREEN

ATLAS may calculate order totals, approvals, tax/shipping inputs, split methods and handoff. Card, ACH, wallet or BNPL execution requires authorized processors/providers.

### 4.12 Order Management — GREEN CROSS-BRANCH FRUIT

Canonical customer order lineage belongs to Enterprise commercial transactions. Commerce presents/creates orders only after Branch 01’s durable Sales Order spine exists.

### 4.13 Fulfillment / Delivery — GREEN / PARTNER-BOUND

Inventory allocation, picking, pickup/shipping/delivery and status events should use Inventory/Operations/Transportation plus merchant/carrier adapters. Delivery ETA and status require source freshness.

### 4.14 POS — GREEN / PARTNER-BOUND

POS can provide cart/order/employee/inventory/receipt workflow. Payment acceptance/acquiring and regulated card handling must use authorized compliant payment layers.

### 4.15 Wallet — GREEN / PARTNER-BOUND

A wallet UI does not mean ATLAS holds customer funds or is a bank. Mature Wallet should organize authorized payment instruments, receipts/rewards and provider-linked balances with clear custody/source boundaries.

### 4.16 Pay / Payment Methods — PARTNER-BOUND

ATLAS can orchestrate compatible methods and record accounting consequences; actual fund movement/custody/settlement requires licensed/authorized providers.

### 4.17 Rewards / Loyalty — GREEN FRUIT

Points/rewards require clear earning/redemption rules, liability accounting, expiration, reversals and provider/merchant responsibility.

### 4.18 Corporate Purchasing Controls — GREEN CROSS-BRANCH FRUIT

Corporate accounts, spending limits, approvals, invoicing and traceability should compose Enterprise Procurement, Operations approvals and Finance—not bypass them.

### 4.19 Subscription Commerce — GREEN CROSS-BRANCH FRUIT

Subscription Control currently manages local recurring-cost records. Selling recurring ATLAS plans requires authoritative plan/entitlement/billing records and provider checkout.

### 4.20 Digital Assets Regulatory Readiness — ARTIFACT-VERIFIED RESEARCH/COMPLIANCE FRUIT

The Digital Assets regulatory-readiness dossier is compliance/research evidence, not proof that ATLAS issues, sells or operates regulated digital assets.

### 4.21 Banking / Connect Bank — PARTNER-BOUND

Bank account linking, custody, deposits and transfers require authorized banking/open-banking providers and applicable compliance.

### 4.22 Lending / Credit Support — PARTNER-BOUND

Loan origination, underwriting, credit decisions and funding require licensed/authorized entities and appropriate disclosures.

### 4.23 Insurance / FlexCover — PARTNER-BOUND

Insurance quote/bind/service workflows require licensed carriers/agencies/producers and jurisdiction-specific compliance.

### 4.24 Investment / Securities — PARTNER-BOUND / HIGH-GOVERNANCE

Investment transactions, securities offerings, brokerage/custody/advice require applicable registration/exemptions/licensed providers.

### 4.25 Food & Market — ARTIFACT-VERIFIED PROPOSAL FRUIT

Food & Market proposal artifacts belong under Commerce as proposal evidence, not proof of operating stores, inventory or investment availability.

### 4.26 Refunds / Returns / Disputes — GREEN FRUIT

Refund UI cannot imply funds moved until processor/provider confirmation exists.

### 4.27 Tax / Sales Tax Handoff — GREEN / PARTNER-BOUND

Commerce may collect transaction facts needed for tax calculation. Determination, filing/remittance and marketplace-facilitator obligations require validated jurisdiction rules/providers. Finance owns accounting/tax records.

---

## 5. Current WORKING FRUIT status

Commerce now has four code-backed fruits:

1. Canonical Product Definition Registry.
2. Canonical Commercial Offer Registry.
3. Fail-closed Commercial Catalog Truth Policy.
4. Meta catalog/feed projection from those canonical records.

COM1 and COM2 are therefore source-functional. COM10 production verification now checks the new Commerce registries and fail-closed policy before a release may be called LIVE.

ATLAS still distinguishes implementation maturity, commercial publication status, actual sellability/entitlement, inventory/capacity and payment-provider readiness. No wallet, bank, insurance, lending, securities or payment-processing function is treated as native regulated execution merely because its name appears in a registry or roadmap.

## 6. Authority map

| Object | Authority |
|---|---|
| ATLAS product/service definition | Product Definition Registry (`commercial-product-registry.js`) |
| ATLAS baseline commercial offer | Commercial Offer Registry (`commercial-product-registry.js`) |
| Catalog commercial state | Commercial Offer Registry + fail-closed policy |
| Public Meta catalog | projection only; not source of truth |
| Stock/item movement | Inventory |
| Merchant/company identity | CRM/Organization/Business Network composition |
| Merchant price/inventory | future verified Merchant Offer records/adapters |
| Sales order | Enterprise future commercial transaction spine |
| Fulfillment task/status | Inventory/Operations/Transportation/provider |
| Invoice/AR/payment accounting | Finance |
| Payment authorization/settlement | authorized processor/provider |
| Bank custody/movement | authorized financial institution/provider |
| Rewards liability | future Commerce/Finance-linked rewards ledger |
| Ad campaign | future Ads registry |

## 7. Fruit chains

`Product definition → ATLAS commercial offer → commercial approval → merchant offer → freshness/revalidation → cart → order → fulfillment → invoice/payment handoff → accounting/audit`

`Plan → approved commercial offer → checkout provider → entitlement → billing event → Finance accounting → Subscription management`

`Corporate request → spending policy/approval → order/PO → receipt → invoice/AP → payment provider → reconciliation`

## 8. Commerce invariants

1. A product definition is not a commercial offer.
2. A catalog entry is not proof of availability.
3. `in stock` requires approved commercial state and, where applicable, real inventory/capacity evidence.
4. Meta availability derives from explicit commercial state; it is never hard-coded globally.
5. An active offer requires approval provenance, effective date and fulfillment evidence.
6. Product identity is separate from merchant offer/inventory.
7. Commerce does not create a second Inventory or Finance ledger.
8. Checkout UI does not imply payment processing or settlement.
9. Wallet UI does not imply custody or banking authority.
10. Banking/lending/insurance/investment execution remains provider/licensing bound.
11. Refund status distinguishes requested/approved/provider-confirmed/settled.
12. Ads/promotions do not alter objective knowledge/safety/resource ranking without disclosure.
13. Proposal/investment artifacts do not imply an offer is legally available.
14. Commercial plan/entitlement state must be authoritative before access is granted.

## 9. Next fruit sequence

**Completed:** COM1 — Canonical Product + Commercial Offer Registry.  
**Completed:** COM2 — Meta availability derives from explicit commercial state.  
**Completed at source/verifier level:** COM10 — production verifier checks commercial truth and canonical registries.

**Next:** COM3. Merchant Offer + price/inventory freshness contract.  
COM4. Cart + checkout revalidation model.  
COM5. Integrate Branch 01 Sales Order spine and fulfillment lineage.  
COM6. Plan/entitlement/subscription billing model.  
COM7. Authorized payment-provider adapter and payment-event evidence.  
COM8. Wallet/provider-source boundary and rewards liability ledger.  
COM9. Refund/dispute/provider-confirmation workflow.

## 10. Definition of ripe fruit

A Commerce fruit becomes **RIPE** only when product identity, commercial approval, price/source freshness, capacity/inventory, order/fulfillment authority, payment-provider status, accounting evidence, consumer disclosures and exact deployed behavior are verified. A registry row, feed, price tag or checkout button alone never proves that ATLAS can legally sell, hold funds, lend, insure or execute investments.
