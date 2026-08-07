import ARKit
import Foundation
import simd

public struct LiDARScanEnvelope: Codable {
    public var dimensionsMeters: Dimensions3D
    public var centerWorld: [Float]
    public var sampledPoints: Int
    public var highConfidenceFraction: Double
    public var timestamp: Date
}

/// Native LiDAR acquisition layer for ATLAS Pallet Spatial Count.
///
/// This component reads ARKit scene-depth data from LiDAR-capable iPhone/iPad devices,
/// converts depth samples to world-space points, and estimates a 3D envelope inside a
/// user-framed region. Production object segmentation can replace `filterForegroundCluster`
/// without changing the JSON contract consumed by SpatialCountEngine.
public final class LiDARDepthScanner: NSObject, ARSessionDelegate {
    public let session = ARSession()
    public private(set) var latestEnvelope: LiDARScanEnvelope?
    public var onEnvelope: ((LiDARScanEnvelope) -> Void)?

    /// Fractional viewport rectangle: x, y, width, height all in 0...1.
    /// Default keeps the center of the camera view so the operator frames the pallet/case.
    public var normalizedRegion = SIMD4<Float>(0.12, 0.12, 0.76, 0.76)

    /// Depths outside this range are discarded for industrial indoor scans.
    public var minimumDepthMeters: Float = 0.20
    public var maximumDepthMeters: Float = 6.0

    public override init() {
        super.init()
        session.delegate = self
    }

    public var isSupported: Bool {
        let configuration = ARWorldTrackingConfiguration()
        return ARWorldTrackingConfiguration.supportsFrameSemantics(.sceneDepth) ||
               ARWorldTrackingConfiguration.supportsFrameSemantics(.smoothedSceneDepth)
    }

    public func start() throws {
        guard ARWorldTrackingConfiguration.isSupported, isSupported else {
            throw NSError(domain: "ATLAS.LiDAR", code: 1, userInfo: [NSLocalizedDescriptionKey: "This device does not expose ARKit LiDAR scene depth."])
        }
        let config = ARWorldTrackingConfiguration()
        config.worldAlignment = .gravity
        if ARWorldTrackingConfiguration.supportsFrameSemantics(.smoothedSceneDepth) {
            config.frameSemantics.insert(.smoothedSceneDepth)
        } else if ARWorldTrackingConfiguration.supportsFrameSemantics(.sceneDepth) {
            config.frameSemantics.insert(.sceneDepth)
        }
        if ARWorldTrackingConfiguration.supportsSceneReconstruction(.mesh) {
            config.sceneReconstruction = .mesh
        }
        session.run(config, options: [.resetTracking, .removeExistingAnchors])
    }

    public func stop() {
        session.pause()
    }

    public func session(_ session: ARSession, didUpdate frame: ARFrame) {
        guard let depthData = frame.smoothedSceneDepth ?? frame.sceneDepth else { return }
        guard let envelope = buildEnvelope(frame: frame, depthData: depthData) else { return }
        latestEnvelope = envelope
        onEnvelope?(envelope)
    }

