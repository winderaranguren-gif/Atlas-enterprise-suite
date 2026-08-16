# Branch 04 — Knowledge, Education & Learning

**Parent:** ATLAS Master Index & Genealogy  
**Lineage:** Human mission → ATLAS OS / Core → Knowledge, Education & Learning  
**Status:** living branch dossier  
**Rule:** knowledge content has an authoritative versioned source; learning experiences may present, assign and measure it, but must not silently fork the knowledge record or the person record.

---

## 1. Branch purpose

Knowledge, Education & Learning turns information into understandable, assignable and verifiable learning. Its fruit is a person who can find trustworthy knowledge, study it, demonstrate understanding and carry evidence of progress or skill without ATLAS confusing a content library, a learner transcript and a certification record.

## 2. Roots inherited

- Knowledge should be accessible, understandable and traceable.
- Source/version/provenance matter as much as presentation.
- One ecosystem: content, learning and talent evidence remain connected.
- Human progress is evidence, not a decorative percentage.
- Learning interfaces must support language and accessibility needs.
- Proprietary third-party course content is not copied into ATLAS without authorization.
- External credentials/certifications are evidence inputs, not ATLAS-owned claims unless verified.

## 3. Trunk dependencies

| Trunk service | Required use |
|---|---|
| Identity / Auth | Protected learning workspaces |
| Organization + DBA | Tenant-owned knowledge and learning assignments |
| RBAC | Authoring, assignment and administrative controls |
| Audit Ledger | Material content/assignment changes |
| People Registry | Learner identity and skill consequences |
| Documents | Source files and governed document lifecycle |
| Lingua / Language Coach | Translation and language-learning capability reuse |
| Global Context | Language, locale, timezone and accessibility context |

## 4. Canonical sub-branches

### 4.1 Knowledge Content Registry — WORKING FRUIT

**System of record:** `hr_knowledge_items` in `migrations/0004_hr_knowledge.sql`.  
**Runtime:** `modules/hr-knowledge.js`.

Content kinds include article, policy, procedure, course, playbook, FAQ and reference. Records include slug, title, category, summary, JSON content, status, version, owner and publish state.

**Fruit:** tenant-scoped, version-aware knowledge records that can be published or archived.

### 4.2 Knowledge Assignment — WORKING FRUIT

**System of record:** `hr_knowledge_assignments`.  
**Runtime:** `modules/hr-knowledge.js`.

Assignments connect an authoritative knowledge item to a real person with required/optional flag, due date, progress, completion and score.

**Fruit:** proof that a specific person was assigned or completed specific knowledge.

**Ownership boundary:** People/Talent owns the human consequence; Knowledge owns the content definition.

### 4.3 Training Course Catalog — WORKING FRUIT

**System of record:** `hr_training_courses` in `migrations/0011_hr_talent.sql`.  
**Runtime:** `modules/hr-talent.js`.

**Fruit:** tenant-scoped course catalog with required flag, category, validity window and active/archive state.

### 4.4 Training Enrollment / Transcript Foundation — WORKING FRUIT

**System of record:** `hr_training_enrollments`.  
**Runtime:** `modules/hr-talent.js`.

Assignments persist learner, course, state, due date, completion, score and expiration.

**Fruit:** durable learning completion evidence attached to the person master.

### 4.5 Academy — GREEN FRUIT

**Route:** `/platform/capabilities/academy`.  
**Runtime:** `modules/capability-fusion.js`.

Capability Fusion exposes course catalog, learning path, lesson progress, quiz workflow, transcript shell and certificate-ready concepts. The registry itself labels Academy `workflow-ready`, not a fully durable LMS.

**Required maturation:** connect every Academy learning object and progress action to authoritative Knowledge/Training records instead of browser/workflow-only state.

### 4.6 Knowledge Reader — WORKING FRUIT / LOCAL STUDY MODE

**Route:** `/platform/knowledge-reader`.  
**Runtime:** `modules/knowledge-reader.js`, protected by `worker-crm.js`.

Reader supports local `.txt`/`.md` input, heading outline, search, reading progress, bookmarks, section notes and deterministic review prompts without uploading source content.

