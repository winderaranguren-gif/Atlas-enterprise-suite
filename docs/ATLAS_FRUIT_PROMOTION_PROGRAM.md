# ATLAS FRUIT PROMOTION PROGRAM

**Phase II after the 15-branch genealogy**

The genealogy answers **what belongs where**. The Fruit Promotion Program answers **what ATLAS should mature next, under what evidence, and without skipping authority or safety boundaries**.

## 1. Source of truth

The program reads every registry under `architecture/genealogy/*.json`. No separate manually maintained priority list is authoritative.

Run:

```bash
npm run atlas:fruits
npm run atlas:fruits -- --json
```

The output is recalculated from the current 15 branches.

## 2. Four queues

### A. WORKING → RIPE

A working fruit already has code/evidence, route and system of record. It is **not automatically production-LIVE**. Promotion to RIPE requires explicit verification appropriate to its intended environment.

Typical evidence includes:
- tests/release gates;
- exact source/release identity;
- security and authorization checks;
- migration/schema compatibility;
- browser/device compatibility where relevant;
- public-domain verification where the claim is public production;
- domain-specific validation for financial, health, physical or regulated use.

### B. GREEN / ARTIFACT / SEED → WORKING

These items are candidates for engineering. The program calculates a deterministic priority score from current maturity, evidence, lineage, routes and declared limitations. The score is an engineering triage aid, **not a readiness claim**.

Promotion requires:
1. authoritative system of record;
2. permissions and audit model;
3. implemented route/API/workspace;
4. evidence-backed test;
5. branch invariants preserved;
6. explicit limitations left visible.

### C. PARTNER-BOUND

ATLAS may design the workflow, integration, reconciliation and evidence layer, but must not represent regulated external execution as self-performed. Examples include banking rails, card processing, government e-file, legally binding signature services, clinical systems and other licensed/authorized operations.

### D. Branch next-fruit sequence

Every branch already declares its `nextFruitSequence`. This remains the local lineage roadmap. The global promotion queue supplements it; it does not erase branch-specific order.

## 3. Scoring rule

The score deliberately favors:
- existing verified evidence;
- established lineage dependencies;
- existing routes;
- green/artifact work over raw seeds;
- fewer known blockers.

It does **not** reward hiding limitations. A limitation is useful architectural truth and may lower immediate priority until its dependency is resolved.

## 4. Promotion laws

1. No fruit skips genealogy.
2. No fruit creates a second source of truth when an authoritative record already exists.
3. `WORKING` means implemented/testable, not necessarily public production.
4. `RIPE` is claim-specific and environment-specific.
5. Artifact maturity does not automatically equal runtime maturity.
6. Partner-bound execution stays visibly partner-bound.
7. Research hypotheses cannot promote directly into operational claims.
8. Reference platforms are studied through the ATLAS Functional Reference Rebuild Rule; proprietary implementation/content is not copied.
9. Negative evidence, blockers and failed validations remain part of the record.
10. The promotion program is recalculated from the current branch registries, so architecture changes automatically affect priorities.

## 5. Immediate operating cycle

For each execution cycle ATLAS should:

1. run `validate:genealogy`;
2. run `atlas:fruits`;
3. select the highest-value item that is not partner-blocked and whose upstream lineage can be satisfied safely;
4. implement on a branch;
5. add/extend validation;
6. merge only after review/mergeability confirmation;
7. update the branch registry maturity only when evidence justifies it;
8. repeat.

## 6. Current known global blockers

Certain blockers cut across multiple fruits and therefore receive priority even when they are not user-visible modules:

- verified production D1 identity/binding and migration target;
- exact production release verification for the canonical domain;
- migrations/schema contracts for any newer module whose runtime expects columns not present in canonical migrations;
- external authorization/provider contracts for partner-bound execution.

Resolving a shared blocker may mature fruit across several branches at once and therefore can outrank a single UI feature.

## 7. Definition of success

ATLAS succeeds in this phase when the number of **truthfully verified fruits** increases while duplicated systems of record, hidden blockers, unverified claims and architecture drift decrease.
