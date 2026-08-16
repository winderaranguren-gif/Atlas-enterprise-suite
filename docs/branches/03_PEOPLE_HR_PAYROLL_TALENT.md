# Branch 03 — People, HR, Payroll & Talent

**Parent:** ATLAS Master Index & Genealogy  
**Lineage:** Human mission → ATLAS OS / Core → People, HR, Payroll & Talent  
**Status:** living branch dossier  
**Rule:** one human identity (`hr_people`) may participate in employment, recruiting, payroll, training, assessments, benefits and performance. Those systems extend the person record; they do not create competing person masters.

---

## 1. Branch purpose

People, HR, Payroll & Talent turns human identity into a traceable lifecycle: candidate → application → assessment → offer/hire → onboarding → employment → time/pay → benefits → performance → learning/skills → offboarding. Its fruit is fairer and more accountable human administration, not simply an employee directory.

## 2. Roots inherited

- Human dignity and non-discriminatory access.
- One person master per Organization/DBA scope.
- Least privilege around personal and payroll data.
- Evidence over subjective claims where practical.
- Auditability of material HR actions.
- Explicit separation of candidate evaluation, employment administration and payroll execution.
- Learning and skill evidence may inform talent decisions but must not silently rewrite employment records.
- Payroll records do not imply regulated tax filing or money movement.

## 3. Trunk dependencies

| Trunk service | Required use |
|---|---|
| Identity / Auth | Protected HR workspaces and APIs |
| Organization + DBA | Exact employer/business scope |
| RBAC / tenant guard | HR read/write authorization |
| Audit Ledger | HR, payroll, talent and assessment mutation evidence |
| Documents | Policies, offers, forms and controlled records |
| Finance | Payroll accounting consequences; HR does not create a second GL |
| Knowledge | Learning content and knowledge pathways |
| Global Context | Language, region and locale-sensitive experience |

## 4. Canonical sub-branches

### 4.1 People Registry — WORKING FRUIT

**System of record:** `hr_people` in `migrations/0004_hr_knowledge.sql` and `migrations/0010_hr_payroll_core.sql`.  
**Runtime:** `modules/hr-knowledge.js` and `modules/hr-payroll.js`.

Supported person types: employee, candidate, contractor, intern and volunteer. The record carries scoped identity, contact, department/job context and lifecycle status.

**Fruit:** one tenant-scoped human master reused by recruiting, payroll, benefits, performance, training and assessments.

### 4.2 Positions & Employment Profiles — WORKING FRUIT

**Route:** `/platform/hr-payroll/employment` and employee workspaces.  
**System of record:** `hr_positions` + `hr_employment_profiles`.  
**Runtime:** `modules/hr-payroll.js` + `modules/hr-employment-ui.js`.

ATLAS records position, manager, hire/termination dates, employment state, pay type, hourly/salary rate, overtime eligibility, standard hours and pay schedule.

**Fruit:** structured employment configuration linked to the same person master.

### 4.3 Recruiting Jobs & Applications — WORKING FRUIT

**Route:** `/platform/hr-payroll/recruiting`.  
**System of record:** `hr_jobs` + `hr_applications`.  
**Runtime:** `modules/hr-payroll.js`.

Application stages are constrained to applied, screening, interview, assessment, offer, hired, rejected and withdrawn.

**Fruit:** candidates are moved through a controlled recruiting pipeline without creating duplicate candidate identities.

### 4.4 Candidate Hub — GREEN FRUIT

Capability Fusion contains a Candidate Hub experience and bridges into HR Recruiting. The underlying candidate/person/application records are real; the full candidate-facing self-service experience is not yet the authoritative system of record.

**Required lineage:** People Registry → Recruiting → Assessments → Documents/offer → Employment.

### 4.5 Onboarding — WORKING FRUIT

**Route:** `/platform/hr-payroll/onboarding`.  
**System of record:** `hr_onboarding_tasks`.  
**Runtime:** `modules/hr-payroll.js`.

