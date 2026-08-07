# ATLAS GPS 4D — CarPlay Navigation Entitlement Package

## Applicant

- Organization: ATLAS
- Product: ATLAS GPS 4D
- Requested category: Navigation
- Bundle identifier: `com.atlas.navigation`
- Primary contact: Winder Aranguren, Founder
- Distribution intent: Public App Store release after safety, privacy and territory validation

## Product description

ATLAS GPS 4D is a turn-by-turn navigation application designed to provide route planning, maneuver guidance, travel estimates, lane information where verified, road-hazard awareness and an optional phone-based augmented road view. The CarPlay experience uses Apple-controlled CarPlay templates and keeps interactive tasks short, voice-first and driving appropriate.

## Driver-safety design

- Navigation controls are limited to essential driving tasks.
- Text entry is redirected to Siri/voice input or the phone while parked.
- The map and maneuver presentation use CarPlay templates rather than a custom unrestricted dashboard.
- Hazard and incident information is filtered by relevance and distance.
- Camera-based AR remains on the phone and is not shown as unrestricted video in CarPlay.
- A route can be started, paused or ended without multi-step menus.
- The application clearly distinguishes advisory data from official traffic-control instructions.

## Privacy design

- Precise location is requested only for navigation.
- Location history is disabled by default.
- Raw road-camera frames are not uploaded by default.
- Stored location data is encrypted when the user explicitly enables history.
- Users can delete navigation history and device data.
- Enterprise administrators cannot silently enable personal location history.

## CarPlay implementation evidence

- [ ] Apple Developer organization membership is active.
- [ ] App ID and bundle identifier are registered.
- [ ] Navigation entitlement request is submitted through Apple’s CarPlay contact process.
- [ ] CarPlay Entitlement Addendum is accepted by an authorized signatory.
- [ ] Managed capability appears in the developer account.
- [ ] Production provisioning profile includes the entitlement.
- [ ] `Entitlements.plist` and code-signing settings are verified.
- [ ] CarPlay simulator tests pass.
- [ ] Tests on at least three physical vehicle/head-unit configurations pass.
- [ ] App Store privacy details and review notes are complete.
- [ ] App Store review approval is recorded.

## Review notes for Apple

ATLAS GPS 4D requests only the navigation category. It does not attempt to replace vehicle safety systems, control the vehicle, display unrestricted video, or create non-driving entertainment flows. The product will be released territory by territory after map freshness, routing, privacy and field-test gates pass.

## Submission boundary

This package prepares the application and evidence. The entitlement itself must be granted by Apple to the ATLAS developer account; it cannot be self-issued or embedded before approval.
