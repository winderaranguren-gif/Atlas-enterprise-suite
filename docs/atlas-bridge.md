# ATLAS Bridge

**Tagline:** One World, Every Screen.  
**Version:** 0.1.0 — foundation  
**Status:** Published foundation; device pairing and file-transfer execution are not enabled yet.

ATLAS Bridge is the continuity layer that allows a phone and computer to behave as one connected workspace.

## Product experience

- **Edge Push:** drag an item toward the edge of the ATLAS mobile interface to send it to a trusted computer.
- **Universal Drop:** deliver an item to ATLAS on the receiving device, with future application-targeted delivery.
- **ATLAS Handoff:** continue a supported task, page, document, presentation or media session on another device.
- **Universal Clipboard:** copy on one device and paste on another.
- **ATLAS Desk:** use the phone as a remote control, keyboard, pointer or media controller.
- **Shared sensors:** offer the phone camera and microphone to an authorized ATLAS session.
- **Voice transfer:** “Atlas, send this video to my laptop.”
- **Resumable transfer:** preserve progress when the connection is interrupted.

## Platform constraints

On iOS, system-wide edge gestures and unrestricted access to data owned by other applications are not available to third-party apps. Edge Push will work inside ATLAS. Outside ATLAS, the supported path is the iOS Share extension (“Share → ATLAS Bridge”) unless Apple exposes additional capabilities.

No product surface may represent planned capabilities as operational.

## Transport strategy

1. Discover trusted nearby devices through Bluetooth, QR or a device code.
2. Transfer over local Wi-Fi when possible.
3. Use USB or an encrypted relay as explicit fallbacks.
4. Resume using chunk hashes and integrity verification.
5. Never require public cloud storage for local transfers.

## Security requirements

- Explicit device pairing and revocation
- End-to-end encryption
- Trusted-device allowlist
- Confirmation before sensitive transfers
- File name, size, type and destination preview
- Malware and file-type validation on the receiver
- Transfer audit events without storing file contents
- Automatic reception only for explicitly trusted devices
- Short-lived session keys and replay protection
- No background camera or microphone access without visible consent

## Published endpoints

- `GET /platform/bridge`
- `GET /api/bridge/status`
- `GET /api/bridge/capabilities`

Reserved execution endpoints return `501 Not Implemented` until secure pairing and transfer execution are complete:

- `/api/bridge/pair`
- `/api/bridge/transfer`

## Delivery phases

1. Foundation and capability contract
2. Device identity, discovery and pairing
3. Encrypted local transfer with progress and resume
4. iOS Share extension and Windows receiver
5. Edge Push inside ATLAS
6. Clipboard and handoff
7. ATLAS Desk and shared sensors
8. Remote encrypted relay and enterprise policy controls