**Fruit:** onboarding work is tracked as tenant-scoped tasks associated with the person rather than informal checklist text.

### 4.6 Time & Attendance — WORKING FRUIT

**Route:** `/platform/hr-payroll/time`.  
**System of record:** `hr_time_entries`.

ATLAS stores work date, regular/overtime minutes, notes and approval status.

**Fruit:** approved time can support payroll calculation and workforce reporting.

### 4.7 Payroll Ledger / Pay Runs — WORKING FRUIT / PARTIAL LIFECYCLE

**Route:** `/platform/hr-payroll/payroll`.  
**System of record:** `hr_pay_runs` + `hr_pay_run_items`.  
**Runtime:** `modules/hr-payroll.js`.

ATLAS persists period/pay date, run status, gross, deductions, employee tax and net values at run and person level.

**Working fruit:** payroll runs and person-level payroll results can be controlled and reported.

**Green edge:** complete federal/state/local withholding engines, employer tax liabilities, tax forms, direct deposit/fund movement and payroll tax filing are not implied by the pay-run ledger.

### 4.8 Benefits — WORKING FRUIT

**Route:** `/platform/hr-payroll/benefits`.  
**System of record:** `hr_benefit_plans` + `hr_benefit_enrollments`.  
**Runtime:** `modules/hr-talent.js`.

**Fruit:** benefit plan definitions and person enrollments with coverage and employer/employee contribution amounts.

**Boundary:** insurer/carrier enrollment execution remains external/partner-dependent unless explicitly integrated.

### 4.9 Performance — WORKING FRUIT

**Route:** `/platform/hr-payroll/performance`.  
**System of record:** `hr_performance_cycles`, `hr_performance_goals`, `hr_performance_reviews`.  
**Runtime:** `modules/hr-talent.js`.

**Fruit:** cycles, measurable goals and review records connected to the person master.

### 4.10 Training — WORKING FRUIT

**Route:** `/platform/hr-payroll/training`.  
**System of record:** `hr_training_courses` + `hr_training_enrollments`.  
**Runtime:** `modules/hr-talent.js`.

Training supports required/optional courses, validity periods, assignments, completion scores and expiration dates.

**Fruit:** accountable training records rather than an untracked content library.

### 4.11 HR Knowledge Assignments — WORKING FRUIT

**System of record:** `hr_knowledge_items` + `hr_knowledge_assignments`.  
**Runtime:** `modules/hr-knowledge.js`.

**Fruit:** policies, procedures, courses, playbooks and reference knowledge can be assigned to a person with due/progress/completion/score evidence.

**Branch boundary:** content semantics belong to Knowledge/Education; People/Talent owns the person-assignment consequence.

### 4.12 Skills — WORKING FRUIT

**System of record:** `hr_skill_catalog` + `hr_person_skills`.  
**Runtime:** `modules/hr-knowledge.js`.

ATLAS stores proficiency, verification state, verifier, evidence, acquisition and expiration metadata.

**Fruit:** explainable skill evidence attached to a real person.

### 4.13 Assessment Templates & Question Bank — WORKING FRUIT

**System of record:** `hr_assessment_templates` + `hr_assessment_questions`.  
**Runtime:** `modules/hr-knowledge.js`.

Template kinds include technical, English, compliance, onboarding and custom. Question types include boolean, yes/no, short text, multiple choice and scenario.

**Fruit:** reusable, tenant-scoped assessment designs and question banks.

### 4.14 Assessment Attempt Foundation — WORKING FRUIT / LIMITED SCHEMA

**System of record:** `hr_assessment_attempts` from `migrations/0004_hr_knowledge.sql`.

The canonical migration supports person + assessment + started/submitted/scored/void status, score and scoring metadata.

**Fruit:** assessment attempt identity and score foundation.

**Limitation:** detailed answer-level persistence is not present in the canonical schema.

