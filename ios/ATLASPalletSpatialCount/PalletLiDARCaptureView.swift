import ARKit
import SceneKit
import SwiftUI

public struct PalletLiDARCaptureView: View {
    @StateObject private var model = PalletSpatialCountCoordinator()
    @State private var errorText: String?

    public init() {}

    public var body: some View {
        ZStack(alignment: .bottom) {
            ARCameraPreview(session: model.lidar.session)
                .ignoresSafeArea()

            // Framing guide. The native depth scanner samples approximately this central region.
            RoundedRectangle(cornerRadius: 22)
                .stroke(.cyan, style: StrokeStyle(lineWidth: 2, dash: [8, 6]))
                .padding(.horizontal, 34)
                .padding(.vertical, 150)
                .allowsHitTesting(false)

            VStack(spacing: 12) {
                HStack {
                    Label("ATLAS LiDAR", systemImage: "viewfinder")
                        .font(.headline)
                    Spacer()
                    Text(model.lidar.isSupported ? "DEPTH READY" : "NO LIDAR")
                        .font(.caption.bold())
                        .padding(.horizontal, 9)
                        .padding(.vertical, 5)
                        .background(.ultraThinMaterial, in: Capsule())
                }

                Text(model.status)
                    .font(.caption)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .foregroundStyle(.secondary)

                captureButtons

                HStack(spacing: 10) {
                    Button("Freeze measurement") { model.freezeCurrentScan() }
                        .buttonStyle(.borderedProminent)
                    Button("Calculate") { model.calculate() }
                        .buttonStyle(.bordered)
                }

                if let result = model.result {
                    resultPanel(result)
                }

                if let errorText {
                    Text(errorText)
                        .font(.caption)
                        .foregroundStyle(.red)
                        .frame(maxWidth: .infinity, alignment: .leading)
                }
            }
            .padding(16)
            .background(.regularMaterial, in: RoundedRectangle(cornerRadius: 24))
            .padding()
        }
        .preferredColorScheme(.dark)
    }

    private var captureButtons: some View {
        HStack(spacing: 8) {
            captureButton("Full pallet", target: .assembly)
            captureButton("Pallet base", target: .palletBase)
            captureButton("Case", target: .referenceCase)
        }
    }

    private func captureButton(_ title: String, target: PalletSpatialCountCoordinator.CaptureTarget) -> some View {
        Button(title) {
            do {
                errorText = nil
                try model.begin(target: target)
            } catch {
                errorText = error.localizedDescription
            }
        }
        .buttonStyle(.bordered)
        .tint(model.target == target ? .cyan : .gray)
    }

    private func resultPanel(_ result: PalletSpatialResult) -> some View {
        VStack(alignment: .leading, spacing: 7) {
            HStack {
                VStack(alignment: .leading) {
                    Text("COUNT RESULT").font(.caption2).foregroundStyle(.secondary)
                    Text("\(result.totalCases) cases · \(result.totalUnits) units")
                        .font(.title3.bold())
                }
                Spacer()
                Text("\(Int(result.confidence * 100))%")
                    .font(.title2.monospacedDigit().bold())
            }
            HStack {
                Text("\(result.casesAlongLength) × \(result.casesAlongWidth) cases/layer")
                Spacer()
                Text("\(result.fullLayers) full layers")
            }
            .font(.caption)
            .foregroundStyle(.secondary)

            Text(result.requiresVerification ? "VERIFY BEFORE POSTING" : "ELIGIBLE FOR APPROVAL")
                .font(.caption.bold())
                .foregroundStyle(result.requiresVerification ? .yellow : .green)
        }
        .padding(12)
        .background(.thinMaterial, in: RoundedRectangle(cornerRadius: 14))
    }
}

private struct ARCameraPreview: UIViewRepresentable {
    let session: ARSession

    func makeUIView(context: Context) -> ARSCNView {
        let view = ARSCNView(frame: .zero)
        view.session = session
        view.automaticallyUpdatesLighting = true
        view.scene = SCNScene()
        return view
    }

    func updateUIView(_ uiView: ARSCNView, context: Context) {
        if uiView.session !== session {
            uiView.session = session
        }
    }
}
