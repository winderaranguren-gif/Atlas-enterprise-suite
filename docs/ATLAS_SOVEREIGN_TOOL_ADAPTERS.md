# ATLAS Sovereign Tool Adapters

This release extends ATLAS Workbench with three provider-independent development capabilities so ATLAS can keep working when an external builder, OAuth helper, or hosted developer platform is unavailable.

## 1. Provider adapters

`atlas/providers.mjs` normalizes the provider catalog used by ATLAS. It currently understands development, deployment, data, AI, and workspace providers including GitHub, Cloudflare, Vercel, Supabase, OpenAI, Anthropic, Google AI, Microsoft, and Google Workspace.

The adapter reports environment readiness without printing credential values and produces provider-neutral execution contracts:

```bash
npm run atlas:providers -- catalog
npm run atlas:providers -- status cloudflare
npm run atlas:providers -- plan cloudflare deploy --json '{"service":"atlas"}'
```

Remote mutations are deliberately not executed by this generic layer. An authenticated provider-specific adapter must perform them so authorization and audit boundaries stay explicit.

## 2. OAuth / PKCE utility

`atlas/oauth.mjs` creates real RFC-style PKCE verifier/challenge pairs, state values, and authorization URLs without persisting tokens or client secrets.

```bash
npm run atlas:oauth -- status
npm run atlas:oauth -- pkce \
  --auth-url https://provider.example/authorize \
  --client-id atlas-client \
  --redirect-uri https://www.atlasenterprisesuite.com/oauth/callback \
  --scope "openid profile email"
```

The tool performs no token exchange and stores nothing. Provider callbacks and durable token storage remain an authenticated backend responsibility.

## 3. Guarded local sandbox

`atlas/sandbox.mjs` creates local sandbox metadata under `.atlas/sandboxes` and can run only allowlisted validation/build/status scripts. Mutations remain dry-run by default.

```bash
npm run atlas:sandbox -- status
npm run atlas:sandbox -- create browser-refactor
npm run atlas:sandbox -- create browser-refactor --apply
npm run atlas:sandbox -- run browser-refactor check:browser
npm run atlas:sandbox -- run browser-refactor check:browser --apply
```

ATLAS Sandbox v1 is a guarded workspace runner, not a security boundary. Network access and operating-system isolation are inherited from the runtime. True disposable container or VM isolation remains a later infrastructure layer.

## Security rules

- Secret values are never stored in the provider registry.
- Environment readiness checks expose names and booleans only.
- OAuth verifier values are generated locally and not persisted by the tool.
- Sandbox execution is allowlisted and dry-run by default.
- Provider-neutral plans never claim that a remote mutation occurred.
- Remote writes must use an authenticated adapter and should be tenant-scoped and auditable.

## Integration

These tools are wired into `package.json` as `atlas:providers`, `atlas:oauth`, and `atlas:sandbox`. The Workbench validation suite syntax-checks and behavior-checks all three so they remain part of the canonical ATLAS build contract.
