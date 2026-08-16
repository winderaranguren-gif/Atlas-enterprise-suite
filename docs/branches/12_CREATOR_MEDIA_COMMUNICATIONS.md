# Branch 12 — Creator, Media & Communications

**Parent:** ATLAS Master Index & Genealogy  
**Lineage:** Human mission → ATLAS OS / Core → Creator, Media & Communications  
**Status:** living branch dossier  
**Rule:** creation, editing, playback, publishing, identity/likeness, communication and distribution are separate rights-bearing actions. Every media asset must retain source, owner/creator, consent/license and transformation lineage.

---

## 1. Branch purpose

Creator turns ideas and authorized source material into useful media, communication and publication workflows while preserving ownership, privacy and provenance. Its fruit is an asset or message that can be traced from source → edit → approval → publication/distribution without ATLAS losing who owns it or implying rights that were never granted.

## 2. Roots inherited

- User consent before camera/microphone access.
- Source/creator/license provenance travels with the asset.
- Editing creates a derivative; it does not erase the original.
- A person’s face/voice/likeness requires authorization for the intended use.
- Local media remains local unless the user explicitly publishes/uploads it.
- Publication requires destination/account authority.
- Social/provider connectivity must use secure OAuth/token handling.
- Copyright/trademark/personality rights are not bypassed by AI generation or editing.

## 3. Trunk dependencies

Identity/Auth, Organization/DBA, RBAC, Documents/Vault, Capability Fusion, Safe DOM/browser permissions, Global Context, provider adapters, Audit, controlled sharing and release verification.

## 4. Canonical sub-branches

### 4.1 Voice & Vision — WORKING FRUIT

**Route:** `/platform/voice-vision`.  
**Runtime:** `modules/sensory.js`.

Current source provides consent-triggered local camera preview, microphone permission test and browser speech synthesis. Status explicitly reports browser/provider dependencies and no server media storage/identity recognition.

### 4.2 Voice / Speech Output — WORKING FRUIT

Browser speech synthesis is an implemented sensory capability. Voice selection, pronunciation coaching and future branded voices must distinguish browser/device voices from licensed/generated voice assets.

### 4.3 Camera Preview — WORKING FRUIT / LOCAL

Camera preview starts only after user action and remains local in the current workspace. Preview access does not imply recording, recognition or upload.

### 4.4 Stream Control — WORKING FRUIT

**Route:** `/platform/stream-control`.  
**Runtime:** `modules/stream-subscription-control.js`.

Supports user-selected local media, session library, favorites, playback position, speed, Picture-in-Picture/fullscreen where supported, without claiming cloud upload or third-party media catalog.

### 4.5 Meta Connect — WORKING FRUIT / PROVIDER-DEPENDENT

**Route:** `/platform/integrations/meta` plus OAuth APIs.  
**Runtime:** `modules/meta-social.js`.

Implements secure Meta OAuth state, token exchange, encrypted credential payloads, Facebook Page / professional Instagram discovery and disconnect state. It requires configured Meta application credentials and provider authorization.

**Boundary:** an installed bridge is not the same as a currently connected/authorized account.

### 4.6 Social Publishing — GREEN / PROVIDER-BOUND

Meta scopes include page posting and Instagram content publishing, but mature publishing must preserve asset rights, draft/approval state, destination identity, provider response IDs, schedule/timezone, failure/retry and published URL/status evidence.

### 4.7 Media Asset Registry — GREEN FRUIT

A canonical asset model should record original/derivative, MIME/dimensions/duration, hash, source, creator/owner, license/consent, project, version and retention/access state. Current visual assets exist, but one authoritative runtime registry is not yet evidenced.

### 4.8 Brand Studio — GREEN FRUIT

Historical scope includes Brand Kit, layouts, media library, social creator, video layout builder, brand rules, glossary, do-not-translate terms, approvals, share pages and permissions.

**Required lineage:** Media Asset Registry + Documents/versioning + organization brand identity + approval workflow.

### 4.9 Design Studio — GREEN FRUIT

Visual interface/presentation/web asset creation is an ATLAS direction. A mature design editor requires layers/components, asset provenance, versions, export and explicit distinction between mockup and deployed product.

### 4.10 Media / Video Studio — GREEN / ARTIFACT FOUNDATION

ATLAS has extensive generated visual/video assets and historical editing concepts. Production maturity requires project/timeline model, source asset registry, deterministic export job evidence and codec/license handling.

### 4.11 Creator Workspace — GREEN FRUIT

Creator should orchestrate Brand, Design, Media, Voice, Documents and publishing under one project identity; it should not duplicate their source assets or approval records.

### 4.12 Teleprompter / Music Desk — GREEN FRUIT

Teleprompter, lyrics/script display and music-production support are established directions. Rights/licensing remain explicit for copyrighted music/lyrics, stems and samples.

### 4.13 Avatar / Holographic Assistant — GREEN / ARTIFACT FOUNDATION

ATLAS avatar/holographic concepts exist. A mature avatar pipeline must distinguish user-owned likeness, synthetic character, voice rights, animation source, disclosure and approved use context.

### 4.14 Founder / Person Likeness Registry — GREEN HIGH-GOVERNANCE

