# ATLAS Enterprise Suite

Clean modular rebuild started 2026-08-11.

## Architecture

- `apps/web` — ATLAS web shell and Cloudflare Worker runtime.
- `modules/core` — platform core contract.
- `modules/dashboard` — first operational module.
- `scripts` — repository validation.
- `.github/workflows` — CI only during rebuild.

The production deployment workflow is intentionally not enabled until the clean foundation passes validation and the deployment bindings are reconnected.

## Commands

```bash
npm install
npm run check
npm run dev
npm run deploy
```

## Rebuild rule

Each ATLAS module is isolated under `modules/<module-name>` and must expose its own manifest. Cross-module behavior must go through the Core contract rather than direct file coupling.
