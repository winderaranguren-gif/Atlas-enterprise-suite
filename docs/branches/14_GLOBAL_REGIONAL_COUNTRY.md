# Branch 14 — Global, Regional & Country Layers

**Parent:** ATLAS Master Index & Genealogy  
**Lineage:** Human mission → ATLAS OS / Core → Global, Regional & Country Layers  
**Status:** living branch dossier  
**Rule:** ATLAS has one global Core. Region/country/culture/regulation adapt that Core; they do not create disconnected country products or fabricate location, law, availability, providers or institutions.

---

## 1. Branch purpose

Global & Country context lets ATLAS behave appropriately across language, direction, locale, time, culture, geography, regulation and local business reality while preserving one identity/security/data architecture. Its fruit is an experience that feels local without becoming architecturally fragmented.

## 2. Roots inherited

- One global runtime, no disconnected country forks.
- User override outranks inference where safe/appropriate.
- Unknown location remains unknown; ATLAS does not fabricate a country.
- Language, country, timezone and cultural identity are distinct dimensions.
- Localization does not change source-of-truth records silently.
- Local laws/regulations require jurisdiction/effective-date provenance.
- Country cultural content must avoid stereotypes and preserve source/provenance.
- Data residency/provider availability are explicit operational constraints.

## 3. Trunk dependencies

Identity/Auth, Global Context, Settings/Personalization, Lingua, Organizations/DBAs, provider adapters, Maps, Commerce, Finance/Tax, Documents, Knowledge, security/privacy, release verification.

## 4. Canonical sub-branches

### 4.1 Global Context Runtime — WORKING FRUIT

**Routes:** `/api/context`, `/api/global/context`.  
**Runtime:** `modules/global-context.js`.  
**Validation:** `scripts/validate-global-context.mjs`.

The runtime resolves language, language tag, country, locale, timezone when available, text direction and source. Explicit `hl`/`gl` overrides are supported. Missing country is allowed rather than fabricated.

### 4.2 Language / Locale Resolution — WORKING FRUIT

ATLAS canonicalizes BCP-47-like language input, reads `Accept-Language`, composes locale and exposes selection source.

### 4.3 Country Resolution — WORKING FRUIT

Country can come from explicit query, edge country or language-region. When none is safe, country remains unspecified.

### 4.4 RTL / Text Direction — WORKING FRUIT

Arabic and other RTL language families are represented through an explicit direction value. UI modules must consume this rather than inventing per-screen direction logic.

### 4.5 Timezone Context — WORKING FOUNDATION

Cloudflare edge timezone can be exposed when available. User/organization timezone preference and event/business timezone semantics still require explicit settings contracts.

### 4.6 Regional Hierarchy — GREEN FRUIT

Canonical hierarchy should support Global → Region → Country → State/Province/Department → City/Locality where relevant, without assuming every country uses the same administrative model.

### 4.7 Country Cultural Profile — GREEN FRUIT

Country profiles may include languages, history, present context, food, landmarks, arts, holidays, institutions, commerce and local terminology. Content requires source/version/date and should distinguish heritage, contemporary reality and opinion.

### 4.8 Country Business / Industry Profile — GREEN FRUIT

Local sectors, employers, supply chains, commerce practices and opportunities should be source-grounded and time-stamped. Business discovery does not imply endorsement or commercial relationship.

### 4.9 Country Regulatory Profile — GREEN / HIGH-GOVERNANCE

Tax, employment, privacy, health, financial, consumer and other rules require jurisdiction, authority/source, effective date, supersession and review cadence. General cultural localization must never masquerade as legal advice.

### 4.10 Country Provider / Integration Availability — GREEN / PARTNER-BOUND

Payments, banking, maps, messaging, healthcare and other provider capabilities vary by market. ATLAS should publish capability/provider availability explicitly rather than assuming global parity.

### 4.11 Currency / Number / Date Units — GREEN FRUIT

Locale-aware display must distinguish presentation currency/format from ledger currency, transaction currency and unit conversion. Formatting never changes underlying accounting or measurement facts.

### 4.12 Address / Phone / Identity Formats — GREEN FRUIT

Country-aware input/validation should accommodate local address, phone, postal, personal/business ID patterns without forcing U.S.-centric assumptions or collecting identifiers without need.

### 4.13 Data Residency / Sovereignty — GREEN / HIGH-GOVERNANCE

Data storage/processing locations, cross-border transfer rules and provider regions must be explicit where applicable. Country selection does not itself relocate data.

### 4.14 Accessibility / Language Variants — GREEN CROSS-CUTTING FRUIT

Plain language, captions, screen-reader compatibility, contrast, regional language variants and sign-language support should reuse shared accessibility/global primitives.

### 4.15 Regional Content Packs — GREEN FRUIT

Reusable packs can contain approved translations, cultural references, place imagery, glossary, do-not-translate terms, regulatory notes and partner/provider availability. Packs are versioned overlays—not separate ATLAS codebases.

### 4.16 North America — GREEN REGIONAL LAYER

United States, Canada, Mexico and related local contexts share a region layer while retaining country-specific rules/culture/providers.

### 4.17 Central America — GREEN REGIONAL LAYER

Country overlays should preserve local languages, institutions and business/regulatory distinctions rather than treat the region as homogeneous.

