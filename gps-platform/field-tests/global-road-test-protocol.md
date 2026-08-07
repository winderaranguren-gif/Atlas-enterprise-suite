# ATLAS GPS 4D — Global Field-Test Protocol

## Purpose

Validate navigation behavior in real environments without treating an unapproved build as a certified safety system. Testing is performed by an authorized organization with insured vehicles, trained adult safety drivers, local legal review and a written stop-work policy.

## Roles

- **Test director:** owns the plan and approves each territory.
- **Safety driver:** controls the vehicle and does not interact with the test device while moving.
- **Observer:** records route guidance, defects and environmental conditions.
- **Remote operations lead:** monitors service health and can disable live feeds or model versions.
- **Privacy officer:** confirms consent, retention and camera controls.
- **Local reviewer:** verifies road rules, language, signage and authority-data sources.

## Entry criteria

- Automated tests and gateway contract tests pass.
- Test build is signed and identifies itself as non-production.
- Territory map sources and effective dates are recorded.
- Emergency contact, insurance and incident process are approved.
- Test devices are securely mounted.
- Camera collection is disabled unless separately approved.
- A paper or independent navigation fallback is available.

## Test phases

### Phase 0 — Simulator and closed course

Validate route calculation, rerouting, voice, lane presentation, tunnels, GPS loss, background mode, thermal behavior and emergency stop controls without public-road exposure.

### Phase 1 — Low-complexity public roads

Daylight tests on familiar routes with low traffic. Compare ATLAS guidance against posted signs and a separately validated reference source.

### Phase 2 — Complex roads

Interchanges, reversible lanes, toll roads, construction zones, left-driving territories, roundabouts, mountain roads, bridges and ferries where legally permitted.

### Phase 3 — Adverse conditions

Night, rain, glare and weak connectivity are tested only when the safety director determines conditions remain suitable. Testing stops immediately when visibility or vehicle control is compromised.

### Phase 4 — Territory acceptance

Repeat critical routes, review every safety-relevant defect, confirm current data and obtain signed release approval for the specific territory and transportation mode.

## Mandatory scenarios

- Correct and incorrect destination selection.
- Start without location permission.
- Loss and restoration of GPS.
- Loss and restoration of network access.
- Departure from route and repeated rerouting.
- Closed road or stale live-data feed.
- Tunnel and multi-level interchange.
- Border, island and ferry transition.
- Wrong-way prevention and divided-road ambiguity.
- Left-side and right-side traffic.
- Multiple writing systems and text-to-speech pronunciation.
- Background navigation, phone lock and incoming-call interruption.
- CarPlay and Android Auto connection changes.
- AR disabled, low-confidence and model rollback states.

## Stop-work conditions

Testing stops when guidance repeatedly directs an illegal maneuver, the device obstructs the driver, the app freezes during a critical maneuver, map data is materially stale, weather makes the route unsafe, a collision or near miss occurs, or any team member invokes stop-work authority.

## Evidence package

Each run records:

- Territory, route ID, mode, build, model versions and map-data dates.
- Start/end time, weather, lighting and connectivity.
- GPS accuracy, route latency and reroute latency.
- Every mismatch against posted signs or verified authority data.
- Screenshots or logs captured by the observer while stopped.
- Defect severity, owner, correction and retest result.
- Safety-driver and test-director signatures.

## Release thresholds

- Zero unresolved critical safety defects.
- All high-severity defects either corrected and retested or explicitly block the affected territory/mode.
- Current map, traffic and authority-data evidence.
- Privacy and retention review complete.
- Independent release sign-off recorded.
