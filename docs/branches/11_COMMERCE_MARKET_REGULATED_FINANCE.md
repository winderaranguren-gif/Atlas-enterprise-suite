# Branch 11 — Commerce, Market & Regulated Finance

**Parent:** ATLAS Master Index & Genealogy  
**Lineage:** Human mission → ATLAS OS / Core → Commerce, Market & Regulated Finance  
**Status:** living branch dossier  
**Rule:** product identity, ATLAS commercial offer, merchant offer, catalog publication, inventory availability, price validity and payment execution are separate claims. ATLAS may orchestrate commerce, but regulated financial execution requires authorized providers and truthful status evidence.

---

## 1. Branch purpose

Commerce turns products/services into discoverable, comparable and controlled transactions. Its fruit is a truthful path from product → ATLAS offer → merchant offer → freshness validation → cart → order → fulfillment → accounting/payment evidence, without ATLAS pretending that a catalog entry is stocked inventory, that a stale external price is current, that a checkout UI is a processor, or that a wallet interface makes ATLAS a bank.

## 2. Roots inherited

- Commercial truth over promotional convenience.
- Product/service identity is separate from retailer inventory/offer identity.
- Product definition is separate from commercial offer/price approval.
- Merchant price/inventory must carry source provenance, observation time and expiry.
- Stale or unknown-inventory merchant offers are not usable commerce inputs.
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

COM1 separates the Product Definition Registry from the ATLAS Commercial Offer Registry. Current authority is repository-source-controlled because the exact production D1 identity remains unverified. No standard ATLAS offer is currently approved for sale; standard entries remain `preview`, while United Hands remains `community`/non-retail.

### 4.1 ATLAS Product / Meta Catalog Feed — WORKING FRUIT / PROJECTION

**Routes:** `/feeds/meta/atlas-catalog.csv`, `/feeds/meta/atlas-catalog.json`, `/feeds/meta/status`.  
**Runtime:** `modules/meta-catalog.js`.  
**Commercial policy:** `modules/commercial-catalog-state.js`.

Meta is a projection generated from the canonical Product + Commercial Offer registries. Presence in the feed does not prove sale readiness.

### 4.1A Commercial Catalog Truth Policy — WORKING FRUIT

The commercial catalog remains fail-closed. Only an `active` and explicitly approved canonical offer may become Meta `in stock`; every non-active entry remains `out of stock`.

### 4.2 Commercial Offer / Pricing Governance — WORKING FRUIT / SOURCE-CONTROLLED

Canonical ATLAS offers carry product reference, offer ID, billing basis, candidate/list pricing, currency, market, commercial status, approval evidence, effective dates and fulfillment evidence.

### 4.3 Master Product Identity / UPC-GTIN Model — GREEN FRUIT

ATLAS products now have canonical ATLAS IDs, but universal manufacturer/GTIN/UPC identity is still pending and remains GREEN.

### 4.3A Merchant Offer Provenance + Price/Inventory Freshness Contract — WORKING FRUIT

**Routes:** `/feeds/commerce/merchant-offer-contract.json`, `/feeds/commerce/merchant-offers.json`, `/feeds/commerce/merchant-offers/status`.  
**Runtime:** `modules/merchant-offer-contract.js`.  
**Validation:** `scripts/validate-merchant-offer-contract.mjs`.

COM3 establishes the rule that an external merchant offer is not usable merely because ATLAS can see a price. A usable merchant offer must include:

- merchant offer ID;
- merchant identity;
- ATLAS product reference;
- market and currency;
- nonnegative unit price;
- inventory status;
- `observedAt` timestamp;
- `expiresAt` freshness boundary;
- accepted source type and source reference;
- at least one fulfillment method.

Accepted source classes are `authorized-provider-feed` and `verified-manual-record`. The contract distinguishes validation from freshness and freshness from usability. `unknown` and `out_of_stock` offers can be structurally valid but are not usable. Expired offers are stale and are not usable.

The canonical directory is intentionally empty today. That is a valid state, not missing work: no merchant data is fabricated before a verified source relationship exists.

### 4.4 Merchant / Offer Directory — PARTNER-BOUND

The directory endpoint now exists under the COM3 contract, but live merchant content remains provider- or verified-manual-source-bound. Merchant-specific price, inventory, promotion, fulfillment options and delivery estimates require authorized feeds or verified records with freshness timestamps.

