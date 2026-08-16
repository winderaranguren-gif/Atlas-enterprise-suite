# Branch 08 — Mobility, Maps & Vehicles

**Parent:** ATLAS Master Index & Genealogy  
**Lineage:** Human mission → ATLAS OS / Core → Mobility, Maps & Vehicles  
**Status:** living branch dossier  
**Rule:** mobility experiences share route, person, vehicle and trip identities where appropriate. Fleet operations, professional-driver intelligence, navigation, vehicle concepts and infrastructure must not become incompatible parallel histories.

---

## 1. Branch purpose

Mobility turns movement into understandable, safer and auditable context: where a person/vehicle is going, what happened during a trip, what the vehicle needs, what it cost and what risks or conditions affected the journey. Its fruit is useful mobility intelligence—not unsupported claims of autonomous driving, live manufacturer integration or real-time map/sensor connectivity.

## 2. Roots inherited

- Human control and safety remain explicit.
- Location data is sensitive and purpose-limited.
- One trip/vehicle/person lineage where systems interoperate.
- Navigation/telematics claims require actual data sources and freshness evidence.
- Driving scores must be explainable and not silently reused for unrelated punitive decisions.
- Vehicle concepts are not manufacturer products or endorsements.
- Payment/insurance/emergency execution remains provider-bound where regulated.

## 3. Trunk dependencies

Identity/Auth, People identities, Organization/DBA, RBAC, Audit, Global Context, Maps/geospatial services, Transportation/Fleet, Finance, Public Safety, provider adapters, privacy/consent and release verification.

## 4. Canonical sub-branches

### 4.1 Fleet Transportation — WORKING CROSS-BRANCH FRUIT

**Route:** `/platform/transportation`.  
**Authority:** Enterprise & Operations / Transportation system of record.  
**Evidence:** current `modules/transportation.js`, transportation schema/safety components.

This is the canonical enterprise fleet layer for vehicles, trips, drivers, maintenance and fuel records. Mobility consumes it where appropriate; it does not fork the fleet ledger.

### 4.2 RideOS / Professional Driver Experience — GREEN FRUIT

Historical ATLAS Ride scope includes session lifecycle, mileage, platform income, tips, bonuses, tolls, fees/commissions, expenses, maintenance, insurance, net earnings and tax-ready organization.

**Required lineage:** person/driver → vehicle → session/trip → route/telemetry → earnings/expenses → Finance/report export.

### 4.3 Smooth Cruising Report — GREEN FRUIT

Defined measures include acceleration, braking, turns, speed, vibration/road condition, traffic, energy consumption, passenger comfort and route efficiency.

**Required maturity:** sensor/source provenance, sampling/timestamp model, score formula/version, explainability and calibration before scores are presented as objective safety facts.

### 4.4 Ride Finance & 1099 Organization — GREEN FRUIT

Ride should organize income/expenses and produce tax-ready supporting summaries without creating a second accounting ledger or pretending to issue official tax forms where source/issuer requirements are absent.

**Authority boundary:** raw mobility/driver session data belongs to Ride; canonical accounting consequences belong to Finance.

### 4.5 Maps & GPS 4D — GREEN / VISUAL ARTIFACT FOUNDATION

The documented product vision is immersive navigation combining route, traffic, weather, safety and places, with Orlando as an early reference environment.

Visual assets and storyboards exist, but no current canonical live routing/map runtime was evidenced in `main`.

### 4.6 Route / Trip Identity — GREEN FRUIT

A canonical route/trip contract should connect origin/destination, timestamps, vehicle, driver/person, distance, map-provider route reference, conditions/incidents and downstream Ride/Fleet/Safety records.

### 4.7 Traffic / Weather / Incident Layers — PARTNER-BOUND / GREEN

Real-time traffic, weather and incident data require authoritative/fresh providers or public data sources. ATLAS may normalize/display them but must preserve source timestamp/provenance.

### 4.8 Parking / Destination / Indoor Arrival — GREEN FRUIT

Mobility concepts include exact entrances, parking locations/structures and guidance inside large destinations. Production requires validated place/map/indoor data and accessibility considerations.

