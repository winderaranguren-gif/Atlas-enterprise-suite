# ATLAS Portable Runtime

ATLAS is no longer required to execute only as a Cloudflare Worker. The portable runtime adapts the canonical Web `Request`/`Response` application in `rideos-router.js` to standard Node.js HTTP and serverless request handlers.

## Runtime targets

1. Cloudflare Workers remains a supported adapter through `wrangler.jsonc`.
2. Standard Node.js runs with `npm run atlas:serve` on `HOST` / `PORT`.
3. OCI containers run the same Node adapter through the repository `Dockerfile`.
4. Vercel-compatible Node functions are provided by `api/index.mjs` and `vercel.json` for HTTP workloads.
5. Any future provider that can run Node 22 or an OCI image can host the portable runtime without rewriting ATLAS application modules.

## Portable health endpoints

- `/_atlas/health`
- `/_atlas/runtime`
- `/api/video/signal?room=<room>` on the Node/OCI server for signaling status

Responses identify runtime capabilities without exposing credentials or filesystem paths.

## ATLAS-owned durable state

On a standard Node process or OCI container, the portable runtime provides an ATLAS-owned Durable Object compatibility layer for:

- `CONNECT_STORE`
- `CAPABILITY_STATE_STORE`
- `WALLET_STORE`

The compatibility layer stores JSON documents under an ATLAS state directory, hashes object identifiers before using them as filenames, uses restrictive directory/file permissions, serializes writes per object, and commits changes with temporary-file + rename semantics. The default Node location is private runtime state under `.atlas`. The OCI image defaults `ATLAS_STATE_DIR` to `/var/lib/atlas` and declares that path as a volume.

This is a **single-node durable adapter**, not a distributed consensus database. Multiple ATLAS replicas must use a shared database/state adapter instead of mounting the same files concurrently.

On ephemeral serverless runtimes such as Vercel Functions or AWS Lambda, local durable state is disabled by default. It can only be forced with `ATLAS_PORTABLE_STATE=local`, which is appropriate for experiments rather than durable production data. A remote persistence adapter should be used for production serverless deployments.

Set `ATLAS_PORTABLE_STATE=off` to disable the local adapter explicitly.

## ATLAS-owned video signaling

The Node/OCI runtime includes `atlas/video-signal-server.mjs`, a native WebSocket signaling service attached to the same HTTP server at `/api/video/signal`. It preserves the ATLAS Video signaling contract used by the browser client:

- room, peer and channel isolation
- peer capacity enforcement
- welcome / peer-joined / peer-left events
- offer, answer, ICE, media-state, ready, transcript, consent and note relays
- ping/pong health messages
- message-size limits
- server-side overwrite of sender/channel metadata and removal of client-supplied target fields

No Cloudflare `VIDEO_ROOMS` binding is needed when ATLAS runs as the portable Node/OCI server. The original Durable Object implementation remains the Cloudflare adapter.

The portable signaling service is intentionally identified as **single-node**. Multiple application replicas need sticky routing plus a shared signaling/pub-sub layer before they can be treated as one distributed room fabric. Serverless platforms that do not support long-lived WebSockets also need an external signaling adapter.

TURN/STUN remains a separate network traversal concern. Portable signaling replaces the room coordination dependency, not TURN infrastructure.

## Assets

The portable adapter supplies repository public assets directly from `public/`. The application code continues to receive an `ASSETS.fetch(...)` capability, keeping individual modules independent of the hosting provider.

## Container artifact

`.github/workflows/portable-runtime.yml` validates HTTP routing, durable-state round trips, WebSocket room behavior, the ATLAS build graph, OCI build, a live WebSocket upgrade inside the container, and persistence across a container restart using a named volume. On pushes to `main` it is designed to publish:

- `ghcr.io/winderaranguren-gif/atlas-enterprise-suite:latest`
- `ghcr.io/winderaranguren-gif/atlas-enterprise-suite:<commit-sha>`

The image contains no repository secrets. Runtime credentials must be injected by the host at execution time.

## Local execution

```bash
npm install
npm run check:portable-runtime
npm run check:portable-video
npm run atlas:serve
```

Or:

```bash
docker build -t atlas-enterprise-suite .
docker run --rm -p 8080:8080 -v atlas-state:/var/lib/atlas atlas-enterprise-suite
```

Then verify `http://127.0.0.1:8080/_atlas/health` and connect a WebSocket client to `ws://127.0.0.1:8080/api/video/signal?room=test&channel=media&peer=example`.

## Engineering rule

Cloud providers are deployment adapters, not the ATLAS architecture. New modules should prefer Web-standard APIs and receive state/capabilities through explicit adapters so the same business logic can run on Worker, Node, container or serverless targets. Provider-specific durable or real-time services must not leak into business modules as architectural assumptions.
