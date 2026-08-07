# ATLAS GPS 4D — Android for Cars Release Package

## Application identity

- Package: `com.atlas.navigation`
- Category: Navigation
- Platforms: Android Auto and Android Automotive OS
- Distribution: Google Play, staged territory release
- Required artifact: signed Android App Bundle produced by the ATLAS release pipeline

## Technical declaration

- Uses Android for Cars App Library templates for navigation.
- Declares the car application metadata and navigation capability.
- Provides route preview, travel estimate, maneuver, navigation alert and map surfaces.
- Restores an active navigation session after process recreation where safe.
- Supports voice-first destination entry.
- Keeps non-driving account, billing and advanced configuration tasks on the phone or while parked.
- Uses a foreground navigation service and visible notification during background guidance.

## Quality gates

### Android Auto

- [ ] Desktop Head Unit tests pass for all supported display sizes.
- [ ] Rotary, touch and voice input paths pass.
- [ ] Day/night theme switching passes.
- [ ] Connection loss and reconnection restore navigation safely.
- [ ] Phone permission handoff is clear and does not invite phone use while driving.
- [ ] Navigation notifications are current and non-duplicative.

### Android Automotive OS

- [ ] Emulator tests pass across portrait, landscape and irregular displays.
- [ ] System bars and display cutouts do not hide controls.
- [ ] Map rendering remains responsive under memory pressure.
- [ ] Offline package behavior is tested with network disabled.
- [ ] Location permission revocation stops tracking and explains the state.
- [ ] Driver-distraction restrictions are honored.

### Navigation-specific

- [ ] Route preview matches the selected destination.
- [ ] Travel estimate updates without rapid distracting changes.
- [ ] Maneuver and lane instructions are removed when stale.
- [ ] Rerouting does not loop or repeatedly announce the same instruction.
- [ ] The application distinguishes unavailable live traffic from normal traffic.
- [ ] Hazard reporting cannot be performed through complex interaction while moving.

## Google Play submission evidence

- [ ] Closed-test track release completed.
- [ ] Pre-launch report reviewed.
- [ ] Data safety form completed.
- [ ] Privacy policy URL active.
- [ ] Car app quality self-assessment attached.
- [ ] Android Auto screenshots and AAOS screenshots attached.
- [ ] Reviewer route and demo account provided.
- [ ] Navigation category selected.
- [ ] Production rollout begins at 1% after approval.
- [ ] Crash, ANR and route-failure rollback thresholds configured.

## Release rule

A phone release may continue independently, but the car-targeted release must remain in a separate controlled track until Google Play accepts the car experience and ATLAS records the approval evidence.
