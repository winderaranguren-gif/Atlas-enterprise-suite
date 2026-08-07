# ATLAS Pallet Spatial Count — Native LiDAR

This folder contains the native iPhone/iPad acquisition layer for ATLAS Inventory Intelligence.

## What is implemented

- ARKit `sceneDepth` / `smoothedSceneDepth` acquisition on LiDAR-capable devices.
- Optional ARKit scene reconstruction mesh enablement when supported.
- Depth confidence filtering.
- Depth-pixel to 3D world-point conversion using camera intrinsics.
- User-framed pallet/case scan region.
- 3D measurement envelope export.
- Separate captures for:
  1. full pallet + cargo assembly,
  2. pallet/base geometry,
  3. one reference case.
- Geometry count engine:
  - subtracts pallet height from assembly height,
  - evaluates reference and 90-degree case orientation,
  - computes cases per layer,
  - computes full layers,
  - accepts an explicitly detected/confirmed partial top layer,
  - multiplies cases by units per case.
- Optional weight cross-check.
- Confidence score and human-verification gate.
- JSON export contract for ATLAS Inventory Intelligence.
- SwiftUI camera/capture screen.

## Files

- `LiDARDepthScanner.swift` — ARKit scene-depth acquisition and 3D envelope generation.
- `SpatialCountEngine.swift` — deterministic pallet/case counting logic.
- `PalletSpatialCountCoordinator.swift` — scan workflow and result packet orchestration.
- `PalletLiDARCaptureView.swift` — native SwiftUI/AR camera interface.

## Add to an iOS target

1. Add these Swift files to an iOS/iPadOS application target.
2. Link the system frameworks used by the source: ARKit, SceneKit, SwiftUI and Combine.
3. Add a camera usage description to the application Info.plist:

```xml
<key>NSCameraUsageDescription</key>
<string>ATLAS uses the camera and LiDAR depth sensor to measure pallets and product cases for inventory counts.</string>
```

4. Present `PalletLiDARCaptureView()` from the ATLAS iOS navigation layer.
5. Run on a physical iPhone/iPad for which `ARWorldTrackingConfiguration.supportsFrameSemantics(.sceneDepth)` or `.smoothedSceneDepth` returns true.

## Counting safety / controls

A geometry-derived count is not posted automatically when:

- LiDAR/depth confidence is below the configured threshold,
- weight validation materially disagrees with geometry,
- a partial top layer is present,
- the reference case does not fit the detected cargo envelope,
- measurements are incomplete or invalid.

Those cases are routed to physical verification/recount.

## Production refinement still required

The current depth acquisition uses a user-framed region plus conservative foreground filtering. For arbitrary mixed pallets or complex warehouse backgrounds, production deployment should add a trained pallet/case segmentation model and an oriented-bounding-box (PCA/OBB) estimator. This is intentionally not represented as already solved: the current version is suitable for controlled, regular pallets and a guided operator workflow.

The web companion `atlas-pallet-spatial-count.html` accepts manual/laser dimensions or imported ATLAS LiDAR JSON and runs the same operational counting model in a browser.