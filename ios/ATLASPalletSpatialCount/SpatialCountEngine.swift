import Foundation

public struct Dimensions3D: Codable, Equatable {
    public var length: Double
    public var width: Double
    public var height: Double

    public init(length: Double, width: Double, height: Double) {
        self.length = length
        self.width = width
        self.height = height
    }

    public var volume: Double { length * width * height }
}

public struct PalletSpatialInput: Codable {
    public var scannedAssembly: Dimensions3D
    public var palletBase: Dimensions3D
    public var referenceCase: Dimensions3D
    public var unitsPerCase: Int
    public var partialTopLayerCases: Int
    public var measuredGrossWeightKg: Double?
    public var palletWeightKg: Double?
    public var caseGrossWeightKg: Double?
    public var lidarQuality: Double

    public init(
        scannedAssembly: Dimensions3D,
        palletBase: Dimensions3D,
        referenceCase: Dimensions3D,
        unitsPerCase: Int,
        partialTopLayerCases: Int = 0,
        measuredGrossWeightKg: Double? = nil,
        palletWeightKg: Double? = nil,
        caseGrossWeightKg: Double? = nil,
        lidarQuality: Double = 1.0
    ) {
        self.scannedAssembly = scannedAssembly
        self.palletBase = palletBase
        self.referenceCase = referenceCase
        self.unitsPerCase = unitsPerCase
        self.partialTopLayerCases = partialTopLayerCases
        self.measuredGrossWeightKg = measuredGrossWeightKg
        self.palletWeightKg = palletWeightKg
        self.caseGrossWeightKg = caseGrossWeightKg
        self.lidarQuality = lidarQuality
    }
}

public struct PalletSpatialResult: Codable {
    public var cargoDimensions: Dimensions3D
    public var caseOrientation: String
    public var casesAlongLength: Int
    public var casesAlongWidth: Int
    public var casesPerFullLayer: Int
    public var fullLayers: Int
    public var partialTopLayerCases: Int
    public var totalCases: Int
    public var totalUnits: Int
    public var unusedHeight: Double
    public var geometryFillRatio: Double
    public var weightDerivedCases: Int?
    public var weightDifferenceCases: Int?
    public var confidence: Double
    public var requiresVerification: Bool
    public var notes: [String]
}

public enum SpatialCountError: Error, LocalizedError {
    case invalidDimensions
    case caseLargerThanCargo
    case invalidUnitsPerCase
    case invalidPartialLayer

    public var errorDescription: String? {
        switch self {
        case .invalidDimensions: return "All dimensions must be greater than zero."
        case .caseLargerThanCargo: return "The reference case does not fit inside the scanned cargo envelope."
        case .invalidUnitsPerCase: return "Units per case must be greater than zero."
        case .invalidPartialLayer: return "Partial-layer count is outside the valid range."
        }
    }
}

public enum SpatialCountEngine {
    private struct Orientation {
        let label: String
        let alongLength: Int
        let alongWidth: Int
        var perLayer: Int { alongLength * alongWidth }
    }

    public static func calculate(_ input: PalletSpatialInput) throws -> PalletSpatialResult {
        let a = input.scannedAssembly
        let p = input.palletBase
        let c = input.referenceCase

        guard [a.length, a.width, a.height, p.length, p.width, p.height, c.length, c.width, c.height].allSatisfy({ $0 > 0 }) else {
            throw SpatialCountError.invalidDimensions
        }
        guard input.unitsPerCase > 0 else { throw SpatialCountError.invalidUnitsPerCase }

        // The pallet/tarima is physically removed from the usable cargo height.
        // Length and width use the observed cargo envelope because overhang is possible.
        let cargo = Dimensions3D(
            length: a.length,
            width: a.width,
            height: max(0, a.height - p.height)
        )
        guard cargo.height > 0 else { throw SpatialCountError.invalidDimensions }

        let normal = Orientation(
            label: "reference",
            alongLength: Int(floor(cargo.length / c.length)),
            alongWidth: Int(floor(cargo.width / c.width))
        )
        let rotated = Orientation(
            label: "rotated-90",
            alongLength: Int(floor(cargo.length / c.width)),
            alongWidth: Int(floor(cargo.width / c.length))
        )
        let orientation = [normal, rotated].max { lhs, rhs in lhs.perLayer < rhs.perLayer }!
        guard orientation.perLayer > 0 else { throw SpatialCountError.caseLargerThanCargo }

        let fullLayers = Int(floor(cargo.height / c.height))
        guard fullLayers > 0 else { throw SpatialCountError.caseLargerThanCargo }
        guard input.partialTopLayerCases >= 0 && input.partialTopLayerCases < orientation.perLayer else {
            throw SpatialCountError.invalidPartialLayer
        }

        let totalCases = fullLayers * orientation.perLayer + input.partialTopLayerCases
        let totalUnits = totalCases * input.unitsPerCase
        let usedHeight = Double(fullLayers) * c.height
        let unusedHeight = max(0, cargo.height - usedHeight)

        // Ratio is diagnostic only. It is not used as the primary counting method.
        let occupiedCaseVolume = Double(totalCases) * c.volume
        let cargoVolume = max(cargo.volume, 0.000_001)
        let fillRatio = min(1.0, occupiedCaseVolume / cargoVolume)

        var weightDerivedCases: Int? = nil
        var weightDifferenceCases: Int? = nil
        var weightAgreement = 1.0
        var notes: [String] = []

        if let gross = input.measuredGrossWeightKg,
           let palletWeight = input.palletWeightKg,
           let caseWeight = input.caseGrossWeightKg,
           gross > palletWeight,
           caseWeight > 0 {
            let derived = Int(round((gross - palletWeight) / caseWeight))
            weightDerivedCases = max(0, derived)
            weightDifferenceCases = abs(totalCases - max(0, derived))
            weightAgreement = totalCases == 0 ? 0 : max(0, 1 - Double(abs(totalCases - derived)) / Double(totalCases))
            if weightAgreement < 0.97 {
                notes.append("Weight validation does not agree closely with the geometry-derived case count.")
            }
        } else {
            notes.append("Weight validation was not supplied; result is geometry-only.")
        }

        let lidarQuality = min(1, max(0, input.lidarQuality))
        let verticalFit = 1 - min(1, unusedHeight / c.height)
        let fillQuality = min(1, max(0, fillRatio / 0.80))
        let confidence = max(0, min(1,
            0.45 * lidarQuality +
            0.20 * verticalFit +
            0.15 * fillQuality +
            0.20 * weightAgreement
        ))

        let requiresVerification = confidence < 0.92 || weightAgreement < 0.97 || input.partialTopLayerCases > 0
        if input.partialTopLayerCases > 0 {
            notes.append("Partial top layer included; ATLAS requires visual confirmation before posting inventory.")
        }
        if confidence < 0.92 {
            notes.append("Confidence is below the automatic-approval threshold.")
        }

        return PalletSpatialResult(
            cargoDimensions: cargo,
            caseOrientation: orientation.label,
            casesAlongLength: orientation.alongLength,
            casesAlongWidth: orientation.alongWidth,
            casesPerFullLayer: orientation.perLayer,
            fullLayers: fullLayers,
            partialTopLayerCases: input.partialTopLayerCases,
            totalCases: totalCases,
            totalUnits: totalUnits,
            unusedHeight: unusedHeight,
            geometryFillRatio: fillRatio,
            weightDerivedCases: weightDerivedCases,
            weightDifferenceCases: weightDifferenceCases,
            confidence: confidence,
            requiresVerification: requiresVerification,
            notes: notes
        )
    }
}