# ATLAS Security & Emergency

Original ATLAS implementation for security operations, incident response, emergency coordination and public-safety workflows.

## Design rule

External security documentation may inform threat-model concepts and defensive best practices, but ATLAS does not copy third-party UI, wording or source code. The module uses ATLAS-native data models, permissions, audit events and interaction patterns.

## Functional scope

- Scoped security incidents by Organization / DBA.
- Severity levels: low, medium, high and critical.
- Categories for cyber, physical, safety, access, fraud, privacy, availability and other incidents.
- Controlled lifecycle: open → acknowledged → contained → resolved, with explicit reopen support.
- Immutable incident-event history for accountability.
- Role-aware operations using the existing ATLAS session and scope authorization boundary.
- Audit logging for allowed and denied actions.
- Internal security-posture signal for operational prioritization; it is not represented as a compliance certification.

## API

- `GET /api/security/posture`
- `GET /api/security/incidents`
- `POST /api/security/incidents`
- `GET /api/security/incidents/:id/events`
- `POST /api/security/incidents/:id/actions`

## Security posture

The posture endpoint reports active incident counts and an ATLAS internal operational score derived from unresolved severity. It is intentionally labeled as an operational signal rather than a legal, regulatory or standards-based certification.
