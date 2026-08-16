# Branch 11 — Commerce, Market & Regulated Finance

**Parent:** ATLAS Master Index & Genealogy  
**Lineage:** Human mission → ATLAS OS / Core → Commerce, Market & Regulated Finance  
**Status:** living branch dossier  
**Rule:** catalog publication, commercial availability, inventory availability, price validity and payment execution are separate claims. ATLAS may orchestrate commerce, but regulated financial execution requires authorized providers and truthful status evidence.

---

## 1. Branch purpose

Commerce turns products/services into discoverable, comparable and controlled transactions. Its fruit is a truthful path from offer → availability → order → fulfillment → accounting/payment evidence, without ATLAS pretending that a catalog entry is stocked inventory, that a checkout UI is a processor, or that a wallet interface makes ATLAS a bank.

## 2. Roots inherited

- Commercial truth over promotional convenience.
- Product/service identity is separate from retailer inventory/offer identity.
- Price, availability and delivery estimates require source and timestamp.
- Orders reference authoritative Inventory/Enterprise records.
- Financial execution is separated from Finance recordkeeping and payment-provider execution.
- Consumer/corporate consent, refunds/disputes and privacy must be explicit.
- Regulated banking/lending/investment/insurance claims require licensing/authorized partners.

## 3. Trunk dependencies

Identity/Auth, Organization/DBA, CRM, Enterprise Orders/Procurement, Inventory, Finance, Documents, Operations/Delivery, Global Context, provider adapters, Audit, security and release verification.

## 4. Canonical sub-branches

### 4.1 ATLAS Product / Meta Catalog Feed — WORKING FRUIT / COMMERCIAL-TRUTH GAP

**Routes:** `/feeds/meta/atlas-catalog.csv`, `/feeds/meta/atlas-catalog.json`, `/feeds/meta/status`.  
**Runtime:** `modules/meta-catalog.js`.

ATLAS has a functional public scheduled-feed representation with IDs, titles, descriptions, USD pricing, sale pricing, images and links.

**Important gap:** the current implementation emits `availability: in stock` uniformly. That is a feed behavior, not verified evidence that every listed module/concept is commercially purchasable or deployable. Commercial availability must become maturity-aware before this feed can be treated as authoritative sales inventory.

### 4.2 Commercial Offer / Pricing Governance — GREEN FRUIT

A canonical offer should include product/service ID, edition/plan, billing basis, price, currency, effective dates, market/region, tax treatment, commercial status and approval/provenance. Published prices must be distinguishable from internal estimates, proposal pricing and future concepts.

### 4.3 Master Product Identity / UPC-GTIN Model — GREEN FRUIT

Historical One Delivery architecture defines one product identity that can map to many merchants/offers. GTIN/UPC/manufacturer identity should not be duplicated per store.

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

Historical architecture defines a universal marketplace/delivery experience for major retailers, groceries, pharmacies, restaurants and local merchants. Product identity maps to multiple offers; price/inventory/promotions/delivery are refreshed before payment.

**Boundary:** ATLAS may compare/orchestrate; actual merchant ordering, pharmacy restrictions and delivery execution depend on authorized integrations and laws/policies.

### 4.10 Cart / Selection — GREEN FRUIT

Cart state should preserve chosen offer, quantity, source price timestamp, substitutions and fulfillment method. Checkout must revalidate price/availability rather than trust stale catalog state.

### 4.11 Checkout Orchestration — PARTNER-BOUND / GREEN

ATLAS may calculate order totals, approvals, tax/shipping inputs, split methods and handoff. Card, ACH, Apple/Google Pay, PayPal, BNPL or other regulated/payment execution requires authorized processors/providers.

### 4.12 Order Management — GREEN CROSS-BRANCH FRUIT

Canonical customer order lineage belongs to Enterprise commercial transactions. Commerce presents/creates orders only after Branch 01’s durable Sales Order spine exists.

### 4.13 Fulfillment / Delivery — GREEN / PARTNER-BOUND

Inventory allocation, picking, pickup/shipping/delivery and status events should use Inventory/Operations/Transportation plus merchant/carrier adapters. Delivery ETA and status require source freshness.

### 4.14 POS — GREEN / PARTNER-BOUND

POS can provide cart/order/employee/inventory/receipt workflow. Payment acceptance/acquiring and regulated card handling must use authorized compliant payment layers.

### 4.15 Wallet — GREEN / PARTNER-BOUND

The existing public catalog describes an ATLAS Wallet workspace, but a digital-wallet UI does not mean ATLAS holds customer funds or is a bank. Mature Wallet should organize authorized payment instruments, receipts/rewards and provider-linked balances with clear custody/source boundaries.

### 4.16 Pay / Payment Methods — PARTNER-BOUND

ATLAS can orchestrate compatible methods and record accounting consequences; actual fund movement/custody/settlement requires licensed/authorized providers.

### 4.17 Rewards / Loyalty — GREEN FRUIT

Points/rewards require clear earning/redemption rules, liability accounting, expiration, reversals and provider/merchant responsibility.

### 4.18 Corporate Purchasing Controls — GREEN CROSS-BRANCH FRUIT

Historical architecture includes corporate accounts, spending limits, approvals, invoicing and traceability. This should compose Enterprise Procurement, Operations approvals and Finance—not bypass them.

### 4.19 Subscription Commerce — GREEN CROSS-BRANCH FRUIT

Subscription Control currently manages local recurring-cost records. Selling recurring ATLAS plans requires authoritative plan/entitlement/billing records and provider checkout, not the local Subscription Control register alone.

