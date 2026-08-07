import Foundation
import CarPlay
import MapKit

final class AtlasCarPlayCoordinator {
    static let shared = AtlasCarPlayCoordinator()

    weak var mapTemplate: CPMapTemplate?
    var navigationSession: CPNavigationSession?
    private var activeTrip: CPTrip?

    private init() {}

    func connect(mapTemplate: CPMapTemplate) {
        self.mapTemplate = mapTemplate
    }

    func disconnect() {
        navigationSession?.finishTrip()
        navigationSession = nil
        activeTrip = nil
        mapTemplate = nil
    }

    func previewTrip(origin: CLLocationCoordinate2D, destination: CLLocationCoordinate2D, destinationName: String, distanceMeters: Double, durationSeconds: Double) {
        guard let mapTemplate else { return }
        let originItem = MKMapItem(placemark: MKPlacemark(coordinate: origin))
        originItem.name = "Current location"
        let destinationItem = MKMapItem(placemark: MKPlacemark(coordinate: destination))
        destinationItem.name = destinationName
        let routeChoice = CPRouteChoice(
            summaryVariants: [destinationName],
            additionalInformationVariants: [formattedDistance(distanceMeters)],
            selectionSummaryVariants: [formattedDuration(durationSeconds)]
        )
        routeChoice.userInfo = [
            "distanceMeters": distanceMeters,
            "durationSeconds": durationSeconds
        ]
        let trip = CPTrip(origin: originItem, destination: destinationItem, routeChoices: [routeChoice])
        activeTrip = trip
        mapTemplate.showTripPreviews([trip], textConfiguration: CPTripPreviewTextConfiguration(
            startButtonTitle: "GO",
            additionalRoutesButtonTitle: "ROUTES",
            overviewButtonTitle: "OVERVIEW"
        ))
    }

    func beginNavigation(for trip: CPTrip, routeChoice: CPRouteChoice) {
        guard let mapTemplate else { return }
        activeTrip = trip
        navigationSession = mapTemplate.startNavigationSession(for: trip)
        mapTemplate.hideTripPreviews()
        updateGuidance(instruction: "Navigation started", symbolName: "arrow.up", distanceMeters: 0, durationSeconds: 0)
    }

    func updateGuidance(instruction: String, symbolName: String, distanceMeters: Double, durationSeconds: Double) {
        guard let session = navigationSession else { return }
        let maneuver = CPManeuver()
        maneuver.instructionVariants = [instruction]
        maneuver.symbolImage = UIImage(systemName: symbolName)
        maneuver.initialTravelEstimates = CPTravelEstimates(
            distanceRemaining: Measurement(value: distanceMeters, unit: UnitLength.meters),
            timeRemaining: durationSeconds
        )
        session.upcomingManeuvers = [maneuver]
        session.updateEstimates(
            CPTravelEstimates(
                distanceRemaining: Measurement(value: distanceMeters, unit: UnitLength.meters),
                timeRemaining: durationSeconds
            ),
            for: maneuver
        )
    }

    func finishNavigation() {
        navigationSession?.finishTrip()
        navigationSession = nil
        activeTrip = nil
    }

    private func formattedDistance(_ meters: Double) -> String {
        let formatter = MeasurementFormatter()
        formatter.unitOptions = .naturalScale
        return formatter.string(from: Measurement(value: meters, unit: UnitLength.meters))
    }

    private func formattedDuration(_ seconds: Double) -> String {
        let formatter = DateComponentsFormatter()
        formatter.allowedUnits = [.hour, .minute]
        formatter.unitsStyle = .abbreviated
        return formatter.string(from: seconds) ?? ""
    }
}

@available(iOS 14.0, *)
final class AtlasCarPlaySceneDelegate: UIResponder, CPTemplateApplicationSceneDelegate, CPMapTemplateDelegate {
    private var interfaceController: CPInterfaceController?
    private var mapTemplate: CPMapTemplate?

    func templateApplicationScene(_ templateApplicationScene: CPTemplateApplicationScene, didConnect interfaceController: CPInterfaceController) {
        self.interfaceController = interfaceController
        let template = CPMapTemplate()
        template.mapDelegate = self
        template.automaticallyHidesNavigationBar = true
        template.guidanceBackgroundColor = .systemBlue
        template.trailingNavigationBarButtons = [
            CPBarButton(type: .image) { _ in
                AtlasCarPlayCoordinator.shared.finishNavigation()
            }
        ]
        template.trailingNavigationBarButtons.first?.image = UIImage(systemName: "xmark.circle")
        mapTemplate = template
        AtlasCarPlayCoordinator.shared.connect(mapTemplate: template)
        interfaceController.setRootTemplate(template, animated: false, completion: nil)
    }

    func templateApplicationScene(_ templateApplicationScene: CPTemplateApplicationScene, didDisconnectInterfaceController interfaceController: CPInterfaceController) {
        AtlasCarPlayCoordinator.shared.disconnect()
        self.interfaceController = nil
        mapTemplate = nil
    }

    func mapTemplate(_ mapTemplate: CPMapTemplate, startedTrip trip: CPTrip, using routeChoice: CPRouteChoice) {
        AtlasCarPlayCoordinator.shared.beginNavigation(for: trip, routeChoice: routeChoice)
    }

    func mapTemplateDidCancelNavigation(_ mapTemplate: CPMapTemplate) {
        AtlasCarPlayCoordinator.shared.finishNavigation()
    }
}