Approved portraits or profile images should carry explicit subject identity, authorized uses, master/reference status and derivative lineage. Face/voice cloning never becomes a general permission to impersonate the person.

### 4.15 Image Generation / Editing — GREEN CROSS-BRANCH

Generated/edited imagery should preserve prompt/project/source references, derivative relationship and disclosure/rights metadata where relevant. External generators are adapters, not ATLAS ownership sources.

### 4.16 Public Website Storytelling — WORKING FOUNDATION

The public ATLAS website and reusable visual library already provide a presentation surface. Public claims must remain aligned with genealogy/commercial maturity instead of turning concept art into implied operational proof.

### 4.17 ATLAS Mail — SEED / GREEN

Business email is an established roadmap direction. Mature Mail requires mailbox/provider identity, messages/threads, attachments, contacts, retention, search, security and authorized sending; a catalog entry is not proof of an operating mail provider.

### 4.18 ATLAS Connect / Communications — GREEN CROSS-BRANCH

Team/device/service communication belongs to shared Connect/Bridge infrastructure. Creator may use it for collaboration/distribution without building a second identity or message-security model.

### 4.19 Notifications / Campaign Messaging — GREEN / PROVIDER-BOUND

Email/SMS/push/social campaign delivery requires recipient consent, unsubscribe/preferences, provider status, suppression, rate limits and audit. Community/help records are never silently repurposed for marketing.

### 4.20 Rights / Consent / License Ledger — GREEN FRUIT

Creator needs an explicit rights layer for asset copyright/license, person likeness, voice, location/property releases, trademarks, third-party source terms, allowed territories/channels and expiration/revocation.

### 4.21 Publishing Approval — GREEN CROSS-BRANCH

Draft → review → approved → scheduled → published should compose Documents/Operations approvals. Publishing must be blocked when required rights/approval are absent.

### 4.22 Export / Rendition Pipeline — GREEN FRUIT

Exports should produce immutable job evidence: source project/version, output format/settings, hash, timestamp and errors. “Exported” must mean a produced artifact exists, not just a clicked button.

### 4.23 Content Analytics — GREEN / PROVIDER-BOUND

Views/reach/engagement must come from destination/provider sources with metric definitions/time windows. Analytics never proves business impact without an explicit attribution model.

---

## 5. Current WORKING FRUIT status

Canonical source currently proves Voice & Vision local consent-first sensory functions, Stream Control local media playback, Meta OAuth connection infrastructure and public website/storytelling foundations. Broader Creator/Brand/Media/Avatar/Mail capabilities remain green until asset/project/rights/publication records become authoritative.

## 6. Authority map

| Object / function | Authority |
|---|---|
| Original media asset | future Media Asset Registry / Vault |
| Document/script copy | Documents |
| Organization brand rules | future Brand Registry |
| Camera/mic permission | browser/device + explicit user action |
| Voice synthesis | browser/provider with source identity |
| Social account identity/token | provider OAuth; encrypted ATLAS connection record |
| Publication result | provider response + ATLAS publication ledger |
| Person likeness/voice consent | future Rights/Consent Ledger |
| Local playback state | Stream Control browser state |
| Public site claim | Public Site + genealogy/commercial truth governance |

## 7. Fruit chains

`Original asset → rights/consent → project/edit → derivative/version → approval → export → publication → provider status → analytics`

`User permission → camera/mic local input → authorized transform/use → stop/release → no implicit storage`

`Social OAuth → authorized account/page → approved content → publish request → provider confirmation → publication ledger`

## 8. Creator invariants

1. Camera/microphone access requires explicit user permission.
2. Local preview/playback does not imply recording/upload/cloud storage.
3. Original media is preserved when derivatives are created.
4. Every asset retains source/creator/license/consent lineage.
5. Likeness/voice rights are purpose-specific; cloning does not equal impersonation authority.
6. Provider OAuth authorization is distinct from bridge installation/configuration.
7. Publishing requires destination authority and required content approval/rights.
8. Concept art does not prove the depicted product is deployed.
9. Community/health/private records are not repurposed for marketing without lawful consent.
10. Export/publish success requires artifact/provider confirmation evidence.
11. Copyrighted music/lyrics/samples remain rights-governed.
12. Analytics retains source, metric definition and time window.

## 9. Next fruit sequence

CR1. Canonical Media Asset Registry + original/derivative lineage.  
CR2. Rights / Consent / License Ledger.  
CR3. Brand Registry and reusable brand-rule system.  
CR4. Creator Project model linking assets/scripts/design/video/audio.  
CR5. Export/Rendition job evidence.  
CR6. Publishing approval + publication ledger.  
CR7. Complete Meta publish/status verification over authorized accounts.  
CR8. Avatar/person-likeness/voice consent model.  
CR9. Mail/notification provider boundary and consent/suppression model.  
CR10. Creator production verifier for rights, source lineage and provider confirmation.

## 10. Definition of ripe fruit

A Creator/Media fruit becomes **RIPE** only when source rights, person consent where applicable, project/version lineage, output evidence, destination authorization, provider confirmation and exact deployed behavior are proven. A generated image, preview, avatar render or connected-OAuth screen is never by itself proof of publication rights, impersonation authority or successful distribution.
