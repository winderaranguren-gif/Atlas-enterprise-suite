# ATLAS Module Bridge v1

ATLAS Module Bridge is the authenticated local-node agent that connects a trusted ATLAS workstation to the ATLAS cloud control plane without exposing the laptop directly to the public Internet.

## Status model

- `UNREGISTERED`: node has never sent an accepted heartbeat.
- `ONLINE`: last accepted heartbeat is <= 90 seconds old.
- `DEGRADED`: heartbeat is fresh but one or more declared capabilities or transports are unhealthy.
- `OFFLINE`: last accepted heartbeat is older than 90 seconds.

A cloud health check is not sufficient to mark a laptop as connected. ATLAS must only display `CONNECTED` after a fresh heartbeat and a successful authenticated end-to-end ping.

## Recommended topology

```text
ATLAS Web/App
   -> same-origin /api/bridge/*
ATLAS Worker / control plane
   -> D1 node registry
   -> optional secured Cloudflare Tunnel command path
Winder laptop
   -> local agent bound to 127.0.0.1:8787
   -> outbound heartbeat every 30 seconds
   -> local capabilities: voice, files, approved local jobs
```

## Node identity

Default node ID for the primary workstation:

`winder-laptop-01`

## Heartbeat payload

```json
{
  "node_id": "winder-laptop-01",
  "version": "1.0.0",
  "os": "windows",
  "architecture": "x64",
  "bridge_port": 8787,
  "tunnel_kind": "cloudflare",
  "capabilities": ["voice", "files", "local-jobs"]
}
```

## Required security controls

- Bind the local HTTP service to loopback only (`127.0.0.1`).
- Never commit bridge secrets, tunnel tokens, API keys, private keys, or voice master files.
- Heartbeats must be authenticated.
- Reject stale/replayed timestamps.
- Use least-privilege node credentials.
- Prefer outbound-only transport; do not open router ports to the laptop.
- Destructive or root-level local jobs require explicit policy and additional authorization.

## Voice engine integration

The local voice capability should use Chatterbox Multilingual V3 with Winder's existing English and Spanish reference recordings. The voice engine receives corrected professional text independently from the source transcript, allowing pronunciation correction without requiring new recordings.

Expected local voice outputs:

- `winder_atlas_english.wav`
- `winder_atlas_spanish.wav`

See `voice/README.md` and `voice/atlas_voice.py`.