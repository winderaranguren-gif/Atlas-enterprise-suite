# ATLAS Update Fabric

## Objective
One permanent ATLAS installation. New validated modules, fixes, configuration and design releases propagate without asking the operator to download replacement ZIPs or reinstall the product.

## Release lifecycle
1. Change is developed in a controlled branch.
2. ATLAS validation, runtime tests, security gates and build pass.
3. Release manifest receives a new immutable `releaseId` and semantic version.
4. Deployment publishes artifacts and manifest atomically.
5. Web/PWA clients poll the same-origin release manifest and also check when returning online or foregrounding the app.
6. A newer release asks the Service Worker to update and activates the new shell automatically.
7. Native launcher adapters may fetch only signed packages, stage them, health-check them, then atomically switch versions.
8. Failed verification retains or restores the last-known-good release.

## Channels
- `stable`: production delivery.
- `preview`: release candidate validation.
- `development`: internal engineering only.

## Release manifest
Canonical public contract: `/atlas.release.json`.
It is network-only and must never be satisfied from the application cache.

## What can update normally
- application modules
- web/PWA code
- styles and approved design assets
- module registry
- localization resources
- configuration that passes schema/policy validation
- documentation bundled into the product

## What requires stronger controls
- identity/security policy changes
- database/schema migrations
- native executable packages
- cryptographic trust roots
- launcher replacement
- destructive data transformations

These require compatibility checks, backup/migration plans, signed artifacts where applicable, and rollback evidence.

## Deployment invariant
`validate -> test -> build -> release -> health verify -> promote`

A Git push alone is not proof that production is healthy. The deployment system must distinguish repository state, deployed state and client-applied state.

## Current implementation in this snapshot
- `public/atlas.release.json`: release contract.
- `public/update-core.js`: automatic web/PWA release detector.
- `public/sw.js`: same-origin cache boundary with network-only release/config manifests.
- permanent launcher/native adapter contract documented for the next native packaging step.