**Current state:** zero stored merchant offers; zero live provider sources; zero verified manual offers.

### 4.5 Market — GREEN FRUIT

Market is the commerce discovery layer across products/services/offers. It must consume canonical product/offer data and only usable merchant offers; it must not create a shadow Inventory ledger.

### 4.6 Local — GREEN FRUIT

Local listings/promotions/business discovery should reuse Business Network/CRM identities, geographic provenance and permissioned merchant data.

### 4.7 Ads / Promotions — GREEN FRUIT

Campaigns/promotions require advertiser identity, target scope, creative/version, start/end, spend source, disclosure and performance definitions. Ads never change organic resource/safety/knowledge truth.

### 4.8 Business Network — GREEN FRUIT

Business profiles/relationships should compose CRM/Organizations and commerce metadata rather than create a second company master.

### 4.9 One Delivery — GREEN FRUIT

Historical architecture defines a universal marketplace/delivery experience across multiple merchant types. Product identity maps to merchant offers; price, inventory, promotions and delivery must be refreshed before payment.

### 4.10 Cart / Selection — GREEN FRUIT

Cart state should preserve chosen merchant offer, quantity, source price timestamp, expiry, substitutions and fulfillment method. Checkout must revalidate price/availability rather than trust stale cart state.

### 4.11 Checkout Orchestration — PARTNER-BOUND / GREEN

ATLAS may calculate totals, approvals, tax/shipping inputs and provider handoff. Card, ACH, wallet or BNPL execution requires authorized processors/providers.

### 4.12 Order Management — GREEN CROSS-BRANCH FRUIT

Canonical customer order lineage belongs to Enterprise commercial transactions. Commerce presents/creates orders only after Branch 01’s durable Sales Order spine exists.

### 4.13 Fulfillment / Delivery — GREEN / PARTNER-BOUND

Inventory allocation, pickup/shipping/delivery and status events should use Inventory/Operations/Transportation plus merchant/carrier adapters.

### 4.14 POS — GREEN / PARTNER-BOUND

POS can provide cart/order/employee/inventory/receipt workflow. Payment acceptance/acquiring must use authorized compliant payment layers.

### 4.15 Wallet — GREEN / PARTNER-BOUND

A wallet UI does not mean ATLAS holds customer funds or is a bank. Mature Wallet must preserve provider/custody boundaries.

### 4.16 Pay / Payment Methods — PARTNER-BOUND

ATLAS can orchestrate compatible methods and record accounting consequences; actual fund movement/custody/settlement requires licensed/authorized providers.

### 4.17 Rewards / Loyalty — GREEN FRUIT

Points/rewards require earning/redemption rules, liability accounting, expiration and reversals.

### 4.18 Corporate Purchasing Controls — GREEN CROSS-BRANCH FRUIT

Corporate accounts, limits, approvals, invoicing and traceability should compose Enterprise Procurement, Operations approvals and Finance.

### 4.19 Subscription Commerce — GREEN CROSS-BRANCH FRUIT

Selling recurring ATLAS plans requires authoritative plan/entitlement/billing records and provider checkout; Subscription Control alone is not that seller system.

### 4.20 Digital Assets Regulatory Readiness — ARTIFACT-VERIFIED RESEARCH/COMPLIANCE FRUIT

Digital Assets materials are readiness/compliance evidence, not authorization to issue, sell or custody regulated assets.

### 4.21 Banking / Connect Bank — PARTNER-BOUND

Bank account linking, custody, deposits and transfers require authorized banking/open-banking providers.

### 4.22 Lending / Credit Support — PARTNER-BOUND

Loan origination, underwriting, credit decisions and funding require licensed/authorized entities.

### 4.23 Insurance / FlexCover — PARTNER-BOUND

Insurance quote/bind/service workflows require licensed carriers/agencies/producers and jurisdiction-specific compliance.

### 4.24 Investment / Securities — PARTNER-BOUND / HIGH-GOVERNANCE

Investment transactions, securities offerings, brokerage/custody/advice require applicable registration/exemptions/licensed providers.

### 4.25 Food & Market — ARTIFACT-VERIFIED PROPOSAL FRUIT

Food & Market proposal artifacts are proposal evidence, not proof of operating stores, inventory or investment availability.

### 4.26 Refunds / Returns / Disputes — GREEN FRUIT

Refund UI cannot imply funds moved until processor/provider confirmation exists.

### 4.27 Tax / Sales Tax Handoff — GREEN / PARTNER-BOUND

