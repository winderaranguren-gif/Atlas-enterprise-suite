# ATLAS Website Launch Queue — 2026-08-18

## Objective

Place the clean-room ATLAS equivalents of work management, passenger mobility, driver/courier operations, local commerce, and driver finance into the canonical website release path for `atlasenterprisesuite.com`.

## Release order

1. **ATLAS Work Management** — `/work`
2. **ATLAS Ride** — `/ride`
3. **ATLAS Driver** — `/driver`
4. **ATLAS Marketplace** — `/marketplace`
5. **ATLAS Driver Finance** — `/driver-finance`
6. **ATLAS Launch Queue** — `/launch-queue` (release-control surface)

## Implemented code

- `modules/work-management-worker.js`
  - List, board and timeline views
  - Task creation and completion
  - Search and project filtering
  - Browser-scoped workspace persistence for the prototype
  - `/api/work/capabilities`
  - `/api/work/health`

- `modules/mobility-commerce-worker.js`
  - Passenger ride-request sandbox
  - Driver/courier availability and offer queue sandbox
  - Marketplace catalog/cart/checkout staging sandbox
  - Driver earnings/tips/payout readiness ledger sandbox
  - `/api/mobility/capabilities`
  - `/api/mobility/health`

- `modules/launch-queue-worker.js`
  - Human-readable launch queue
  - Machine-readable `/api/launch-queue`
  - `/api/launch-queue/health`

- `atlas-router.js`
  - Routes all modules above through the canonical ATLAS Worker.
  - Adds discovery links to the existing ATLAS shell.

- `scripts/validate-launch-queue.mjs`
  - Automated route and response validation for all queued modules.

- `.github/workflows/deploy-cloudflare.yml`
  - Runs `npm run check:launch` before Wrangler bundle validation.
  - After deployment, verifies the new health endpoints and public routes.

## Release integrity

A module can be **code-ready** without being **production-live**. The release pipeline is:

`main` → automated validation → Wrangler dry-run → Cloudflare deployment → public endpoint verification.

The website must not represent sandbox functions as live operational services until their external production dependencies are connected and verified.

## Production gates

### Work Management
Requires shared tenant persistence and authenticated multi-user collaboration for production use.

### Ride / Driver
Requires authorized maps/geocoding/routing, real-time dispatch, driver onboarding/compliance, notifications, payment processing, and safety operations.

### Marketplace
Requires merchant catalog/inventory integrations, order management, payments, and delivery dispatch.

### Driver Finance
The current implementation is a software ledger sandbox only. Real debit, deposit, stored-value, credit/advance, payout, or banking products require regulated banking/issuer/payment partners, KYC/AML controls, and applicable licensing/compliance.

## Current deployment constraint

The canonical GitHub workflow requires `CLOUDFLARE_API_TOKEN` to validate successfully before the production Worker can deploy. A successful production launch must be evidenced by the post-deploy verification checks; repository commits alone are not proof of a public launch.