### 4.9 Smart Road — SEED / GREEN INFRASTRUCTURE

Concept portfolio defines intelligent roads with sensors, LED lighting, pedestrian safety and EV readiness.

**Boundary:** infrastructure sensing/control requires municipal/road authority, hardware, field validation, cybersecurity and fail-safe engineering.

### 4.10 Vehicle Registry / Driver-Vehicle Link — GREEN CROSS-BRANCH FRUIT

Transportation already has fleet vehicle/driver primitives. A personal/professional mobility profile should reference canonical vehicle identity and authorized driver relationship rather than create duplicate vehicles for Ride, Fuel and Cars.

### 4.11 Vehicle Guard Mode — GREEN FRUIT

Concepts include unauthorized-access alerts, towing detection, parking-impact detection, real-time location, movement history, geofencing, valet/parking modes and roadside/emergency access.

**Boundary:** real capability depends on authorized vehicle telematics/sensors, consent, device security and actual alert channels.

### 4.12 Predictive Maintenance — GREEN / HIGH-EVIDENCE

Potential inputs include battery, tire pressure, temperature, braking, energy/oil state, diagnostic codes and component wear.

**Maturity requirement:** OEM/device source provenance, diagnostic-code semantics, model accuracy, false-positive handling and clear distinction between maintenance guidance and safety-critical diagnosis.

### 4.13 Fuel / Charge Discovery — GREEN FRUIT

Fuel/charge concepts include station discovery, availability, price comparison, range-based suggested stops and trip-cost calculation.

**Provider boundary:** price/availability must be timestamped/source-backed.

### 4.14 Fuel Pay & Rewards — PARTNER-BOUND / GREEN

Concept scope includes receipts, digital payments, rewards, promotions and vehicle spend.

ATLAS may own route/context/spend records; card/ACH/wallet/fuel purchase execution requires authorized payment/provider integration.

### 4.15 Digital Driver Profile — GREEN FRUIT

Potential preferences include seat, climate, music, mirrors, lighting, driving modes, frequent routes, emergency contacts, young-driver restrictions, accessibility, maintenance history and privacy settings.

**Invariant:** preferences only load into a compatible vehicle after authenticated/authorized pairing and explicit scope.

### 4.16 Cars Design Studio — ARTIFACT-VERIFIED CONCEPT FRUIT

The ATLAS concept family includes Urban X, Neo X, Terrain X, GT X/GT Line X, Solaris EV and Carnival X, with multiple presentation/design artifacts.

**Claim boundary:** these are ATLAS design/concept studies, not manufactured vehicles or production automotive platforms.

### 4.17 Kia Concept Portfolio — ARTIFACT-VERIFIED CONCEPT FRUIT

Protected presentations exist for Sportage 2027/2028, Carnival, Seltos and connected-vehicle/VisionGuard ideas. The presentation itself states that the concepts are independent and not affiliated with, endorsed by or commissioned by Kia Corporation/Kia America.

### 4.18 VisionGuard / 360° Vehicle Safety — GREEN CONCEPT

Front/rear/side cameras, night vision where viable, recording, app access and privacy/consent are established design directions.

**Maturity requirement:** automotive-grade hardware, lawful recording rules, retention/access policy, cybersecurity and safety validation.

### 4.19 Vehicle–Phone–Home Connectivity — GREEN FRUIT

Cross-device vehicle experience is a product direction. It requires authenticated device/vehicle pairing, scoped commands, revocation, offline/failure behavior and explicit safety restrictions for remote controls.

### 4.20 EV / Charging / Energy Optimization — GREEN FRUIT

EV concepts include charging, energy consumption and route/range intelligence. Production must use actual vehicle/charger capabilities and avoid inventing range, charge state or compatibility.

### 4.21 Accessibility in Mobility — GREEN CROSS-CUTTING FRUIT

Documented concepts include voice control, larger text, high contrast, visual/audible/haptic alerts, screen reading, captions, simplified language and controls for limited mobility.

Accessibility is a branch invariant, not a late UI option.

