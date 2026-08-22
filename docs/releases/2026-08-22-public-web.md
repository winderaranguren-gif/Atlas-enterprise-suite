# ATLAS Public Website Release — 2026-08-22

## Scope

This release promotes the rebuilt ATLAS Enterprise Suite public website experience already present on `main` into the canonical release path.

## Public experience

- Orlando-led ATLAS visual identity and curated Design Library assets.
- Hero message: `One platform. Every solution. Total control.`
- Public product, solution, trust, status, privacy, terms, accessibility and contact surfaces.
- Public product previews remain separate from protected application routes.
- Module access transitions through ATLAS Identity and authorization.
- Business metrics remain empty until authorized data is connected; no decorative operational metrics are allowed.
- Public site includes responsive, accessibility, SEO, canonical, Open Graph, sitemap and robots protections.

## Release boundary

Public website routes remain indexable where intended. `/dashboard`, API surfaces and protected module routes remain outside the public sitemap and protected by the application boundary.

## Production verification

The public-site verifier is now aligned with the canonical sovereign deployment workflow, `Deploy ATLAS VPS`, and can also be dispatched manually for independent production verification.

Production verification requires:

1. `https://www.atlasenterprisesuite.com/` to serve the rebuilt corporate home.
2. ATLAS Design Library assets to resolve successfully.
3. Product, Trust Center, Status and Identity routes to respond.
4. `/app` to preserve the application transition to `/dashboard`.
5. protected application routes to remain `noindex`.
6. CSP, nosniff, responsive and accessibility markers to remain present.
7. no empty `href="#"`, fabricated live state or decorative internal metrics to be exposed publicly.

## Canonical release path

`main` → ATLAS Portable Runtime validation → immutable OCI image → sovereign release → Deploy ATLAS VPS → public production verification.

Cloudflare remains an optional adapter and is not the canonical production path for this release.
