# Branch 06 — Documents, Forms & Confidential Exchange

**Parent:** ATLAS Master Index & Genealogy  
**Lineage:** Human mission → ATLAS OS / Core → Documents, Forms & Confidential Exchange  
**Status:** living branch dossier  
**Rule:** a governed document, a data-entry form and a legally binding signature/exchange are different objects. ATLAS may connect them, but must never imply legal execution merely because text, approval or acknowledgment exists.

---

## 1. Branch purpose

This branch turns information into controlled business evidence: authored records, versions, templates, approvals, structured forms and secure handoffs. Its fruit is evidence that can be traced to who created it, what version existed, what was approved and what remains legally or operationally pending.

## 2. Roots inherited

- Version and provenance before presentation.
- Tenant-scoped access and least privilege.
- Audit material document actions.
- No silent overwrite of historical versions.
- Browser-local draft state is not durable enterprise evidence.
- A typed acknowledgment is not automatically a legally binding signature.
- Confidential exchange requires explicit recipient/access/revocation evidence.

## 3. Trunk dependencies

Identity/Auth, Organization/DBA, RBAC, Audit Ledger, People/user identities, safe browser runtime, capability bridge, storage/provider adapters and release verification.

## 4. Canonical sub-branches

### 4.1 Document Registry — WORKING FRUIT
**Route:** `/platform/documents`  
**System of record:** `documents` via `modules/documents-schema.js`.  
Document types include document, policy, procedure, contract, memo, report, form and other. Status supports draft, in-review, approved, rejected and archived.

### 4.2 Document Versions — WORKING FRUIT
`document_versions` preserves version number, title, text content, change note, author and timestamp. Historical versions are separate records rather than overwritten content.

### 4.3 Templates — WORKING FRUIT
`document_templates` stores reusable tenant-scoped templates with type, description, content and lifecycle status.

### 4.4 Approval Records — WORKING FRUIT
`document_approvals` records requested-by, approver, decision status/note and decision time. Approval is business workflow evidence; it is not automatically a legal signature.

### 4.5 Archive / Lifecycle — WORKING FRUIT
Documents support archived status/time and the runtime exposes controlled lifecycle actions. Archive is retention state, not deletion by implication.

### 4.6 Forms Capability — WORKING FRUIT / LOCAL FOUNDATION
**Route:** `/platform/capabilities/forms`.  
Capability Fusion provides browser-native form-building foundations and bridges to Documents.

### 4.7 Forms Control — WORKING FRUIT / LOCAL DESIGNER
**Route:** `/platform/forms-control`.  
**Runtime:** `modules/forms-control.js`, protected through `worker-crm.js`.

Current fruit includes required fields, select/options, conditional visibility, field ordering, live preview, local file metadata, validation, local template persistence, JSON copy and acknowledgment draft.

**Boundary:** no remote submission/upload is claimed; templates remain browser-local unless later promoted to a verified durable form schema.

### 4.8 Durable Form Definition — GREEN FRUIT
A canonical tenant-scoped form schema for fields, versions, conditional rules and publication state is not yet persisted in D1.

### 4.9 Form Submission / Case Evidence — GREEN FRUIT
A durable submission model should preserve form-version identity, answers, attachments/evidence, submitter, timestamps, workflow state and audit trail. Current Forms Control test submission is local-only.

### 4.10 File / Attachment Vault — GREEN FRUIT
Current canonical document schema stores text content and metadata but does not evidence a complete binary object-storage/attachment lifecycle with hashes, malware scanning, retention and access grants.

### 4.11 OCR / Document Intake — GREEN FRUIT
ATLAS has document/scan ambitions, but durable OCR for PDF/image/Word intake should become a governed ingestion pipeline with original-file preservation, extracted-text provenance and confidence/evidence metadata.

### 4.12 Document Conversion / Editing — GREEN FRUIT
Word/PDF/Excel-style editing/conversion is an ATLAS product direction. Canonical conversion/editing services must preserve source version, output version and fidelity evidence before being treated as production document authority.

### 4.13 Controlled Sharing — GREEN FRUIT
Future sharing must record recipient identity, scope, expiration, download/view rights, revocation and disclosure events without creating public-by-default links.

### 4.14 Confidential Exchange / NDA — GREEN FRUIT
ATLAS Sign & Confidential Exchange is an established architectural direction. The mature system should combine Documents, access grants, NDA/terms, recipient identity, disclosure ledger, expiration and revocation.

### 4.15 Legal E-signature — PARTNER-BOUND
A draft acknowledgment, document approval or typed name is not represented as a binding electronic signature. Where legal signature requirements demand a validated provider/method, ATLAS orchestrates documents/evidence while the authorized signature layer executes signing.

### 4.16 Search / Retrieval — WORKING FOUNDATION
Documents can be listed/filtered inside the tenant-scoped runtime. A unified full-text/ranked search across Documents, Knowledge and attachments with permission-aware snippets remains future fruit.

### 4.17 Retention / Legal Hold — GREEN FRUIT
Archive exists, but formal retention policies, legal holds, deletion schedules and immutable hold evidence are not yet canonical.

### 4.18 External Storage / Provider Sync — PARTNER-BOUND
Drive/Dropbox/SharePoint or other storage may be adapters. Synced copies must retain ATLAS authority/provenance rules and cannot silently replace the canonical document record.

---

## 5. Authority map

| Object | Authority |
|---|---|
| Document identity/lifecycle | Documents |
| Version | Document Versions |
| Template | Document Templates |
| Approval | Document Approvals |
| Local form design/test state | Forms Control browser-local state |
| Durable form definition | future Forms schema |
| Submission/case evidence | future Forms/Workflow schema |
| Original binary/attachment | future Vault/storage contract |
| Policy document | Documents; consumed by HR/other branches |
| Legal signature execution | validated authorized signature layer |
| Disclosure/access grant | future Confidential Exchange |

## 6. Fruit chains

`Draft → Version → Review → Approval/Rejection → Approved record → Archive`

`Form definition → Published version → Submission → Evidence → Approval/Case workflow → Document/archive`

`Confidential document → Recipient/access grant → NDA/terms → disclosure → revocation/expiry → audit evidence`

`Source file → preserved original → OCR/extraction → verified metadata/text → governed document version`

## 7. Invariants

1. Historical versions are never silently overwritten.
2. A document approval is not automatically a legal signature.
3. A typed acknowledgment is not represented as binding e-signature.
4. Forms browser-local state is not represented as durable enterprise submission state.
5. Binary/original file evidence must preserve provenance and integrity metadata when introduced.
6. Sharing is explicit, scoped, revocable and auditable.
7. Policies remain governed documents even when consumed by HR/Operations/Knowledge.
8. External storage is an adapter, not automatic source of truth.
9. Confidential material is fail-closed when identity/access cannot be verified.
10. Conversion/OCR outputs retain a link to original source/version.

## 8. Next fruit sequence

D1. Canonical durable Form Definition + version schema.  
D2. Form Submission / evidence schema and workflow linkage.  
D3. Attachment Vault with hashes, access controls and original preservation.  
D4. OCR/intake pipeline with provenance/confidence.  
D5. Controlled Sharing/access-grant ledger.  
D6. Confidential Exchange / NDA workflow.  
D7. Authorized e-signature adapter contract.  
D8. Permission-aware full-text search and retention/legal-hold controls.

## 9. Definition of ripe fruit

A Documents/Forms fruit becomes RIPE only when source/version ownership, access control, audit evidence, durable state, validation and exact deployment are verified. Confidential/legal execution additionally requires recipient/signature/provider evidence appropriate to the claim being made.
