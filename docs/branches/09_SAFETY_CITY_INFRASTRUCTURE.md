# Branch 09 — Safety, City & Infrastructure

**Parent:** ATLAS Master Index & Genealogy  
**Lineage:** Human mission → ATLAS OS / Core → Safety, City & Infrastructure  
**Status:** living branch dossier  
**Rule:** sensing, classification, visualization, dispatch and public authority are separate functions. ATLAS may assist detection and coordination, but must not claim emergency dispatch, surveillance authority or municipal control without verified institutional integration and governance.

---

## 1. Branch purpose

Safety & City turns authorized observations into traceable situational awareness: detect a possible incident, preserve evidence, classify confidence/risk, notify the right authorized workflow and provide a shared operational picture. Its fruit is faster, more accountable coordination—not automated public authority.

## 2. Roots inherited

- Human safety and due process.
- Minimize surveillance and collect only authorized data.
- Detection is probabilistic evidence, not automatic guilt/fact.
- Human/institutional authority remains explicit.
- Evidence provenance, integrity and retention matter.
- Emergency systems fail safely when connectivity/model confidence is poor.
- Biometric use requires explicit consent/legal basis, liveness where applicable, revocation and non-biometric alternatives.
- City technology must be accessible and publicly governable.

## 3. Trunk dependencies

Identity/Auth, Organization/DBA, RBAC, Audit, Documents/Evidence, Maps/Geospatial, Mobility, Operations, Health emergency handoff, Hardware/Sensors, provider adapters, privacy/security and release verification.

## 4. Canonical sub-branches

### 4.1 Public Safety Network — GREEN FRUIT
Established architecture covers city monitoring, risk detection, incident classification, operations-center context and coordinated response. No canonical municipal runtime in `main` is currently evidenced.

### 4.2 Intelligent Camera / Sensor Intake — GREEN / PARTNER-BOUND
Future inputs include authorized cameras/sensors for fire, smoke, collisions, explosions and crowd conditions. Production requires device identity, timestamps, calibration/health, lawful placement, retention rules and cybersecurity.

### 4.3 Incident Detection — GREEN FRUIT
Detection models/rules should emit candidate events with source, confidence, model/rule version, timestamp and supporting evidence. Detection alone does not trigger irreversible enforcement action.

### 4.4 Incident Classification & Risk — GREEN FRUIT
Risk classification must separate observed facts from inferred severity and expose the evidence/reasoning used for prioritization.

### 4.5 Evidence Preservation — GREEN CROSS-BRANCH FRUIT
Documents/Vault should own hashes, originals, versions/access and retention. Safety adds chain-of-custody semantics, capture device/source and incident linkage.

### 4.6 Alert Prioritization — GREEN FRUIT
Alerts can rank urgency and route to authorized teams. Priority does not equal confirmed emergency outcome.

### 4.7 Emergency Dispatch / CAD Integration — PARTNER-BOUND
Police/fire/EMS dispatch requires authorized agency/CAD/911 integration, operational policy and fail-safe handoff. ATLAS must not simulate a real dispatch connection.

### 4.8 Operations Center — GREEN FRUIT
One command view may combine incidents, units/assets, weather, traffic, maps, cameras and evidence. Every displayed source needs freshness/provenance and role-based access.

### 4.9 Digital Twin / 4D Vision — GREEN / ARTIFACT FOUNDATION
Historical ATLAS designs include 2D/3D/360° views, replay and annotations. Visual assets demonstrate the concept; they do not prove a live city twin or authoritative spatial data feed.

### 4.10 Incident Replay / Timeline — GREEN FRUIT
A mature replay should reconstruct source events without rewriting originals: evidence → normalized events → timeline → annotations, preserving who added each annotation.

### 4.11 Unit / Asset Awareness — GREEN / PARTNER-BOUND
Locations/status of police, fire, EMS, city vehicles or infrastructure assets require authorized agency sources. ATLAS may normalize/display, not invent availability or ETA.

### 4.12 Orlando City — ARTIFACT-VERIFIED PROPOSAL FRUIT
The master archive records an EN/ES Orlando City package covering vision, architecture, sustainability, accessibility, plan, costs, ROI and annexes. It is proposal evidence, not a municipal deployment.

### 4.13 MCO Airport Experience — ARTIFACT-VERIFIED PROPOSAL FRUIT
ATLAS has documented MCO mapping, traveler arrival-flow improvements and advertising integration concepts. Airport operational/security integrations remain authority-bound.

