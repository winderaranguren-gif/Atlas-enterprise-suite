import Foundation

@MainActor
public final class PalletSpatialCountCoordinator: ObservableObject {
    public enum CaptureTarget: String, Codable {
        case assembly
        case palletBase
        case referenceCase
    }

    @Published public private(set) var target: CaptureTarget = .assembly
    @Published public private(set) var assemblyScan: LiDARScanEnvelope?
    @Published public private(set) var palletScan: LiDARScanEnvelope?
    @Published public private(set) var caseScan: LiDARScanEnvelope?
    @Published public private(set) var result: PalletSpatialResult?
    @Published public private(set) var status = "Ready"
    @Published public var unitsPerCase: Int = 1
    @Published public var partialTopLayerCases: Int = 0
    @Published public var measuredGrossWeightKg: Double?
    @Published public var palletWeightKg: Double?
    @Published public var caseGrossWeightKg: Double?

    public let lidar = LiDARDepthScanner()

    public init() {
        lidar.onEnvelope = { [weak self] envelope in
            Task { @MainActor in
                self?.acceptLiveEnvelope(envelope)
            }
        }
    }

    public func begin(target: CaptureTarget) throws {
        self.target = target
        status = "Scanning \(target.rawValue)… frame the object and move slowly around its visible faces."
        try lidar.start()
    }

    public func freezeCurrentScan() {
        guard let envelope = lidar.latestEnvelope else {
            status = "No stable LiDAR measurement is available yet."
            return
        }
        switch target {
        case .assembly: assemblyScan = envelope
        case .palletBase: palletScan = envelope
        case .referenceCase: caseScan = envelope
        }
        lidar.stop()
        status = "Captured \(target.rawValue): \(format(envelope.dimensionsMeters))."
    }

    public func calculate() {
        guard let assemblyScan, let palletScan, let caseScan else {
            status = "Capture the full pallet assembly, empty pallet/base, and one reference case first."
            return
        }

        let quality = min(
            assemblyScan.highConfidenceFraction,
            palletScan.highConfidenceFraction,
            caseScan.highConfidenceFraction
        )
        let input = PalletSpatialInput(
            scannedAssembly: assemblyScan.dimensionsMeters,
            palletBase: palletScan.dimensionsMeters,
            referenceCase: caseScan.dimensionsMeters,
            unitsPerCase: unitsPerCase,
            partialTopLayerCases: partialTopLayerCases,
            measuredGrossWeightKg: measuredGrossWeightKg,
            palletWeightKg: palletWeightKg,
            caseGrossWeightKg: caseGrossWeightKg,
            lidarQuality: quality
        )

        do {
            result = try SpatialCountEngine.calculate(input)
            if let result {
                status = result.requiresVerification
                    ? "Count calculated: \(result.totalCases) cases / \(result.totalUnits) units. Human verification required."
                    : "Count calculated and eligible for approval: \(result.totalCases) cases / \(result.totalUnits) units."
            }
        } catch {
            result = nil
            status = error.localizedDescription
        }
    }

    public func exportCountPacketJSON() throws -> Data {
        struct Packet: Codable {
            let version: Int
            let source: String
            let assembly: LiDARScanEnvelope
            let pallet: LiDARScanEnvelope
            let referenceCase: LiDARScanEnvelope
            let result: PalletSpatialResult
        }
        guard let assemblyScan, let palletScan, let caseScan, let result else {
            throw NSError(domain: "ATLAS.PalletSpatial", code: 20, userInfo: [NSLocalizedDescriptionKey: "A completed count is required before export."])
        }
        let packet = Packet(
            version: 1,
            source: "ATLAS LiDAR Pallet Spatial Count",
            assembly: assemblyScan,
            pallet: palletScan,
            referenceCase: caseScan,
            result: result
        )
        let encoder = JSONEncoder()
        encoder.outputFormatting = [.prettyPrinted, .sortedKeys]
        encoder.dateEncodingStrategy = .iso8601
        return try encoder.encode(packet)
    }

    private func acceptLiveEnvelope(_ envelope: LiDARScanEnvelope) {
        status = "Live \(target.rawValue): \(format(envelope.dimensionsMeters)) · confidence \(Int(envelope.highConfidenceFraction * 100))%"
    }

    private func format(_ d: Dimensions3D) -> String {
        String(format: "%.3f × %.3f × %.3f m", d.length, d.width, d.height)
    }
}