### 4.22 Emergency Assistance Handoff — PARTNER-BOUND / GREEN

ATLAS can detect/contextualize and prepare an emergency/roadside handoff. Actual emergency dispatch, roadside service or vehicle emergency control must use authorized services and fail-safe human pathways.

---

## 5. Authority map

| Object / function | Authority |
|---|---|
| Enterprise fleet vehicle/trip/maintenance/fuel | Transportation / Enterprise |
| Professional-driver session | future Ride system |
| Accounting ledger / tax accounting | Finance |
| Person/driver identity | People / authorized mobility profile |
| Route geometry / traffic / map place | authoritative map/data provider or future ATLAS geospatial store with provenance |
| Weather | contextual provider |
| Vehicle telemetry | authorized vehicle/OEM/device source |
| Emergency dispatch | authorized public/private emergency service |
| Payment/fuel transaction execution | authorized payment/provider layer |
| ATLAS concept vehicle design | ATLAS Creator/Cars concept artifacts |

## 6. Fruit chains

`Driver/person + vehicle → session/trip → route/conditions/telemetry → Smooth Cruising metrics → report/history`

`Ride session → mileage + platform earnings + expenses → categorized supporting record → Finance/tax-ready export`

`Route request → provider route → traffic/weather/incidents → navigation presentation → arrival/parking → trip evidence`

`Vehicle telemetry → maintenance rule/model → explainable alert → authorized service action → maintenance record`

## 7. Maturity summary

**WORKING FRUIT:** Fleet Transportation exists canonically under Enterprise and is reused by Mobility.  
**ARTIFACT-VERIFIED CONCEPT FRUIT:** ATLAS Cars and Kia concept portfolios.  
**GREEN FRUIT:** RideOS, Smooth Cruising, GPS 4D, route/trip contract, Guard Mode, predictive maintenance, fuel/charge discovery, digital driver profile, vehicle connectivity, EV intelligence, accessibility.  
**PARTNER-BOUND:** live traffic/weather/map feeds where external, Fuel Pay execution, OEM/telematics integrations, emergency/roadside dispatch and safety-critical vehicle commands.  
**SEED/GREEN:** Smart Road infrastructure.

## 8. Mobility invariants

1. Fleet/vehicle/trip identity is not duplicated across Mobility products.
2. Location history is sensitive, purpose-limited and permissioned.
3. Driving scores expose formula/version/source context.
4. Ride financial organization does not create a second Finance ledger.
5. Real-time claims require source timestamp/freshness evidence.
6. Vehicle telemetry is never invented when no authorized source exists.
7. Manufacturer concept presentations do not imply endorsement or production integration.
8. Remote vehicle actions require authenticated pairing, authorization and safety constraints.
9. Camera/recording features require privacy/retention/lawful-use controls.
10. Accessibility is part of route/driver design from the start.
11. Emergency/roadside execution remains an authorized-service handoff.
12. Smart Road control requires infrastructure authority and fail-safe field engineering.

## 9. Next fruit sequence

M1. Canonical mobility identity contract: person/driver/vehicle/session/trip.  
M2. Ride session + mileage + earnings/expense durable schema.  
M3. Smooth Cruising telemetry/score provenance contract.  
M4. Geospatial provider abstraction with source/freshness metadata.  
M5. GPS 4D functional routing prototype against authorized map/weather sources.  
M6. Vehicle telematics adapter contract and permission model.  
M7. Fuel/charge discovery and expense integration before payment execution.  
M8. Driver profile/pairing/revocation model.  
M9. Cars/VisionGuard simulation layer clearly separated from real vehicle control.  
M10. Mobility production verifier for privacy, route provenance, offline/failure and authorization behavior.

## 10. Definition of ripe fruit

A Mobility fruit becomes RIPE only when its person/vehicle/trip identity, location privacy, source freshness, telemetry provenance, safety behavior, authorization, validation and exact deployed environment are proven for the claimed intended use. A concept render, presentation or storyboard is evidence of design—not evidence of live navigation, vehicle control or autonomous capability.
