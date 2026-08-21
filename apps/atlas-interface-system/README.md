# ATLAS Interface System

This directory preserves the ATLAS Interface System source developed in Lovable and moves ongoing ownership into the canonical GitHub repository.

## Migration status

- Source origin: Lovable project `atlas-enterprise-suite` / ATLAS Interface System.
- Lovable project snapshot commit at migration start: `7e0cdb359c12fb43019fc3af19bdb471f47a785f` ("Added ATLAS Browser module").
- Canonical repository: this GitHub repository.
- Secrets are intentionally not copied. In particular, the Lovable `.env` file is excluded from this public repository.
- Binary generated assets may be re-added from an approved source if needed.

## Development direction

GitHub is the source of truth. Builder tools such as Lovable or Base44 may be used as accelerators, but changes should return here through branches and reviewable commits.

The ATLAS Browser web workspace is groundwork for a future native iOS shell. The web workspace itself must never claim to be an iOS default browser. Native browser eligibility requires a separate Swift/SwiftUI + WKWebView application and Apple approval.
