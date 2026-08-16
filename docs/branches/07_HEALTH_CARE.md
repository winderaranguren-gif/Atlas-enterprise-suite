# Branch 07 — Health & Care

**Parent:** ATLAS Master Index & Genealogy  
**Lineage:** Human mission → ATLAS OS / Core → Health & Care  
**Status:** living branch dossier  
**Rule:** ATLAS Health may organize information, research, workflows and prototypes, but must distinguish educational/research support from validated clinical decision support, medical-device functionality, diagnosis, treatment and hospital production deployment.

---

## 1. Branch purpose

Health & Care exists to reduce fragmentation around care, health knowledge, hospital operations and research while protecting patients and clinicians from unsupported claims. Its fruit is safer coordination, clearer information, better navigation and more rigorous research evidence—not a claim that ATLAS independently practices medicine.

## 2. Roots inherited

- Human dignity, privacy and informed consent.
- Clinical safety outranks visual novelty or speed.
- Data minimization and need-to-know access.
- Established evidence, emerging evidence, hypothesis and concept remain visibly distinct.
- No cure, diagnosis or personalized-treatment claim without appropriate validation.
- Human clinical authority remains explicit.
- Medical-device, EHR, pharmacy, telehealth and regulated execution boundaries are not bypassed.
- Patient-facing experiences must be accessible and multilingual where deployed.

## 3. Trunk dependencies

Identity/Auth, Organization/DBA, RBAC, Audit Ledger, Documents/evidence, Knowledge/provenance, Global Context, Maps/indoor navigation, Inventory, Operations, provider adapters, security/privacy governance and release verification.

## 4. Canonical sub-branches

### 4.1 Health Visitor Access & Indoor Navigation — ARTIFACT-VERIFIED FRUIT

A verified Library MVP exists as `ATLAS_Health_Visitor_Access_MVP.zip`, with supporting README evidence.

The documented local prototype includes staff lookup against fictional demo patients, visitor eligibility, privacy-safe denial, random temporary passes, QR access, destination/indoor directions, lost/checkpoint recovery, checkout, local SQLite audit, dashboard metrics and mobile-friendly behavior.

**Crucial boundary:** the artifact explicitly identifies itself as a functional local prototype, **not a hospital production deployment**. Production still requires EHR/ADT, consent/restriction feeds, hospital SSO/RBAC, messaging, encrypted production data/key management, HIPAA/privacy/security governance, ID/badge policy, indoor positioning, accessibility/multilingual validation and emergency/unit policy workflows.

**Design invariant:** visitor-facing output intentionally excludes diagnosis, treatment, medications, lab results and clinical notes.

### 4.2 Holographic Health Twin — ARTIFACT-VERIFIED FRUIT

The Library backup and SHA-256 index verify existence/integrity of `ATLAS-Holographic-Health-Twin-MVP.zip`.

**Current claim:** artifact/MVP exists.

**Not implied:** clinical accuracy, diagnostic performance, validated physiologic simulation, patient-specific medical-device status or production EHR integration.

### 4.3 Health Frontiers Research Framework — ARTIFACT-VERIFIED RESEARCH FRUIT

ATLAS Health Frontiers has documented research material and integrity-preserved artifacts. The research doctrine requires uncertainty, evidence levels and clear separation between scientific questions and proven interventions.

The English edition explicitly states that ATLAS must not declare cures without reproducible trials/regulatory review, recommend stopping prescribed treatment, confuse AI correlation with causation, use personal data without consent, experiment outside approved protocols, hide uncertainty/negative results, or promote universal commercial solutions without evidence.

**Fruit:** structured research questions, evidence taxonomy, hypothesis registry direction and public educational material—not direct clinical care.

### 4.4 Medicine & Disease Intelligence — GREEN FRUIT

The established vision is a knowledge/research layer for classification, mechanisms, evidence gaps, early-detection questions and scientific investigation.

**Required maturation:** versioned medical sources, evidence grading, provenance, conflict/update handling, specialty review, clinical-safety policy and explicit separation between educational synthesis and patient-specific decision support.

### 4.5 Health Evidence Governance — GREEN FRUIT / STRONG SPECIFICATION

Historical ATLAS rules require evidence levels and separation of established knowledge, emerging evidence, hypotheses and conceptual vision.

**Next step:** turn that rule into a canonical evidence object/schema with source, publication date, study type, population, certainty, reviewer, conflict status and expiration/review date.

### 4.6 Smart Room — GREEN FRUIT

The documented Smart Room portfolio includes bedside station, clinical station, virtual care, medication & infusion, care timeline, patient experience, connected-care operations, intelligent history and security.

