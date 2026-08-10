# ATLAS Clean Foundation Migration Boundary

## Active baseline

The authoritative GitHub application tree is the clean foundation introduced by commit `968b0385015dc8125d6c25183158669d4cd251a1` and versioned as ATLAS Enterprise Suite `1.0.0`.

The clean foundation intentionally does not inherit the old browser runtime, old Cloudflare Worker entrypoints, old GitHub Actions workflows, or old feature-branch application trees by merge.

## Legacy pull requests

Pull requests created against the pre-v1.0.0 application tree are historical implementation sources, not merge candidates for the clean foundation. Useful capabilities must be selectively reimplemented or ported on branches created from the current clean `main`, with the current validation and security boundary preserved.

Closing a superseded pull request does not delete its branch or Git history.

## Backend state

The previously connected Supabase project may retain database objects and hardening migrations created before the clean-foundation rebuild. The current v1.0.0 browser foundation does not connect to Supabase and must not imply that those backend capabilities are active in the new client.

Before any future backend capability is reattached:

1. inspect the live schema and current grants/RLS;
2. reconcile the database state with a migration tracked from the clean foundation;
3. expose only server-mediated or RLS-safe interfaces;
4. keep secrets out of the browser and repository;
5. add a regression validator for the capability;
6. verify deployment before claiming the capability is active.

## Error-notification rule

A notification from an older PR head describes that historical branch, not the current clean `main`. Current ATLAS status must be determined from the current `main` SHA and its deployment, not from stale branch notifications.

## Release rule

Do not merge pre-v1.0.0 application snapshots wholesale into the clean foundation. Re-port the smallest required capability, validate it against the current architecture, and keep the clean tree as the source of truth.