    private func buildEnvelope(frame: ARFrame, depthData: ARDepthData) -> LiDARScanEnvelope? {
        let depthMap = depthData.depthMap
        let confidenceMap = depthData.confidenceMap
        CVPixelBufferLockBaseAddress(depthMap, .readOnly)
        if let confidenceMap { CVPixelBufferLockBaseAddress(confidenceMap, .readOnly) }
        defer {
            CVPixelBufferUnlockBaseAddress(depthMap, .readOnly)
            if let confidenceMap { CVPixelBufferUnlockBaseAddress(confidenceMap, .readOnly) }
        }

        let depthWidth = CVPixelBufferGetWidth(depthMap)
        let depthHeight = CVPixelBufferGetHeight(depthMap)
        guard depthWidth > 0, depthHeight > 0 else { return nil }

        let imageWidth = Float(frame.camera.imageResolution.width)
        let imageHeight = Float(frame.camera.imageResolution.height)
        let sx = imageWidth / Float(depthWidth)
        let sy = imageHeight / Float(depthHeight)
        let intrinsics = frame.camera.intrinsics
        let fx = intrinsics[0,0]
        let fy = intrinsics[1,1]
        let cx = intrinsics[2,0]
        let cy = intrinsics[2,1]

        let x0 = max(0, Int(Float(depthWidth) * normalizedRegion.x))
        let y0 = max(0, Int(Float(depthHeight) * normalizedRegion.y))
        let x1 = min(depthWidth - 1, Int(Float(depthWidth) * (normalizedRegion.x + normalizedRegion.z)))
        let y1 = min(depthHeight - 1, Int(Float(depthHeight) * (normalizedRegion.y + normalizedRegion.w)))

        let depthBytes = CVPixelBufferGetBytesPerRow(depthMap)
        let depthBase = CVPixelBufferGetBaseAddress(depthMap)!
        let confidenceBytes = confidenceMap.map(CVPixelBufferGetBytesPerRow)
        let confidenceBase = confidenceMap.flatMap(CVPixelBufferGetBaseAddress)

        var points: [SIMD3<Float>] = []
        var highConfidence = 0
        var acceptedConfidence = 0

        // Sampling every other pixel keeps the pipeline responsive while retaining dense geometry.
        for y in stride(from: y0, through: y1, by: 2) {
            let depthRow = depthBase.advanced(by: y * depthBytes).assumingMemoryBound(to: Float32.self)
            let confidenceRow: UnsafeMutablePointer<UInt8>? = {
                guard let confidenceBase, let confidenceBytes else { return nil }
                return confidenceBase.advanced(by: y * confidenceBytes).assumingMemoryBound(to: UInt8.self)
            }()

            for x in stride(from: x0, through: x1, by: 2) {
                let z = depthRow[x]
                guard z.isFinite, z >= minimumDepthMeters, z <= maximumDepthMeters else { continue }

                let confidence = confidenceRow.map { Int($0[x]) } ?? 2
                guard confidence >= 1 else { continue }
                acceptedConfidence += 1
                if confidence >= 2 { highConfidence += 1 }

                let u = Float(x) * sx
                let v = Float(y) * sy
                let cameraX = (u - cx) * z / fx
                let cameraY = (v - cy) * z / fy
                // ARKit camera looks down -Z in camera space.
                let cameraPoint = SIMD4<Float>(cameraX, cameraY, -z, 1)
                let worldPoint4 = frame.camera.transform * cameraPoint
                points.append(SIMD3<Float>(worldPoint4.x, worldPoint4.y, worldPoint4.z))
            }
        }

        guard points.count >= 80 else { return nil }
        let filtered = filterForegroundCluster(points)
        guard filtered.count >= 50 else { return nil }

        // World-aligned AABB is stable for a pallet placed on a gravity-aligned floor when
        // the operator scans approximately square to the pallet. A later PCA/OBB stage can
        // replace this without changing the exported result contract.
        var minP = SIMD3<Float>(repeating: .greatestFiniteMagnitude)
        var maxP = SIMD3<Float>(repeating: -.greatestFiniteMagnitude)
        var sum = SIMD3<Float>(repeating: 0)
        for p in filtered {
            minP = simd_min(minP, p)
            maxP = simd_max(maxP, p)
            sum += p
        }
        let extents = maxP - minP
        let center = sum / Float(filtered.count)
        let horizontal = [Double(abs(extents.x)), Double(abs(extents.z))].sorted(by: >)
        let dimensions = Dimensions3D(length: horizontal[0], width: horizontal[1], height: Double(abs(extents.y)))
        guard dimensions.length > 0.03, dimensions.width > 0.03, dimensions.height > 0.03 else { return nil }

        return LiDARScanEnvelope(
            dimensionsMeters: dimensions,
            centerWorld: [center.x, center.y, center.z],
            sampledPoints: filtered.count,
            highConfidenceFraction: acceptedConfidence == 0 ? 0 : Double(highConfidence) / Double(acceptedConfidence),
            timestamp: Date()
        )
    }

    /// Keeps the dense foreground depth cluster and rejects much of the background inside
    /// the framing rectangle. It is deliberately conservative: uncertain scans are sent to
    /// human verification instead of silently becoming inventory.
    private func filterForegroundCluster(_ points: [SIMD3<Float>]) -> [SIMD3<Float>] {
        guard points.count > 20 else { return points }
        // Device position is the origin of camera-relative distance after world transform is
        // unavailable here, so use the dominant coordinate median spread as a robust coarse filter.
        let xs = points.map(\.x).sorted()
        let ys = points.map(\.y).sorted()
        let zs = points.map(\.z).sorted()
        let mx = xs[xs.count / 2]
        let my = ys[ys.count / 2]
        let mz = zs[zs.count / 2]
        let center = SIMD3<Float>(mx, my, mz)
        let distances = points.map { simd_length($0 - center) }.sorted()
        let p90 = distances[min(distances.count - 1, Int(Double(distances.count) * 0.90))]
        let radius = max(0.35, p90)
        return points.filter { simd_length($0 - center) <= radius }
    }

    public func exportLatestJSON() throws -> Data {
        guard let latestEnvelope else {
            throw NSError(domain: "ATLAS.LiDAR", code: 2, userInfo: [NSLocalizedDescriptionKey: "No LiDAR envelope has been captured yet."])
        }
        let encoder = JSONEncoder()
        encoder.outputFormatting = [.prettyPrinted, .sortedKeys]
        encoder.dateEncodingStrategy = .iso8601
        return try encoder.encode(latestEnvelope)
    }
}