**Current state:** architecture/proposal lineage, not a canonical production hospital runtime in the current repository.

### 4.7 Bedside / Patient Experience — GREEN FRUIT

Future bedside tools may expose authorized education, comfort/environment controls, wayfinding, communication and care-status context.

**Boundary:** the patient-facing interface must not expose clinician-only data or alter orders/medications without validated clinical authorization pathways.

### 4.8 Clinical Station / Operations — GREEN FRUIT

The AdventHealth proposal defines beds, rooms, staffing visibility, task routing, throughput and capacity coordination as a high-priority clinical-operations domain.

**Lineage:** Operations + People + authorized EHR/ADT context + Health-specific policy.

**Boundary:** ATLAS must not become a shadow EHR or unvalidated source of patient census/order truth.

### 4.9 Connected Care / Longitudinal Context — GREEN FRUIT

Health Intelligence and Connected Care aim to unify authorized longitudinal context, communication and follow-up.

**Required maturation:** canonical patient identity mapping, consent, source provenance, encounter/data lineage, EHR interoperability and role-sensitive views.

### 4.10 Virtual Care / Telemedicine — PARTNER-BOUND / GREEN

ATLAS may orchestrate scheduling, context, documentation and communication. Actual clinical telehealth delivery must satisfy provider/licensure, privacy, consent, communication security and jurisdiction-specific requirements.

### 4.11 Medication & Infusion Workflow — PARTNER-BOUND / GREEN

Medication safety, infusion context and pharmacy workflows are established ATLAS concepts.

**Boundary:** medication orders, administration records, dose calculations, pharmacy verification and device control require validated clinical systems, interfaces, human oversight and—where applicable—medical-device/regulatory compliance.

### 4.12 Clinical Inventory / Supply Chain — GREEN CROSS-BRANCH FRUIT

ATLAS Inventory can provide item/location/movement primitives. Health-specific supply chain must add lot/serial/expiry, sterile/temperature requirements, recalls, clinical authorization and healthcare procurement semantics where applicable.

**Invariant:** Health reuses Inventory movement logic rather than creating a hidden stock ledger.

### 4.13 Patient / Visitor Identity & Consent — GREEN FRUIT

Visitor Access demonstrates privacy-aware authorization logic using fictional data, but production identity/consent must connect to authorized hospital identity, patient consent/restrictions and revocation sources.

### 4.14 Indoor Clinical Navigation — GREEN / ARTIFACT FOUNDATION

Visitor Access already demonstrates step-by-step indoor directions and route recovery locally. Production requires a validated hospital map/positioning system such as approved QR checkpoints, BLE, Wi-Fi RTT, UWB, NFC or equivalent.

### 4.15 Health Data Interoperability — PARTNER-BOUND / GREEN

EHR/ADT, laboratory, imaging, pharmacy, payer and other health-system integrations remain provider/institution-bound. ATLAS should use standards/adapters where appropriate and preserve source-system provenance rather than ingesting data into an untraceable copy.

### 4.16 Clinical Decision Support — GREEN / HIGH-GOVERNANCE

Decision-support context may be a future ATLAS capability, but clinical recommendations require validated models/rules, intended-use definition, performance evidence, monitoring, human override, provenance and regulatory assessment where applicable.

**No current claim:** ATLAS has validated diagnostic or treatment decision authority.

### 4.17 Remote Monitoring / Sensors — PARTNER-BOUND / GREEN

Wearables, bedside devices and remote sensors may feed authorized health workflows. Device quality, calibration, intended use, consent and medical-device status must be known before signals influence care.

### 4.18 Health Analytics / Risk Stratification — GREEN / HIGH-GOVERNANCE

The AdventHealth proposal includes predictive analytics and risk context, but model performance, bias, drift, calibration, target population and clinician adoption must be validated before clinical use.

### 4.19 Research Data & Cohort Infrastructure — GREEN FRUIT

Health Frontiers envisions taxonomy, evidence libraries, hypothesis registry, research data prototypes, retrospective studies and later prospective trials.

**Boundary:** research involving human data/specimens requires protocol, consent/waiver, governance, privacy and ethics/IRB-equivalent oversight as applicable.

### 4.20 Health Frontiers Disease Programs — SEED / RESEARCH

Cancer and other disease areas are research programs/questions. Public research material must continue to state clearly that hypotheses require laboratory validation, ethical review, clinical trials and regulatory evaluation before treatment claims.

### 4.21 Mental / Neurodevelopmental / Prenatal-Fetal Knowledge — SEED / GREEN RESEARCH

Historical scope includes mental/emotional health, prenatal/fetal health, Down syndrome, ADHD and autism/Asperger-related knowledge/research. These areas require careful evidence, respectful language, specialty review and no stigmatizing or unsupported intervention claims.

