# Branch 05 — Capability Fusion

**Parent:** ATLAS Master Index & Genealogy  
**Lineage:** Human mission → ATLAS OS / Core → Capability Fusion  
**Status:** living branch dossier  
**Rule:** Capability Fusion provides reusable experiences across ATLAS. It must bridge to authoritative systems of record instead of creating duplicate ledgers, people, documents, learning transcripts or finance records.

---

## 1. Branch purpose

Capability Fusion packages common human-facing functions—language, learning, tax workflow, recruiting experience, forms, media, subscription control and personalization—behind one ATLAS identity/navigation/security layer. Its fruit is reusable capability without architecture fragmentation.

## 2. Roots inherited

- One ecosystem, no capability silos.
- Honest implementation-state labels.
- Browser-native capability is conditional on actual browser/device support.
- Workflow foundation is not equivalent to durable system-of-record persistence.
- Protected workspaces remain protected.
- Public discovery may describe capabilities but cannot expose private records.
- Bridges connect ATLAS workspaces; they do not imply unsupported third-party integrations.

## 3. Trunk dependencies

Identity/Auth, Organization/DBA, protected workspace routing, Safe DOM, global context, public web shell, release identity, build gates and production verifier.

## 4. Canonical sub-branches

### 4.1 Capability Registry — WORKING FRUIT
`ATLAS_CAPABILITY_REGISTRY` in `modules/capability-fusion.js` is the canonical list of ten Capability Fusion workspaces and their honest state labels.

### 4.2 Lingua — WORKING FRUIT
Native-browser translation/detection/text intake/speech capability where browser support exists. It bridges to Settings/localization rather than inventing a second preference system.

### 4.3 Language Coach — WORKING FRUIT
Pronunciation/speech practice with Voice & Vision bridge. Practice is coaching evidence, not automatically an HR assessment score.

### 4.4 Academy — GREEN FRUIT
Workflow-ready self-paced learning experience. It bridges to HR Training, which remains the durable learner-record authority.

### 4.5 Tax Compliance — GREEN FRUIT
Due-diligence/review workflow bridged to Finance Taxes. Durable tax evidence/rule-pack maturity remains Finance/Tax work.

### 4.6 Tax Pro — GREEN FRUIT
Client tax workflow bridged to Finance Taxes. Return calculation, generation and e-file remain outside current ripe scope.

### 4.7 Candidate Hub — GREEN FRUIT
Candidate experience bridged to HR Recruiting. Candidate identity/applications remain People/HR records.

### 4.8 Forms — WORKING FRUIT / LOCAL FOUNDATION
Browser-native form builder capability. Durable document/form lifecycle belongs to Documents/Forms Control and future canonical persisted form state.

### 4.9 Stream — WORKING FRUIT
Local user-owned media playback capability plus protected Stream Control. No cloud upload, third-party catalog or unlicensed media claim.

### 4.10 Subscription Control — WORKING FRUIT
Protected management register for recurring software/service costs, plans, seats and renewals. It does not charge cards or cancel provider subscriptions.

### 4.11 Personalization — WORKING FRUIT / LOCAL PROFILE FOUNDATION
User-facing preference model bridged to ATLAS Settings. Durable cross-device preference portability remains future state work.

### 4.12 Capability Bridges — WORKING FRUIT
`worker-meta.js` connects all ten detail workspaces to their appropriate ATLAS destinations: Settings, Voice & Vision, HR Training, Finance Taxes, Recruiting, Documents, Stream Control and Subscription Control.

### 4.13 Public Capability Directory & Feed — WORKING FRUIT
`/capabilities` and `/feeds/capabilities.json` expose the registry with transparent status and connected ATLAS workspace information. `/capabilities` is discoverable from home navigation and sitemap.

### 4.14 ATLAS Safe DOM — WORKING FRUIT
Capability detail pages load the shared security runtime before inline scripts. Dynamic `innerHTML` is sanitized for dangerous elements, event handlers and unsafe URL schemes.

### 4.15 Capability Release Gates — WORKING FRUIT
Dedicated validators cover registry integrity, bridges, public directory, Stream/Subscriptions, Safe DOM, Forms Control and Knowledge Reader. Production verification checks public surfaces and that protected control routes redirect to login without session.

### 4.16 Durable Capability State — GREEN FRUIT
Several capability experiences remain browser-local or workflow-ready. Shared durable state must be introduced only against the verified canonical database/schema and must preserve authoritative ownership boundaries.

### 4.17 Capability Analytics / Recommendation Layer — GREEN FRUIT
Future analytics may measure capability use and recommend next actions, but must derive from permissioned events/preferences without becoming a hidden cross-domain shadow profile.

---

## 5. Authority map

| Capability | Durable authority / bridge |
|---|---|
| Lingua | Settings / Global Context for preferences |
| Language Coach | Voice & Vision; HR Assessment only via explicit evidence contract |
| Academy | HR Training / Knowledge |
| Tax Compliance | Finance / Tax evidence |
| Tax Pro | Finance / Tax preparation records |
| Candidate Hub | HR Recruiting / People |
| Forms | Documents / Forms Control |
| Stream | Stream Control; local media session state |
| Subscription Control | Subscription Control register |
| Personalization | Settings / future preference state |

## 6. Invariants

1. Capability Fusion never becomes a duplicate system of record.
2. Public capability state must match implementation reality.
3. `native-browser` never guarantees support on every device/browser.
4. `workflow-ready` never implies durable enterprise persistence.
5. A bridge to an ATLAS workspace does not imply a third-party provider is connected.
6. Protected capability/control routes require authenticated session.
7. Public directory/feed contain no private tenant data.
8. Safe DOM protection loads before capability inline scripts.
9. Local media/forms/preferences are not silently represented as cloud-synced.
10. Regulated execution remains owned by authorized-provider boundaries in the appropriate domain branch.

## 7. Next fruit sequence

C1. Canonical Capability State schema with explicit ownership and tenant scope.  
C2. Cross-device preference portability.  
C3. Academy durable persistence bridge.  
C4. Candidate Hub durable candidate-facing portal contract.  
C5. Forms persisted workflow/evidence bridge.  
C6. Permission-aware capability event analytics.  
C7. Explainable recommendation/routing layer across capabilities.

## 8. Definition of ripe fruit

A Capability Fusion fruit is RIPE only when its claimed state is truthful, its authority bridge is explicit, security/session boundaries are verified, browser/device prerequisites are disclosed, release gates pass and the exact deployment is independently verified for the stated environment.
