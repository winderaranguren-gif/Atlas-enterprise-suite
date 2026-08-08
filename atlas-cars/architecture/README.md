# ATLAS Cars — Vehicle Platform Architecture v1

This package converts the public high-level concepts benchmarked from modern premium EV architectures into an original, vendor-neutral ATLAS Cars system design.

## What is implemented now

- Interactive Architecture Lab (`/atlas-cars.html`).
- Simulated vehicle telemetry and event bus.
- Sensor-fusion health model for LiDAR, 4D radar, HD cameras and ultrasonic sensing.
- Independent safety-supervisor state model.
- Synthetic sensor-fault injection and degraded-safe demonstration.
- Energy / battery state simulation.
- AI-compute load and latency simulation.
- Digital-twin status panel.
- Cybersecurity boundaries: secure boot, signed software, ECU identity, segmentation, OTA rollback.
- Vendor-neutral architecture manifest in JSON.

## Architecture

```text
LiDAR / Radar 4D / Cameras / Ultrasonic
                  |
                  v
          Time Synchronization
                  |
                  v
        ATLAS Sensor Fusion 360
                  |
                  v
           ATLAS AI Drive
       Perception / Prediction
              Planning
                  |
          +-------+-------+
          |               |
          v               v
 Safety Supervisor   Digital Twin
          |
          v
 Validated Control Boundary
          |
      [NO PHYSICAL ACTUATION
       IN THIS PROTOTYPE]

Cockpit <-> Secure Data Plane <-> Vehicle Cloud
                            <-> ATLAS App / Home / Chargers / Parking / Pay
```

## Design rules

1. Safety-critical processing remains local-first.
2. Infotainment and user devices never share unrestricted access with critical domains.
3. The safety supervisor remains logically independent from the primary AI compute path.
4. Any future physical control layer must be developed and validated separately under an automotive safety lifecycle.
5. Compute, sensor and connectivity providers must remain replaceable behind stable ATLAS interfaces.
6. Vehicle cloud services may observe, synchronize and distribute signed software metadata, but must not be required for basic safety-critical operation.
7. Every software and configuration release must be versioned, auditable and reversible.

## Hardware boundary

The current repository intentionally does **not** implement commands for steering, braking, acceleration, battery contactors, inverters, charging hardware or other high-voltage systems. Those require vehicle-specific engineering, certified components, test benches, functional-safety analysis and controlled validation.

## Next engineering layers

- Define canonical telemetry schemas and protobuf/JSON contracts.
- Add deterministic replay of recorded simulation sessions.
- Add scenario-based verification for degraded sensing and connectivity loss.
- Add signed OTA package metadata and rollback simulation.
- Add fleet digital-twin API mock.
- Add a hardware-in-the-loop boundary only after the software contracts and safety case are reviewed.

## Intellectual-property boundary

ATLAS Cars uses publicly observable functional concepts as engineering benchmarks. The implementation must remain original: no proprietary firmware, source code, CAD, calibration tables, confidential specifications, trademarks used as product identity, or copied protected UI assets.