**Fruit:** private study of user-owned/authorized text with local learning aids.

**Boundary:** Reader-local progress/bookmarks/notes are not an enterprise transcript and do not become durable training completion automatically.

### 4.7 Learning Paths — GREEN FRUIT

Academy contains a learning-path shell, but no canonical durable path → ordered learning objects → prerequisites → completion model is yet evidenced.

**Required lineage:** Knowledge Content / Training Course → Path Definition → Person Enrollment → Progress → Completion Evidence.

### 4.8 Lesson / Unit Model — GREEN FRUIT

Knowledge JSON can hold structured content and Academy can present lessons, but a canonical lesson/unit/version schema separate from course marketing metadata is not yet evidenced.

### 4.9 Quiz / Learning Assessment — GREEN FRUIT

Assessment infrastructure exists in HR Knowledge, but learning quizzes should explicitly separate:
- formative practice;
- scored course assessment;
- employment/candidate assessment.

They may reuse the same question mechanics while retaining different evidence and decision semantics.

### 4.10 Skills Evidence — WORKING CROSS-BRANCH FRUIT

**System of record:** `hr_skill_catalog` + `hr_person_skills`.  
**Runtime:** `modules/hr-knowledge.js`.

Knowledge can lead to skills; People/Talent owns the person skill record and verification consequence.

### 4.11 Certifications — GREEN FRUIT

Training already supports score and expiration, but a dedicated certification definition/award/evidence/renewal registry is not yet canonical.

**Required lineage:** Course/Path/Assessment → Certification Definition → Award → Evidence → Validity/Renewal.

### 4.12 Knowledge Search & Discovery — WORKING FOUNDATION

Knowledge items are queryable through HR Knowledge APIs and Reader provides local full-document search.

**Green edge:** one global ranked search spanning Knowledge, Documents, Training and authorized external sources with provenance and permissions is not yet canonical.

### 4.13 Authoring / Publishing — WORKING FOUNDATION

Knowledge records support draft/published/archived status and version metadata.

**Green edge:** rich collaborative authoring, review workflow, diff/history, reusable blocks and formal publication approval should compose Documents/Forms rather than invent another document-control engine.

### 4.14 Lingua — WORKING CROSS-BRANCH CAPABILITY

**Route:** `/platform/capabilities/lingua`.  
Capability Fusion labels it native-browser and supports on-device translation/detection where browser support exists, local text intake and speech synthesis.

**Ownership boundary:** Lingua belongs to Capability Fusion; Knowledge consumes it to reduce language barriers.

### 4.15 Language Coach — WORKING CROSS-BRANCH CAPABILITY

**Route:** `/platform/capabilities/language-coach`.

Pronunciation/speech practice is a reusable capability. It can feed English-learning or future English Assessment evidence, but its practice history/self-rating must not be silently treated as an employment assessment score.

### 4.16 Accounting / Finance Learning Paths — GREEN FRUIT

Historical ATLAS design includes accounting, finance, tax, Excel, data analysis and professional-skills paths. The content taxonomy is approved, but canonical course/path records and validated curriculum packages must be built before they are called complete programs.

### 4.17 External Course / Credential Ingestion — GREEN / PARTNER-BOUND

ATLAS may store verified evidence or metadata from external learning providers when authorized. It should not copy restricted course content or imply credential verification without source evidence/provider support.

### 4.18 Knowledge Atlas / Knowledge Graph — GREEN FRUIT

The broader Knowledge Atlas vision should connect concepts, sources, prerequisites, skills, courses and real-world applications. No canonical graph schema was evidenced in current production source.

### 4.19 Learning Analytics — GREEN FRUIT

Current systems contain assignment/completion/score records. A cross-course analytics layer should derive from those authoritative records and preserve learner privacy, rather than create parallel progress state.

### 4.20 AI Tutor / Adaptive Learning — SEED / GREEN FRUIT

ATLAS can eventually explain concepts, generate practice, identify gaps and recommend next learning steps. Any AI-generated educational content must identify source/provenance, avoid fabricating credentials and keep assessment decisions distinguishable from coaching.

---

## 5. Authoritative object ownership