Commerce may collect transaction facts needed for tax calculation. Determination, filing/remittance and marketplace-facilitator obligations require validated jurisdiction rules/providers. Finance owns accounting/tax records.

---

## 5. Current WORKING FRUIT status

Commerce now has five code-backed fruits:

1. Canonical Product Definition Registry.
2. Canonical ATLAS Commercial Offer Registry.
3. Fail-closed Commercial Catalog Truth Policy.
4. Meta catalog/feed projection from canonical records.
5. Merchant Offer Provenance + Freshness Contract.

COM1, COM2 and the COM3 contract are source-functional. COM10 production verification now checks the Commerce registries, merchant-offer contract and fail-closed policy before a release may be called LIVE.

The Merchant Offer Directory itself remains PARTNER-BOUND and empty until ATLAS receives a source with explicit authority/provenance. This is intentionally different from calling the COM3 contract incomplete.

## 6. Authority map

| Object | Authority |
|---|---|
| ATLAS product/service definition | Product Definition Registry |
| ATLAS baseline commercial offer | Commercial Offer Registry |
| Catalog commercial state | Commercial Offer Registry + fail-closed policy |
| Public Meta catalog | projection only |
| Merchant offer schema/freshness | Merchant Offer Contract |
| Merchant price/inventory record | verified provider/manual source record satisfying COM3 |
| Merchant/company identity | CRM/Organization/Business Network composition |
| Stock/item movement owned by ATLAS merchant tenant | Inventory |
| Sales order | Enterprise future commercial transaction spine |
| Fulfillment task/status | Inventory/Operations/Transportation/provider |
| Invoice/AR/payment accounting | Finance |
| Payment authorization/settlement | authorized processor/provider |
| Bank custody/movement | authorized financial institution/provider |

## 7. Fruit chains

`Product definition → ATLAS commercial offer → commercial approval → merchant offer → provenance/freshness validation → cart → revalidation → order → fulfillment → invoice/payment handoff → accounting/audit`

`Merchant observation → source evidence → observedAt → expiresAt → inventory state → usable/stale decision`

`Plan → approved commercial offer → checkout provider → entitlement → billing event → Finance accounting`

## 8. Commerce invariants

1. A product definition is not a commercial offer.
2. An ATLAS commercial offer is not a merchant offer.
3. A catalog entry is not proof of availability.
4. `in stock` requires approved commercial state and applicable inventory/capacity evidence.
5. An active ATLAS offer requires approval provenance, effective date and fulfillment evidence.
6. A merchant offer requires accepted source provenance.
7. A merchant offer requires observation and expiry times.
8. Expired, malformed, unknown-inventory and out-of-stock merchant offers are not usable live offers.
9. Merchant price/inventory is separate from ATLAS baseline product pricing.
10. Commerce does not create a second Inventory or Finance ledger.
11. Checkout UI does not imply payment processing or settlement.
12. Wallet UI does not imply custody or banking authority.
13. Banking/lending/insurance/investment execution remains provider/licensing bound.
14. Refund status distinguishes requested/approved/provider-confirmed/settled.
15. Commercial plan/entitlement state must be authoritative before access is granted.

## 9. Next fruit sequence

**Completed:** COM1 — Canonical Product + Commercial Offer Registry.  
**Completed:** COM2 — Meta availability derives from explicit commercial state.  
**Completed:** COM3 — Merchant Offer provenance + price/inventory freshness contract.  
**Completed at source/verifier level:** COM10 — production verifier covers Commerce truth gates.

**Next:** Commercial State Approval Workflow.  
Then COM4. Cart + checkout revalidation model.  
COM5. Integrate Branch 01 Sales Order spine and fulfillment lineage.  
COM6. Plan/entitlement/subscription billing model.  
COM7. Authorized payment-provider adapter and payment-event evidence.  
COM8. Wallet/provider-source boundary and rewards liability ledger.  
COM9. Refund/dispute/provider-confirmation workflow.

## 10. Definition of ripe fruit

A Commerce fruit becomes **RIPE** only when product identity, commercial approval, merchant-source provenance, price/source freshness, capacity/inventory, order/fulfillment authority, payment-provider status, accounting evidence, consumer disclosures and exact deployed behavior are verified. A registry row, stale merchant feed, price tag or checkout button alone never proves that ATLAS can legally sell, hold funds, lend, insure or execute investments.
