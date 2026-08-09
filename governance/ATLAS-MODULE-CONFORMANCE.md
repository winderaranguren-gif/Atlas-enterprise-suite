# ATLAS Module Constitutional Conformance

Status: release-control implementation for ATLAS Universal Constitution v1.1.

This document defines how ATLAS modules move from development to production without silently bypassing the Universal Constitution.

## Core rule

Every module registered in a protected ATLAS module registry must have an explicit constitutional classification. A newly registered module with no classification fails the structural constitutional gate.

A module is either:

- **standard** — still subject to the Universal Constitution, security, privacy and normal quality controls; or
- **high-impact** — additionally subject to a profile-specific control set and a production approval gate.

A high-impact module starts as **blocked**. It does not become **approved** merely because the code runs or an AI says it is safe.

## Current protected profiles

### Employment
Applies to HR, employee/candidate evaluation and background-check-related decisions.

Required principles include human review, correction/appeal, audit, least privilege, data minimization, no automatic rejection solely from a background check, job relevance, context and second-chance review, explainability, and bias/disparate-impact review.

### Finance
Applies to finance, payroll, invoices, expenses and accounting.

Required principles include transaction authorization, review/appeal, audit, least privilege, reconciliation, dual control for high-risk actions, no opaque automated denial, and rollback or compensating controls.

### Identity
Applies to identity credentials and sensitive legal/identity documents.

Required principles include masking, lawful basis or consent, purpose limitation, expiry/revocation, least privilege, correction, audit and secure storage boundaries.

### Health
Applies to ATLAS Health and future medical/clinical modules.

Required principles include health privacy, consent or lawful basis, human authority for clinical decisions, no autonomous diagnosis or treatment, emergency escalation, least privilege and auditability.

### Public Safety
Applies to public-safety systems and future surveillance/enforcement-sensitive modules.

Required principles include no mass surveillance, purpose limitation, proportionality, retention limits, human review before enforcement, correction/appeal, audit and independent oversight.

### Education
Applies to high-stakes learner assessment and education decisions.

Required principles include human review, appeal, minor protections, no manipulative profiling, data minimization and explainability.

### Security and Privileged Access
Applies to roles, privileged access and security administration.

Required principles include MFA for privileged access, least privilege, privileged-action audit, separation of duties, revocation and prohibition on self-granted privileges.

### Democracy / Elections
Reserved for future ATLAS Democracy and election systems.

Required principles include voter privacy, independent auditability, no secret result modification, multi-party verification, recount/recovery, tamper evidence, and public transparency without exposing individual votes.

### Autonomous Robotics
Reserved for future robots, autonomous agents with physical control, and similar systems.

Required principles include operator identity, no self-granted privileges, inability to remove their own safety limits, bounded replication, human override, safe stop, fail-safe mode, audit and independent safety validation.

## Approval evidence required

A high-impact module may change from `blocked` to `approved` only when its classification contains an approval record with all profile controls attested, repository evidence files, test commands, an independent reviewer, a review date, a concrete rollback plan, an identified human approver, and the exact reviewed commit.

The constitutional gate checks the structure of this evidence. It does not treat declarations as proof that tests actually ran; normal repository validation, security review and CI evidence remain required.

## Release behavior

- `npm run validate` checks constitutional integrity, protected bindings, complete module classification, JavaScript, database packages, regional structure and smoke tests.
- `npm run build:dev` permits development packaging after structural validation.
- `npm run check:constitutional-release` fails while any registered high-impact module remains blocked.
- `npm run build` is the production build path and runs the constitutional release gate.
- `npm run deploy` and `npm run cloudflare:deploy` therefore cannot proceed through the supported scripts while protected high-impact modules remain blocked.
- `npm run mobile:release:check` provides the same gate for an iOS/Android release workflow.

## No silent downgrade

The validator contains protected high-impact profiles and mandatory bindings for existing sensitive modules. Changing HR, finance, health, identity, education, public safety or privileged security modules to `standard` causes validation to fail.

Future module names indicating health, medical, clinical, HR, employment, payroll, finance, bank, wallet, identity, background checks, credit, insurance, education, students, security, safety, police, surveillance, biometrics, democracy, elections, voting, robots or autonomy are treated as high-impact signals and cannot be silently classified as standard.

## Human and machine responsibility

AI, robots and automated reviewers may assist with testing and evidence collection, but they may not be the sole authority approving a high-impact ATLAS production release. Human approval remains required, and independent review must remain a distinct control.

No approval transfers responsibility away from the humans or organizations operating ATLAS.