| Object | Authority |
|---|---|
| Knowledge article/policy/procedure/course/playbook/reference | Knowledge Content Registry |
| Person identity | People branch / `hr_people` |
| Knowledge assignment | HR Knowledge assignment record |
| Training course | HR Training catalog |
| Training enrollment/completion | HR Training enrollment |
| Skill evidence | People/Talent skill record |
| Candidate/employment assessment | People/Talent assessment system |
| Local reader note/bookmark/progress | Knowledge Reader browser-local state |
| Governed source document/version | Documents branch |
| Translation/pronunciation capability | Capability Fusion |
| Certification award | future Certification Registry |

## 6. Fruit chains

### Knowledge-to-learning
`Authoritative source → Knowledge item/version → course/path presentation → learner assignment → study → assessment → completion evidence`

### Learning-to-skill
`Course/Knowledge completion → evidence → verified person skill → talent/performance use`

### Source-to-reader
`User-owned/authorized text → Knowledge Reader local parsing → search/bookmark/note/review → no automatic enterprise transcript mutation`

### Multilingual learning
`Knowledge source → Lingua translation/context → accessible learning presentation → same authoritative source identity`

## 7. Maturity matrix

| Sub-branch | Classification |
|---|---|
| Knowledge content registry | WORKING FRUIT |
| Knowledge assignments | WORKING FRUIT |
| Training catalog/enrollment | WORKING FRUIT |
| Academy | GREEN FRUIT |
| Knowledge Reader | WORKING FRUIT / local study mode |
| Learning Paths | GREEN FRUIT |
| Lesson/unit model | GREEN FRUIT |
| Learning quiz model | GREEN FRUIT |
| Skills evidence | WORKING CROSS-BRANCH FRUIT |
| Certifications | GREEN FRUIT |
| Search/discovery | WORKING FOUNDATION |
| Authoring/publishing | WORKING FOUNDATION |
| Lingua | WORKING CROSS-BRANCH CAPABILITY |
| Language Coach | WORKING CROSS-BRANCH CAPABILITY |
| Accounting/Finance curricula | GREEN FRUIT |
| External credentials/content | GREEN / PARTNER-BOUND |
| Knowledge Atlas graph | GREEN FRUIT |
| Learning analytics | GREEN FRUIT |
| AI Tutor | SEED / GREEN |

## 8. Knowledge invariants

1. Learning interfaces never silently fork authoritative knowledge content.
2. Person progress and credentials reference the canonical person master.
3. Reader-local state is not an enterprise transcript.
4. Proprietary third-party course content is not copied without authorization.
5. Credential claims require evidence and verification provenance.
6. Translation changes presentation, not source identity/version.
7. Coaching/practice scores are not automatically employment-assessment scores.
8. Knowledge search must respect tenant/document permissions.
9. AI-generated learning material must not be confused with authoritative source content.
10. Certifications require a dedicated award/evidence contract before being represented as issued credentials.

## 9. Next fruit sequence

### K1 — Canonical Learning Path schema
Path, version, ordered objects, prerequisites, enrollment, completion rules and skill outcomes.

### K2 — Lesson / Unit model
Versioned units linked to authoritative knowledge/course sources.

### K3 — Learning assessment contract
Separate formative learning assessment from candidate/employment assessment while sharing safe question primitives.

### K4 — Academy persistence bridge
Make Academy read/write canonical learning path, course, enrollment and progress records.

### K5 — Certification registry
Definition, issuer, requirements, award, evidence, expiration and renewal.

### K6 — Unified permission-aware Knowledge Search
Search Knowledge + Documents + Training with provenance and exact tenant permission enforcement.

### K7 — Knowledge Atlas graph
Concept/source/prerequisite/skill/course/application graph with explainable links.

### K8 — Adaptive Tutor
Tutor/recommendation layer that consumes authoritative knowledge and progress while clearly labeling generated explanations/practice.

## 10. Definition of ripe fruit

A Knowledge/Education fruit becomes **RIPE** only when source ownership/versioning, learner identity, progress evidence, permissions, validation and exact deployment are proven. External credentials require verification provenance; external content requires authorization; AI assistance does not become authoritative knowledge merely because it is useful.
