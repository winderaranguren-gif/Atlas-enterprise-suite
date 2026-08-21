# ATLAS Portable Runtime

ATLAS is no longer required to execute only as a Cloudflare Worker. The portable runtime adapts the canonical Web `Request`/`Response` application in `rideos-router.js` to standard Node.js HTTP and serverless request handlers.

## Runtime targets

1. Cloudflare Workers remains a supported adapter through `wrangler.jsonc`.
2. Standard Node.js runs with `npm run atlas:serve` on `HOST` / `PORT`.
3. OCI containers run the same Node adapter through the repository `Dockerfile`.
4. Vercel-compatible Node functions are provided by `api/index.mjs` and `vercel.json`.
5. Any future provider that can run Node 22 or an OCI image can host the portable runtime without rewriting ATLAS application modules.

## Portable health endpoints

- `/_atlas/health`
- `/_atlas/runtime`

Responses identify the portable runtime and do not expose credentials.

## State boundary

The portable adapter supplies local public assets directly from `public/`. Cloudflare Durable Objects are not silently emulated. Routes that require `VIDEO_ROOMS`, `CONNECT_STORE`, `CAPABILITY_STATE_STORE`, or `WALLET_STORE` need an explicit persistence adapter on non-Cloudflare hosts. This prevents a fallback deployment from pretending to provide durable semantics that it does not have.

Stateless surfaces such as ATLAS Browser and ATLAS Workbench run through the portable adapter immediately. Stateful modules can be migrated behind provider-neutral storage contracts separately.

## Container artifact

`.github/workflows/portable-runtime.yml` validates the Web adapter, builds the OCI image, boots it, exercises health/Browser/Workbench, and on pushes to `main` publishes:

- `ghcr.io/winderaranguren-gif/atlas-enterprise-suite:latest`
- `ghcr.io/winderaranguren-gif/atlas-enterprise-suite:<commit-sha>`

The image contains no repository secrets. Runtime credentials must be injected by the host at execution time.

## Local execution

```bash
npm install
npm run check:portable-runtime
npm run atlas:serve
```

Or:

```bash
docker build -t atlas-enterprise-suite .
docker run --rm -p 8080:8080 atlas-enterprise-suite
```

Then verify `http://127.0.0.1:8080/_atlas/health`.

## Engineering rule

Cloud providers are deployment adapters, not the ATLAS architecture. New modules should prefer Web-standard APIs and receive state/capabilities through `env` so the same business logic can run on Worker, Node, container, or serverless targets.