### 4.18 Caribbean — GREEN REGIONAL LAYER

Island/territory status, language, currency, legal system and provider availability require country/territory-specific treatment.

### 4.19 South America — GREEN REGIONAL LAYER

Includes the ATLAS Venezuela direction plus future country layers, all inheriting one Core.

### 4.20 Europe — GREEN REGIONAL LAYER

EU/EEA and non-EU distinctions, language diversity, currencies and privacy/regulatory overlays must be explicit.

### 4.21 Africa — GREEN REGIONAL LAYER

Country/cultural/provider diversity prevents continent-wide assumptions. ATLAS must use country-level sources and local context.

### 4.22 Asia — GREEN REGIONAL LAYER

Language scripts, calendars/formatting, regulations and provider ecosystems vary significantly; the global runtime must support scripts/RTL and explicit local overlays.

### 4.23 Oceania — GREEN REGIONAL LAYER

Australia, New Zealand and Pacific contexts require distinct country/territory profiles and provider availability.

### 4.24 Antarctica / Research — SEED / SPECIAL CONTEXT

This is a research/geospatial context rather than a normal consumer-market country layer; governance should follow relevant treaty/research/operator frameworks.

### 4.25 ATLAS Venezuela — ARTIFACT/CONCEPT-VERIFIED COUNTRY DIRECTION

ATLAS Venezuela includes business/company/bank and cultural-country planning. It belongs as a country overlay and potential legal entities/services under the global architecture—not as a disconnected fork.

**Boundary:** legal entity incorporation, banking and regulated services require current Venezuelan law, filings and authorized institutions.

### 4.26 Egypt / Country Cultural Integration Pattern — GREEN CONCEPT

The established country pattern incorporates language, culture, food, emblematic sites, history, present, business and products. Egypt serves as an example of the content model, not a completed authoritative country database by implication.

### 4.27 Country Organization / Legal Entity Mapping — GREEN FRUIT

Organizations/DBAs can operate in countries, but legal entities, registrations, tax IDs, branches and establishments require explicit jurisdictional records rather than changing company identity based on locale.

### 4.28 Global Search / Discovery Context — GREEN FRUIT

Search/recommendation should know selected region/country/language while exposing when results are global vs locally applicable. Location-based ranking must not hide source/availability constraints.

### 4.29 Country Release / Feature Gating — GREEN FRUIT

Features subject to law/provider availability should be enabled by explicit market capability configuration, not hardcoded assumptions from IP country alone.

---

## 5. Authority map

| Context | Authority |
|---|---|
| Language/locale preference | user/organization settings + Global Context |
| Edge inferred country/timezone | edge/provider signal with source label |
| Legal jurisdiction | explicit transaction/entity/context record; never inferred solely from UI language |
| Country cultural content | versioned Knowledge/Country Profile sources |
| Local provider availability | provider/contract/config registry |
| Entity registration/tax ID | authoritative legal/business records |
| Currency accounting | Finance transaction/ledger records |
| Place/map facts | authoritative geospatial sources |

## 6. Fruit chains

`Request/browser/edge + explicit preferences → Global Context → regional/country overlay → localized UI/content/providers → same ATLAS Core records`

`Country profile source → review/version → cultural/regulatory/provider pack → feature/content presentation → provenance shown`

`Organization/entity → jurisdiction record → tax/regulatory/provider rules → allowed capability configuration → audit`

## 7. Global invariants

1. One global Core; country layers do not fork identity/security/data architecture.
2. Unknown country remains unknown rather than fabricated.
3. Language does not automatically determine legal jurisdiction.
4. Locale formatting does not alter underlying financial/measurement values.
5. Country cultural content is source/version aware and avoids stereotypes.
6. Regulatory content includes authority, effective date and review status.
7. Provider availability is explicit per market.
8. Selecting a country does not automatically relocate stored data.
9. Legal entities/registrations are explicit records, not UI settings.
10. Country feature gating uses verified law/provider/configuration, not IP inference alone.
11. User explicit preference can override inference for presentation context.
12. Regional layers reuse Core and shared capabilities rather than duplicate modules.

## 8. Next fruit sequence

G1. Canonical Region/Country/Cultural Profile schema.  
G2. Organization/user locale/timezone preference persistence.  
G3. Country provider/capability availability registry.  
G4. Versioned country regulatory-source registry.  
G5. Currency/unit/address/phone locale services.  
G6. Country content packs with source/version/glossary/media rights.  
G7. Data residency / processing-region metadata and controls.  
G8. ATLAS Venezuela country pack + legal-entity records separated from concepts.  
G9. Country feature gating and fallback behavior.  
G10. Global production verifier across LTR/RTL, unknown-location and explicit override scenarios.

## 9. Current WORKING FRUIT status

Global Context, language/country resolution, locale composition and RTL direction are canonical source-level working fruit. Region/country cultural, regulatory, provider and entity overlays remain green until durable sourced registries exist.

## 10. Definition of ripe fruit

A Global/Country fruit becomes **RIPE** only when source jurisdiction, language/locale, culture/regulation provenance, provider availability, entity context, privacy/data-region implications, fallback behavior and exact deployed behavior are verified. A country name, IP signal or translated screen alone never proves legal applicability, data residency, service availability or cultural completeness.
