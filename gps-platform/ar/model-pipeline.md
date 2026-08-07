# ATLAS GPS 4D — Computer-Vision Model Pipeline

## Scope

Models may support lane boundaries, road signs, vehicles, pedestrians, cyclists, traffic lights, debris and other road obstacles. They are advisory inputs to navigation and must never be represented as a substitute for attentive driving or certified vehicle safety systems.

## Model families

| Model | Primary output | Minimum operating domains |
|---|---|---|
| LaneNet | lane polylines and confidence | day, night, rain, glare, worn markings |
| SignNet | sign class, text region and confidence | multiple scripts, temporary signs, construction zones |
| ObjectNet | vehicle, pedestrian, cyclist and obstacle boxes | urban, highway, rural, tunnel |
| SignalNet | traffic-light state and confidence | horizontal, vertical, flashing and obscured signals |
| DepthRisk | relative depth and time-to-collision estimate | phone camera motion and stationary camera positions |

## Data controls

- Every dataset requires a license record, territory coverage record and permitted-use statement.
- Faces and license plates must be removed, blurred or governed by a documented lawful basis.
- Training, validation and safety-test sets must be separated by route, camera and collection session.
- Rare and safety-critical classes require targeted collection and synthetic augmentation review.
- Dataset versions are immutable after a model release is signed.

## Training pipeline

1. Validate dataset licenses and manifests.
2. Run integrity, duplicate and leakage scans.
3. Normalize camera calibration and image metadata.
4. Train reproducibly from a pinned container image and configuration.
5. Export an on-device model format supported by the native applications.
6. Benchmark latency, memory, temperature and battery use on representative devices.
7. Evaluate by territory, lighting, weather, road class and demographic exposure.
8. Run adversarial, occlusion, blur, glare and low-resolution tests.
9. Produce a model card, limitations statement and signed hash.
10. Release to a canary cohort with automatic rollback thresholds.

## Required metrics

- Precision, recall and F1 by class.
- Intersection-over-union for lanes and object boxes.
- False-negative rate for pedestrians, cyclists and stopped vehicles.
- Sign recognition accuracy by script and territory.
- Traffic-light state confusion matrix.
- End-to-end latency at p50, p95 and p99.
- Thermal throttling and battery impact over a two-hour navigation session.
- Calibration error so confidence values reflect real reliability.

## Safety gates

A model is blocked from production when any of the following applies:

- No legal right to use a material portion of the training data.
- Missing results for night, rain, glare or construction conditions.
- Pedestrian or cyclist false-negative rate exceeds the approved territory threshold.
- Model output is not confidence-calibrated.
- Artifact signature or model-card hash does not match.
- Independent safety review is incomplete.
- The model causes route guidance to contradict verified map or authority data without a safe fallback.

## Artifact contract

Each released model package must contain:

```text
model.onnx | model.tflite | model.mlmodelc
model-card.json
metrics.json
territories.json
calibration.json
LICENSES/
sha256.txt
signature.ed25519
```

## Runtime behavior

- Inference occurs on device by default.
- Raw frames are not retained unless the user explicitly opts into a separately governed collection program.
- Low-confidence outputs are suppressed rather than displayed as facts.
- Map, route and official traffic-control data remain independently available when AR is disabled.
- A remote kill switch may disable a model version without disabling basic GPS navigation.