### 4.14 Smart Infrastructure — GREEN / PARTNER-BOUND
Road lighting, signals, facilities, utilities, sensors and connected infrastructure require asset authority, hardware security, maintenance and safe-state controls.

### 4.15 Smart Road — SEED CROSS-BRANCH
Smart Road belongs primarily to Mobility/Infrastructure composition: sensors, LED, pedestrian safety, EV readiness. Safety consumes incident/condition signals but does not create a separate road-control system.

### 4.16 Elevator / Facility Safety — ARTIFACT-VERIFIED CROSS-BRANCH
Elevator Operations MVP belongs to Enterprise industry operations. Safety may consume alarms/inspection/maintenance events after a canonical integration, but does not fork elevator records.

### 4.17 Disaster / Emergency Coordination — GREEN FRUIT
Future hurricanes, floods, fires, outages or mass-event workflows should compose public alerts, maps, shelter/resources, infrastructure status and agency coordination with source provenance.

### 4.18 Community Safety Communication — GREEN FRUIT
Public-facing alerts must separate verified official information, advisory context and uncertainty, support multilingual/accessibility needs and avoid exposing sensitive tactical/private data.

### 4.19 Biometrics / Identity in Public Space — PARTNER-BOUND / HIGH-GOVERNANCE
Any facial/biometric function requires explicit legal basis/consent as applicable, strict purpose limits, liveness/quality controls, bias/performance evaluation, retention/revocation and non-biometric alternatives. No blanket public-surveillance authority is implied.

### 4.20 Safety Analytics — GREEN / HIGH-GOVERNANCE
Trend/hotspot analysis must avoid converting historical reporting bias into automated enforcement decisions. Inputs, uncertainty and demographic fairness require review.

---

## 5. Current WORKING FRUIT status in canonical repo

No city/public-safety-specific production runtime at the same maturity level as Finance/HR/Operations is currently evidenced in `main`. Current strongest evidence is concept/proposal/visual material plus reusable Core, Operations, Documents, Mobility and Audit foundations.

## 6. Authority map

| Object / function | Authority |
|---|---|
| Camera/sensor raw event | authorized device/source |
| Incident candidate | future Safety incident registry |
| Evidence original/hash/version | Documents/Vault + Safety chain-of-custody metadata |
| Map/traffic/weather | authoritative provider/source |
| Police/fire/EMS dispatch | authorized agency/CAD/911 systems |
| City asset status | authorized municipal/institutional source |
| Public alert | authorized agency/publisher workflow |
| Safety model output | ATLAS model/rule evidence; never equivalent to official determination |
| Biometric identity | authorized identity system under applicable law/policy |

## 7. Fruit chains

`Authorized sensor → candidate detection → evidence preservation → confidence/risk review → authorized alert/workflow → agency action → outcome/audit`

`Incident sources → normalized timeline → digital twin/map → human annotations → replay/report → preserved evidence`

`Infrastructure telemetry → condition/risk rule → maintenance/operations workflow → authorized field action → asset record`

## 8. Safety invariants

1. Detection is not confirmation.
2. Classification is not public authority or dispatch.
3. Model output never automatically becomes guilt/enforcement.
4. Raw evidence/provenance is preserved before annotation/transformation.
5. Public-safety data access is least-privilege and purpose-limited.
6. Dispatch/911/CAD claims require verified agency integration.
7. Unit/asset ETAs are never fabricated.
8. City/digital-twin visualizations disclose source freshness.
9. Biometrics require strict legal/policy/technical governance and alternatives.
10. Public alerts distinguish verified facts from uncertainty/advisories.
11. Failures degrade safely to human/manual operations.
12. Proposal/render evidence is not deployment evidence.

## 9. Next fruit sequence

S1. Canonical incident/evidence schema with source/confidence/model version.  
S2. Sensor/device identity and health/provenance contract.  
S3. Evidence Vault + chain-of-custody integration.  
S4. Permission-aware incident operations workspace.  
S5. Digital-twin event/timeline contract.  
S6. Agency/CAD/911 adapter boundary with fail-safe manual handoff.  
S7. City asset/infrastructure adapter contract.  
S8. Public alert/accessibility/multilingual governance.  
S9. Bias/performance monitoring for safety analytics/models.  
S10. Safety production verifier covering source freshness, access, evidence integrity and no-false-dispatch behavior.

## 10. Definition of ripe fruit

A Safety/City fruit becomes RIPE only when authorized source systems, intended use, privacy/legal authority, model performance where applicable, evidence integrity, human/institutional oversight, failure behavior and exact deployed integrations are verified. A city visualization or emergency storyboard is never proof of real dispatch or municipal control.
