# ATLAS Module Constitutional Conformance

Status: release-control implementation for ATLAS Universal Constitution v1.1.

This document defines how ATLAS modules and sensitive production assets move from development to production without silently bypassing the Universal Constitution.

## Core rule

Every protected ATLAS target must have an explicit constitutional classification. A newly registered module, or a root production asset whose name signals a protected domain, fails the structural constitutional gate when it has no classification.

A target is either:

- **standard** — still subject to the Universal Constitution, security, privacy and normal quality controls; or
- **high-impact** — additionally subject to a profile-specific control set and a production approval gate.

A high-impact target starts as **blocked**. Running code, a model recommendation, or an automated test cannot by itself make that target production-approved.

## Protected high-impact profiles

ATLAS currently defines protected profiles for:

- **Employment** — HR, employee/candidate evaluation and background-check decisions; includes human review, appeal/correction, job relevance, second chances, explainability and bias review.
- **Finance** — finance, payroll, invoices, expenses and accounting; includes authorization, reconciliation, dual control, audit and rollback/compensating controls.
- **Identity** — credentials and sensitive legal/identity documents; includes masking, lawful basis, purpose limitation, revocation, least privilege and secure storage boundaries.
- **Health** — health, medical and clinical targets; includes health privacy, consent/lawful basis, human clinical authority, no autonomous diagnosis/treatment and emergency escalation.
- **Public Safety** — surveillance/enforcement-sensitive systems; includes no mass surveillance, proportionality, retention limits, human review and independent oversight.
- **Education** — high-stakes learner decisions; includes appeal, minor protections, data minimization, explainability and no manipulative profiling.
- **Security / Privileged Access** — privileged roles and administration; includes MFA, least privilege, privileged-action audit, separation of duties and revocation.
- **Democracy / Elections** — voter privacy, independent auditability, no secret result modification, multiparty verification, recount/recovery and tamper evidence.
- **Autonomous Robotics** — operator identity, bounded permissions/replication, no self-granted privileges, human override, safe stop, fail-safe behavior and independent safety validation.
- **Housing** — review/appeal, nondiscrimination, explainability, lawful basis and no opaque automated denial.
- **Child Protection** — minor protections, age-appropriate design, lawful guardian/basis controls, retention limits and safety escalation.
- **Critical Infrastructure** — least privilege, separation of duties, resilience/redundancy, incident response, safe degraded mode and independent oversight.
- **High-impact AI** — human review, explainability, no secret manipulation, no self-granted privileges, safe stop and independent oversight.

## Approval evidence

A high-impact target may change from `blocked` to `approved` only when its classification contains:

1. every required profile control explicitly attested;
2. repository evidence files that exist as regular files;
3. test commands;
4. an independent reviewer;
5. an identified human approver distinct from that review function;
6. a review date;
7. a concrete rollback plan; and
8. a `reviewedDigest` SHA-256 that exactly matches the released source plus its evidence files.

If a reviewed source or evidence file changes after approval, the digest changes and the approval becomes invalid automatically.

The approval record does not replace CI/security evidence. It binds approval to the exact reviewed content while normal repository checks remain mandatory.

## Release architecture

ATLAS intentionally separates buildability from production authorization:

- `npm run validate` checks JavaScript, database packages, regional navigation, GPS/Worker validation, the constitutional baseline, protected bindings, module/asset classification, the deployment boundary and smoke tests.
- `npm run build` is a generic CI/preview build and routes to `build:dev`; it **does not** grant production approval.
- `npm run build:dev` creates validated development/preview assets.
- `npm run check:constitutional-release` fails while any protected high-impact target remains blocked or has invalid approval evidence.
- `npm run build:prod` is the explicit production package path and requires the constitutional release gate.
- `npm run deploy`, `npm run cloudflare:deploy`, the GitHub production workflow, the Pages fallback and mobile release paths retain production-gate checks.
- Wrangler routes `main`, `deploy` and `versions deploy` to `build:prod`; preview/development commands route to `build:dev`.
- iOS Simulator verification uses `build:dev`, never `build:prod`.

## Protected assets and future modules

The gate discovers both registered modules and sensitive executable assets in the production root. Current standalone Health pages are explicitly classified and blocked until evidence exists.

Quoted and unquoted module keys are both discovered. Short risk abbreviations such as `hr` and `ai` are matched as tokens so harmless words do not become false positives.

Protected signals include employment/background checks, finance/banking/credit, identity, health/clinical, education, public safety/surveillance, democracy/elections, autonomous robotics, housing, children, critical infrastructure and high-impact AI.

## No silent downgrade

Mandatory profile definitions and existing high-impact bindings are independently locked by validation. A protected target cannot be changed to `standard`, removed from the protected registry, or marked `approved` with stale evidence without failing the gate.

The constitutional baseline is separately pinned by SHA-256 and versioned through an amendment ledger. Editing the policy and canonical document together is therefore insufficient to silently redefine the immutable baseline.

## Human and machine responsibility

AI, robots and automated reviewers may assist with testing and evidence collection, but they may not be the sole authority approving a high-impact ATLAS production release. Human approval and independent review remain distinct controls.

No approval transfers responsibility away from the people or organizations operating ATLAS.
