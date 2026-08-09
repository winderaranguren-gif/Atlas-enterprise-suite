# ATLAS Work Nomenclature & Isolation Standard v1.0

Purpose: prevent one ATLAS workstream from accidentally overwriting, rebasing over, or silently replacing another.

## 1. Permanent identifiers

Every ATLAS workstream receives a permanent Work Unit ID:

`ATLAS-WU-####`

The numeric block identifies the domain. IDs are never reused.

Initial blocks:

- `ATLAS-WU-0000` — ATLAS Core / shared integration
- `ATLAS-WU-0100` — Governance / Constitution / release controls
- `ATLAS-WU-0200` — GPS / navigation
- `ATLAS-WU-0300` — Accessibility / ATLAS Access / ATLAS Sign
- `ATLAS-WU-0400` — ATLAS Cars
- `ATLAS-WU-0500` — Technical Support / runbooks
- `ATLAS-WU-0600` — Fleet Intelligence
- `ATLAS-WU-0700` — Calendar / notifications

Future modules use the next free numeric block. A number is not reassigned to a different module after retirement.

## 2. File identity

Every important file receives a logical File ID even when its current filename is retained for compatibility:

`ATLAS-F-<WORKUNIT>-<SEQUENCE>`

Examples:

- `ATLAS-F-0300-0001` → `atlas-accessibility.js`
- `ATLAS-F-0300-0002` → `atlas-accessibility.css`
- `ATLAS-F-0200-0001` → `atlas-gps-4d.js`
- `ATLAS-F-0000-0001` → `app.js`
- `ATLAS-F-0000-0002` → `service-worker.js`

New module-owned files should include the numeric module prefix when practical, for example:

`atlas-0300-access-sign-runtime.js`

Legacy filenames are not renamed merely to satisfy nomenclature if doing so would create unnecessary deployment risk. Their permanent logical File ID is recorded in the registry instead.

## 3. Branch naming

One active branch per work unit and objective:

`wu/ATLAS-WU-####-short-objective`

Examples:

- `wu/ATLAS-WU-0300-sign-hardening`
- `wu/ATLAS-WU-0200-gps-provider`

A branch MUST start from the current `main`, not from an old feature branch snapshot.

## 4. PR and commit naming

Pull request title:

`[ATLAS-WU-####] Objective`

Commit prefix:

`ATLAS-WU-####: change description`

This makes ownership visible in Git history, deployment logs, reviews and rollback operations.

## 5. Isolation rule

Module work should modify module-owned files only.

Shared integration files such as `app.js`, `service-worker.js`, `index.html`, `package.json`, `wrangler.jsonc` and governance gates are ATLAS Core/shared surfaces. A module may touch them only when the change is explicitly declared in the work-unit registry under `sharedTouches`.

When two active work units need the same shared file, they MUST NOT independently replace that file. The integration change is handled as a dedicated Core integration step from the newest `main` after the module-owned work is ready.

## 6. No blind file replacement

Before replacing an existing shared file, the current blob SHA must be fetched from the branch being edited. A write using a stale SHA is rejected rather than forced.

Force-updating `main` is prohibited. Force-updating a feature branch is allowed only for an explicit rebuild/rebase when a backup branch has first been created.

## 7. Work-unit lock

`governance/atlas-work-units.json` is the source of truth for active work.

Each active work unit declares:

- owner domain
- branch
- status
- owned paths
- shared paths it expects to touch
- dependencies
- base policy

An active work unit must not claim another active unit's owned path.

## 8. Integration policy

The safe sequence is:

1. start from latest `main`;
2. create the work-unit branch;
3. edit only owned paths;
4. declare required shared touches;
5. run review/CI;
6. update/rebase from current `main` before merge;
7. resolve shared integration once, not independently in each module;
8. merge only after the branch is current and validation is green or the remaining blocker is explicitly documented.

## 9. Current rule for ATLAS development

A new feature must not be implemented by copying an old full-project snapshot and then replacing current shared files. New work is additive and namespaced. Shared code is integrated deliberately.

This standard is intended to prevent the exact failure mode where a valid new module becomes divergent because another ATLAS module advanced `main` at the same time.