### 4.20 Digital Assets Regulatory Readiness — ARTIFACT-VERIFIED RESEARCH/COMPLIANCE FRUIT

The Library contains final Digital Assets regulatory-readiness dossier artifacts. This is compliance/research evidence, not proof that ATLAS issues, sells or operates regulated digital assets.

### 4.21 Banking / Connect Bank — PARTNER-BOUND

Bank account linking, custody, deposits, transfers and other banking services require authorized banking/open-banking providers and applicable compliance. Finance’s internal bank ledger does not confer banking functionality.

### 4.22 Lending / Credit Support — PARTNER-BOUND

ATLAS may organize budgeting, debt information and provider offers where lawful/authorized. Loan origination, underwriting, credit decisions and funding require licensed/authorized entities and appropriate disclosures.

### 4.23 Insurance / FlexCover — PARTNER-BOUND

Insurance quote/bind/service workflows require licensed carriers/agencies/producers and jurisdiction-specific compliance. ATLAS may orchestrate approved provider experiences but cannot represent itself as insurer without authority.

### 4.24 Investment / Securities — PARTNER-BOUND / HIGH-GOVERNANCE

Investment transactions, securities offerings, brokerage/custody/advice require applicable registration/exemptions/licensed providers. The Digital Assets dossier is readiness research, not authorization.

### 4.25 Food & Market — ARTIFACT-VERIFIED PROPOSAL FRUIT

ATLAS Library contains Food & Market investment proposal artifacts. They belong under Commerce as proposal evidence, not proof of operating stores, inventory or investment availability.

### 4.26 Refunds / Returns / Disputes — GREEN FRUIT

Commerce needs a canonical post-order workflow linked to merchant/order/payment/provider evidence. Refund UI cannot imply funds moved until processor/provider confirmation exists.

### 4.27 Tax / Sales Tax Handoff — GREEN / PARTNER-BOUND

Commerce may collect transaction facts needed for tax calculation. Tax determination, filing/remittance and marketplace-facilitator obligations require jurisdiction rules and, where used, validated tax/provider integrations. Finance owns accounting/tax records.

---

## 5. Current WORKING FRUIT status

The strongest canonical Commerce-specific runtime is the public Meta catalog feed. It is technically functional, but its present uniform `in stock` status is **not sufficient commercial evidence** for each listed product. Therefore ATLAS must distinguish:

1. implementation maturity;
2. commercial publication status;
3. actual sellability/entitlement status;
4. physical/digital inventory or capacity;
5. payment-provider readiness.

No wallet, bank, insurance, lending, securities or payment-processing function is treated as native regulated execution merely because its name appears in a catalog or roadmap.

## 6. Authority map

| Object | Authority |
|---|---|
| ATLAS product/service definition | future Product Registry / approved catalog source |
| Price/plan/offer | future Commerce Offer Registry |
| Stock/item movement | Inventory |
| Merchant/company identity | CRM/Organization/Business Network composition |
| Sales order | Enterprise future commercial transaction spine |
| Fulfillment task/status | Inventory/Operations/Transportation/provider |
| Invoice/AR/payment accounting | Finance |
| Payment authorization/settlement | authorized processor/provider |
| Bank custody/movement | authorized financial institution/provider |
| Rewards liability | future Commerce/Finance-linked rewards ledger |
| Ad campaign | future Ads registry |

## 7. Fruit chains

`Product identity → merchant offer → price/availability revalidation → cart → order → fulfillment → invoice/payment handoff → accounting/audit`

`Plan → approved commercial offer → checkout provider → entitlement → billing event → Finance accounting → Subscription management`

`Corporate request → spending policy/approval → order/PO → receipt → invoice/AP → payment provider → reconciliation`

## 8. Commerce invariants

1. A catalog entry is not proof of availability.
2. `in stock` must be backed by actual commercial/inventory/capacity evidence.
3. Price includes source/effective date/market and is revalidated before charge.
4. Product identity is separate from merchant offer/inventory.
5. Commerce does not create a second Inventory or Finance ledger.
6. Checkout UI does not imply payment processing or settlement.
7. Wallet UI does not imply custody or banking authority.
8. Banking/lending/insurance/investment execution remains provider/licensing bound.
9. Refund status distinguishes requested/approved/provider-confirmed/settled.
10. Ads/promotions do not alter objective knowledge/safety/resource ranking without disclosure.
11. Proposal/investment artifacts do not imply an offer is legally available.
12. Commercial plan/entitlement state must be authoritative before access is granted.

## 9. Next fruit sequence

COM1. Canonical Product + Commercial Offer Registry with maturity/commercial-state separation.  
COM2. Make Meta feed derive truthful availability from approved commercial state instead of unconditional `in stock`.  
COM3. Merchant Offer + price/inventory freshness contract.  
COM4. Cart + checkout revalidation model.  
COM5. Integrate Branch 01 Sales Order spine and fulfillment lineage.  
COM6. Plan/entitlement/subscription billing model.  
COM7. Authorized payment-provider adapter and payment-event evidence.  
COM8. Wallet/provider-source boundary and rewards liability ledger.  
COM9. Refund/dispute/provider-confirmation workflow.  
COM10. Commerce production verifier covering price/availability/payment truth.

## 10. Definition of ripe fruit

A Commerce fruit becomes **RIPE** only when product identity, commercial approval, price/source freshness, capacity/inventory, order/fulfillment authority, payment-provider status, accounting evidence, consumer disclosures and exact deployed behavior are verified. A feed, price tag or checkout button alone never proves that ATLAS can legally sell, hold funds, lend, insure or execute investments.
