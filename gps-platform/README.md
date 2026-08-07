# ATLAS GPS 4D — Planetary Platform

This directory turns the browser prototype into a deployable navigation platform with an ATLAS-controlled data plane.

## Scope

The platform is divided into nine production layers:

1. **Global Map Cloud** — self-hosted vector tiles, search, routing, elevation and object storage.
2. **Live Operations Data** — traffic, incidents, closures, construction, floods, weather and road availability through licensed or public-authority feeds.
3. **Lane Intelligence** — lane connectivity, signs, speed limits, interchange geometry and route-step lane recommendations.
4. **Offline Regions** — signed, versioned regional packages and resumable downloads.
5. **Native Runtime** — iOS and Android location services, background navigation, lock-screen guidance and vehicle-display integration.
6. **Advanced AR** — on-device camera calibration, lane estimation and model hooks for signs, vehicles, pedestrians and obstacles.
7. **Multimodal Routing** — car, truck, transit, bicycle, walking, emergency, maritime and aviation profiles.
8. **Planetary Validation** — coverage, locale, script, tunnel, rural, border, island and safety test matrices.
9. **Security and Privacy** — explicit consent, data minimization, encryption, retention controls, purge APIs and enterprise policies.

## Local platform start

1. Copy `.env.example` to `.env` and set secure values.
2. Provision map/routing data under volumes defined by `docker-compose.yml`.
3. Start the stack:

```bash
docker compose --env-file gps-platform/.env -f gps-platform/docker-compose.yml up -d
```

4. Start the ATLAS app:

```bash
npm start
```

5. Open `/atlas-gps-4d.html`.

## Production boundary

The repository contains the gateway, provider contracts, deployment topology, offline manifests, native bridge contracts, validation rules and security controls. Global production service still requires founder-controlled cloud accounts, storage, domains, TLS certificates, compute capacity, map imports, provider credentials, Apple entitlements, Google vehicle-app approval and legally authorized live-data feeds. No codebase can create those external accounts, licenses or approvals by itself.

## Default safety posture

- Public demonstration providers are disabled by default.
- Location history is disabled by default.
- Raw camera frames are not uploaded by default.
- Destructive privacy operations require an administrator token.
- Provider keys are read only from environment variables.
- Production deployments must terminate TLS before the gateway.