### 4.15 Assessment Studio — GREEN FRUIT

`modules/assessment-studio.js` exists and contains an administrative UI/API concept for candidates, templates, questions, attempts and scoring. It is **not** promoted to Working Fruit because:

1. the current canonical Worker does not import/route it; and
2. it expects attempt fields such as `attempt_number`, `completed_at`, `result_status`, `time_spent_seconds`, `notes` and `created_by_user_id` that are not present in the canonical `0004_hr_knowledge.sql` attempt table.

**Required maturation:** reconcile schema contract first, then route through the protected Worker, then add validation and production verification.

### 4.16 Technical Assessment — GREEN FRUIT

The template/question engine supports `kind='technical'`, but a complete candidate-facing execution flow with answer persistence, automated/manual rubric scoring, anti-cheat rules where appropriate and recruiter decision evidence still needs maturation.

### 4.17 English Assessment — GREEN FRUIT

The template/question engine supports `kind='english'` and Language Coach/Voice capabilities exist elsewhere in ATLAS. A complete English evaluation should compose reading/writing/listening/speaking evidence rather than create a separate candidate identity.

**Green requirements:** answer-level evidence, speaking/listening capture policy, scoring rubric/version, reviewer/automated score provenance and accessible accommodations.

### 4.18 Certifications — GREEN FRUIT

Training enrollment has completion/score/expiry support and skills have evidence/expiration support, but no dedicated canonical certification-award registry was evidenced in the current HR migrations.

**Required lineage:** Training/Assessment → certification definition → award → evidence → expiration/renewal.

### 4.19 Policies — WORKING HANDOFF

The HR menu routes policies to `/platform/documents`. This is the correct genealogy: HR consumes governed policies while Documents remains the authoritative version/approval/archive system.

### 4.20 Leave / PTO / Scheduling — GREEN FRUIT

Employment includes `on_leave`, but a canonical accrual/request/approval/balance model for PTO/leave was not evidenced in current HR schemas.

### 4.21 Payroll Tax Filing & Direct Deposit — PARTNER-BOUND / GREEN

ATLAS may calculate, reconcile and account for payroll outcomes. Actual ACH/direct-deposit execution and government payroll filing/payment require authorized providers or channels. The internal tax calculation model itself also requires jurisdiction/year versioning before it can be called complete.

### 4.22 Employee / Candidate Self-Service — GREEN FRUIT

Current administration is strong, but a fully scoped self-service portal for person-owned profile, applications, documents, training, time, pay statements and benefit choices should reuse the same person records and permissions rather than duplicate data.

---

## 5. Authoritative object ownership

| Object | Owner |
|---|---|
| Human person identity | `hr_people` |
| Position | HR |
| Employment profile | HR |
| Recruiting job/application | HR Recruiting |
| Onboarding task | HR |
| Time entry | HR Time |
| Pay run / pay run item | Payroll |
| Benefit plan/enrollment | HR Talent |
| Performance cycle/goal/review | HR Talent |
| Training course/enrollment | HR Talent |
| Knowledge content | Knowledge branch; HR assignment references it |
| Skill catalog/person skill | HR Knowledge / Talent |
| Assessment template/question | HR Knowledge / Talent |
| Assessment attempt | HR Knowledge / Talent |
| Policy document | Documents branch |
| Payroll accounting journal | Finance branch |
| Direct deposit / insurance carrier execution | authorized provider boundary |

## 6. Fruit chains

### Candidate-to-hire
`Person(candidate) → Job Application → Screening/Interview → Assessment → Offer evidence → Employment profile → Onboarding`

### Time-to-pay
`Person(employee) → Employment profile → Approved Time → Pay Run Item → Pay Run → Finance accounting consequence → authorized payment execution`

### Learn-to-skill
`Person → Training/Knowledge assignment → completion/score → Skill evidence → Performance/Talent decision`

