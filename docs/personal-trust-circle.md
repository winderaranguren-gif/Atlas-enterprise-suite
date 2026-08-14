# ATLAS Personal Trust Circle

**Status:** Architecture specification  
**Version:** 1.0  
**Date:** 2026-08-14

## Purpose

ATLAS Personal Trust Circle provides one personal identity and one persistent session across a user's approved devices without treating a shared Wi-Fi network as proof of identity.

Core rule:

> One identity, one session, all approved personal devices. A shared network never grants access to another person's data.

## User experience

1. The user signs in fully once on a primary device.
2. Additional devices are enrolled once using a QR code, proximity check, or approval from the primary phone.
3. Every approved device receives its own device-bound cryptographic credential.
4. ATLAS keeps the session active and securely renews it without repeatedly asking for an email and password.
5. Step-up verification is requested only for meaningful risk or sensitive operations.

Changing normally between home Wi-Fi, another trusted network, and mobile data must not close the session by itself.

## Identity and device trust

- Email identifies the account but is never sufficient by itself to authorize a device.
- Each user has an isolated Trust Circle.
- Each enrolled phone, laptop, or tablet has a unique key pair and revocable device record.
- Trust is based on user identity, device credentials, secure storage, session state, and risk signals.
- The IP address and Wi-Fi SSID are contextual signals only; they are not authentication factors.
- A lost or replaced device can be revoked immediately from another approved device.
- The laptop may continue through Windows Hello if the primary phone is temporarily unavailable.
- Account recovery requires two independent recovery methods.

## Household isolation

Multiple family members may use the same router while maintaining completely separate spaces.

ATLAS must:

- isolate accounts, sessions, files, photos, clipboard data, history, notifications, and screen-sharing permissions;
- deny cross-user discovery and access by default;
- never infer that devices belong to the same person because they share an IP address, Wi-Fi network, surname, or household;
- require explicit, scoped consent before sharing anything between Trust Circles;
- provide a guest mode when lending a device;
- support temporary access to a specific file or module with an automatic expiration.

## Private device bridge

Communication between approved devices uses a mutually authenticated, end-to-end encrypted channel.

Required properties:

- device-to-device authentication;
- end-to-end encryption in transit;
- encrypted local credential storage;
- replay protection and short-lived session tokens;
- explicit recipient selection for file, clipboard, screen, camera, and media transfers;
- no public folder or broadcast discovery;
- no direct exposure of the phone or laptop to the public internet;
- complete revocation and security-event audit trail.

A different public IP address is not required for privacy. Cryptographic identity, authorization, encryption, and firewall enforcement provide the protection.

## Session policy

| Event | Expected behavior |
|---|---|
| Open ATLAS on an approved device | Continue automatically |
| Normal Wi-Fi or mobile-network change | Continue automatically |
| Session renewal | Renew silently using the device credential |
| New device enrollment | Approve once from an existing trusted device |
| Unrecognized or revoked device | Deny access |
| Abnormal location or device behavior | Request step-up verification |
| Payment, password, security change, or destructive action | Require Face ID, Windows Hello, PIN, or equivalent |
| Device reported lost | Revoke tokens and encryption access immediately |

Suggested default session lifetime: 90 days with secure rolling renewal. Administrative policy may shorten this period.

## Network segmentation

Network separation is defense in depth and does not replace device-level security.

### Primary network

For approved personal computers, phones, tablets, and trusted infrastructure.

### Guest/IoT network

For visitors, televisions, cameras, assistants, appliances, and devices that do not require access to personal systems.

Recommended router controls:

- guest-to-primary-network blocking;
- client isolation on the guest network when supported;
- WPA2/WPA3 with a strong unique credential;
- UPnP disabled unless a documented requirement exists;
- no exposed file sharing;
- no unsolicited inbound access.

ATLAS remains secure even if segmentation is unavailable because the Wi-Fi network is always treated as untrusted.

## Privacy requirements

- Store device secrets only in platform secure storage such as Secure Enclave, Keychain, TPM, or Windows Hello-backed storage.
- Minimize biometric processing and defer to operating-system biometric APIs where possible.
- Do not store raw facial images for routine authentication.
- Do not upload contacts, photos, files, or browsing data merely because a device is enrolled.
- Make every sharing permission visible, specific, revocable, and logged.
- Encrypt sensitive data at rest and in transit.
- Never place credentials, tokens, personal files, or conversation history in the source repository.

## Administration panel

The **My Devices** panel should show:

- device name and type;
- owner/profile;
- trust status;
- last successful activity;
- approximate region when permitted;
- active sessions;
- granted sharing capabilities;
- revoke and sign-out controls;
- a global **Sign out all devices** emergency control.

## Implementation phases

### Phase 1 — Foundation

- account isolation and device registry;
- passkey/WebAuthn sign-in;
- device-bound sessions and token rotation;
- revocation and security audit log.

### Phase 2 — Trust Circle

- QR/proximity enrollment;
- primary-phone approvals;
- My Devices panel;
- risk-based step-up verification;
- recovery flow.

### Phase 3 — Private Bridge

- encrypted file and clipboard transfer;
- explicit screen/camera/media permissions;
- nearby-device handoff;
- temporary scoped sharing.

### Phase 4 — Network hardening

- guided primary/guest network configuration;
- Windows public-network and firewall policy checks;
- guest client-isolation checks;
- clear diagnostics without exposing router credentials.

## Acceptance criteria

- Four family members on one Wi-Fi cannot view or access each other's ATLAS data.
- A user signs in once and can subsequently open ATLAS on every previously enrolled personal device without re-entering credentials.
- Enrollment of a new device always requires approval from an already trusted factor.
- Changing networks does not force a new login unless risk is detected.
- Revoking a device prevents it from renewing or using the session.
- Sensitive actions always require step-up verification.
- No raw passwords, biometric images, session tokens, router credentials, or personal data are committed to the repository.