### 4.22 Hospital Enterprise Integration — GREEN / PARTNER-BOUND

The AdventHealth Smart Health Ecosystem proposal correctly treats value as one coordinated system across patient, clinical, workforce, finance, facilities, research, safety and community domains—not 18 isolated apps. Actual hospital deployment remains institution/integration/validation dependent.

---

## 5. Current WORKING FRUIT status in canonical repo

At this branch cut, no Health-specific runtime in the canonical `main` repository was evidenced at the same maturity level as Finance, HR or Operations. Therefore ATLAS must not promote historical Health artifacts/proposals into canonical **WORKING FRUIT** merely because they are well-designed or locally functional.

The strongest current Health evidence is **ARTIFACT-VERIFIED** for Visitor Access, Holographic Health Twin and Health Frontiers research material. Promotion into canonical runtime requires selective re-porting under current Core security/data standards.

## 6. Authority map

| Object / function | Authority |
|---|---|
| ATLAS Health research hypothesis/evidence record | future Health Research registry |
| Knowledge synthesis | Knowledge + Health evidence governance |
| Hospital patient/encounter/order data | authorized EHR/clinical source system |
| Visitor access state | future canonical Health Visitor system; production backed by hospital authorization sources |
| Inventory movement | ATLAS Inventory; Health adds clinical constraints |
| Clinical workforce | People/HR + hospital identity/workforce source |
| Health document/evidence | Documents |
| Telehealth encounter execution | authorized healthcare/provider platform and licensed clinicians |
| Medication order/administration | authorized clinical/pharmacy systems |
| Medical-device/sensor signal | validated device/source with provenance |
| Clinical decision authority | licensed clinical professionals + validated institutional systems |

## 7. Fruit chains

### Visitor access
`Hospital patient/consent source → visitor request → eligibility → temporary scoped pass → indoor guidance → checkout/expiry → audit`

### Research evidence
`Research question → source evidence → evidence grade → hypothesis → protocol → ethics/regulatory review → study → results → updated evidence`

### Connected care
`Authorized clinical sources → patient identity/consent → provenance-preserving context → clinician/patient view → documented action → source-system writeback when authorized`

### Medication safety
`Authorized order → pharmacy/clinical verification → patient/device context → administration workflow → monitoring → audit/source-system record`

## 8. Health invariants

1. ATLAS Health does not diagnose or promise cures without appropriate validation.
2. Research hypothesis is never represented as proven treatment.
3. Patient-facing data follows minimum-necessary disclosure.
4. Clinical authority and human oversight remain explicit.
5. EHR/ADT/pharmacy/device sources retain provenance and authority.
6. Visitor Access never reveals restricted clinical/location data to an unauthorized visitor.
7. Health-specific inventory composes the canonical Inventory ledger.
8. Model/AI output does not silently become a clinical order or diagnosis.
9. Human-subject research requires appropriate ethics/privacy/protocol governance.
10. Artifact-verified Health MVPs are not called hospital production deployments.
11. Sensor/device data must carry source, quality and intended-use context.
12. Health deployment requires privacy/security/accessibility/regulatory review appropriate to intended use.

## 9. Next fruit sequence

HCARE1. Canonical Health evidence/provenance schema and evidence-level contract.  
HCARE2. Re-port Visitor Access into current ATLAS Core with Organization/DBA, RBAC, Audit and no demo patient leakage.  
HCARE3. Define patient/visitor identity and consent adapter contract without creating a shadow EHR.  
HCARE4. Create Health Smart Room operational model as a composition of Operations, People, Inventory, Documents and authorized clinical adapters.  
HCARE5. Define Health interoperability provenance contract for EHR/ADT/lab/imaging/pharmacy data.  
HCARE6. Re-port Holographic Health Twin as a visualization/simulation layer with explicit model/data provenance and no unsupported clinical claims.  
HCARE7. Build research registry: disease/question/evidence/hypothesis/protocol/status/results.  
HCARE8. Define clinical decision-support governance, model validation and monitoring before any patient-specific recommendation capability.  
HCARE9. Establish telemedicine/device/provider adapter boundaries and security controls.  
HCARE10. Add Health-specific production verification that tests privacy boundaries, role access, provenance and fail-closed behavior.

## 10. Definition of ripe fruit

A Health fruit becomes **RIPE** only for a precisely stated intended use after its authoritative sources, consent/access model, privacy/security controls, evidence/provenance, validation, human oversight, monitoring, interoperability and exact deployed environment are verified. A research artifact, local MVP or impressive interface is never sufficient evidence for clinical efficacy or hospital production readiness.