### Assessment-to-decision
`Person → Assessment Template → Attempt → answers/evidence [green] → score/rubric → Recruiting/Training decision`

### Policy-to-acknowledgment
`Documents policy/version → HR assignment/acknowledgment workflow → person evidence → Audit`

## 7. Maturity matrix

| Sub-branch | Durable source | Classification |
|---|---:|---|
| People Registry | Yes | WORKING FRUIT |
| Positions / Employment | Yes | WORKING FRUIT |
| Recruiting | Yes | WORKING FRUIT |
| Candidate Hub | Partial composition | GREEN FRUIT |
| Onboarding | Yes | WORKING FRUIT |
| Time | Yes | WORKING FRUIT |
| Payroll ledger | Yes | WORKING FRUIT / partial lifecycle |
| Benefits | Yes | WORKING FRUIT |
| Performance | Yes | WORKING FRUIT |
| Training | Yes | WORKING FRUIT |
| Knowledge assignments | Yes | WORKING FRUIT |
| Skills | Yes | WORKING FRUIT |
| Assessment templates/questions | Yes | WORKING FRUIT |
| Assessment attempt foundation | Yes | WORKING FRUIT / limited schema |
| Assessment Studio | Source exists, schema/routing conflict | GREEN FRUIT |
| Technical Assessment execution | Partial | GREEN FRUIT |
| English Assessment execution | Partial | GREEN FRUIT |
| Certifications | No dedicated award registry proven | GREEN FRUIT |
| Policies | Documents-authoritative | WORKING HANDOFF |
| Leave / PTO | No canonical ledger proven | GREEN FRUIT |
| Payroll filing/direct deposit | Provider/jurisdiction dependent | PARTNER-BOUND / GREEN |
| Self-service portal | Partial | GREEN FRUIT |

## 8. People invariants

1. `hr_people` is the canonical human master for HR/talent records in a tenant scope.
2. Candidate, employee, contractor, intern and volunteer are person roles/types, not separate identity databases.
3. Recruiting applications reference a person; they do not create a second candidate record.
4. Payroll results reference employment/person records and never become a second GL.
5. Policies remain governed by Documents.
6. Learning content may be assigned to people but does not own employment state.
7. Correct assessment answers must not be exposed to candidate-facing read paths.
8. Assessment maturity requires schema/API/UI agreement; existence of a source file is insufficient.
9. Direct deposit, insurer enrollment and government filing do not become “connected” without authorized provider evidence.
10. Sensitive HR/payroll data remains tenant-scoped and least-privilege.

## 9. Next fruit sequence

### H1 — Reconcile Assessment Studio schema
Create an explicit migration/contract for attempt metadata and answer-level evidence, or simplify Studio to the canonical 0004 schema. Never let runtime code assume invisible columns.

### H2 — Route and validate Assessment Studio
Only after schema agreement: route protected UI/API, add release gate and production protection checks.

### H3 — Candidate-facing assessment runner
Separate administrative answer-key access from candidate delivery; persist answer evidence and rubric/scoring provenance.

### H4 — English Assessment composition
Compose Language Coach/Voice capabilities with assessment evidence for listening/speaking while retaining accessible text alternatives.

### H5 — Certification registry
Create certification definitions, awards, evidence, validity and renewal linked to person/training/assessment records.

### H6 — PTO / leave ledger
Add policies, accruals, balances, requests, approvals and payroll/time consequences.

### H7 — Payroll compliance engine boundary
Version tax rules by jurisdiction/year and separate calculation from authorized filing/payment execution.

### H8 — Person self-service permissions
Create a person-owned view over existing HR records without duplicating the HR system of record.

## 10. Definition of ripe fruit

A People/Talent fruit becomes **RIPE** only when person lineage, tenant permission, sensitive-data boundary, authoritative schema, audit evidence, validation and exact deployed release are proven. Assessment and payroll fruits require additional provenance for scoring/tax rules; regulated payment/filing/carrier actions require verified authorized-provider execution.
