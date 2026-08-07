import Foundation
import Capacitor
import CoreLocation
import UIKit

@objc(AtlasNavigationPlugin)
public class AtlasNavigationPlugin: CAPPlugin, CAPBridgedPlugin, CLLocationManagerDelegate {
    public let identifier = "AtlasNavigationPlugin"
    public let jsName = "AtlasNavigation"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "startBackgroundNavigation", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "updateGuidance", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "stopBackgroundNavigation", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getNavigationStatus", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "purgeLocalNavigationData", returnType: CAPPluginReturnPromise)
    ]

    private let locationManager = CLLocationManager()
    private var navigationActive = false
    private var routeId: String?
    private var destinationName: String?

    public override func load() {
        locationManager.delegate = self
        locationManager.activityType = .automotiveNavigation
        locationManager.desiredAccuracy = kCLLocationAccuracyBestForNavigation
        locationManager.distanceFilter = kCLDistanceFilterNone
        locationManager.pausesLocationUpdatesAutomatically = false
        locationManager.allowsBackgroundLocationUpdates = true
        locationManager.showsBackgroundLocationIndicator = true
    }

    @objc func startBackgroundNavigation(_ call: CAPPluginCall) {
        guard CLLocationManager.locationServicesEnabled() else {
            call.reject("Location services are disabled")
            return
        }

        routeId = call.getString("routeId")
        destinationName = call.getString("destinationName")

        switch locationManager.authorizationStatus {
        case .notDetermined:
            locationManager.requestWhenInUseAuthorization()
        case .authorizedWhenInUse:
            locationManager.requestAlwaysAuthorization()
        case .authorizedAlways:
            break
        case .restricted, .denied:
            call.reject("Location permission was not granted")
            return
        @unknown default:
            call.reject("Unknown location authorization status")
            return
        }

        navigationActive = true
        UIApplication.shared.isIdleTimerDisabled = true
        locationManager.startUpdatingLocation()
        locationManager.startUpdatingHeading()
        call.resolve([
            "active": true,
            "routeId": routeId as Any,
            "destinationName": destinationName as Any
        ])
    }

    @objc func updateGuidance(_ call: CAPPluginCall) {
        guard navigationActive else {
            call.reject("Navigation is not active")
            return
        }

        let instruction = call.getString("instruction") ?? "Continue"
        let distanceMeters = call.getDouble("distanceMeters") ?? 0
        let etaEpochMs = call.getDouble("etaEpochMs") ?? 0

        notifyListeners("guidanceUpdated", data: [
            "instruction": instruction,
            "distanceMeters": distanceMeters,
            "etaEpochMs": etaEpochMs
        ])
        call.resolve(["updated": true])
    }

    @objc func stopBackgroundNavigation(_ call: CAPPluginCall) {
        navigationActive = false
        locationManager.stopUpdatingLocation()
        locationManager.stopUpdatingHeading()
        UIApplication.shared.isIdleTimerDisabled = false
        routeId = nil
        destinationName = nil
        call.resolve(["active": false])
    }

    @objc func getNavigationStatus(_ call: CAPPluginCall) {
        call.resolve([
            "active": navigationActive,
            "authorization": authorizationLabel(locationManager.authorizationStatus),
            "routeId": routeId as Any,
            "destinationName": destinationName as Any
        ])
    }

    @objc func purgeLocalNavigationData(_ call: CAPPluginCall) {
        routeId = nil
        destinationName = nil
        UserDefaults.standard.removeObject(forKey: "atlas.navigation.history")
        UserDefaults.standard.removeObject(forKey: "atlas.navigation.lastRoute")
        call.resolve(["purged": true])
    }

    public func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
        guard navigationActive, let location = locations.last else { return }
        notifyListeners("locationUpdate", data: [
            "latitude": location.coordinate.latitude,
            "longitude": location.coordinate.longitude,
            "altitude": location.altitude,
            "accuracy": location.horizontalAccuracy,
            "speed": max(0, location.speed),
            "course": max(0, location.course),
            "timestamp": location.timestamp.timeIntervalSince1970 * 1000
        ])
    }

    public func locationManager(_ manager: CLLocationManager, didUpdateHeading newHeading: CLHeading) {
        guard navigationActive else { return }
        notifyListeners("headingUpdate", data: [
            "magneticHeading": newHeading.magneticHeading,
            "trueHeading": newHeading.trueHeading,
            "accuracy": newHeading.headingAccuracy
        ])
    }

    public func locationManager(_ manager: CLLocationManager, didFailWithError error: Error) {
        notifyListeners("navigationError", data: ["message": error.localizedDescription])
    }

    private func authorizationLabel(_ status: CLAuthorizationStatus) -> String {
        switch status {
        case .notDetermined: return "notDetermined"
        case .restricted: return "restricted"
        case .denied: return "denied"
        case .authorizedAlways: return "authorizedAlways"
        case .authorizedWhenInUse: return "authorizedWhenInUse"
        @unknown default: return "unknown"
        }
    }
}
