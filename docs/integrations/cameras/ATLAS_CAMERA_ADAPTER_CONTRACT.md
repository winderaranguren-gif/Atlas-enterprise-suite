# ATLAS Camera Adapter Contract v1

Status: EXPERIMENTAL / NOT OPERATIONAL

Purpose: provide one vendor-neutral boundary for authorized security-camera integrations without reverse engineering vendor applications or extracting credentials.

## Supported transport classes

An adapter may advertise one or more transports only after successful capability discovery:

- `webrtc` — authorized WebRTC session negotiated through the vendor/device integration.
- `rtsp` — authenticated RTSP endpoint explicitly exposed by the device/vendor.
- `onvif` — ONVIF discovery/control explicitly supported by the device.
- `matter-camera` — Matter camera capability when certified/exposed by the device.
- `evidence-import` — user-authorized clip/snapshot import when live transport is unavailable.

Unknown transports MUST fail closed. ATLAS MUST NOT infer a stream URL, bypass access controls, scrape private application credentials, or reverse engineer a vendor application.

## Device record

Each linked camera is scoped to an ATLAS organization and DBA and has:

- `device_id`
- `organization_id`
- `dba_id`
- `vendor`
- `model`
- `display_name`
- `location_label`
- `transport`
- `capabilities`
- `connection_state`
- `last_seen_at`
- `created_at`
- `updated_at`

Secrets/tokens are never stored in the device record or client-visible payloads.

## Capability vocabulary

Adapters may expose: `live_video`, `snapshot`, `record`, `two_way_audio`, `siren`, `motion_events`, `person_events`, `local_storage`, `cloud_clips`, `battery`, `signal`, `firmware`.

A capability is available only after the adapter verifies it against the linked device/account.

## Required adapter operations

- `discover()` — return only devices visible through an authorized integration.
- `capabilities(device)` — verify current device capabilities.
- `openLiveSession(device)` — return a short-lived session descriptor, never a permanent credential.
- `capture(device)` — request or retrieve a snapshot when supported.
- `listEvents(device, cursor)` — normalized motion/person/device events.
- `closeSession(session)` — terminate/revoke a live session.
- `health(device)` — return `online`, `offline`, `degraded`, or `unsupported` with reason.

## Security boundary

Every operation requires an authenticated ATLAS user with an active membership matching the device's exact `organization_id + dba_id`. Read-only roles cannot activate sirens, change settings, or initiate other mutating controls. Every live-view, capture, evidence import, control action, authorization denial, and session termination must create an audit event with actor, organization, DBA, device, action, decision, and timestamp.

## Evidence integrity

Imported/generated evidence receives SHA-256, capture/event time when available, ingestion time, source device ID, organization/DBA scope, MIME type, byte size, and provenance. The original object is immutable; derivatives are separate objects linked to the original hash.

## Kangaroo adapter status

`kangaroo` is currently `discovery-pending`. No public vendor API, RTSP, ONVIF, Matter, or other live transport is assumed. The adapter MUST remain disabled until an authorized capability path is verified against the user's actual device/account. Evidence import can be implemented independently where the user provides/export clips or snapshots.

## Production gate

A camera adapter is OPERATIONAL only after an end-to-end test verifies: authorized link -> scoped device discovery -> capability verification -> permitted action/live session -> audit record -> cross-DBA denial -> session termination/revocation. Until then it remains EXPERIMENTAL.