# ATLAS Cars — Vehicle Platform Architecture v1.0.1

ATLAS Cars Architecture Lab is an original, vendor-neutral software model for vehicle telemetry, sensor fusion, AI-compute, independent safety supervision, energy state, cybersecurity boundaries and digital-twin observability.

## Implemented now

- Interactive Architecture Lab at `/atlas-cars.html`.
- Simulated telemetry and local event bus.
- Sensor-fusion health model for LiDAR, 4D radar, HD cameras and ultrasonic sensing.
- Independent safety-supervisor state model.
- Synthetic sensor-fault injection and degraded-safe demonstration.
- Low-SOC energy state included in the top-level safety summary.
- Bilingual Spanish/English interface and event messages.
- Accessible light/dark theme controls and reviewed light-mode contrast.
- Energy / battery state simulation.
- AI-compute load and latency simulation.
- Digital-twin status panel.
- Cybersecurity boundaries: secure boot, signed software, ECU identity, segmentation and OTA rollback.
- Versioned vendor-neutral architecture manifest.

## Canonical processing flow

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
5. Compute, sensor and connectivity providers remain replaceable behind stable ATLAS interfaces.
6. Vehicle cloud services may observe, synchronize and distribute signed software metadata, but are not required for basic safety-critical operation.
7. Every software and configuration release is versioned, auditable and reversible.
8. The machine-readable data flow must remain consistent with the rendered and documented architecture.

## Hardware boundary

This repository does **not** implement commands for steering, braking, acceleration, battery contactors, inverters, charging hardware or other high-voltage systems. Those require vehicle-specific engineering, certified components, controlled test environments, functional-safety analysis and independent validation.

## Next engineering layers

- Canonical telemetry schemas and protobuf/JSON contracts.
- Deterministic replay of recorded simulation sessions.
- Scenario-based verification for degraded sensing, low-energy states and connectivity loss.
- Signed OTA package metadata and rollback simulation.
- Fleet digital-twin API mock.
- Hardware-in-the-loop boundary only after software contracts and the safety case are reviewed.

## Intellectual-property boundary

ATLAS Cars may use publicly observable functional concepts as engineering benchmarks, but implementation must remain original. Do not copy proprietary firmware, source code, CAD, calibration tables, confidential specifications or protected UI assets.
