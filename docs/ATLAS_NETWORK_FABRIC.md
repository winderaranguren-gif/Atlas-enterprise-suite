# ATLAS Network Fabric

ATLAS Network Fabric extends ATLAS Connect into a carrier-neutral connectivity control layer. Verizon is treated as an integration provider and benchmark, not as a copied product or a source of simulated network state.

## Scope in this release

- Multi-carrier connection registry for Verizon, AT&T, T-Mobile, Starlink, local fiber, private networks, Wi-Fi, Ethernet, 5G and private 5G.
- Device Registry linking operational assets such as POS terminals, cameras, sensors and other equipment to registered connections.
- Connectivity policies with workload priority, primary connection and fallback connection.
- Fail-closed route evaluation. ATLAS only selects a connection with a provider-verified health state.
- Tenant-scoped persistence inside the existing `CONNECT_STORE` Durable Object.
- Audit records for network inventory, devices, policies and route evaluations.
- Provider health updates protected by `NETWORK_ADAPTER_SECRET`.
- No fabricated bandwidth, latency, coverage, online state, carrier status or SLA metrics.

## Routes

User interface:

- `/connect/network`
- `/connect/devices`
- `/connect/policies`
- `/connect/settings`

API:

- `GET /api/connect/network/snapshot`
- `POST /api/connect/network/connections`
- `POST /api/connect/network/devices`
- `POST /api/connect/network/policies`
- `POST /api/connect/network/decision`
- `PATCH /api/connect/network/connections/:id/status`

The provider-health PATCH endpoint requires `Authorization: Bearer <NETWORK_ADAPTER_SECRET>` and is intended for authenticated server-side provider adapters.

## Provider adapter contract

The runtime may declare a provider adapter through server-side configuration:

- `NETWORK_PROVIDER`
- `NETWORK_API_BASE_URL`
- `NETWORK_API_TOKEN`
- `NETWORK_ADAPTER_SECRET`

These values indicate adapter readiness only. They do not make a connection `verified` by themselves. A provider adapter must independently verify carrier health and then post an authenticated state update.

Allowed provider health states are:

- `verified`
- `degraded`
- `offline`
- `error`

New connections always start as `unverified`.

## Routing behavior

A connectivity policy identifies a primary connection and optional fallback. The decision engine evaluates only connections whose persisted provider health state is `verified`.

1. If primary is verified, select primary.
2. Otherwise, if fallback is verified, select fallback.
3. Otherwise, return HTTP 409 with `fail_closed: true` and select no route.

This prevents ATLAS from presenting an unavailable or unverified network as production-ready.

## Verizon integration path

A future Verizon adapter should map authorized Verizon enterprise/network API responses into the normalized ATLAS connection-health contract rather than introducing Verizon-specific truth throughout the application. The same contract can later support AT&T, T-Mobile, private 5G, fiber and satellite providers.

Provider-specific secrets remain server-side. ATLAS should not expose carrier credentials to the browser or store them in network inventory records.

## Security boundary

Network Fabric reuses the existing ATLAS Connect storage boundary. Tenant and actor identifiers are accepted from the upstream ATLAS request context and stored with audit events. Final production authorization must remain enforced by the canonical ATLAS identity/RBAC gateway rather than creating a parallel identity system inside Network Fabric.

## Validation

`npm run check:connect` verifies:

- all Connect and Network Fabric routes render;
- existing conversation persistence remains functional;
- new network connections start unverified;
- device and policy persistence works;
- routing fails closed without a verified link;
- audit events are created;
- unauthorized carrier-health updates are rejected;
- outbound telephony continues to fail closed without provider credentials.
