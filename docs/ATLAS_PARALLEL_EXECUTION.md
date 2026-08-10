# ATLAS Parallel Execution Fabric

Date: 2026-08-10

## Objective
ATLAS is developed as one platform with multiple concurrent workstreams, not as isolated applications. Shared platform contracts are owned centrally and consumed by every product domain.

## Operating model
All workstreams may progress simultaneously. A domain does not wait for another domain to be feature-complete; it waits only for the specific contract it consumes to be stable enough for integration. Until then, adapters or mocks must preserve the same public contract.

## Shared contracts
The platform-wide contracts are identity, permissions, audit, data fabric, event fabric, knowledge graph, agent fabric, design system and update fabric. Product modules must not create competing implementations of these concerns.

## Readiness model
Every workstream reports one of five states:

1. `design` — scope and contracts are defined.
2. `build` — implementation is actively being produced.
3. `integrated` — implementation is connected to shared ATLAS contracts.
4. `tested` — functional, security and integration validation has passed.
5. `production-ready` — deployment gates and operational evidence are complete.

A workstream state is evidence-based. Missing external provider credentials do not downgrade an ATLAS-owned capability when its native runtime is independently operational; provider connection state is tracked separately.

## Integration gate
`scripts/atlas-integration-gate.mjs` validates the program registry before integration. It fails when:

- a workstream has an unknown readiness state or priority;
- dependencies reference unknown workstreams;
- a workstream depends on itself;
- the dependency graph contains a cycle;
- two workstreams claim ownership of the same capability;
- a required shared contract is absent.

The registry lives at `config/atlas-workstreams.json`.

## Domain ownership
Current execution lanes:

- Core OS & Security
- Data & Event Fabric
- Intelligence & Agent Fabric
- Web, Mobile & Experience
- Enterprise, Finance & Operations
- People, HR & Assessments
- Mail, Calendar & Collaboration
- ATLAS Health
- Mobility, Places & Public Safety
- Media & Humanity
- ATLAS Frontiers

These lanes are organizational boundaries, not separate products. User identity, authorization, audit, data, events, intelligence, design and updates remain horizontal.

## Change rule
A feature branch should declare which workstream it belongs to and which shared contracts it changes or consumes. Changes to a shared contract require compatibility review across all dependent workstreams.

## Product invariant
One ATLAS identity -> one permission model -> one data/event fabric -> one intelligence layer -> many product surfaces -> one audit trail.

## Release invariant
No module may claim `production-ready` merely because a UI exists. Production readiness requires the relevant backend/runtime, authorization boundary, persistence path, integration tests, security checks, failure handling and deployment evidence.

## Parallelism invariant
Parallel development means concurrent progress with explicit contracts. It does not mean uncontrolled merging. The integration gate protects the shared architecture while independent workstreams continue at full speed.
