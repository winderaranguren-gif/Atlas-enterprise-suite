# ATLAS Autonomy and Recovery Contract

ATLAS must remain operable when a CI vendor, deployment dashboard, integration, or hosted runner is unavailable. External services may execute or expose ATLAS, but they are not the source of truth for ATLAS state.

## Source-of-truth hierarchy

1. `main` in `winderaranguren-gif/Atlas-enterprise-suite` is the canonical source tree.
2. `modules/version.js` is the canonical runtime version source.
3. `infra/cloudflare/production-baseline.json` is the desired edge configuration baseline.
4. `infra/cloudflare/known-good.json` identifies the recovery point and recovery branch.
5. Immutable audit/security data remains authoritative for tenant activity; never reconstruct it from UI state.

Cloudflare is the current edge/runtime provider. GitHub is the current source-control provider. Neither provider is allowed to redefine ATLAS business state merely because its dashboard, workflow runner, or integration is unavailable.

## Provider-independent control commands

- `npm run atlas:doctor` — fast repository/configuration diagnosis using only Node built-ins.
- `npm run atlas:verify` — full local release gate: ATLAS Doctor + production validation + QA.
- `npm run atlas:self-heal` — repair safe Wrangler drift from the repository baseline and then run the full local release gate.
- `npm run infra:validate` — verify Cloudflare configuration against the repository baseline.
- `npm run infra:repair` — restore only the safe Wrangler baseline; it does not modify DNS, billing, secrets, or account ownership.

These commands do not require GitHub Actions. Hosted CI is an optional execution surface, not a prerequisite for validating ATLAS.

## Failure policy

### Hosted CI unavailable or billing-blocked
Run the local ATLAS release gate. Do not classify a runner-start failure as an application failure. Automatic GitHub Actions remain paused while hosted runners are non-authoritative.

### Cloudflare configuration drift
Run `npm run atlas:self-heal`. Automatic repair is deliberately limited to repository-owned Wrangler configuration. DNS deletion, secret rotation, billing changes, registrar changes, and account ownership changes are excluded from automatic repair.

### Non-main deployment attempt
`scripts/guard-cloudflare-production.mjs` must exit non-zero for Cloudflare Workers Builds where `WORKERS_CI_BRANCH` is not `main`. Production must never be promoted from an unmerged branch.

### Source corruption or accidental deletion
Use the known-good recovery record and immutable source-backup manifest. Restore from a known-good commit rather than mirroring a broken tree forward.

### Provider outage
Preserve the source tree, configuration baseline, migrations, and recovery metadata. A provider outage must not cause source changes. Recovery should move execution to a compatible provider only after the same ATLAS validation gate passes.

## Release invariant

A production release is acceptable only when all of these hold:

- source commit is known;
- branch is `main`;
- `npm run atlas:verify` passes in an environment capable of executing Node 22+;
- edge configuration matches the repository baseline;
- no production secret is stored in source control;
- the deployed version can be traced back to the exact source commit.

## Safety boundary

Self-healing is fail-closed. ATLAS may automatically restore deterministic repository-owned configuration. It must not guess or fabricate credentials, tenant data, DNS records, billing decisions, or identity permissions.

## Privacy boundary

Do not commit chat transcripts, private prompts, credentials, tokens, personal documents, or unrelated user data to this repository.
