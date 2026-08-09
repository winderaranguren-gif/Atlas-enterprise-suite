# ATLAS GPS 4D — Mainline Architecture v1

ATLAS GPS 4D is being reintegrated into the current ATLAS core in independently verifiable layers rather than merging the historical 56-commit GPS branch directly.

## Layer 1 — local-first core (implemented)

- Dynamic module registration through `atlas-gps-entry.js`.
- Responsive GPS workspace at `/atlas-gps-4d.html`.
- Provider-independent canvas route preview.
- Demo route usable without a map CDN or external routing service.
- Session-only geolocation after explicit user action.
- Optional road camera after explicit user action.
- Camera tracks and location watch stop when the session is cleared or the page ends.
- No raw camera upload.
- No location-history persistence.
- Optional provider adapter through `window.ATLASGPS4D.registerProvider(...)`.
- Provider failure preserves local-core usability.
- PWA/offline caching of the local core.
- Automated privacy/provider validation in `npm run validate`.

## Provider contract

A routing provider is optional and may be registered at runtime:

```js
window.ATLASGPS4D.registerProvider({
  name: 'Authorized provider',
  async route({ origin, destination, language }) {
    return {
      geometry: [[longitude, latitude], [longitude, latitude]],
      summary: 'Route summary'
    };
  }
});
```

Provider credentials must not be embedded in browser source. Production adapters should call an ATLAS-controlled backend or another approved boundary that holds provider secrets securely.

## Layer 2 — provider and map intelligence (next)

The historical GPS work contains useful foundations for search, routing, traffic, incidents, lane intelligence, offline regional packages and live feeds. These will be ported selectively after the local core is merged, using current ATLAS security and deployment gates.

## Layer 3 — native navigation (gated)

CarPlay, Android for Cars, background navigation and native vehicle surfaces require platform-specific entitlements, permissions, distribution review and native build verification. Repository code must not claim those approvals exist until the corresponding external evidence is available.

## Layer 4 — planetary infrastructure (gated)

Planet-scale map imports, search indexes, routing clusters, traffic/live-data contracts, maritime/aeronautical datasets and field-validation programs require controlled infrastructure, data rights and operational evidence. They remain separate activation resources rather than hidden runtime assumptions.

## Security invariant

ATLAS GPS must remain useful when external providers are absent or degraded, while precise location, route geometry and camera data stay within the minimum permission and retention boundary required for the active session.
