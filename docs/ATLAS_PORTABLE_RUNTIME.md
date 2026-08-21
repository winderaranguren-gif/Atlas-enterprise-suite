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

Responses identify the runtime and storage mode without exposing credentials or filesystem paths.

## ATLAS-owned durable state

On a standard Node process or OCI container, the portable runtime now provides an ATLAS-owned Durable Object compatibility layer for:

- `CONNECT_STORE`
- `CAPABILITY_STATE_STORE`
- `WALLET_STORE`

The compatibility layer stores JSON documents under an ATLAS state directory, hashes object identifiers before using them as filenames, uses restrictive directory/file permissions, serializes writes per object, and commits changes with temporary-file + rename semantics. The default location is private runtime state under `.atlas`; operators can set `ATLAS_STATE_DIR` to a mounted persistent volume.

This is a **single-node durable adapter**, not a distributed consensus database. Multiple ATLAS replicas must use a future shared database/state adapter instead of mounting the same files concurrently.

On ephemeral serverless runtimes such as Vercel Functions or AWS Lambda, local durable state is disabled by default. It can only be forced with `ATLAS_PORTABLE_STATE=local`, which is appropriate for experiments rather than durable production data. A remote persistence adapter should be used for production serverless deployments.

Set `ATLAS_PORTABLE_STATE=off` to disable the local adapter explicitly.

## Video signaling boundary

`VIDEO_ROOMS` is intentionally not faked. ATLAS Video signaling uses distributed WebSocket semantics that require a WebSocket-capable service or an explicit signaling adapter. A portable Node/WebSocket implementation can be added separately without weakening the durability claims of the other modules.

## Assets

The portable adapter supplies repository public assets directly from `public/`. The application code continues to receive an `ASSETS.fetch(...)` capability, keeping individual modules independent of the hosting provider.

## Container artifact

`.github/workflows/portable-runtime.yml` validates the Web adapter, durable-state round trips, ATLAS build graph, OCI build and a live container smoke test. On pushes to `main` it is designed to publish:

- `ghcr.io/winderaranguren-gif/atlas-enterprise-suite:latest`
- `ghcr.io/winderaranguren-gif/atlas-enterprise-suite:<commit-sha>`

The image contains no repository secrets. Runtime credentials must be injected by the host at execution time. For durable portable state, mount a persistent volume and point `ATLAS_STATE_DIR` at it.

## Local execution

```bash
npm install
npm run check:portable-runtime
npm run atlas:serve
```

Or:

```bash
docker build -t atlas-enterprise-suite .
docker run --rm -p 8080:8080 -v atlas-state:/var/lib/atlas -e ATLAS_STATE_DIR=/var/lib/atlas atlas-enterprise-suite
```

Then verify `http://127.0.0.1:8080/_atlas/health`.

## Engineering rule

Cloud providers are deployment adapters, not the ATLAS architecture. New modules should prefer Web-standard APIs and receive state/capabilities through `env` so the same business logic can run on Worker, Node, container or serverless targets. Provider-specific durable services must be represented by explicit adapters rather than leaked into business modules.
